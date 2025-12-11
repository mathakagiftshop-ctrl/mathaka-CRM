import { Router } from 'express';
import supabase from '../database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Sales report
router.get('/sales', authenticate, async (req, res) => {
  try {
    const { period = 'month' } = req.query; // month, year, all
    
    const { data: invoices } = await supabase
      .from('invoices')
      .select(`
        id, total, status, created_at, paid_at,
        customers (name, country),
        invoice_items (category_id, total, categories (name))
      `)
      .eq('status', 'paid');
    
    // Group by month
    const monthlyData = {};
    (invoices || []).forEach(inv => {
      const month = inv.paid_at ? inv.paid_at.substring(0, 7) : inv.created_at.substring(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { revenue: 0, orders: 0 };
      }
      monthlyData[month].revenue += parseFloat(inv.total);
      monthlyData[month].orders += 1;
    });
    
    // Category breakdown
    const categoryData = {};
    (invoices || []).forEach(inv => {
      (inv.invoice_items || []).forEach(item => {
        const catName = item.categories?.name || 'Other';
        if (!categoryData[catName]) categoryData[catName] = 0;
        categoryData[catName] += parseFloat(item.total);
      });
    });
    
    // Country breakdown
    const countryData = {};
    (invoices || []).forEach(inv => {
      const country = inv.customers?.country || 'Unknown';
      if (!countryData[country]) countryData[country] = { revenue: 0, orders: 0 };
      countryData[country].revenue += parseFloat(inv.total);
      countryData[country].orders += 1;
    });
    
    // Top customers
    const customerData = {};
    (invoices || []).forEach(inv => {
      const name = inv.customers?.name || 'Unknown';
      if (!customerData[name]) customerData[name] = { revenue: 0, orders: 0 };
      customerData[name].revenue += parseFloat(inv.total);
      customerData[name].orders += 1;
    });
    
    const topCustomers = Object.entries(customerData)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    
    res.json({
      monthly: Object.entries(monthlyData)
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => a.month.localeCompare(b.month)),
      byCategory: Object.entries(categoryData)
        .map(([name, revenue]) => ({ name, revenue }))
        .sort((a, b) => b.revenue - a.revenue),
      byCountry: Object.entries(countryData)
        .map(([country, data]) => ({ country, ...data }))
        .sort((a, b) => b.revenue - a.revenue),
      topCustomers
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Inactive customers (haven't ordered in X days)
router.get('/inactive-customers', authenticate, async (req, res) => {
  try {
    const { days = 90 } = req.query;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
    
    const { data: customers } = await supabase
      .from('customers')
      .select('id, name, whatsapp, country, created_at');
    
    const { data: invoices } = await supabase
      .from('invoices')
      .select('customer_id, created_at')
      .order('created_at', { ascending: false });
    
    // Find last order date for each customer
    const lastOrderMap = {};
    (invoices || []).forEach(inv => {
      if (!lastOrderMap[inv.customer_id] || inv.created_at > lastOrderMap[inv.customer_id]) {
        lastOrderMap[inv.customer_id] = inv.created_at;
      }
    });
    
    const inactiveCustomers = (customers || [])
      .map(c => ({
        ...c,
        last_order: lastOrderMap[c.id] || null,
        days_inactive: lastOrderMap[c.id] 
          ? Math.floor((new Date() - new Date(lastOrderMap[c.id])) / (1000 * 60 * 60 * 24))
          : Math.floor((new Date() - new Date(c.created_at)) / (1000 * 60 * 60 * 24))
      }))
      .filter(c => !lastOrderMap[c.id] || new Date(lastOrderMap[c.id]) < cutoffDate)
      .sort((a, b) => b.days_inactive - a.days_inactive);
    
    res.json(inactiveCustomers);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
