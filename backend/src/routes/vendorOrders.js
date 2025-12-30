import { Router } from 'express';
import supabase from '../database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Get all vendor orders with filters
router.get('/', authenticate, async (req, res) => {
  try {
    const { vendor_id, invoice_id, status } = req.query;

    let query = supabase
      .from('vendor_orders')
      .select(`
        *,
        vendors (id, name, phone),
        invoices (id, invoice_number, customer_id, customers (name)),
        users (name)
      `)
      .order('created_at', { ascending: false });

    if (vendor_id) query = query.eq('vendor_id', vendor_id);
    if (invoice_id) query = query.eq('invoice_id', invoice_id);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    const orders = (data || []).map(o => ({
      ...o,
      vendor_name: o.vendors?.name,
      vendor_phone: o.vendors?.phone,
      invoice_number: o.invoices?.invoice_number,
      customer_name: o.invoices?.customers?.name,
      created_by_name: o.users?.name,
      balance_due: parseFloat(o.total_amount) - parseFloat(o.amount_paid || 0)
    }));

    res.json(orders);
  } catch (err) {
    console.error('Error fetching vendor orders:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single vendor order with payments
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { data: order, error } = await supabase
      .from('vendor_orders')
      .select(`
        *,
        vendors (id, name, phone, address),
        invoices (id, invoice_number, customer_id, customers (name, whatsapp))
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !order) {
      return res.status(404).json({ error: 'Vendor order not found' });
    }

    // Get payments for this order
    const { data: payments } = await supabase
      .from('vendor_payments')
      .select('*, users (name)')
      .eq('vendor_order_id', req.params.id)
      .order('payment_date', { ascending: false });

    res.json({
      ...order,
      vendor_name: order.vendors?.name,
      vendor_phone: order.vendors?.phone,
      invoice_number: order.invoices?.invoice_number,
      customer_name: order.invoices?.customers?.name,
      payments: payments || [],
      balance_due: parseFloat(order.total_amount) - parseFloat(order.amount_paid || 0)
    });
  } catch (err) {
    console.error('Error fetching vendor order:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// Get vendor orders for a specific invoice
router.get('/invoice/:invoiceId', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_orders')
      .select(`
        *,
        vendors (id, name, phone)
      `)
      .eq('invoice_id', req.params.invoiceId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const orders = (data || []).map(o => ({
      ...o,
      vendor_name: o.vendors?.name,
      vendor_phone: o.vendors?.phone,
      balance_due: parseFloat(o.total_amount) - parseFloat(o.amount_paid || 0)
    }));

    res.json(orders);
  } catch (err) {
    console.error('Error fetching invoice vendor orders:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create vendor order (assign to vendor)
router.post('/', authenticate, async (req, res) => {
  try {
    const { invoice_id, vendor_id, description, total_amount, notes } = req.body;

    if (!invoice_id || !vendor_id || !description) {
      return res.status(400).json({ error: 'Invoice, vendor, and description are required' });
    }

    const { data, error } = await supabase
      .from('vendor_orders')
      .insert({
        invoice_id,
        vendor_id,
        description,
        total_amount: total_amount || 0,
        notes,
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error creating vendor order:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update vendor order
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { description, total_amount, notes, status } = req.body;

    const updateData = {
      description,
      total_amount,
      notes,
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('vendor_orders')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error updating vendor order:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update vendor order status
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;

    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('vendor_orders')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error updating vendor order status:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete vendor order
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await supabase.from('vendor_orders').delete().eq('id', req.params.id);
    res.json({ message: 'Vendor order deleted' });
  } catch (err) {
    console.error('Error deleting vendor order:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ VENDOR PAYMENTS ============

// Add payment to vendor order
router.post('/:id/payments', authenticate, async (req, res) => {
  try {
    const { amount, payment_type, payment_method, notes } = req.body;

    // Get vendor order to get vendor_id
    const { data: order } = await supabase
      .from('vendor_orders')
      .select('vendor_id, total_amount, amount_paid')
      .eq('id', req.params.id)
      .single();

    if (!order) {
      return res.status(404).json({ error: 'Vendor order not found' });
    }

    const { data, error } = await supabase
      .from('vendor_payments')
      .insert({
        vendor_order_id: parseInt(req.params.id),
        vendor_id: order.vendor_id,
        amount,
        payment_type: payment_type || 'advance',
        payment_method: payment_method || 'cash',
        notes,
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error adding vendor payment:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get payments for a vendor order
router.get('/:id/payments', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_payments')
      .select('*, users (name)')
      .eq('vendor_order_id', req.params.id)
      .order('payment_date', { ascending: false });

    if (error) throw error;

    const payments = (data || []).map(p => ({
      ...p,
      created_by_name: p.users?.name
    }));

    res.json(payments);
  } catch (err) {
    console.error('Error fetching vendor payments:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete vendor payment
router.delete('/payments/:paymentId', authenticate, async (req, res) => {
  try {
    await supabase.from('vendor_payments').delete().eq('id', req.params.paymentId);
    res.json({ message: 'Payment deleted' });
  } catch (err) {
    console.error('Error deleting vendor payment:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get vendor summary (total orders, payments, balance)
router.get('/vendor/:vendorId/summary', authenticate, async (req, res) => {
  try {
    const { data: orders } = await supabase
      .from('vendor_orders')
      .select('total_amount, amount_paid, status')
      .eq('vendor_id', req.params.vendorId);

    const summary = {
      total_orders: orders?.length || 0,
      pending_orders: orders?.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length || 0,
      completed_orders: orders?.filter(o => o.status === 'completed').length || 0,
      total_amount: orders?.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0) || 0,
      total_paid: orders?.reduce((sum, o) => sum + parseFloat(o.amount_paid || 0), 0) || 0,
      total_balance: orders?.reduce((sum, o) => sum + (parseFloat(o.total_amount || 0) - parseFloat(o.amount_paid || 0)), 0) || 0
    };

    res.json(summary);
  } catch (err) {
    console.error('Error fetching vendor summary:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
