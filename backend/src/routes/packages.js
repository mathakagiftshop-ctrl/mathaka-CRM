import { Router } from 'express';
import supabase from '../database.js';
import { authenticate, adminOnly } from '../middleware/auth.js';

const router = Router();

// Get all packages
router.get('/', authenticate, async (req, res) => {
  try {
    const { data: packages } = await supabase
      .from('gift_packages')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    // Get items for each package
    const packagesWithItems = await Promise.all((packages || []).map(async (pkg) => {
      const { data: items } = await supabase
        .from('gift_package_items')
        .select(`*, products (name)`)
        .eq('package_id', pkg.id);
      
      return { ...pkg, items: items || [] };
    }));
    
    res.json(packagesWithItems);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single package
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { data: pkg } = await supabase
      .from('gift_packages')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (!pkg) return res.status(404).json({ error: 'Package not found' });
    
    const { data: items } = await supabase
      .from('gift_package_items')
      .select(`*, products (name)`)
      .eq('package_id', pkg.id);
    
    res.json({ ...pkg, items: items || [] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create package
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, total_price, items } = req.body;
    
    const { data: pkg, error } = await supabase
      .from('gift_packages')
      .insert({ name, description, total_price })
      .select()
      .single();
    
    if (error) throw error;
    
    if (items && items.length > 0) {
      const packageItems = items.map(item => ({
        package_id: pkg.id,
        product_id: item.product_id || null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price
      }));
      
      await supabase.from('gift_package_items').insert(packageItems);
    }
    
    res.json(pkg);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete package
router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    await supabase.from('gift_packages').update({ is_active: false }).eq('id', req.params.id);
    res.json({ message: 'Package deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
