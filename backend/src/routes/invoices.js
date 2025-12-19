import { Router } from 'express';
import supabase from '../database.js';
import { authenticate } from '../middleware/auth.js';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

// Generate invoice number
async function generateInvoiceNumber() {
  const { data: prefixSetting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'invoice_prefix')
    .single();
  
  const prefix = prefixSetting?.value || 'INV';
  const year = new Date().getFullYear();
  
  const { data: lastInvoice } = await supabase
    .from('invoices')
    .select('invoice_number')
    .like('invoice_number', `${prefix}-${year}-%`)
    .order('id', { ascending: false })
    .limit(1)
    .single();
  
  let nextNum = 1;
  if (lastInvoice) {
    const parts = lastInvoice.invoice_number.split('-');
    nextNum = parseInt(parts[2]) + 1;
  }
  
  return `${prefix}-${year}-${String(nextNum).padStart(4, '0')}`;
}

// Get all invoices
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, customer_id, order_status } = req.query;
    
    let query = supabase
      .from('invoices')
      .select(`
        *,
        customers (name, whatsapp),
        delivery_zones (name, delivery_fee)
      `);
    
    if (status) query = query.eq('status', status);
    if (customer_id) query = query.eq('customer_id', customer_id);
    if (order_status) query = query.eq('order_status', order_status);
    
    const { data } = await query.order('created_at', { ascending: false });
    
    const invoices = (data || []).map(inv => ({
      ...inv,
      customer_name: inv.customers?.name,
      customer_whatsapp: inv.customers?.whatsapp,
      delivery_zone_name: inv.delivery_zones?.name
    }));
    
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single invoice with items and packages
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { data: invoice } = await supabase
      .from('invoices')
      .select(`
        *,
        customers (name, whatsapp, country),
        recipients (name, phone, address)
      `)
      .eq('id', req.params.id)
      .single();
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // Get packages for this invoice
    const { data: packages } = await supabase
      .from('invoice_packages')
      .select('*')
      .eq('invoice_id', req.params.id)
      .order('id');
    
    // Get all items for this invoice
    const { data: items } = await supabase
      .from('invoice_items')
      .select(`
        *,
        categories (name),
        vendors (name),
        products (name, cost_price, retail_price)
      `)
      .eq('invoice_id', req.params.id);
    
    const formattedItems = (items || []).map(item => ({
      ...item,
      category_name: item.categories?.name,
      vendor_name: item.vendors?.name,
      product_name: item.products?.name
    }));
    
    // Group items by package
    const packagesWithItems = (packages || []).map(pkg => ({
      ...pkg,
      items: formattedItems.filter(item => item.package_id === pkg.id)
    }));
    
    // Items without package (legacy or standalone)
    const standaloneItems = formattedItems.filter(item => !item.package_id);
    
    res.json({
      ...invoice,
      customer_name: invoice.customers?.name,
      customer_whatsapp: invoice.customers?.whatsapp,
      customer_country: invoice.customers?.country,
      recipient_name: invoice.recipients?.name,
      recipient_phone: invoice.recipients?.phone,
      recipient_address: invoice.recipients?.address,
      packages: packagesWithItems,
      items: standaloneItems, // For backward compatibility
      all_items: formattedItems // All items flat
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create invoice (supports both legacy items and new package-based)
router.post('/', authenticate, async (req, res) => {
  try {
    const { customer_id, recipient_id, items, packages, discount, notes, delivery_zone_id, delivery_fee, gift_message } = req.body;
    
    let subtotal = 0;
    let totalCost = 0;
    let totalPackagingCost = 0;
    
    // Calculate totals from packages if provided
    if (packages && packages.length > 0) {
      packages.forEach(pkg => {
        subtotal += parseFloat(pkg.package_price) || 0;
        totalPackagingCost += parseFloat(pkg.packaging_cost) || 0;
        // Sum up item costs
        (pkg.items || []).forEach(item => {
          totalCost += (parseFloat(item.cost_price) || 0) * (item.quantity || 1);
        });
      });
      totalCost += totalPackagingCost;
    } else if (items && items.length > 0) {
      // Legacy: calculate from items directly
      subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      totalCost = items.reduce((sum, item) => sum + ((item.cost_price || 0) * item.quantity), 0);
    }
    
    const total = subtotal - (discount || 0) + (delivery_fee || 0);
    const profit = total - totalCost - (delivery_fee || 0); // Exclude delivery fee from profit calc
    const profitMargin = total > 0 ? (profit / total) * 100 : 0;
    const markupPercentage = totalCost > 0 ? (profit / totalCost) * 100 : 0;
    
    const invoice_number = await generateInvoiceNumber();
    
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        invoice_number,
        customer_id,
        recipient_id: recipient_id || null,
        subtotal,
        discount: discount || 0,
        total,
        total_cost: totalCost,
        total_packaging_cost: totalPackagingCost,
        profit_margin: profitMargin,
        markup_percentage: markupPercentage,
        notes,
        delivery_zone_id: delivery_zone_id || null,
        delivery_fee: delivery_fee || 0,
        gift_message: gift_message || null,
        order_status: 'received'
      })
      .select()
      .single();
    
    if (invoiceError) throw invoiceError;
    
    // Insert packages and their items
    if (packages && packages.length > 0) {
      for (const pkg of packages) {
        const { data: packageData, error: pkgError } = await supabase
          .from('invoice_packages')
          .insert({
            invoice_id: invoice.id,
            package_name: pkg.package_name,
            package_price: pkg.package_price,
            packaging_cost: pkg.packaging_cost || 0,
            notes: pkg.notes || null
          })
          .select()
          .single();
        
        if (pkgError) throw pkgError;
        
        // Insert items for this package
        if (pkg.items && pkg.items.length > 0) {
          const packageItems = pkg.items.map(item => ({
            invoice_id: invoice.id,
            package_id: packageData.id,
            product_id: item.product_id || null,
            category_id: item.category_id || null,
            vendor_id: item.vendor_id || null,
            description: item.description,
            quantity: item.quantity || 1,
            unit_price: item.unit_price || 0,
            cost_price: item.cost_price || 0,
            total: (item.quantity || 1) * (item.unit_price || 0)
          }));
          
          await supabase.from('invoice_items').insert(packageItems);
        }
      }
    } else if (items && items.length > 0) {
      // Legacy: insert items without package
      const invoiceItems = items.map(item => ({
        invoice_id: invoice.id,
        package_id: null,
        product_id: item.product_id || null,
        category_id: item.category_id || null,
        vendor_id: item.vendor_id || null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        cost_price: item.cost_price || 0,
        total: item.quantity * item.unit_price
      }));
      
      await supabase.from('invoice_items').insert(invoiceItems);
    }
    
    res.json({ id: invoice.id, invoice_number });
  } catch (err) {
    console.error('Invoice creation error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update order status
router.patch('/:id/order-status', authenticate, async (req, res) => {
  try {
    const { order_status } = req.body;
    
    const updates = { order_status };
    if (order_status === 'dispatched') {
      updates.dispatched_at = new Date().toISOString();
    } else if (order_status === 'delivered') {
      updates.delivered_at = new Date().toISOString();
    }
    
    await supabase.from('invoices').update(updates).eq('id', req.params.id);
    res.json({ message: 'Order status updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload delivery photo
router.post('/:id/photos', authenticate, async (req, res) => {
  try {
    const { photo_url, caption } = req.body;
    
    const { data, error } = await supabase
      .from('delivery_photos')
      .insert({
        invoice_id: req.params.id,
        photo_url,
        caption
      })
      .select()
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get delivery photos
router.get('/:id/photos', authenticate, async (req, res) => {
  try {
    const { data } = await supabase
      .from('delivery_photos')
      .select('*')
      .eq('invoice_id', req.params.id)
      .order('uploaded_at', { ascending: false });
    
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update invoice status
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    
    const updates = { status };
    if (status === 'paid') {
      updates.paid_at = new Date().toISOString();
    } else {
      updates.paid_at = null;
    }
    
    await supabase.from('invoices').update(updates).eq('id', req.params.id);
    res.json({ message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete invoice
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await supabase.from('invoices').delete().eq('id', req.params.id);
    res.json({ message: 'Invoice deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Generate PDF
router.get('/:id/pdf', authenticate, async (req, res) => {
  try {
    const { data: invoice } = await supabase
      .from('invoices')
      .select(`
        *,
        customers (name, whatsapp, country),
        recipients (name, phone, address)
      `)
      .eq('id', req.params.id)
      .single();
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    const { data: items } = await supabase
      .from('invoice_items')
      .select(`*, categories (name)`)
      .eq('invoice_id', req.params.id);
    
    const { data: settingsData } = await supabase.from('settings').select('*');
    const settings = {};
    (settingsData || []).forEach(row => { settings[row.key] = row.value; });
    
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${invoice.invoice_number}.pdf"`);
    
    doc.pipe(res);
    
    // Logo
    const logoPath = path.join(__dirname, '..', '..', 'uploads', 'logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 45, { width: 80 });
    }
    
    // Parse phone numbers
    let phoneNumbers = [];
    try { phoneNumbers = JSON.parse(settings.phone_numbers || '[]'); } catch {}
    
    // Header
    doc.fontSize(20).text(settings.business_name || 'Mathaka Gift Store', 150, 50);
    doc.fontSize(10).text(settings.business_address || '', 150, 75);
    
    // Show phone numbers
    let headerY = 90;
    if (phoneNumbers.length > 0) {
      phoneNumbers.forEach(phone => {
        doc.text(`${phone.label}: ${phone.number}`, 150, headerY);
        headerY += 12;
      });
    }
    if (settings.business_email) {
      doc.text(settings.business_email, 150, headerY);
    }
    
    // Invoice title
    doc.fontSize(24).text('INVOICE', 400, 50, { align: 'right' });
    doc.fontSize(12).text(invoice.invoice_number, 400, 80, { align: 'right' });
    doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 400, 95, { align: 'right' });
    doc.text(`Status: ${invoice.status.toUpperCase()}`, 400, 110, { align: 'right' });
    
    doc.moveTo(50, 140).lineTo(550, 140).stroke();
    
    // Bill To
    doc.fontSize(12).text('Bill To:', 50, 160);
    doc.fontSize(10).text(invoice.customers?.name || '', 50, 180);
    doc.text(`WhatsApp: ${invoice.customers?.whatsapp || ''}`, 50, 195);
    if (invoice.customers?.country) doc.text(`Country: ${invoice.customers.country}`, 50, 210);
    
    // Deliver To
    if (invoice.recipients?.name) {
      doc.fontSize(12).text('Deliver To:', 300, 160);
      doc.fontSize(10).text(invoice.recipients.name, 300, 180);
      if (invoice.recipients.phone) doc.text(`Phone: ${invoice.recipients.phone}`, 300, 195);
      if (invoice.recipients.address) doc.text(invoice.recipients.address, 300, 210, { width: 200 });
    }
    
    // Items table
    let y = 260;
    doc.fontSize(10);
    doc.text('Description', 50, y);
    doc.text('Category', 220, y);
    doc.text('Qty', 320, y);
    doc.text('Price', 370, y);
    doc.text('Total', 450, y, { align: 'right', width: 100 });
    
    doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke();
    y += 25;
    
    const currency = settings.currency || 'Rs.';
    
    for (const item of (items || [])) {
      doc.text(item.description, 50, y, { width: 160 });
      doc.text(item.categories?.name || '-', 220, y);
      doc.text(item.quantity.toString(), 320, y);
      doc.text(`${currency} ${parseFloat(item.unit_price).toFixed(2)}`, 370, y);
      doc.text(`${currency} ${parseFloat(item.total).toFixed(2)}`, 450, y, { align: 'right', width: 100 });
      y += 20;
    }
    
    doc.moveTo(50, y).lineTo(550, y).stroke();
    y += 15;
    
    // Totals
    doc.text('Subtotal:', 370, y);
    doc.text(`${currency} ${parseFloat(invoice.subtotal).toFixed(2)}`, 450, y, { align: 'right', width: 100 });
    y += 15;
    
    if (invoice.discount > 0) {
      doc.text('Discount:', 370, y);
      doc.text(`- ${currency} ${parseFloat(invoice.discount).toFixed(2)}`, 450, y, { align: 'right', width: 100 });
      y += 15;
    }
    
    doc.fontSize(12).text('Total:', 370, y);
    doc.text(`${currency} ${parseFloat(invoice.total).toFixed(2)}`, 450, y, { align: 'right', width: 100 });
    
    // Bank details
    let bankAccounts = [];
    try { bankAccounts = JSON.parse(settings.bank_accounts || '[]'); } catch {}
    
    if (bankAccounts.length > 0) {
      y += 40;
      doc.fontSize(12).text('Bank Details:', 50, y);
      doc.fontSize(10);
      y += 20;
      
      bankAccounts.forEach((account, index) => {
        if (index > 0) y += 10; // Space between accounts
        doc.text(`Bank: ${account.bank_name || ''}`, 50, y);
        doc.text(`Account Name: ${account.account_name || ''}`, 50, y + 12);
        doc.text(`Account Number: ${account.account_number || ''}`, 50, y + 24);
        doc.text(`Branch: ${account.branch || ''}`, 50, y + 36);
        y += 48;
      });
    }
    
    // Notes
    if (invoice.notes) {
      y += 80;
      doc.fontSize(10).text('Notes:', 50, y);
      doc.text(invoice.notes, 50, y + 15, { width: 500 });
    }
    
    // Footer
    doc.fontSize(8).text('Thank you for your business!', 50, 750, { align: 'center', width: 500 });
    
    doc.end();
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
