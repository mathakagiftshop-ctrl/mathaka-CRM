import { Router } from 'express';
import supabase from '../database.js';
import { authenticate, adminOnly } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, 'logo.png')
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images allowed'));
    }
  }
});

// Get all settings
router.get('/', authenticate, async (req, res) => {
  try {
    const { data } = await supabase.from('settings').select('*');
    
    const settings = {};
    (data || []).forEach(row => { settings[row.key] = row.value; });
    
    // Check if logo exists
    const logoPath = path.join(uploadsDir, 'logo.png');
    settings.logo_exists = fs.existsSync(logoPath);
    
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update settings (admin only)
router.put('/', authenticate, adminOnly, async (req, res) => {
  try {
    const updates = req.body;
    
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'logo_exists') {
        await supabase
          .from('settings')
          .upsert({ key, value }, { onConflict: 'key' });
      }
    }
    
    res.json({ message: 'Settings updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload logo (admin only)
router.post('/logo', authenticate, adminOnly, upload.single('logo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({ message: 'Logo uploaded successfully' });
});

// Get logo
router.get('/logo', (req, res) => {
  const logoPath = path.join(uploadsDir, 'logo.png');
  if (fs.existsSync(logoPath)) {
    res.sendFile(logoPath);
  } else {
    res.status(404).json({ error: 'Logo not found' });
  }
});

export default router;
