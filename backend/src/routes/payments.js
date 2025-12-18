import { Router } from 'express';
import supabase from '../database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Get all payments for an invoice
router.get('/invoice/:invoiceId', authenticate, async (req, res) => {
  try {
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', req.params.invoiceId)
      .order('payment_date', { ascending: false });
    
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add a payment (advance or partial)
router.post('/', authenticate, async (req, res) => {
  try {
    const { invoice_id, amount, payment_method, notes } = req.body;
    
    // Get invoice to validate
    const { data: invoice } = await supabase
      .from('invoices')
      .select('total, amount_paid, status')
      .eq('id', invoice_id)
      .single();
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    if (invoice.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot add payment to cancelled invoice' });
    }
    
    const currentPaid = parseFloat(invoice.amount_paid) || 0;
    const total = parseFloat(invoice.total);
    const paymentAmount = parseFloat(amount);
    const newTotal = currentPaid + paymentAmount;
    
    if (newTotal > total) {
      return res.status(400).json({ 
        error: `Payment exceeds balance. Maximum payment: Rs. ${(total - currentPaid).toFixed(2)}` 
      });
    }
    
    // Insert payment
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        invoice_id,
        amount: paymentAmount,
        payment_method: payment_method || 'bank_transfer',
        notes,
        created_by: req.user?.id
      })
      .select()
      .single();
    
    if (error) throw error;
    
    let receipt_number = null;
    
    // Check if fully paid and update status
    if (newTotal >= total) {
      await supabase
        .from('invoices')
        .update({ 
          status: 'paid', 
          paid_at: new Date().toISOString(),
          amount_paid: newTotal
        })
        .eq('id', invoice_id);
      
      // Auto-generate receipt when fully paid
      const { data: existing } = await supabase
        .from('receipts')
        .select('id')
        .eq('invoice_id', invoice_id)
        .single();
      
      if (!existing) {
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
        receipt_number = `${prefix}-${year}-${String(nextNum).padStart(4, '0')}`;
        await supabase.from('receipts').insert({
          receipt_number,
          invoice_id,
          amount: total,
          payment_method: payment_method || 'bank_transfer',
          notes: 'Auto-generated on full payment'
        });
      }
    } else {
      // Update amount_paid (trigger should do this, but let's be safe)
      await supabase
        .from('invoices')
        .update({ amount_paid: newTotal })
        .eq('id', invoice_id);
    }
    
    res.json({ 
      id: payment.id, 
      amount_paid: newTotal,
      balance: total - newTotal,
      is_fully_paid: newTotal >= total,
      receipt_number
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a payment
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { data: payment } = await supabase
      .from('payments')
      .select('invoice_id, amount')
      .eq('id', req.params.id)
      .single();
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    // Delete the payment
    await supabase.from('payments').delete().eq('id', req.params.id);
    
    // Get updated total and revert status if needed
    const { data: invoice } = await supabase
      .from('invoices')
      .select('total, amount_paid, status')
      .eq('id', payment.invoice_id)
      .single();
    
    const newPaid = (parseFloat(invoice.amount_paid) || 0) - parseFloat(payment.amount);
    
    // If was fully paid, revert to pending
    if (invoice.status === 'paid' && newPaid < parseFloat(invoice.total)) {
      await supabase
        .from('invoices')
        .update({ status: 'pending', paid_at: null, amount_paid: newPaid })
        .eq('id', payment.invoice_id);
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
