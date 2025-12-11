import { Router } from 'express';
import supabase from '../database.js';
import { authenticate, adminOnly } from '../middleware/auth.js';

const router = Router();

// Get all zones
router.get('/', authenticate, async (req, res) => {
  try {
    const { data } = await supabase
      .from('delivery_zones')
      .select('*')
      .eq('is_active', true)
      .order('delivery_fee');
    
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create zone
router.post('/', authenticate, adminOnly, async (req, res) => {
  try {
    const { name, areas, delivery_fee } = req.body;
    
    const { data, error } = await supabase
      .from('delivery_zones')
      .insert({ name, areas, delivery_fee })
      .select()
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update zone
router.put('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const { name, areas, delivery_fee, is_active } = req.body;
    
    const { data, error } = await supabase
      .from('delivery_zones')
      .update({ name, areas, delivery_fee, is_active })
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete zone
router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    await supabase.from('delivery_zones').update({ is_active: false }).eq('id', req.params.id);
    res.json({ message: 'Zone deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
