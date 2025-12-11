import { Router } from 'express';
import supabase from '../database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Get recipients for a customer
router.get('/customer/:customerId', authenticate, async (req, res) => {
  try {
    const { data } = await supabase
      .from('recipients')
      .select('*')
      .eq('customer_id', req.params.customerId);
    
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create recipient
router.post('/', authenticate, async (req, res) => {
  try {
    const { customer_id, name, phone, address, relationship } = req.body;
    
    const { data, error } = await supabase
      .from('recipients')
      .insert({ customer_id, name, phone, address, relationship })
      .select()
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update recipient
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, phone, address, relationship } = req.body;
    
    const { data, error } = await supabase
      .from('recipients')
      .update({ name, phone, address, relationship })
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete recipient
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await supabase.from('recipients').delete().eq('id', req.params.id);
    res.json({ message: 'Recipient deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
