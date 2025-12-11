import { Router } from 'express';
import supabase from '../database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Get all important dates
router.get('/', authenticate, async (req, res) => {
  try {
    const { data } = await supabase
      .from('important_dates')
      .select(`
        *,
        customers (name, whatsapp),
        recipients (name)
      `)
      .order('date');
    
    const dates = (data || []).map(d => ({
      ...d,
      customer_name: d.customers?.name,
      customer_whatsapp: d.customers?.whatsapp,
      recipient_name: d.recipients?.name
    }));
    
    // Sort by month-day for yearly view
    dates.sort((a, b) => {
      const aMonthDay = a.date.substring(5);
      const bMonthDay = b.date.substring(5);
      return aMonthDay.localeCompare(bMonthDay);
    });
    
    res.json(dates);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get dates for a customer
router.get('/customer/:customerId', authenticate, async (req, res) => {
  try {
    const { data } = await supabase
      .from('important_dates')
      .select(`*, recipients (name)`)
      .eq('customer_id', req.params.customerId)
      .order('date');
    
    const dates = (data || []).map(d => ({
      ...d,
      recipient_name: d.recipients?.name
    }));
    
    res.json(dates);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create important date
router.post('/', authenticate, async (req, res) => {
  try {
    const { customer_id, recipient_id, title, date, recurring, notes } = req.body;
    
    const { data, error } = await supabase
      .from('important_dates')
      .insert({
        customer_id,
        recipient_id: recipient_id || null,
        title,
        date,
        recurring: recurring !== false,
        notes
      })
      .select()
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update important date
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { recipient_id, title, date, recurring, notes } = req.body;
    
    const { data, error } = await supabase
      .from('important_dates')
      .update({
        recipient_id: recipient_id || null,
        title,
        date,
        recurring: recurring !== false,
        notes
      })
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete important date
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await supabase.from('important_dates').delete().eq('id', req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
