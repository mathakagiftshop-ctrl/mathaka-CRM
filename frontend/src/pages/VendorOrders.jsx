import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Plus, Truck, DollarSign, CheckCircle, Clock, Package, X, ChevronDown, ChevronUp, Trash2, AlertCircle } from 'lucide-react';

export default function VendorOrders() {
  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [filter, setFilter] = useState({ vendor_id: '', status: '' });
  
  const [form, setForm] = useState({
    invoice_id: '',
    vendor_id: '',
    description: '',
    total_amount: '',
    notes: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_type: 'advance',
    payment_method: 'cash',
    notes: ''
  });

  const fetchData = async () => {
    try {
      const [ordersRes, vendorsRes, invoicesRes] = await Promise.all([
        api.get('/vendor-orders', { params: filter }),
        api.get('/vendors'),
        api.get('/invoices?status=pending,partial,paid')
      ]);
      setOrders(ordersRes.data);
      setVendors(vendorsRes.data);
      setInvoices(invoicesRes.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filter.vendor_id, filter.status]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/vendor-orders', {
        ...form,
        total_amount: parseFloat(form.total_amount) || 0
      });
      setShowModal(false);
      setForm({ invoice_id: '', vendor_id: '', description: '', total_amount: '', notes: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create vendor order');
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/vendor-orders/${selectedOrder.id}/payments`, {
        ...paymentForm,
        amount: parseFloat(paymentForm.amount)
      });
      setShowPaymentModal(false);
      setPaymentForm({ amount: '', payment_type: 'advance', payment_method: 'cash', notes: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add payment');
    }
  };

  const updateStatus = async (orderId, status) => {
    try {
      await api.patch(`/vendor-orders/${orderId}/status`, { status });
      fetchData();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const deleteOrder = async (orderId) => {
    if (confirm('Delete this vendor order?')) {
      await api.delete(`/vendor-orders/${orderId}`);
      fetchData();
    }
  };

  const deletePayment = async (paymentId) => {
    if (confirm('Delete this payment?')) {
      await api.delete(`/vendor-orders/payments/${paymentId}`);
      fetchData();
    }
  };

  const toggleExpand = async (orderId) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
    } else {
      // Fetch payments for this order
      const res = await api.get(`/vendor-orders/${orderId}/payments`);
      setOrders(orders.map(o => o.id === orderId ? { ...o, payments: res.data } : o));
      setExpandedOrder(orderId);
    }
  };

  const statusColors = {
    assigned: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700'
  };

  const statusLabels = {
    assigned: 'Assigned',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled'
  };

  // Calculate summary
  const summary = {
    total: orders.length,
    pending: orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length,
    totalAmount: orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0),
    totalPaid: orders.reduce((sum, o) => sum + parseFloat(o.amount_paid || 0), 0),
    totalBalance: orders.reduce((sum, o) => sum + parseFloat(o.balance_due || 0), 0)
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Vendor Orders</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
        >
          <Plus size={20} /> Assign to Vendor
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Pending Orders</p>
          <p className="text-2xl font-bold text-orange-600">{summary.pending}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Amount</p>
          <p className="text-2xl font-bold">Rs. {summary.totalAmount.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Paid</p>
          <p className="text-2xl font-bold text-green-600">Rs. {summary.totalPaid.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Balance Due</p>
          <p className="text-2xl font-bold text-red-600">Rs. {summary.totalBalance.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filter.vendor_id}
          onChange={(e) => setFilter({ ...filter, vendor_id: e.target.value })}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="">All Vendors</option>
          {vendors.map(v => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
        <select
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="">All Status</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-xl shadow-sm divide-y">
        {loading ? (
          <p className="p-4 text-center">Loading...</p>
        ) : orders.length === 0 ? (
          <p className="p-8 text-center text-gray-500">No vendor orders yet</p>
        ) : (
          orders.map(order => (
            <div key={order.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Truck className="text-orange-600" size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{order.vendor_name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[order.status]}`}>
                        {statusLabels[order.status]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{order.description}</p>
                    <Link to={`/invoices/${order.invoice_id}`} className="text-xs text-purple-600 hover:underline">
                      {order.invoice_number} • {order.customer_name}
                    </Link>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span>Total: <strong>Rs. {parseFloat(order.total_amount).toLocaleString()}</strong></span>
                      <span className="text-green-600">Paid: Rs. {parseFloat(order.amount_paid || 0).toLocaleString()}</span>
                      {order.balance_due > 0 && (
                        <span className="text-red-600">Due: Rs. {parseFloat(order.balance_due).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleExpand(order.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    {expandedOrder === order.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
              </div>

              {/* Expanded Section */}
              {expandedOrder === order.id && (
                <div className="mt-4 pt-4 border-t space-y-4">
                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {order.status === 'assigned' && (
                      <button
                        onClick={() => updateStatus(order.id, 'in_progress')}
                        className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-sm flex items-center gap-1"
                      >
                        <Clock size={14} /> Start Work
                      </button>
                    )}
                    {order.status === 'in_progress' && (
                      <button
                        onClick={() => updateStatus(order.id, 'completed')}
                        className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm flex items-center gap-1"
                      >
                        <CheckCircle size={14} /> Mark Complete
                      </button>
                    )}
                    {order.status !== 'completed' && order.status !== 'cancelled' && (
                      <button
                        onClick={() => { setSelectedOrder(order); setShowPaymentModal(true); }}
                        className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm flex items-center gap-1"
                      >
                        <DollarSign size={14} /> Add Payment
                      </button>
                    )}
                    <button
                      onClick={() => deleteOrder(order.id)}
                      className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-sm flex items-center gap-1"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>

                  {/* Payment History */}
                  {order.payments && order.payments.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Payment History</h4>
                      <div className="space-y-2">
                        {order.payments.map(payment => (
                          <div key={payment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                            <div>
                              <span className="font-medium">Rs. {parseFloat(payment.amount).toLocaleString()}</span>
                              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                                payment.payment_type === 'advance' ? 'bg-blue-100 text-blue-700' :
                                payment.payment_type === 'final' ? 'bg-green-100 text-green-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {payment.payment_type}
                              </span>
                              <span className="text-gray-500 ml-2">
                                {new Date(payment.payment_date).toLocaleDateString()} • {payment.payment_method}
                              </span>
                              {payment.notes && <span className="text-gray-500 ml-2">• {payment.notes}</span>}
                            </div>
                            <button
                              onClick={() => deletePayment(payment.id)}
                              className="p-1 text-red-500 hover:bg-red-100 rounded"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {order.notes && (
                    <p className="text-sm text-gray-500">Notes: {order.notes}</p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>


      {/* Create Order Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Assign to Vendor</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Invoice *</label>
                <select
                  value={form.invoice_id}
                  onChange={(e) => setForm({ ...form, invoice_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">Select Invoice</option>
                  {invoices.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} - {inv.customer_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Vendor *</label>
                <select
                  value={form.vendor_id}
                  onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">Select Vendor</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description *</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g., Birthday cake - 2kg chocolate"
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Total Amount (Rs.)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.total_amount}
                  onChange={(e) => setForm({ ...form, total_amount: e.target.value })}
                  placeholder="Amount to pay vendor"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Any special instructions..."
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                  Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add Payment</h2>
              <button onClick={() => setShowPaymentModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="font-medium">{selectedOrder.vendor_name}</p>
              <p className="text-sm text-gray-500">{selectedOrder.description}</p>
              <div className="flex justify-between text-sm mt-2">
                <span>Total:</span>
                <span>Rs. {parseFloat(selectedOrder.total_amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Paid:</span>
                <span className="text-green-600">Rs. {parseFloat(selectedOrder.amount_paid || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold border-t mt-2 pt-2">
                <span>Balance:</span>
                <span className="text-red-600">Rs. {parseFloat(selectedOrder.balance_due).toLocaleString()}</span>
              </div>
            </div>

            <form onSubmit={handlePayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount (Rs.) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  placeholder={`Max: ${selectedOrder.balance_due}`}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Payment Type</label>
                <select
                  value={paymentForm.payment_type}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="advance">Advance</option>
                  <option value="partial">Partial</option>
                  <option value="final">Final Payment</option>
                  <option value="adjustment">Adjustment</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Payment Method</label>
                <select
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Card</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <input
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="Optional notes..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="px-4 py-2 border rounded-lg">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Add Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
