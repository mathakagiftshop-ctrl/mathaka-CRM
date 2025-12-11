import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import customerRoutes from './routes/customers.js';
import recipientRoutes from './routes/recipients.js';
import categoryRoutes from './routes/categories.js';
import vendorRoutes from './routes/vendors.js';
import invoiceRoutes from './routes/invoices.js';
import receiptRoutes from './routes/receipts.js';
import settingsRoutes from './routes/settings.js';
import dashboardRoutes from './routes/dashboard.js';
import importantDatesRoutes from './routes/importantDates.js';
import productRoutes from './routes/products.js';
import deliveryZoneRoutes from './routes/deliveryZones.js';
import packageRoutes from './routes/packages.js';
import expenseRoutes from './routes/expenses.js';
import activityLogRoutes from './routes/activityLog.js';
import reportRoutes from './routes/reports.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/recipients', recipientRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/important-dates', importantDatesRoutes);
app.use('/api/products', productRoutes);
app.use('/api/delivery-zones', deliveryZoneRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/activity-log', activityLogRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Mathaka CRM API running on http://localhost:${PORT}`);
});
