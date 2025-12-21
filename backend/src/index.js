import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Routes
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
import paymentRoutes from './routes/payments.js';
import aiRoutes from './routes/ai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Base middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Request logging (development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} | ${req.method} ${req.url}`);
    next();
  });
}

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
app.use('/api/payments', paymentRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler - must be after routes
app.use(notFoundHandler);

// Centralized error handler - must be last
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mathaka CRM API running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});
