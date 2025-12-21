import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Plus, FileText, Filter, Search, Calendar, X } from 'lucide-react';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (filter !== 'all') params.status = filter;
    if (search) params.search = search;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;

    api.get('/invoices', { params }).then(res => {
      setInvoices(res.data);
      setLoading(false);
    });
  }, [filter, search, dateFrom, dateTo]);

  const clearFilters = () => {
    setFilter('all');
    setSearch('');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = filter !== 'all' || search || dateFrom || dateTo;

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    partial: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700'
  };

  // Quick date presets
  const setDatePreset = (preset) => {
    const today = new Date();
    let from, to;

    switch (preset) {
      case 'today':
        from = to = today.toISOString().split('T')[0];
        break;
      case 'week':
        from = new Date(today.setDate(today.getDate() - 7)).toISOString().split('T')[0];
        to = new Date().toISOString().split('T')[0];
        break;
      case 'month':
        from = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        to = new Date().toISOString().split('T')[0];
        break;
      case 'lastMonth':
        from = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
        to = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
        break;
      default:
        return;
    }
    setDateFrom(from);
    setDateTo(to);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <Link
          to="/invoices/new"
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
        >
          <Plus size={20} /> Create Invoice
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by invoice number or customer name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-gray-500" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border rounded-lg"
              placeholder="From"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border rounded-lg"
              placeholder="To"
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
            >
              <X size={16} /> Clear
            </button>
          )}
        </div>

        {/* Quick Date Presets */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-500">Quick:</span>
          <button onClick={() => setDatePreset('today')} className="text-sm px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded">Today</button>
          <button onClick={() => setDatePreset('week')} className="text-sm px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded">Last 7 Days</button>
          <button onClick={() => setDatePreset('month')} className="text-sm px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded">This Month</button>
          <button onClick={() => setDatePreset('lastMonth')} className="text-sm px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded">Last Month</button>
        </div>
      </div>

      {/* Results Count */}
      {!loading && (
        <p className="text-sm text-gray-500">
          Showing {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
          {hasActiveFilters && ' (filtered)'}
        </p>
      )}

      {/* Invoice List */}
      <div className="bg-white rounded-xl shadow-sm divide-y">
        {loading ? (
          <p className="p-4 text-center">Loading...</p>
        ) : invoices.length === 0 ? (
          <p className="p-8 text-center text-gray-500">No invoices found</p>
        ) : (
          invoices.map(inv => (
            <Link
              key={inv.id}
              to={`/invoices/${inv.id}`}
              className="p-4 flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <FileText className="text-purple-600" size={20} />
                </div>
                <div>
                  <p className="font-medium">{inv.invoice_number}</p>
                  <p className="text-sm text-gray-500">{inv.customer_name}</p>
                  <p className="text-xs text-gray-400">{new Date(inv.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">Rs. {inv.total.toLocaleString()}</p>
                <span className={`text-xs px-2 py-1 rounded-full ${statusColors[inv.status]}`}>
                  {inv.status}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
