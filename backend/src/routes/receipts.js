import { Router } from 'express';
import supabase from '../database.js';
import { authenticate } from '../middleware/auth.js';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

// Generate receipt number
async function generateReceiptNumber() {
  const { data: prefixSetting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'receipt_prefix')
    .single();
  
  const prefix = prefixSetting?.value || 'RCP';
  const year = new Date().getFullYear();
  
  const { data: lastReceipt } = await supabase
    .from('receipts')
    .select('receipt_number')
    .like('receipt_number', `${prefix}-${year}-%`)
    .order('id', { ascending: false })
    .limit(1)
    .single();
  
  let nextNum = 1;
  if (lastReceipt) {
    const parts = lastReceipt.receipt_number.split('-');
    nextNum = parseInt(parts[2]) + 1;
  }
  
  return `${prefix}-${year}-${String(nextNum).padStart(4, '0')}`;
}

// Get all receipts
router.get('/', authenticate, async (req, res) => {
  try {
    const { data } = await supabase
      .from('receipts')
      .select(`
        *,
        invoices (
          invoice_number,
          customers (name)
        )
      `)
      .order('created_at', { ascending: false });
    
    const receipts = (data || []).map(r => ({
      ...r,
      invoice_number: r.invoices?.invoice_number,
      customer_name: r.invoices?.customers?.name
    }));
    
    res.json(receipts);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get receipt by invoice
router.get('/invoice/:invoiceId', authenticate, async (req, res) => {
  try {
    const { data } = await supabase
      .from('receipts')
      .select(`*, invoices (invoice_number)`)
      .eq('invoice_id', req.params.invoiceId)
      .single();
    
    if (data) {
      data.invoice_number = data.invoices?.invoice_number;
    }
    
    res.json(data || null);
  } catch (err) {
    res.json(null);
  }
});

// Create receipt (marks invoice as paid)
router.post('/', authenticate, async (req, res) => {
  try {
    const { invoice_id, payment_method, notes } = req.body;
    
    const { data: invoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoice_id)
      .single();
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // Check if receipt already exists
    const { data: existingReceipt } = await supabase
      .from('receipts')
      .select('id')
      .eq('invoice_id', invoice_id)
      .single();
    
    if (existingReceipt) {
      return res.status(400).json({ error: 'Receipt already exists for this invoice' });
    }
    
    const receipt_number = await generateReceiptNumber();
    
    const { data: receipt, error } = await supabase
      .from('receipts')
      .insert({
        receipt_number,
        invoice_id,
        amount: invoice.total,
        payment_method: payment_method || 'bank_transfer',
        notes
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Mark invoice as paid
    await supabase
      .from('invoices')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', invoice_id);
    
    res.json({ id: receipt.id, receipt_number });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Generate Receipt PDF
router.get('/:id/pdf', authenticate, async (req, res) => {
  try {
    const { data: receipt } = await supabase
      .from('receipts')
      .select(`
        *,
        invoices (
          invoice_number, subtotal, discount, total,
          customers (name, whatsapp, country),
          recipients (name, phone, address)
        )
      `)
      .eq('id', req.params.id)
      .single();
    
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }
    
    const { data: items } = await supabase
      .from('invoice_items')
      .select(`*, categories (name)`)
      .eq('invoice_id', receipt.invoice_id);
    
    const { data: settingsData } = await supabase.from('settings').select('*');
    const settings = {};
    (settingsData || []).forEach(row => { settings[row.key] = row.value; });
    
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${receipt.receipt_number}.pdf"`);
    
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
    
    // Receipt title
    doc.fontSize(24).text('RECEIPT', 400, 50, { align: 'right' });
    doc.fontSize(12).text(receipt.receipt_number, 400, 80, { align: 'right' });
    doc.text(`Date: ${new Date(receipt.created_at).toLocaleDateString()}`, 400, 95, { align: 'right' });
    doc.fontSize(10).fillColor('green').text('PAID', 400, 115, { align: 'right' });
    doc.fillColor('black');
    
    doc.moveTo(50, 140).lineTo(550, 140).stroke();
    
    // Customer info
    doc.fontSize(12).text('Received From:', 50, 160);
    doc.fontSize(10).text(receipt.invoices?.customers?.name || '', 50, 180);
    doc.text(`WhatsApp: ${receipt.invoices?.customers?.whatsapp || ''}`, 50, 195);
    
    // Invoice reference
    doc.fontSize(12).text('For Invoice:', 300, 160);
    doc.fontSize(10).text(receipt.invoices?.invoice_number || '', 300, 180);
    
    // Items
    let y = 230;
    doc.fontSize(10);
    doc.text('Description', 50, y);
    doc.text('Qty', 350, y);
    doc.text('Amount', 450, y, { align: 'right', width: 100 });
    
    doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke();
    y += 25;
    
    const currency = settings.currency || 'Rs.';
    
    for (const item of (items || [])) {
      doc.text(item.description, 50, y, { width: 280 });
      doc.text(item.quantity.toString(), 350, y);
      doc.text(`${currency} ${parseFloat(item.total).toFixed(2)}`, 450, y, { align: 'right', width: 100 });
      y += 20;
    }
    
    doc.moveTo(50, y).lineTo(550, y).stroke();
    y += 15;
    
    // Totals
    const subtotal = receipt.invoices?.subtotal || 0;
    const discount = receipt.invoices?.discount || 0;
    
    doc.text('Subtotal:', 370, y);
    doc.text(`${currency} ${parseFloat(subtotal).toFixed(2)}`, 450, y, { align: 'right', width: 100 });
    y += 15;
    
    if (discount > 0) {
      doc.text('Discount:', 370, y);
      doc.text(`- ${currency} ${parseFloat(discount).toFixed(2)}`, 450, y, { align: 'right', width: 100 });
      y += 15;
    }
    
    doc.fontSize(12).text('Amount Paid:', 370, y);
    doc.text(`${currency} ${parseFloat(receipt.amount).toFixed(2)}`, 450, y, { align: 'right', width: 100 });
    
    y += 30;
    doc.fontSize(10).text(`Payment Method: ${receipt.payment_method === 'bank_transfer' ? 'Bank Transfer' : receipt.payment_method}`, 50, y);
    
    // Notes
    if (receipt.notes) {
      y += 30;
      doc.text('Notes:', 50, y);
      doc.text(receipt.notes, 50, y + 15, { width: 500 });
    }
    
    // Footer
    doc.fontSize(8).text('Thank you for your business!', 50, 750, { align: 'center', width: 500 });
    
    doc.end();
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
