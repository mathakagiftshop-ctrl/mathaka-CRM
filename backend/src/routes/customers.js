import { Router } from 'express';
import supabase from '../database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Get all customers
router.get('/', authenticate, async (req, res) => {
  try {
    const { search } = req.query;
    
    let query = supabase.from('customers').select('*');
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,whatsapp.ilike.%${search}%`);
    }
    
    const { data: customers } = await query.order('created_at', { ascending: false });
    
    // Get counts for each customer
    const customersWithCounts = await Promise.all((customers || []).map(async (c) => {
      const { count: recipient_count } = await supabase
        .from('recipients')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', c.id);
      
      const { count: invoice_count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', c.id);
      
      return { ...c, recipient_count, invoice_count };
    }));
    
    res.json(customersWithCounts);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single customer with recipients and dates
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    const { data: recipients } = await supabase
      .from('recipients')
      .select('*')
      .eq('customer_id', req.params.id);
    
    const { data: importantDates } = await supabase
      .from('important_dates')
      .select('*')
      .eq('customer_id', req.params.id);
    
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id, invoice_number, total, status, created_at')
      .eq('customer_id', req.params.id)
      .order('created_at', { ascending: false });
    
    res.json({ ...customer, recipients: recipients || [], importantDates: importantDates || [], invoices: invoices || [] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create customer
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, whatsapp, country, notes } = req.body;
    
    const { data, error } = await supabase
      .from('customers')
      .insert({ name, whatsapp, country, notes })
      .select()
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update customer
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, whatsapp, country, notes } = req.body;
    
    const { data, error } = await supabase
      .from('customers')
      .update({ name, whatsapp, country, notes, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete customer
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await supabase.from('customers').delete().eq('id', req.params.id);
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
