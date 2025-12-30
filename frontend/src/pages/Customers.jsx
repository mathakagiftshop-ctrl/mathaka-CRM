import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { Plus, Search, MessageCircle, User, AlertTriangle, Sparkles } from 'lucide-react';
import CustomerOnboardingWizard from '../components/CustomerOnboardingWizard';

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [form, setForm] = useState({ name: '', whatsapp: '', country: '', notes: '' });
  const [loading, setLoading] = useState(true);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchCustomers = () => {
    api.get('/customers', { params: { search: search || undefined } })
      .then(res => {
        setCustomers(res.data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  // Check for duplicate on blur
  const checkDuplicate = async () => {
    if (!form.whatsapp) {
      setDuplicateWarning(null);
      return;
    }

    try {
      const res = await api.get('/customers/check-duplicate', { params: { whatsapp: form.whatsapp } });
      if (res.data.exists) {
        setDuplicateWarning(res.data.customer);
      } else {
        setDuplicateWarning(null);
      }
    } catch (err) {
      setDuplicateWarning(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // If there's a duplicate warning but user proceeds, skip the check
      const payload = duplicateWarning ? { ...form, skipDuplicateCheck: true } : form;
      await api.post('/customers', payload);
      setShowModal(false);
      setForm({ name: '', whatsapp: '', country: '', notes: '' });
      setDuplicateWarning(null);
      fetchCustomers();
    } catch (err) {
      if (err.response?.status === 409) {
        setDuplicateWarning(err.response.data.existingCustomer);
      } else {
        alert('Error creating customer');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openWhatsApp = (phone, name) => {
    const message = encodeURIComponent(`Hi ${name}! This is Mathaka Gift Store.`);
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${message}`, '_blank');
  };

  const goToExisting = () => {
    if (duplicateWarning?.id) {
      setShowModal(false);
      navigate(`/customers/${duplicateWarning.id}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h1 className="text-2xl font-bold text-crm-primary">Customers</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 btn-ghost border border-crm-border text-crm-primary"
          >
            <Plus size={20} /> Quick Add
          </button>
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 btn-primary px-4 py-2 rounded-lg"
          >
            <Sparkles size={20} /> New Customer Setup
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-crm-border rounded-lg focus:ring-1 focus:ring-crm-primary outline-none"
        />
      </div>

      {/* Customer List */}
      <div className="panel bg-white divide-y divide-gray-100">
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="spinner h-8 w-8"></div>
          </div>
        ) : customers.length === 0 ? (
          <p className="p-8 text-center text-crm-secondary">No customers found</p>
        ) : (
          customers.map(customer => (
            <div key={customer.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <Link to={`/customers/${customer.id}`} className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 bg-crm-background border border-crm-border rounded-lg flex items-center justify-center">
                  <User className="text-crm-secondary" size={20} />
                </div>
                <div>
                  <p className="font-medium text-crm-primary">{customer.name}</p>
                  <p className="text-sm text-crm-secondary">{customer.whatsapp} • {customer.country || 'N/A'}</p>
                </div>
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-gray-100 text-crm-secondary px-2 py-1 rounded">
                  {customer.invoice_count} orders
                </span>
                <button
                  onClick={() => openWhatsApp(customer.whatsapp, customer.name)}
                  className="p-2 text-crm-success hover:bg-green-50 rounded-lg"
                >
                  <MessageCircle size={20} />
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
            <h2 className="text-xl font-bold mb-4">Quick Add Customer</h2>

            {/* Duplicate Warning */}
            {duplicateWarning && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Possible duplicate found!</p>
                    <p className="text-sm text-yellow-700">
                      A customer with this WhatsApp already exists: <strong>{duplicateWarning.name}</strong>
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={goToExisting}
                        className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                      >
                        View Existing
                      </button>
                      <button
                        type="button"
                        onClick={() => setDuplicateWarning(null)}
                        className="text-xs px-2 py-1 text-yellow-600 hover:text-yellow-800"
                      >
                        Create Anyway
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">WhatsApp Number *</label>
                <input
                  type="text"
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  onBlur={checkDuplicate}
                  placeholder="+971XXXXXXXXX"
                  className={`w-full px-3 py-2 border rounded-lg ${duplicateWarning ? 'border-yellow-400' : ''}`}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Country</label>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  placeholder="UAE, Qatar, Saudi..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setDuplicateWarning(null); }}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : duplicateWarning ? 'Add Anyway' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Onboarding Wizard */}
      {showWizard && (
        <CustomerOnboardingWizard
          onClose={() => setShowWizard(false)}
          onComplete={(customerId) => {
            setShowWizard(false);
            fetchCustomers();
            navigate(`/customers/${customerId}`);
          }}
        />
      )}
    </div>
  );
}
