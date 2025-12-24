import { Router } from 'express';
import supabase from '../database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Get all expenses
router.get('/', authenticate, async (req, res) => {
  try {
    const { month, year, vendor_id } = req.query;

    let query = supabase
      .from('expenses')
      .select(`
        *,
        vendors (name),
        invoices (invoice_number),
        users (name)
      `)
      .order('expense_date', { ascending: false });

    if (vendor_id) query = query.eq('vendor_id', vendor_id);

    const { data } = await query;

    const expenses = (data || []).map(e => ({
      ...e,
      vendor_name: e.vendors?.name,
      invoice_number: e.invoices?.invoice_number,
      created_by_name: e.users?.name
    }));

    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get expense summary
router.get('/summary', authenticate, async (req, res) => {
  try {
    const { data: expenses } = await supabase.from('expenses').select('amount, expense_date');

    // Use amount_paid for revenue (includes partial payments)
    const { data: invoices } = await supabase
      .from('invoices')
      .select('amount_paid, status')
      .in('status', ['paid', 'partial']);

    // Get payments for accurate monthly revenue calculation
    const { data: payments } = await supabase
      .from('payments')
      .select('amount, payment_date');

    const totalExpenses = (expenses || []).reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const totalRevenue = (invoices || []).reduce((sum, i) => sum + (parseFloat(i.amount_paid) || 0), 0);
    const profit = totalRevenue - totalExpenses;

    // This month calculations
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const thisMonthExpenses = (expenses || [])
      .filter(e => e.expense_date >= startOfMonth.split('T')[0])
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);

    // Use payments table for accurate monthly revenue
    const thisMonthRevenue = (payments || [])
      .filter(p => p.payment_date >= startOfMonth)
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    res.json({
      totalExpenses,
      totalRevenue,
      profit,
      profitMargin: totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(1) : 0,
      thisMonthExpenses,
      thisMonthRevenue,
      thisMonthProfit: thisMonthRevenue - thisMonthExpenses
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create expense
router.post('/', authenticate, async (req, res) => {
  try {
    const { invoice_id, vendor_id, description, amount, expense_date, notes } = req.body;

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        invoice_id: invoice_id || null,
        vendor_id: vendor_id || null,
        description,
        amount,
        expense_date: expense_date || new Date().toISOString().split('T')[0],
        notes,
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update expense
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { vendor_id, description, amount, expense_date, notes } = req.body;

    const { data, error } = await supabase
      .from('expenses')
      .update({ vendor_id, description, amount, expense_date, notes })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete expense
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await supabase.from('expenses').delete().eq('id', req.params.id);
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
