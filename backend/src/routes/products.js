import { Router } from 'express';
import supabase from '../database.js';
import { authenticate, adminOnly } from '../middleware/auth.js';

const router = Router();

// Get all products
router.get('/', authenticate, async (req, res) => {
  try {
    const { data } = await supabase
      .from('products')
      .select(`*, categories (name)`)
      .eq('is_active', true)
      .order('name');
    
    const products = (data || []).map(p => ({
      ...p,
      category_name: p.categories?.name
    }));
    
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create product
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, category_id, price } = req.body;
    
    const { data, error } = await supabase
      .from('products')
      .insert({ name, description, category_id, price })
      .select()
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update product
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, description, category_id, price, is_active } = req.body;
    
    const { data, error } = await supabase
      .from('products')
      .update({ name, description, category_id, price, is_active })
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete product
router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    await supabase.from('products').update({ is_active: false }).eq('id', req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
