import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'mathaka-secret-key';

const supabase = createClient(supabaseUrl, supabaseKey);

// Auth helpers
function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
  } catch { return null; }
}

function json(res, data, status = 200) {
  res.status(status).json(data);
}

function error(res, msg, status = 500) {
  res.status(status).json({ error: msg });
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname.replace('/api', '');
  const segments = path.split('/').filter(Boolean);
  const method = req.method;

  try {
    // Health check
    if (path === '/health') return json(res, { status: 'ok' });

    // AUTH ROUTES
    if (segments[0] === 'auth') {
      if (segments[1] === 'login' && method === 'POST') {
        const { username, password } = req.body;
        const { data: user } = await supabase.from('users').select('*').eq('username', username).single();
        if (!user || !bcrypt.compareSync(password, user.password)) return error(res, 'Invalid credentials', 401);
        const token = jwt.sign({ id: user.id, username: user.username, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        return json(res, { token, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
      }
      if (segments[1] === 'me' && method === 'GET') {
        const user = verifyToken(req);
        if (!user) return error(res, 'Unauthorized', 401);
        return json(res, { user });
      }
      if (segments[1] === 'users' && method === 'GET') {
        const user = verifyToken(req);
        if (!user || user.role !== 'admin') return error(res, 'Forbidden', 403);
        const { data } = await supabase.from('users').select('id, username, name, role, created_at').order('created_at', { ascending: false });
        return json(res, data || []);
      }
      if (segments[1] === 'users' && method === 'POST') {
        const user = verifyToken(req);
        if (!user || user.role !== 'admin') return error(res, 'Forbidden', 403);
        const { username, password, name, role } = req.body;
        const hashedPassword = bcrypt.hashSync(password, 10);
        const { data, error: err } = await supabase.from('users').insert({ username, password: hashedPassword, name, role: role || 'staff' }).select('id, username, name, role').single();
        if (err?.code === '23505') return error(res, 'Username exists', 400);
        return json(res, data);
      }
      if (segments[1] === 'users' && segments[2] && method === 'DELETE') {
        const user = verifyToken(req);
        if (!user || user.role !== 'admin') return error(res, 'Forbidden', 403);
        if (segments[2] == user.id) return error(res, 'Cannot delete yourself', 400);
        await supabase.from('users').delete().eq('id', segments[2]);
        return json(res, { message: 'Deleted' });
      }
      if (segments[1] === 'change-password' && method === 'POST') {
        const user = verifyToken(req);
        if (!user) return error(res, 'Unauthorized', 401);
        const { currentPassword, newPassword } = req.body;
        const { data: dbUser } = await supabase.from('users').select('*').eq('id', user.id).single();
        if (!bcrypt.compareSync(currentPassword, dbUser.password)) return error(res, 'Wrong password', 400);
        await supabase.from('users').update({ password: bcrypt.hashSync(newPassword, 10) }).eq('id', user.id);
        return json(res, { message: 'Password changed' });
      }
    }

    // Protected routes - require auth
    const user = verifyToken(req);
    if (!user) return error(res, 'Unauthorized', 401);

    // CUSTOMERS
    if (segments[0] === 'customers') {
      if (method === 'GET' && !segments[1]) {
        const search = url.searchParams.get('search');
        let query = supabase.from('customers').select('*');
        if (search) query = query.or(`name.ilike.%${search}%,whatsapp.ilike.%${search}%`);
        const { data: customers } = await query.order('created_at', { ascending: false });
        const result = await Promise.all((customers || []).map(async (c) => {
          const { count: recipient_count } = await supabase.from('recipients').select('*', { count: 'exact', head: true }).eq('customer_id', c.id);
          const { count: invoice_count } = await supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('customer_id', c.id);
          return { ...c, recipient_count, invoice_count };
        }));
        return json(res, result);
      }
      if (method === 'GET' && segments[1]) {
        const { data: customer } = await supabase.from('customers').select('*').eq('id', segments[1]).single();
        if (!customer) return error(res, 'Not found', 404);
        const { data: recipients } = await supabase.from('recipients').select('*').eq('customer_id', segments[1]);
        const { data: importantDates } = await supabase.from('important_dates').select('*').eq('customer_id', segments[1]);
        const { data: invoices } = await supabase.from('invoices').select('id, invoice_number, total, status, created_at').eq('customer_id', segments[1]).order('created_at', { ascending: false });
        return json(res, { ...customer, recipients: recipients || [], importantDates: importantDates || [], invoices: invoices || [] });
      }
      if (method === 'POST') {
        const { name, whatsapp, country, notes } = req.body;
        const { data } = await supabase.from('customers').insert({ name, whatsapp, country, notes }).select().single();
        return json(res, data);
      }
      if (method === 'PUT' && segments[1]) {
        const { name, whatsapp, country, notes } = req.body;
        const { data } = await supabase.from('customers').update({ name, whatsapp, country, notes, updated_at: new Date().toISOString() }).eq('id', segments[1]).select().single();
        return json(res, data);
      }
      if (method === 'DELETE' && segments[1]) {
        await supabase.from('customers').delete().eq('id', segments[1]);
        return json(res, { message: 'Deleted' });
      }
    }

    // RECIPIENTS
    if (segments[0] === 'recipients') {
      if (segments[1] === 'customer' && segments[2] && method === 'GET') {
        const { data } = await supabase.from('recipients').select('*').eq('customer_id', segments[2]);
        return json(res, data || []);
      }
      if (method === 'POST') {
        const { customer_id, name, phone, address, relationship } = req.body;
        const { data } = await supabase.from('recipients').insert({ customer_id, name, phone, address, relationship }).select().single();
        return json(res, data);
      }
      if (method === 'PUT' && segments[1]) {
        const { name, phone, address, relationship } = req.body;
        const { data } = await supabase.from('recipients').update({ name, phone, address, relationship }).eq('id', segments[1]).select().single();
        return json(res, data);
      }
      if (method === 'DELETE' && segments[1]) {
        await supabase.from('recipients').delete().eq('id', segments[1]);
        return json(res, { message: 'Deleted' });
      }
    }

    // CATEGORIES
    if (segments[0] === 'categories') {
      if (method === 'GET') {
        const { data } = await supabase.from('categories').select('*').order('name');
        return json(res, data || []);
      }
      if (method === 'POST') {
        if (user.role !== 'admin') return error(res, 'Forbidden', 403);
        const { name, description } = req.body;
        const { data, error: err } = await supabase.from('categories').insert({ name, description }).select().single();
        if (err?.code === '23505') return error(res, 'Category exists', 400);
        return json(res, data);
      }
      if (method === 'PUT' && segments[1]) {
        if (user.role !== 'admin') return error(res, 'Forbidden', 403);
        const { name, description } = req.body;
        const { data } = await supabase.from('categories').update({ name, description }).eq('id', segments[1]).select().single();
        return json(res, data);
      }
      if (method === 'DELETE' && segments[1]) {
        if (user.role !== 'admin') return error(res, 'Forbidden', 403);
        await supabase.from('categories').delete().eq('id', segments[1]);
        return json(res, { message: 'Deleted' });
      }
    }

    // VENDORS
    if (segments[0] === 'vendors') {
      if (method === 'GET' && !segments[1]) {
        const { data } = await supabase.from('vendors').select('*').order('name');
        return json(res, data || []);
      }
      if (method === 'GET' && segments[1]) {
        const { data } = await supabase.from('vendors').select('*').eq('id', segments[1]).single();
        return json(res, data);
      }
      if (method === 'POST') {
        const { name, phone, address, notes } = req.body;
        const { data } = await supabase.from('vendors').insert({ name, phone, address, notes }).select().single();
        return json(res, data);
      }
      if (method === 'PUT' && segments[1]) {
        const { name, phone, address, notes } = req.body;
        const { data } = await supabase.from('vendors').update({ name, phone, address, notes }).eq('id', segments[1]).select().single();
        return json(res, data);
      }
      if (method === 'DELETE' && segments[1]) {
        if (user.role !== 'admin') return error(res, 'Forbidden', 403);
        await supabase.from('vendors').delete().eq('id', segments[1]);
        return json(res, { message: 'Deleted' });
      }
    }

    // INVOICES
    if (segments[0] === 'invoices') {
      if (method === 'GET' && !segments[1]) {
        const status = url.searchParams.get('status');
        const customer_id = url.searchParams.get('customer_id');
        const order_status = url.searchParams.get('order_status');
        let query = supabase.from('invoices').select(`*, customers (name, whatsapp), delivery_zones (name, delivery_fee)`);
        if (status) query = query.eq('status', status);
        if (customer_id) query = query.eq('customer_id', customer_id);
        if (order_status) query = query.eq('order_status', order_status);
        const { data } = await query.order('created_at', { ascending: false });
        const invoices = (data || []).map(inv => ({ ...inv, customer_name: inv.customers?.name, customer_whatsapp: inv.customers?.whatsapp, delivery_zone_name: inv.delivery_zones?.name }));
        return json(res, invoices);
      }
      if (method === 'GET' && segments[1] && segments[2] === 'photos') {
        const { data } = await supabase.from('delivery_photos').select('*').eq('invoice_id', segments[1]).order('uploaded_at', { ascending: false });
        return json(res, data || []);
      }
      if (method === 'GET' && segments[1]) {
        const { data: invoice } = await supabase.from('invoices').select(`*, customers (name, whatsapp, country), recipients (name, phone, address)`).eq('id', segments[1]).single();
        if (!invoice) return error(res, 'Not found', 404);
        const { data: items } = await supabase.from('invoice_items').select(`*, categories (name), vendors (name)`).eq('invoice_id', segments[1]);
        const formattedItems = (items || []).map(item => ({ ...item, category_name: item.categories?.name, vendor_name: item.vendors?.name }));
        return json(res, { ...invoice, customer_name: invoice.customers?.name, customer_whatsapp: invoice.customers?.whatsapp, customer_country: invoice.customers?.country, recipient_name: invoice.recipients?.name, recipient_phone: invoice.recipients?.phone, recipient_address: invoice.recipients?.address, items: formattedItems });
      }
      if (method === 'POST' && segments[1] && segments[2] === 'photos') {
        const { photo_url, caption } = req.body;
        const { data } = await supabase.from('delivery_photos').insert({ invoice_id: segments[1], photo_url, caption }).select().single();
        return json(res, data);
      }
      if (method === 'POST' && !segments[1]) {
        const { customer_id, recipient_id, items, discount, notes, delivery_zone_id, delivery_fee, gift_message } = req.body;
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const total = subtotal - (discount || 0) + (delivery_fee || 0);
        // Generate invoice number
        const { data: prefixSetting } = await supabase.from('settings').select('value').eq('key', 'invoice_prefix').single();
        const prefix = prefixSetting?.value || 'INV';
        const year = new Date().getFullYear();
        const { data: lastInvoice } = await supabase.from('invoices').select('invoice_number').like('invoice_number', `${prefix}-${year}-%`).order('id', { ascending: false }).limit(1).single();
        let nextNum = 1;
        if (lastInvoice) { const parts = lastInvoice.invoice_number.split('-'); nextNum = parseInt(parts[2]) + 1; }
        const invoice_number = `${prefix}-${year}-${String(nextNum).padStart(4, '0')}`;
        const { data: invoice } = await supabase.from('invoices').insert({ invoice_number, customer_id, recipient_id: recipient_id || null, subtotal, discount: discount || 0, total, notes, delivery_zone_id: delivery_zone_id || null, delivery_fee: delivery_fee || 0, gift_message: gift_message || null, order_status: 'received' }).select().single();
        const invoiceItems = items.map(item => ({ invoice_id: invoice.id, category_id: item.category_id || null, vendor_id: item.vendor_id || null, description: item.description, quantity: item.quantity, unit_price: item.unit_price, total: item.quantity * item.unit_price }));
        await supabase.from('invoice_items').insert(invoiceItems);
        return json(res, { id: invoice.id, invoice_number });
      }
      if (method === 'PATCH' && segments[1] && segments[2] === 'order-status') {
        const { order_status } = req.body;
        const updates = { order_status };
        if (order_status === 'dispatched') updates.dispatched_at = new Date().toISOString();
        else if (order_status === 'delivered') updates.delivered_at = new Date().toISOString();
        await supabase.from('invoices').update(updates).eq('id', segments[1]);
        return json(res, { message: 'Updated' });
      }
      if (method === 'PATCH' && segments[1] && segments[2] === 'status') {
        const { status } = req.body;
        const updates = { status };
        if (status === 'paid') updates.paid_at = new Date().toISOString();
        else updates.paid_at = null;
        await supabase.from('invoices').update(updates).eq('id', segments[1]);
        return json(res, { message: 'Updated' });
      }
      if (method === 'DELETE' && segments[1]) {
        await supabase.from('invoices').delete().eq('id', segments[1]);
        return json(res, { message: 'Deleted' });
      }
    }

    // RECEIPTS
    if (segments[0] === 'receipts') {
      if (method === 'GET' && segments[1] === 'invoice' && segments[2]) {
        const { data } = await supabase.from('receipts').select(`*, invoices (invoice_number)`).eq('invoice_id', segments[2]).single();
        if (data) data.invoice_number = data.invoices?.invoice_number;
        return json(res, data || null);
      }
      if (method === 'GET' && !segments[1]) {
        const { data } = await supabase.from('receipts').select(`*, invoices (invoice_number, customers (name))`).order('created_at', { ascending: false });
        const receipts = (data || []).map(r => ({ ...r, invoice_number: r.invoices?.invoice_number, customer_name: r.invoices?.customers?.name }));
        return json(res, receipts);
      }
      if (method === 'POST') {
        const { invoice_id, payment_method, notes } = req.body;
        const { data: invoice } = await supabase.from('invoices').select('*').eq('id', invoice_id).single();
        if (!invoice) return error(res, 'Invoice not found', 404);
        const { data: existing } = await supabase.from('receipts').select('id').eq('invoice_id', invoice_id).single();
        if (existing) return error(res, 'Receipt exists', 400);
        // Generate receipt number
        const { data: prefixSetting } = await supabase.from('settings').select('value').eq('key', 'receipt_prefix').single();
        const prefix = prefixSetting?.value || 'RCP';
        const year = new Date().getFullYear();
        const { data: lastReceipt } = await supabase.from('receipts').select('receipt_number').like('receipt_number', `${prefix}-${year}-%`).order('id', { ascending: false }).limit(1).single();
        let nextNum = 1;
        if (lastReceipt) { const parts = lastReceipt.receipt_number.split('-'); nextNum = parseInt(parts[2]) + 1; }
        const receipt_number = `${prefix}-${year}-${String(nextNum).padStart(4, '0')}`;
        const { data: receipt } = await supabase.from('receipts').insert({ receipt_number, invoice_id, amount: invoice.total, payment_method: payment_method || 'bank_transfer', notes }).select().single();
        await supabase.from('invoices').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', invoice_id);
        return json(res, { id: receipt.id, receipt_number });
      }
    }

    // SETTINGS
    if (segments[0] === 'settings') {
      if (method === 'GET') {
        const { data } = await supabase.from('settings').select('*');
        const settings = {};
        (data || []).forEach(row => { settings[row.key] = row.value; });
        return json(res, settings);
      }
      if (method === 'PUT') {
        if (user.role !== 'admin') return error(res, 'Forbidden', 403);
        const updates = req.body;
        for (const [key, value] of Object.entries(updates)) {
          if (key !== 'logo_exists') await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });
        }
        return json(res, { message: 'Updated' });
      }
    }

    // DASHBOARD
    if (segments[0] === 'dashboard' && method === 'GET') {
      const { count: totalCustomers } = await supabase.from('customers').select('*', { count: 'exact', head: true });
      const { count: totalInvoices } = await supabase.from('invoices').select('*', { count: 'exact', head: true });
      const { count: pendingInvoices } = await supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const { data: revenueData } = await supabase.from('invoices').select('total').eq('status', 'paid');
      const totalRevenue = (revenueData || []).reduce((sum, inv) => sum + parseFloat(inv.total), 0);
      const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
      const { data: monthRevenueData } = await supabase.from('invoices').select('total').eq('status', 'paid').gte('paid_at', startOfMonth.toISOString());
      const thisMonthRevenue = (monthRevenueData || []).reduce((sum, inv) => sum + parseFloat(inv.total), 0);
      const { data: recentInvoicesData } = await supabase.from('invoices').select(`id, invoice_number, total, status, created_at, customers (name)`).order('created_at', { ascending: false }).limit(5);
      const recentInvoices = (recentInvoicesData || []).map(inv => ({ ...inv, customer_name: inv.customers?.name }));
      const today = new Date();
      const todayMonthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const futureDate = new Date(); futureDate.setDate(futureDate.getDate() + 30);
      const futureMonthDay = `${String(futureDate.getMonth() + 1).padStart(2, '0')}-${String(futureDate.getDate()).padStart(2, '0')}`;
      const { data: allDates } = await supabase.from('important_dates').select(`*, customers (name, whatsapp), recipients (name)`);
      const upcomingDates = (allDates || []).map(d => ({ ...d, customer_name: d.customers?.name, customer_whatsapp: d.customers?.whatsapp, recipient_name: d.recipients?.name, monthDay: d.date.substring(5) })).filter(d => todayMonthDay <= futureMonthDay ? (d.monthDay >= todayMonthDay && d.monthDay <= futureMonthDay) : (d.monthDay >= todayMonthDay || d.monthDay <= futureMonthDay)).sort((a, b) => a.monthDay.localeCompare(b.monthDay)).slice(0, 10);
      return json(res, { totalCustomers: totalCustomers || 0, totalInvoices: totalInvoices || 0, pendingInvoices: pendingInvoices || 0, totalRevenue, thisMonthRevenue, recentInvoices, upcomingDates });
    }

    // IMPORTANT DATES
    if (segments[0] === 'important-dates') {
      if (method === 'GET' && segments[1] === 'customer' && segments[2]) {
        const { data } = await supabase.from('important_dates').select(`*, recipients (name)`).eq('customer_id', segments[2]).order('date');
        const dates = (data || []).map(d => ({ ...d, recipient_name: d.recipients?.name }));
        return json(res, dates);
      }
      if (method === 'GET' && !segments[1]) {
        const { data } = await supabase.from('important_dates').select(`*, customers (name, whatsapp), recipients (name)`).order('date');
        const dates = (data || []).map(d => ({ ...d, customer_name: d.customers?.name, customer_whatsapp: d.customers?.whatsapp, recipient_name: d.recipients?.name }));
        dates.sort((a, b) => a.date.substring(5).localeCompare(b.date.substring(5)));
        return json(res, dates);
      }
      if (method === 'POST') {
        const { customer_id, recipient_id, title, date, recurring, notes } = req.body;
        const { data } = await supabase.from('important_dates').insert({ customer_id, recipient_id: recipient_id || null, title, date, recurring: recurring !== false, notes }).select().single();
        return json(res, data);
      }
      if (method === 'PUT' && segments[1]) {
        const { recipient_id, title, date, recurring, notes } = req.body;
        const { data } = await supabase.from('important_dates').update({ recipient_id: recipient_id || null, title, date, recurring: recurring !== false, notes }).eq('id', segments[1]).select().single();
        return json(res, data);
      }
      if (method === 'DELETE' && segments[1]) {
        await supabase.from('important_dates').delete().eq('id', segments[1]);
        return json(res, { message: 'Deleted' });
      }
    }

    // PRODUCTS
    if (segments[0] === 'products') {
      if (method === 'GET') {
        const { data } = await supabase.from('products').select(`*, categories (name)`).eq('is_active', true).order('name');
        const products = (data || []).map(p => ({ ...p, category_name: p.categories?.name }));
        return json(res, products);
      }
      if (method === 'POST') {
        const { name, description, category_id, price } = req.body;
        const { data } = await supabase.from('products').insert({ name, description, category_id, price }).select().single();
        return json(res, data);
      }
      if (method === 'PUT' && segments[1]) {
        const { name, description, category_id, price, is_active } = req.body;
        const { data } = await supabase.from('products').update({ name, description, category_id, price, is_active }).eq('id', segments[1]).select().single();
        return json(res, data);
      }
      if (method === 'DELETE' && segments[1]) {
        if (user.role !== 'admin') return error(res, 'Forbidden', 403);
        await supabase.from('products').update({ is_active: false }).eq('id', segments[1]);
        return json(res, { message: 'Deleted' });
      }
    }

    // DELIVERY ZONES
    if (segments[0] === 'delivery-zones') {
      if (method === 'GET') {
        const { data } = await supabase.from('delivery_zones').select('*').eq('is_active', true).order('delivery_fee');
        return json(res, data || []);
      }
      if (method === 'POST') {
        if (user.role !== 'admin') return error(res, 'Forbidden', 403);
        const { name, areas, delivery_fee } = req.body;
        const { data } = await supabase.from('delivery_zones').insert({ name, areas, delivery_fee }).select().single();
        return json(res, data);
      }
      if (method === 'PUT' && segments[1]) {
        if (user.role !== 'admin') return error(res, 'Forbidden', 403);
        const { name, areas, delivery_fee, is_active } = req.body;
        const { data } = await supabase.from('delivery_zones').update({ name, areas, delivery_fee, is_active }).eq('id', segments[1]).select().single();
        return json(res, data);
      }
      if (method === 'DELETE' && segments[1]) {
        if (user.role !== 'admin') return error(res, 'Forbidden', 403);
        await supabase.from('delivery_zones').update({ is_active: false }).eq('id', segments[1]);
        return json(res, { message: 'Deleted' });
      }
    }

    // EXPENSES
    if (segments[0] === 'expenses') {
      if (segments[1] === 'summary' && method === 'GET') {
        const { data: expenses } = await supabase.from('expenses').select('amount, expense_date');
        const { data: invoices } = await supabase.from('invoices').select('total, status, paid_at').eq('status', 'paid');
        const totalExpenses = (expenses || []).reduce((sum, e) => sum + parseFloat(e.amount), 0);
        const totalRevenue = (invoices || []).reduce((sum, i) => sum + parseFloat(i.total), 0);
        const profit = totalRevenue - totalExpenses;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const thisMonthExpenses = (expenses || []).filter(e => e.expense_date >= startOfMonth.split('T')[0]).reduce((sum, e) => sum + parseFloat(e.amount), 0);
        const thisMonthRevenue = (invoices || []).filter(i => i.paid_at && i.paid_at >= startOfMonth).reduce((sum, i) => sum + parseFloat(i.total), 0);
        return json(res, { totalExpenses, totalRevenue, profit, profitMargin: totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(1) : 0, thisMonthExpenses, thisMonthRevenue, thisMonthProfit: thisMonthRevenue - thisMonthExpenses });
      }
      if (method === 'GET' && !segments[1]) {
        let query = supabase.from('expenses').select(`*, vendors (name), invoices (invoice_number), users (name)`).order('expense_date', { ascending: false });
        const vendor_id = url.searchParams.get('vendor_id');
        if (vendor_id) query = query.eq('vendor_id', vendor_id);
        const { data } = await query;
        const expenses = (data || []).map(e => ({ ...e, vendor_name: e.vendors?.name, invoice_number: e.invoices?.invoice_number, created_by_name: e.users?.name }));
        return json(res, expenses);
      }
      if (method === 'POST') {
        const { invoice_id, vendor_id, description, amount, expense_date, notes } = req.body;
        const { data } = await supabase.from('expenses').insert({ invoice_id: invoice_id || null, vendor_id: vendor_id || null, description, amount, expense_date: expense_date || new Date().toISOString().split('T')[0], notes, created_by: user.id }).select().single();
        return json(res, data);
      }
      if (method === 'PUT' && segments[1]) {
        const { vendor_id, description, amount, expense_date, notes } = req.body;
        const { data } = await supabase.from('expenses').update({ vendor_id, description, amount, expense_date, notes }).eq('id', segments[1]).select().single();
        return json(res, data);
      }
      if (method === 'DELETE' && segments[1]) {
        await supabase.from('expenses').delete().eq('id', segments[1]);
        return json(res, { message: 'Deleted' });
      }
    }

    // ACTIVITY LOG
    if (segments[0] === 'activity-log' && method === 'GET') {
      if (user.role !== 'admin') return error(res, 'Forbidden', 403);
      const limit = url.searchParams.get('limit') || 50;
      const user_id = url.searchParams.get('user_id');
      const entity_type = url.searchParams.get('entity_type');
      let query = supabase.from('activity_log').select(`*, users (name, username)`).order('created_at', { ascending: false }).limit(parseInt(limit));
      if (user_id) query = query.eq('user_id', user_id);
      if (entity_type) query = query.eq('entity_type', entity_type);
      const { data } = await query;
      const logs = (data || []).map(log => ({ ...log, user_name: log.users?.name, username: log.users?.username }));
      return json(res, logs);
    }

    // REPORTS
    if (segments[0] === 'reports') {
      if (segments[1] === 'sales' && method === 'GET') {
        const { data: invoices } = await supabase.from('invoices').select(`id, total, status, created_at, paid_at, customers (name, country), invoice_items (category_id, total, categories (name))`).eq('status', 'paid');
        const monthlyData = {};
        (invoices || []).forEach(inv => {
          const month = inv.paid_at ? inv.paid_at.substring(0, 7) : inv.created_at.substring(0, 7);
          if (!monthlyData[month]) monthlyData[month] = { revenue: 0, orders: 0 };
          monthlyData[month].revenue += parseFloat(inv.total);
          monthlyData[month].orders += 1;
        });
        const categoryData = {};
        (invoices || []).forEach(inv => {
          (inv.invoice_items || []).forEach(item => {
            const catName = item.categories?.name || 'Other';
            if (!categoryData[catName]) categoryData[catName] = 0;
            categoryData[catName] += parseFloat(item.total);
          });
        });
        const countryData = {};
        (invoices || []).forEach(inv => {
          const country = inv.customers?.country || 'Unknown';
          if (!countryData[country]) countryData[country] = { revenue: 0, orders: 0 };
          countryData[country].revenue += parseFloat(inv.total);
          countryData[country].orders += 1;
        });
        const customerData = {};
        (invoices || []).forEach(inv => {
          const name = inv.customers?.name || 'Unknown';
          if (!customerData[name]) customerData[name] = { revenue: 0, orders: 0 };
          customerData[name].revenue += parseFloat(inv.total);
          customerData[name].orders += 1;
        });
        const topCustomers = Object.entries(customerData).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
        return json(res, {
          monthly: Object.entries(monthlyData).map(([month, data]) => ({ month, ...data })).sort((a, b) => a.month.localeCompare(b.month)),
          byCategory: Object.entries(categoryData).map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue),
          byCountry: Object.entries(countryData).map(([country, data]) => ({ country, ...data })).sort((a, b) => b.revenue - a.revenue),
          topCustomers
        });
      }
      if (segments[1] === 'inactive-customers' && method === 'GET') {
        const days = url.searchParams.get('days') || 90;
        const cutoffDate = new Date(); cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
        const { data: customers } = await supabase.from('customers').select('id, name, whatsapp, country, created_at');
        const { data: invoices } = await supabase.from('invoices').select('customer_id, created_at').order('created_at', { ascending: false });
        const lastOrderMap = {};
        (invoices || []).forEach(inv => {
          if (!lastOrderMap[inv.customer_id] || inv.created_at > lastOrderMap[inv.customer_id]) lastOrderMap[inv.customer_id] = inv.created_at;
        });
        const inactiveCustomers = (customers || []).map(c => ({ ...c, last_order: lastOrderMap[c.id] || null, days_inactive: lastOrderMap[c.id] ? Math.floor((new Date() - new Date(lastOrderMap[c.id])) / (1000 * 60 * 60 * 24)) : Math.floor((new Date() - new Date(c.created_at)) / (1000 * 60 * 60 * 24)) })).filter(c => !lastOrderMap[c.id] || new Date(lastOrderMap[c.id]) < cutoffDate).sort((a, b) => b.days_inactive - a.days_inactive);
        return json(res, inactiveCustomers);
      }
    }

    // PACKAGES
    if (segments[0] === 'packages') {
      if (method === 'GET' && !segments[1]) {
        const { data: packages } = await supabase.from('gift_packages').select('*').eq('is_active', true).order('name');
        const packagesWithItems = await Promise.all((packages || []).map(async (pkg) => {
          const { data: items } = await supabase.from('gift_package_items').select(`*, products (name)`).eq('package_id', pkg.id);
          return { ...pkg, items: items || [] };
        }));
        return json(res, packagesWithItems);
      }
      if (method === 'GET' && segments[1]) {
        const { data: pkg } = await supabase.from('gift_packages').select('*').eq('id', segments[1]).single();
        if (!pkg) return error(res, 'Not found', 404);
        const { data: items } = await supabase.from('gift_package_items').select(`*, products (name)`).eq('package_id', pkg.id);
        return json(res, { ...pkg, items: items || [] });
      }
      if (method === 'POST') {
        const { name, description, total_price, items } = req.body;
        const { data: pkg } = await supabase.from('gift_packages').insert({ name, description, total_price }).select().single();
        if (items && items.length > 0) {
          const packageItems = items.map(item => ({ package_id: pkg.id, product_id: item.product_id || null, description: item.description, quantity: item.quantity, unit_price: item.unit_price }));
          await supabase.from('gift_package_items').insert(packageItems);
        }
        return json(res, pkg);
      }
      if (method === 'DELETE' && segments[1]) {
        if (user.role !== 'admin') return error(res, 'Forbidden', 403);
        await supabase.from('gift_packages').update({ is_active: false }).eq('id', segments[1]);
        return json(res, { message: 'Deleted' });
      }
    }

    // PAYMENTS (advance/partial payments)
    if (segments[0] === 'payments') {
      if (method === 'GET' && segments[1] === 'invoice' && segments[2]) {
        const { data } = await supabase.from('payments').select('*').eq('invoice_id', segments[2]).order('payment_date', { ascending: false });
        return json(res, data || []);
      }
      if (method === 'POST') {
        const { invoice_id, amount, payment_method, notes } = req.body;
        const { data: invoice } = await supabase.from('invoices').select('total, amount_paid, status').eq('id', invoice_id).single();
        if (!invoice) return error(res, 'Invoice not found', 404);
        if (invoice.status === 'cancelled') return error(res, 'Cannot add payment to cancelled invoice', 400);
        const currentPaid = parseFloat(invoice.amount_paid) || 0;
        const total = parseFloat(invoice.total);
        const paymentAmount = parseFloat(amount);
        const newTotal = currentPaid + paymentAmount;
        if (newTotal > total) return error(res, `Payment exceeds balance. Maximum payment: Rs. ${(total - currentPaid).toFixed(2)}`, 400);
        const { data: payment } = await supabase.from('payments').insert({ invoice_id, amount: paymentAmount, payment_method: payment_method || 'bank_transfer', notes, created_by: user.id }).select().single();
        let receipt_number = null;
        if (newTotal >= total) {
          await supabase.from('invoices').update({ status: 'paid', paid_at: new Date().toISOString(), amount_paid: newTotal }).eq('id', invoice_id);
          // Auto-generate receipt when fully paid
          const { data: existing } = await supabase.from('receipts').select('id').eq('invoice_id', invoice_id).single();
          if (!existing) {
            const { data: prefixSetting } = await supabase.from('settings').select('value').eq('key', 'receipt_prefix').single();
            const prefix = prefixSetting?.value || 'RCP';
            const year = new Date().getFullYear();
            const { data: lastReceipt } = await supabase.from('receipts').select('receipt_number').like('receipt_number', `${prefix}-${year}-%`).order('id', { ascending: false }).limit(1).single();
            let nextNum = 1;
            if (lastReceipt) { const parts = lastReceipt.receipt_number.split('-'); nextNum = parseInt(parts[2]) + 1; }
            receipt_number = `${prefix}-${year}-${String(nextNum).padStart(4, '0')}`;
            await supabase.from('receipts').insert({ receipt_number, invoice_id, amount: total, payment_method: payment_method || 'bank_transfer', notes: 'Auto-generated on full payment' });
          }
        } else {
          await supabase.from('invoices').update({ amount_paid: newTotal }).eq('id', invoice_id);
        }
        return json(res, { id: payment.id, amount_paid: newTotal, balance: total - newTotal, is_fully_paid: newTotal >= total, receipt_number });
      }
      if (method === 'DELETE' && segments[1]) {
        const { data: payment } = await supabase.from('payments').select('invoice_id, amount').eq('id', segments[1]).single();
        if (!payment) return error(res, 'Payment not found', 404);
        await supabase.from('payments').delete().eq('id', segments[1]);
        const { data: invoice } = await supabase.from('invoices').select('total, amount_paid, status').eq('id', payment.invoice_id).single();
        const newPaid = (parseFloat(invoice.amount_paid) || 0) - parseFloat(payment.amount);
        if (invoice.status === 'paid' && newPaid < parseFloat(invoice.total)) {
          await supabase.from('invoices').update({ status: 'pending', paid_at: null, amount_paid: newPaid }).eq('id', payment.invoice_id);
        } else {
          await supabase.from('invoices').update({ amount_paid: newPaid }).eq('id', payment.invoice_id);
        }
        return json(res, { success: true });
      }
    }

    return error(res, 'Not found', 404);
  } catch (err) {
    console.error(err);
    return error(res, 'Server error', 500);
  }
}
