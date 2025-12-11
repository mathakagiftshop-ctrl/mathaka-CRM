import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import supabase from '../database.js';
import { authenticate, adminOnly } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'mathaka-secret-key';

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error || !user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, username: user.username, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ 
      token, 
      user: { id: user.id, username: user.username, name: user.name, role: user.role } 
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// Change password
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();
    
    if (!bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', req.user.id);
    
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// List users (admin only)
router.get('/users', authenticate, adminOnly, async (req, res) => {
  try {
    const { data: users } = await supabase
      .from('users')
      .select('id, username, name, role, created_at')
      .order('created_at', { ascending: false });
    
    res.json(users || []);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create user (admin only)
router.post('/users', authenticate, adminOnly, async (req, res) => {
  try {
    const { username, password, name, role } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    const { data, error } = await supabase
      .from('users')
      .insert({ username, password: hashedPassword, name, role: role || 'staff' })
      .select('id, username, name, role')
      .single();
    
    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Username already exists' });
      }
      throw error;
    }
    
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user (admin only)
router.delete('/users/:id', authenticate, adminOnly, async (req, res) => {
  try {
    if (req.params.id == req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    
    await supabase.from('users').delete().eq('id', req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
