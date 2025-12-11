import { Router } from 'express';
import supabase from '../database.js';
import { authenticate, adminOnly } from '../middleware/auth.js';

const router = Router();

// Get all vendors
router.get('/', authenticate, async (req, res) => {
  try {
    const { data } = await supabase
      .from('vendors')
      .select('*')
      .order('name');
    
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single vendor
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { data } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (!data) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create vendor
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, phone, address, notes } = req.body;
    
    const { data, error } = await supabase
      .from('vendors')
      .insert({ name, phone, address, notes })
      .select()
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update vendor
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, phone, address, notes } = req.body;
    
    const { data, error } = await supabase
      .from('vendors')
      .update({ name, phone, address, notes })
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete vendor (admin only)
router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    await supabase.from('vendors').delete().eq('id', req.params.id);
    res.json({ message: 'Vendor deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
