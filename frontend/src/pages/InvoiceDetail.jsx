import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, Download, MessageCircle, Receipt, Trash2, CheckCircle, Package, Truck, Gift, Camera } from 'lucide-react';
import { generateInvoicePDF, generateReceiptPDF } from '../utils/pdfGenerator';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchInvoice = () => {
    Promise.all([
      api.get(`/invoices/${id}`),
      api.get(`/receipts/invoice/${id}`),
      api.get(`/invoices/${id}/photos`),
      api.get('/settings')
    ]).then(([inv, rec, ph, set]) => {
      setInvoice(inv.data);
      setReceipt(rec.data);
      setPhotos(ph.data);
      setSettings(set.data);
      setLoading(false);
    });
  };

  useEffect(() => { fetchInvoice(); }, [id]);

  const downloadPDF = () => {
    const doc = generateInvoicePDF(invoice, settings);
    doc.save(`${invoice.invoice_number}.pdf`);
  };

  const downloadReceiptPDF = () => {
    if (receipt) {
      const doc = generateReceiptPDF(receipt, invoice, invoice.items, settings);
      doc.save(`${receipt.receipt_number}.pdf`);
    }
  };

  const markAsPaid = async () => {
    await api.post('/receipts', { invoice_id: id, payment_method: 'bank_transfer' });
    fetchInvoice();
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
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
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
        <button onClick={downloadPDF} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
          <Download size={18} /> Download Invoice
        </button>
        <button onClick={sendWhatsApp} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          <MessageCircle size={18} /> Send WhatsApp
        </button>
        {invoice.status === 'pending' && (
          <button onClick={markAsPaid} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <CheckCircle size={18} /> Mark as Paid
          </button>
        )}
        {receipt && (
          <button onClick={downloadReceiptPDF} className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
            <Receipt size={18} /> Download Receipt
          </button>
        )}
        {invoice.status === 'pending' && (
          <button onClick={cancelInvoice} className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50">
            Cancel
          </button>
        )}
        <button onClick={deleteInvoice} className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg">
          <Trash2 size={18} />
        </button>
      </div>

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

        {/* Items Table */}
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
              {invoice.items.map((item, i) => (
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
