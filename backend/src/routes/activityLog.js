import { Router } from 'express';
import supabase from '../database.js';
import { authenticate, adminOnly } from '../middleware/auth.js';

const router = Router();

// Get activity log
router.get('/', authenticate, adminOnly, async (req, res) => {
  try {
    const { limit = 50, user_id, entity_type } = req.query;
    
    let query = supabase
      .from('activity_log')
      .select(`*, users (name, username)`)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));
    
    if (user_id) query = query.eq('user_id', user_id);
    if (entity_type) query = query.eq('entity_type', entity_type);
    
    const { data } = await query;
    
    const logs = (data || []).map(log => ({
      ...log,
      user_name: log.users?.name,
      username: log.users?.username
    }));
    
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

// Helper function to log activity (export for use in other routes)
export async function logActivity(userId, action, entityType, entityId, details = {}) {
  try {
    await supabase.from('activity_log').insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}
