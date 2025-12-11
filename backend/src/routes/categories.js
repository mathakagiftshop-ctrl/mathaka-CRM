import { Router } from 'express';
import supabase from '../database.js';
import { authenticate, adminOnly } from '../middleware/auth.js';

const router = Router();

// Get all categories
router.get('/', authenticate, async (req, res) => {
  try {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create category (admin only)
router.post('/', authenticate, adminOnly, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const { data, error } = await supabase
      .from('categories')
      .insert({ name, description })
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Category already exists' });
      }
      throw error;
    }
    
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update category (admin only)
router.put('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const { data, error } = await supabase
      .from('categories')
      .update({ name, description })
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete category (admin only)
router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    await supabase.from('categories').delete().eq('id', req.params.id);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
