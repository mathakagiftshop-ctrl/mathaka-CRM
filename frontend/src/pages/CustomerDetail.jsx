import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, MessageCircle, Plus, Trash2, Edit2, Calendar, User, MapPin, Zap, FileText } from 'lucide-react';
import QuickOrderModal from '../components/QuickOrderModal';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showQuickOrder, setShowQuickOrder] = useState(false);
  const [recipientForm, setRecipientForm] = useState({ name: '', phone: '', address: '', relationship: '' });
  const [dateForm, setDateForm] = useState({ title: '', date: '', recipient_id: '', notes: '' });

  const fetchCustomer = () => {
    api.get(`/customers/${id}`).then(res => {
      setCustomer(res.data);
      setForm(res.data);
      setLoading(false);
    });
  };

  useEffect(() => { fetchCustomer(); }, [id]);

  const handleUpdate = async () => {
    await api.put(`/customers/${id}`, form);
    setEditMode(false);
    fetchCustomer();
  };

  const handleDelete = async () => {
    if (confirm('Delete this customer?')) {
      await api.delete(`/customers/${id}`);
      navigate('/customers');
    }
  };

  const addRecipient = async (e) => {
    e.preventDefault();
    await api.post('/recipients', { ...recipientForm, customer_id: id });
    setShowRecipientModal(false);
    setRecipientForm({ name: '', phone: '', address: '', relationship: '' });
    fetchCustomer();
  };

  const deleteRecipient = async (rid) => {
    if (confirm('Delete this recipient?')) {
      await api.delete(`/recipients/${rid}`);
      fetchCustomer();
    }
  };

  const addDate = async (e) => {
    e.preventDefault();
    await api.post('/important-dates', { ...dateForm, customer_id: id, recurring: true });
    setShowDateModal(false);
    setDateForm({ title: '', date: '', recipient_id: '', notes: '' });
    fetchCustomer();
  };

  const deleteDate = async (did) => {
    if (confirm('Delete this date?')) {
      await api.delete(`/important-dates/${did}`);
      fetchCustomer();
    }
  };

  const openWhatsApp = () => {
    const message = encodeURIComponent(`Hi ${customer.name}! This is Mathaka Gift Store.`);
    window.open(`https://wa.me/${customer.whatsapp.replace(/[^0-9]/g, '')}?text=${message}`, '_blank');
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/customers" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold flex-1 text-crm-primary">{customer.name}</h1>
        <button onClick={openWhatsApp} className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
          <MessageCircle size={24} />
        </button>
      </div>

      {/* Customer Info */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="font-semibold">Customer Information</h2>
          <div className="flex gap-2">
            {editMode ? (
              <>
                <button onClick={() => setEditMode(false)} className="text-sm px-3 py-1 border border-crm-border rounded-lg">Cancel</button>
                <button onClick={handleUpdate} className="text-sm px-3 py-1 bg-crm-primary text-white rounded-lg font-medium">Save</button>
              </>
            ) : (
              <>
                <button onClick={() => setEditMode(true)} className="p-1 text-crm-secondary hover:text-crm-primary"><Edit2 size={18} /></button>
                <button onClick={handleDelete} className="p-1 text-gray-500 hover:text-red-600"><Trash2 size={18} /></button>
              </>
            )}
          </div>
        </div>

        {editMode ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="px-3 py-2 border rounded-lg" placeholder="Name" />
            <input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} className="px-3 py-2 border rounded-lg" placeholder="WhatsApp" />
            <input value={form.country || ''} onChange={e => setForm({ ...form, country: e.target.value })} className="px-3 py-2 border rounded-lg" placeholder="Country" />
            <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} className="px-3 py-2 border rounded-lg sm:col-span-2" placeholder="Notes" />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">WhatsApp:</span> {customer.whatsapp}</div>
            <div><span className="text-gray-500">Country:</span> {customer.country || 'N/A'}</div>
            {customer.notes && <div className="sm:col-span-2"><span className="text-gray-500">Notes:</span> {customer.notes}</div>}
          </div>
        )}
      </div>

      {/* Recipients */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold flex items-center gap-2"><User size={18} /> Recipients in Sri Lanka</h2>
          <button onClick={() => setShowRecipientModal(true)} className="text-crm-primary text-sm flex items-center gap-1 font-medium hover:underline">
            <Plus size={16} /> Add
          </button>
        </div>
        <div className="divide-y">
          {customer.recipients.length === 0 ? (
            <p className="p-4 text-gray-500 text-center">No recipients added</p>
          ) : customer.recipients.map(r => (
            <div key={r.id} className="p-4 flex justify-between items-start">
              <div>
                <p className="font-medium">{r.name} {r.relationship && <span className="text-gray-500 text-sm">({r.relationship})</span>}</p>
                {r.phone && <p className="text-sm text-gray-500">{r.phone}</p>}
                {r.address && <p className="text-sm text-gray-500 flex items-center gap-1"><MapPin size={14} /> {r.address}</p>}
              </div>
              <button onClick={() => deleteRecipient(r.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Important Dates */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold flex items-center gap-2"><Calendar size={18} /> Important Dates</h2>
          <button onClick={() => setShowDateModal(true)} className="text-crm-primary text-sm flex items-center gap-1 font-medium hover:underline">
            <Plus size={16} /> Add
          </button>
        </div>
        <div className="divide-y">
          {customer.importantDates.length === 0 ? (
            <p className="p-4 text-gray-500 text-center">No dates added</p>
          ) : customer.importantDates.map(d => (
            <div key={d.id} className="p-4 flex justify-between items-center">
              <div>
                <p className="font-medium">{d.title}</p>
                <p className="text-sm text-crm-accent font-medium">{d.date}</p>
              </div>
              <button onClick={() => deleteDate(d.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Order History */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold flex items-center gap-2"><FileText size={18} /> Order History</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowQuickOrder(true)}
              className="text-crm-primary text-sm flex items-center gap-1 hover:bg-crm-accent px-3 py-1.5 rounded-lg border border-crm-border font-medium"
            >
              <Zap size={16} /> Quick Order
            </button>
            <Link to={`/invoices/new?customer=${id}`} className="text-crm-primary text-sm flex items-center gap-1 hover:bg-gray-100 px-3 py-1.5 rounded-lg border border-crm-border">
              <Plus size={16} /> Full Order
            </Link>
          </div>
        </div>
        <div className="divide-y">
          {customer.invoices.length === 0 ? (
            <p className="p-4 text-gray-500 text-center">No orders yet</p>
          ) : customer.invoices.map(inv => (
            <Link key={inv.id} to={`/invoices/${inv.id}`} className="p-4 flex justify-between items-center hover:bg-gray-50">
              <div>
                <p className="font-medium">{inv.invoice_number}</p>
                <p className="text-sm text-gray-500">{new Date(inv.created_at).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="font-medium">Rs. {inv.total.toLocaleString()}</p>
                <span className={`text-xs px-2 py-1 rounded-full ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {inv.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Add Recipient Modal */}
      {showRecipientModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Add Recipient</h2>
            <form onSubmit={addRecipient} className="space-y-4">
              <input value={recipientForm.name} onChange={e => setRecipientForm({ ...recipientForm, name: e.target.value })} placeholder="Name *" className="w-full px-3 py-2 border rounded-lg" required />
              <input value={recipientForm.phone} onChange={e => setRecipientForm({ ...recipientForm, phone: e.target.value })} placeholder="Phone" className="w-full px-3 py-2 border rounded-lg" />
              <input value={recipientForm.relationship} onChange={e => setRecipientForm({ ...recipientForm, relationship: e.target.value })} placeholder="Relationship (Mother, Wife...)" className="w-full px-3 py-2 border rounded-lg" />
              <textarea value={recipientForm.address} onChange={e => setRecipientForm({ ...recipientForm, address: e.target.value })} placeholder="Address" className="w-full px-3 py-2 border rounded-lg" rows={2} />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowRecipientModal(false)} className="px-4 py-2 border border-crm-border rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-crm-primary text-white rounded-lg font-medium">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Date Modal */}
      {showDateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Add Important Date</h2>
            <form onSubmit={addDate} className="space-y-4">
              <input value={dateForm.title} onChange={e => setDateForm({ ...dateForm, title: e.target.value })} placeholder="Title (Birthday, Anniversary...) *" className="w-full px-3 py-2 border rounded-lg" required />
              <input type="date" value={dateForm.date} onChange={e => setDateForm({ ...dateForm, date: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required />
              <select value={dateForm.recipient_id} onChange={e => setDateForm({ ...dateForm, recipient_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                <option value="">For whom? (optional)</option>
                {customer.recipients.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <textarea value={dateForm.notes} onChange={e => setDateForm({ ...dateForm, notes: e.target.value })} placeholder="Notes" className="w-full px-3 py-2 border rounded-lg" rows={2} />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowDateModal(false)} className="px-4 py-2 border border-crm-border rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-crm-primary text-white rounded-lg font-medium">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Order Modal */}
      {showQuickOrder && (
        <QuickOrderModal
          onClose={() => setShowQuickOrder(false)}
          preselectedCustomer={id}
        />
      )}
    </div>
  );
}
