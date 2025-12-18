import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Plus, FileText, Filter } from 'lucide-react';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = filter !== 'all' ? { status: filter } : {};
    api.get('/invoices', { params }).then(res => {
      setInvoices(res.data);
      setLoading(false);
    });
  }, [filter]);

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    partial: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700'
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

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter size={18} className="text-gray-500" />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="all">All Invoices</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

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
