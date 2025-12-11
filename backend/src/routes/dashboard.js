import { Router } from 'express';
import supabase from '../database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    // Total customers
    const { count: totalCustomers } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });
    
    // Total invoices
    const { count: totalInvoices } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true });
    
    // Pending invoices
    const { count: pendingInvoices } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    
    // Total revenue (paid invoices)
    const { data: revenueData } = await supabase
      .from('invoices')
      .select('total')
      .eq('status', 'paid');
    
    const totalRevenue = (revenueData || []).reduce((sum, inv) => sum + parseFloat(inv.total), 0);
    
    // This month's revenue
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const { data: monthRevenueData } = await supabase
      .from('invoices')
      .select('total')
      .eq('status', 'paid')
      .gte('paid_at', startOfMonth.toISOString());
    
    const thisMonthRevenue = (monthRevenueData || []).reduce((sum, inv) => sum + parseFloat(inv.total), 0);
    
    // Recent invoices
    const { data: recentInvoicesData } = await supabase
      .from('invoices')
      .select(`
        id, invoice_number, total, status, created_at,
        customers (name)
      `)
      .order('created_at', { ascending: false })
      .limit(5);
    
    const recentInvoices = (recentInvoicesData || []).map(inv => ({
      ...inv,
      customer_name: inv.customers?.name
    }));
    
    // Upcoming important dates (next 30 days)
    const today = new Date();
    const todayMonthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const futureMonthDay = `${String(futureDate.getMonth() + 1).padStart(2, '0')}-${String(futureDate.getDate()).padStart(2, '0')}`;
    
    const { data: allDates } = await supabase
      .from('important_dates')
      .select(`
        *,
        customers (name, whatsapp),
        recipients (name)
      `);
    
    // Filter dates that fall within next 30 days (by month-day)
    const upcomingDates = (allDates || [])
      .map(d => ({
        ...d,
        customer_name: d.customers?.name,
        customer_whatsapp: d.customers?.whatsapp,
        recipient_name: d.recipients?.name,
        monthDay: d.date.substring(5)
      }))
      .filter(d => {
        if (todayMonthDay <= futureMonthDay) {
          return d.monthDay >= todayMonthDay && d.monthDay <= futureMonthDay;
        } else {
          // Wraps around year end
          return d.monthDay >= todayMonthDay || d.monthDay <= futureMonthDay;
        }
      })
      .sort((a, b) => a.monthDay.localeCompare(b.monthDay))
      .slice(0, 10);
    
    res.json({
      totalCustomers: totalCustomers || 0,
      totalInvoices: totalInvoices || 0,
      pendingInvoices: pendingInvoices || 0,
      totalRevenue,
      thisMonthRevenue,
      recentInvoices,
      upcomingDates
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
