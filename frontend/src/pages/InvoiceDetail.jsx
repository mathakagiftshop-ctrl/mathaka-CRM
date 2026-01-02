import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, Download, MessageCircle, Receipt, Trash2, CheckCircle, Package, Truck, Gift, Camera, DollarSign, Plus, X, TrendingUp, Box, Clock, Edit } from 'lucide-react';
import { generateInvoicePDF, generateReceiptPDF, generateCustomerInvoicePDF } from '../utils/pdfGenerator';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [payments, setPayments] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', payment_method: 'bank_transfer', notes: '' });

  // Vendor orders state
  const [vendorOrders, setVendorOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [vendorForm, setVendorForm] = useState({ vendor_id: '', description: '', total_amount: '', notes: '' });

  const fetchInvoice = () => {
    Promise.all([
      api.get(`/invoices/${id}`),
      api.get(`/receipts/invoice/${id}`),
      api.get(`/payments/invoice/${id}`),
      api.get(`/invoices/${id}/photos`),
      api.get('/settings'),
      api.get(`/vendor-orders/invoice/${id}`),
      api.get('/vendors')
    ]).then(([inv, rec, pay, ph, set, vo, vend]) => {
      setInvoice(inv.data);
      setReceipt(rec.data);
      setPayments(pay.data || []);
      setPhotos(ph.data);
      setSettings(set.data);
      setVendorOrders(vo.data || []);
      setVendors(vend.data || []);
      setLoading(false);
    });
  };

  useEffect(() => { fetchInvoice(); }, [id]);

  const downloadPDF = async () => {
    const doc = await generateInvoicePDF(invoice, settings);
    doc.save(`${invoice.invoice_number}.pdf`);
  };

  const downloadCustomerPDF = async () => {
    const doc = await generateCustomerInvoicePDF(invoice, settings);
    doc.save(`${invoice.invoice_number}-customer.pdf`);
  };

  const downloadReceiptPDF = async () => {
    if (receipt) {
      const doc = await generateReceiptPDF(receipt, invoice, invoice.all_items || invoice.items, settings);
      doc.save(`${receipt.receipt_number}.pdf`);
    }
  };

  const markAsPaid = async () => {
    await api.post('/receipts', { invoice_id: id, payment_method: 'bank_transfer' });
    fetchInvoice();
  };

  const addPayment = async (e) => {
    e.preventDefault();
    try {
      await api.post('/payments', {
        invoice_id: id,
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        notes: paymentForm.notes
      });
      setShowPaymentModal(false);
      setPaymentForm({ amount: '', payment_method: 'bank_transfer', notes: '' });
      fetchInvoice();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add payment');
    }
  };

  const deletePayment = async (paymentId) => {
    if (confirm('Delete this payment?')) {
      await api.delete(`/payments/${paymentId}`);
      fetchInvoice();
    }
  };

  const getBalanceDue = () => {
    const total = parseFloat(invoice?.total) || 0;
    const paid = parseFloat(invoice?.amount_paid) || 0;
    return total - paid;
  };

  const updateOrderStatus = async (newStatus) => {
    await api.patch(`/invoices/${id}/order-status`, { order_status: newStatus });
    fetchInvoice();
  };

  const cancelInvoice = async () => {
    if (confirm('Cancel this invoice?')) {
      await api.patch(`/invoices/${id}/status`, { status: 'cancelled' });
      fetchInvoice();
    }
  };

  const deleteInvoice = async () => {
    if (confirm('Delete this invoice permanently?')) {
      await api.delete(`/invoices/${id}`);
      navigate('/invoices');
    }
  };

  const addDeliveryPhoto = async () => {
    const url = prompt('Enter photo URL (you can use Imgur or any image hosting):');
    if (url) {
      const caption = prompt('Add a caption (optional):');
      await api.post(`/invoices/${id}/photos`, { photo_url: url, caption });
      fetchInvoice();
    }
  };

  const sendWhatsApp = () => {
    const message = encodeURIComponent(
      `Hi ${invoice.customer_name}!\n\nYour invoice ${invoice.invoice_number} for Rs. ${parseFloat(invoice.total).toLocaleString()} is ready.\n\nThank you for choosing Mathaka Gift Store!`
    );
    window.open(`https://wa.me/${invoice.customer_whatsapp.replace(/[^0-9]/g, '')}?text=${message}`, '_blank');
  };

  const sendStatusUpdate = (status) => {
    const messages = {
      processing: `Hi ${invoice.customer_name}!\n\nGreat news! Your order ${invoice.invoice_number} is now being processed. We'll update you once it's dispatched.\n\nThank you! 🎁`,
      dispatched: `Hi ${invoice.customer_name}!\n\nYour order ${invoice.invoice_number} has been dispatched and is on its way to ${invoice.recipient_name || 'the recipient'}!\n\nThank you for choosing Mathaka Gift Store! 🚚`,
      delivered: `Hi ${invoice.customer_name}!\n\nYour gift has been delivered successfully! 🎉\n\nOrder: ${invoice.invoice_number}\n\nThank you for choosing Mathaka Gift Store! We hope your loved one enjoys the gift! 💝`
    };
    const message = encodeURIComponent(messages[status] || '');
    window.open(`https://wa.me/${invoice.customer_whatsapp.replace(/[^0-9]/g, '')}?text=${message}`, '_blank');
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    partial: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700'
  };

  const orderStatusSteps = [
    { key: 'received', label: 'Received', icon: Package },
    { key: 'processing', label: 'Processing', icon: Package },
    { key: 'dispatched', label: 'Dispatched', icon: Truck },
    { key: 'delivered', label: 'Delivered', icon: CheckCircle }
  ];

  const currentStatusIndex = orderStatusSteps.findIndex(s => s.key === invoice.order_status);
  const hasPackages = invoice.packages && invoice.packages.length > 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link to="/invoices" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{invoice.invoice_number}</h1>
          <span className={`text-xs px-2 py-1 rounded-full ${statusColors[invoice.status]}`}>
            {invoice.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Profitability Summary (Internal View) */}
      {(invoice.total_cost > 0 || invoice.profit_margin > 0) && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
          <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
            <TrendingUp size={18} /> Profitability Analysis (Internal)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
            <div>
              <span className="text-gray-600 block">Revenue</span>
              <span className="text-crm-primary font-semibold">Rs. {parseFloat(invoice.total).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-600 block">Total Cost</span>
              <span className="text-red-600 font-semibold">Rs. {parseFloat(invoice.total_cost || 0).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-600 block">Packaging Cost</span>
              <span className="text-orange-600 font-semibold">Rs. {parseFloat(invoice.total_packaging_cost || 0).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-600 block">Profit</span>
              <span className={`font-semibold ${(parseFloat(invoice.total) - parseFloat(invoice.total_cost || 0)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Rs. {(parseFloat(invoice.total) - parseFloat(invoice.total_cost || 0) - parseFloat(invoice.delivery_fee || 0)).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-600 block">Margin / Markup</span>
              <span className="text-green-600 font-semibold">
                {parseFloat(invoice.profit_margin || 0).toFixed(1)}% / {parseFloat(invoice.markup_percentage || 0).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Order Status Tracker */}
      {invoice.status === 'paid' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold mb-4">Order Status</h2>
          <div className="flex items-center justify-between mb-4">
            {orderStatusSteps.map((step, index) => {
              const isCompleted = index <= currentStatusIndex;
              const isCurrent = index === currentStatusIndex;
              return (
                <div key={step.key} className="flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                    } ${isCurrent ? 'ring-4 ring-green-200' : ''}`}>
                    <step.icon size={20} />
                  </div>
                  <span className={`text-xs mt-2 ${isCompleted ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            {invoice.order_status === 'received' && (
              <button onClick={() => { updateOrderStatus('processing'); sendStatusUpdate('processing'); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                Start Processing
              </button>
            )}
            {invoice.order_status === 'processing' && (
              <button onClick={() => { updateOrderStatus('dispatched'); sendStatusUpdate('dispatched'); }} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm">
                Mark Dispatched
              </button>
            )}
            {invoice.order_status === 'dispatched' && (
              <button onClick={() => { updateOrderStatus('delivered'); sendStatusUpdate('delivered'); }} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">
                Mark Delivered
              </button>
            )}
            <button onClick={addDeliveryPhoto} className="px-4 py-2 border rounded-lg text-sm flex items-center gap-2">
              <Camera size={16} /> Add Delivery Photo
            </button>
          </div>
        </div>
      )}

      {/* Delivery Photos */}
      {photos.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Camera size={18} /> Delivery Photos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {photos.map(photo => (
              <div key={photo.id} className="relative">
                <img src={photo.photo_url} alt={photo.caption || 'Delivery'} className="w-full h-32 object-cover rounded-lg" />
                {photo.caption && <p className="text-xs text-gray-500 mt-1">{photo.caption}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button onClick={downloadPDF} className="flex items-center gap-2 px-4 py-2 bg-crm-primary text-white rounded-lg hover:bg-gray-800 font-medium">
          <Download size={18} /> Internal Invoice
        </button>
        {hasPackages && (
          <button onClick={downloadCustomerPDF} className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700">
            <Download size={18} /> Customer Invoice
          </button>
        )}
        <button onClick={sendWhatsApp} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          <MessageCircle size={18} /> Send WhatsApp
        </button>
        {['pending', 'partial'].includes(invoice.status) && (
          <button onClick={() => setShowPaymentModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <DollarSign size={18} /> Add Payment
          </button>
        )}
        {receipt && (
          <button onClick={downloadReceiptPDF} className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
            <Receipt size={18} /> Download Receipt
          </button>
        )}
        {['pending', 'partial'].includes(invoice.status) && (
          <>
            <Link to={`/invoices/${id}/edit`} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600">
              <Edit size={18} /> Edit
            </Link>
            <button onClick={cancelInvoice} className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50">
              Cancel
            </button>
          </>
        )}
        <button onClick={deleteInvoice} className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg">
          <Trash2 size={18} />
        </button>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Add Payment</h2>
              <button onClick={() => setShowPaymentModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Invoice Total:</span>
                <span>Rs. {parseFloat(invoice.total).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Already Paid:</span>
                <span className="text-green-600">Rs. {parseFloat(invoice.amount_paid || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold border-t mt-2 pt-2">
                <span>Balance Due:</span>
                <span className="text-red-600">Rs. {getBalanceDue().toLocaleString()}</span>
              </div>
            </div>
            <form onSubmit={addPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount (Rs.)</label>
                <input
                  type="number"
                  step="0.01"
                  max={getBalanceDue()}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder={`Max: ${getBalanceDue().toLocaleString()}`}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Payment Method</label>
                <select
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="paypal">PayPal</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="e.g., Advance payment"
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="flex-1 px-4 py-2 border rounded-lg">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Add Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gift Message */}
      {invoice.gift_message && (
        <div className="bg-pink-50 border border-pink-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-pink-700 mb-2">
            <Gift size={20} />
            <span className="font-medium">Gift Message</span>
          </div>
          <p className="text-pink-800 italic">"{invoice.gift_message}"</p>
        </div>
      )}

      {/* Invoice Details */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="grid sm:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Bill To</h3>
            <p className="font-medium">{invoice.customer_name}</p>
            <p className="text-sm text-gray-600">{invoice.customer_whatsapp}</p>
            {invoice.customer_country && <p className="text-sm text-gray-600">{invoice.customer_country}</p>}
          </div>
          {invoice.recipient_name && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Deliver To</h3>
              <p className="font-medium">{invoice.recipient_name}</p>
              {invoice.recipient_phone && <p className="text-sm text-gray-600">{invoice.recipient_phone}</p>}
              {invoice.recipient_address && <p className="text-sm text-gray-600">{invoice.recipient_address}</p>}
            </div>
          )}
        </div>

        <div className="text-sm text-gray-500 mb-4">
          Created: {new Date(invoice.created_at).toLocaleString()}
          {invoice.paid_at && <span className="ml-4">Paid: {new Date(invoice.paid_at).toLocaleString()}</span>}
          {invoice.delivered_at && <span className="ml-4">Delivered: {new Date(invoice.delivered_at).toLocaleString()}</span>}
        </div>

        {/* Packages View */}
        {hasPackages ? (
          <div className="space-y-4">
            <h3 className="font-semibold">Packages</h3>
            {invoice.packages.map((pkg, index) => (
              <div key={pkg.id} className="border rounded-lg overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-crm-border flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Gift className="text-crm-primary" size={20} />
                    <span className="font-bold text-crm-primary">{pkg.package_name}</span>
                  </div>
                  <span className="font-bold text-crm-primary">Rs. {parseFloat(pkg.package_price).toLocaleString()}</span>
                </div>
                <div className="p-4">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-2">Item</th>
                        <th className="text-right p-2">Qty</th>
                        <th className="text-right p-2 text-red-600">Cost</th>
                        <th className="text-right p-2 text-green-600">Retail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {pkg.items.map((item, i) => (
                        <tr key={i}>
                          <td className="p-2">{item.description}</td>
                          <td className="p-2 text-right">{item.quantity}</td>
                          <td className="p-2 text-right text-red-600">Rs. {parseFloat(item.cost_price || 0).toLocaleString()}</td>
                          <td className="p-2 text-right text-green-600">Rs. {parseFloat(item.unit_price || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {pkg.packaging_cost > 0 && (
                    <div className="mt-2 pt-2 border-t flex justify-between text-sm">
                      <span className="flex items-center gap-1 text-orange-600">
                        <Box size={14} /> Packaging Cost
                      </span>
                      <span className="text-orange-600">Rs. {parseFloat(pkg.packaging_cost).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Legacy Items Table */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Description</th>
                  <th className="text-left p-3">Category</th>
                  <th className="text-right p-3">Qty</th>
                  <th className="text-right p-3">Price</th>
                  <th className="text-right p-3">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(invoice.items || []).map((item, i) => (
                  <tr key={i}>
                    <td className="p-3">{item.description}</td>
                    <td className="p-3 text-gray-500">{item.category_name || '-'}</td>
                    <td className="p-3 text-right">{item.quantity}</td>
                    <td className="p-3 text-right">Rs. {parseFloat(item.unit_price).toLocaleString()}</td>
                    <td className="p-3 text-right">Rs. {parseFloat(item.total).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals */}
        <div className="border-t mt-4 pt-4 space-y-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>Rs. {parseFloat(invoice.subtotal).toLocaleString()}</span>
          </div>
          {invoice.delivery_fee > 0 && (
            <div className="flex justify-between text-blue-600">
              <span>Delivery Fee</span>
              <span>Rs. {parseFloat(invoice.delivery_fee).toLocaleString()}</span>
            </div>
          )}
          {invoice.discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>- Rs. {parseFloat(invoice.discount).toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>Rs. {parseFloat(invoice.total).toLocaleString()}</span>
          </div>
        </div>

        {invoice.notes && (
          <div className="mt-4 pt-4 border-t">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Notes</h3>
            <p className="text-sm">{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Payment Summary & History */}
      {(payments.length > 0 || ['pending', 'partial'].includes(invoice.status)) && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <DollarSign size={18} /> Payment Summary
          </h2>

          {/* Payment Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Paid: Rs. {parseFloat(invoice.amount_paid || 0).toLocaleString()}</span>
              <span>Total: Rs. {parseFloat(invoice.total).toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${invoice.status === 'paid' ? 'bg-green-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min(100, ((parseFloat(invoice.amount_paid) || 0) / parseFloat(invoice.total)) * 100)}%` }}
              />
            </div>
            {['pending', 'partial'].includes(invoice.status) && getBalanceDue() > 0 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mt-2">
                <p className="text-sm text-orange-600 font-medium">
                  Balance due: Rs. {getBalanceDue().toLocaleString()}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={downloadCustomerPDF}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200"
                  >
                    <Download size={14} /> Invoice with Balance
                  </button>
                  <button
                    onClick={() => {
                      const message = encodeURIComponent(
                        `Hi ${invoice.customer_name}!\n\nThis is a friendly reminder for your pending balance.\n\nInvoice: ${invoice.invoice_number}\nTotal: Rs. ${parseFloat(invoice.total).toLocaleString()}\nPaid: Rs. ${parseFloat(invoice.amount_paid || 0).toLocaleString()}\nBalance Due: Rs. ${getBalanceDue().toLocaleString()}\n\nThank you! 🙏`
                      );
                      window.open(`https://wa.me/${invoice.customer_whatsapp.replace(/[^0-9]/g, '')}?text=${message}`, '_blank');
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200"
                  >
                    <MessageCircle size={14} /> Send Reminder
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Payment History */}
          {payments.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Payment History</h3>
              <div className="space-y-2">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Rs. {parseFloat(payment.amount).toLocaleString()}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(payment.payment_date).toLocaleString()} • {payment.payment_method === 'bank_transfer' ? 'Bank Transfer' : payment.payment_method}
                        {payment.notes && ` • ${payment.notes}`}
                      </p>
                    </div>
                    {['pending', 'partial'].includes(invoice.status) && (
                      <button
                        onClick={() => deletePayment(payment.id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vendor Orders Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Truck size={18} /> Vendor Assignments
          </h2>
          <button
            onClick={() => setShowVendorModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-sm hover:bg-orange-200"
          >
            <Plus size={16} /> Assign Vendor
          </button>
        </div>

        {vendorOrders.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No vendors assigned yet</p>
        ) : (
          <div className="space-y-3">
            {vendorOrders.map(vo => (
              <div key={vo.id} className="border rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{vo.vendor_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${vo.status === 'completed' ? 'bg-green-100 text-green-700' :
                          vo.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                            vo.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                              'bg-blue-100 text-blue-700'
                        }`}>
                        {vo.status === 'in_progress' ? 'In Progress' : vo.status.charAt(0).toUpperCase() + vo.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{vo.description}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>Total: Rs. {parseFloat(vo.total_amount).toLocaleString()}</span>
                      <span className="text-green-600">Paid: Rs. {parseFloat(vo.amount_paid || 0).toLocaleString()}</span>
                      {vo.balance_due > 0 && (
                        <span className="text-red-600">Due: Rs. {parseFloat(vo.balance_due).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <Link to="/vendor-orders" className="block text-center text-sm text-crm-primary hover:underline mt-2 font-medium">
              View all vendor orders →
            </Link>
          </div>
        )}
      </div>

      {/* Vendor Assignment Modal */}
      {showVendorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Assign to Vendor</h2>
              <button onClick={() => setShowVendorModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api.post('/vendor-orders', {
                  invoice_id: id,
                  ...vendorForm,
                  total_amount: parseFloat(vendorForm.total_amount) || 0
                });
                setShowVendorModal(false);
                setVendorForm({ vendor_id: '', description: '', total_amount: '', notes: '' });
                fetchInvoice();
              } catch (err) {
                alert(err.response?.data?.error || 'Failed to assign vendor');
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Vendor *</label>
                <select
                  value={vendorForm.vendor_id}
                  onChange={(e) => setVendorForm({ ...vendorForm, vendor_id: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
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
                  value={vendorForm.description}
                  onChange={(e) => setVendorForm({ ...vendorForm, description: e.target.value })}
                  placeholder="e.g., Birthday cake - 2kg chocolate"
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount (Rs.)</label>
                <input
                  type="number"
                  step="0.01"
                  value={vendorForm.total_amount}
                  onChange={(e) => setVendorForm({ ...vendorForm, total_amount: e.target.value })}
                  placeholder="Amount to pay vendor"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={vendorForm.notes}
                  onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })}
                  placeholder="Special instructions..."
                  className="w-full border rounded-lg px-3 py-2"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowVendorModal(false)} className="flex-1 px-4 py-2 border rounded-lg">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                  Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Info */}
      {receipt && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-green-700">
            <Receipt size={20} />
            <span className="font-medium">Receipt Generated: {receipt.receipt_number}</span>
          </div>
          <p className="text-sm text-green-600 mt-1">
            Payment received on {new Date(receipt.created_at).toLocaleString()} via {receipt.payment_method === 'bank_transfer' ? 'Bank Transfer' : receipt.payment_method}
          </p>
        </div>
      )}
    </div>
  );
}
