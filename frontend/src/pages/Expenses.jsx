import { useState, useEffect } from 'react';
import api from '../api';
import { Plus, DollarSign, TrendingUp, TrendingDown, Trash2 } from 'lucide-react';

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ description: '', amount: '', vendor_id: '', expense_date: '', notes: '' });
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    Promise.all([
      api.get('/expenses'),
      api.get('/expenses/summary'),
      api.get('/vendors')
    ]).then(([e, s, v]) => {
      setExpenses(e.data);
      setSummary(s.data);
      setVendors(v.data);
      setLoading(false);
    });
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post('/expenses', form);
    setShowModal(false);
    setForm({ description: '', amount: '', vendor_id: '', expense_date: '', notes: '' });
    fetchData();
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this expense?')) {
      await api.delete(`/expenses/${id}`);
      fetchData();
    }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Expenses</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-crm-primary text-white px-4 py-2 rounded-lg hover:bg-gray-800 font-medium"
        >
          <Plus size={20} /> Add Expense
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <TrendingUp size={20} />
              <span className="text-sm">Total Revenue</span>
            </div>
            <p className="text-2xl font-bold">Rs. {summary.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <TrendingDown size={20} />
              <span className="text-sm">Total Expenses</span>
            </div>
            <p className="text-2xl font-bold">Rs. {summary.totalExpenses.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-crm-primary mb-2">
              <DollarSign size={20} />
              <span className="text-sm">Profit</span>
            </div>
            <p className="text-2xl font-bold">Rs. {summary.profit.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <TrendingUp size={20} />
              <span className="text-sm">Profit Margin</span>
            </div>
            <p className="text-2xl font-bold">{summary.profitMargin}%</p>
          </div>
        </div>
      )}

      {/* This Month */}
      {summary && (
        <div className="bg-crm-primary rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-4">This Month</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm opacity-80">Revenue</p>
              <p className="text-xl font-bold">Rs. {summary.thisMonthRevenue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm opacity-80">Expenses</p>
              <p className="text-xl font-bold">Rs. {summary.thisMonthExpenses.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm opacity-80">Profit</p>
              <p className="text-xl font-bold">Rs. {summary.thisMonthProfit.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Expense List */}
      <div className="bg-white rounded-xl shadow-sm divide-y">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Recent Expenses</h2>
        </div>
        {expenses.length === 0 ? (
          <p className="p-8 text-center text-gray-500">No expenses recorded yet</p>
        ) : (
          expenses.map(expense => (
            <div key={expense.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{expense.description}</p>
                <p className="text-sm text-gray-500">
                  {expense.vendor_name && `${expense.vendor_name} • `}
                  {new Date(expense.expense_date).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-semibold text-red-600">- Rs. {parseFloat(expense.amount).toLocaleString()}</span>
                <button onClick={() => handleDelete(expense.id)} className="p-2 text-gray-500 hover:text-red-600">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Add Expense</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Description *"
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="Amount (Rs.) *"
                className="w-full px-3 py-2 border rounded-lg"
                required
                min="0"
              />
              <select
                value={form.vendor_id}
                onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Select Vendor (optional)</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
              <input
                type="date"
                value={form.expense_date}
                onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Notes"
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
              />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-crm-primary text-white rounded-lg font-medium">Add Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
