import { useState } from 'react';
import api from '../api';
import { X, User, Users, Calendar, ChevronRight, ChevronLeft, Check, Plus, Trash2, AlertTriangle } from 'lucide-react';

export default function CustomerOnboardingWizard({ onClose, onComplete }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  // Step 1: Customer Info
  const [customerForm, setCustomerForm] = useState({
    name: '', whatsapp: '', country: '', notes: ''
  });

  // Step 2: Recipients
  const [recipients, setRecipients] = useState([]);
  const [recipientForm, setRecipientForm] = useState({
    name: '', phone: '', address: '', relationship: ''
  });

  // Step 3: Important Dates
  const [dates, setDates] = useState([]);
  const [dateForm, setDateForm] = useState({
    title: '', date: '', recipient_id: '', notes: ''
  });

  const steps = [
    { num: 1, title: 'Customer Info', icon: User },
    { num: 2, title: 'Recipients', icon: Users },
    { num: 3, title: 'Important Dates', icon: Calendar },
  ];

  // Check for duplicate customer
  const checkDuplicate = async () => {
    if (!customerForm.whatsapp) {
      setDuplicateWarning(null);
      return;
    }
    try {
      const res = await api.get('/customers/check-duplicate', { params: { whatsapp: customerForm.whatsapp } });
      if (res.data.exists) {
        setDuplicateWarning(res.data.customer);
      } else {
        setDuplicateWarning(null);
      }
    } catch (err) {
      setDuplicateWarning(null);
    }
  };

  // Step 1: Create Customer
  const handleCreateCustomer = async () => {
    if (!customerForm.name || !customerForm.whatsapp) {
      alert('Please fill in name and WhatsApp number');
      return;
    }
    setLoading(true);
    try {
      const payload = duplicateWarning ? { ...customerForm, skipDuplicateCheck: true } : customerForm;
      const res = await api.post('/customers', payload);
      setCustomerId(res.data.id);
      setStep(2);
    } catch (err) {
      if (err.response?.status === 409) {
        setDuplicateWarning(err.response.data.existingCustomer);
      } else {
        alert('Error creating customer');
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Add Recipients
  const addRecipient = () => {
    if (!recipientForm.name) return;
    setRecipients([...recipients, { ...recipientForm, tempId: Date.now() }]);
    setRecipientForm({ name: '', phone: '', address: '', relationship: '' });
  };

  const removeRecipient = (tempId) => {
    setRecipients(recipients.filter(r => r.tempId !== tempId));
  };

  const saveRecipients = async () => {
    setLoading(true);
    try {
      for (const r of recipients) {
        await api.post('/recipients', { ...r, customer_id: customerId });
      }
      setStep(3);
    } catch (err) {
      alert('Error saving recipients');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Add Important Dates
  const addDate = () => {
    if (!dateForm.title || !dateForm.date) return;
    setDates([...dates, { ...dateForm, tempId: Date.now() }]);
    setDateForm({ title: '', date: '', recipient_id: '', notes: '' });
  };

  const removeDate = (tempId) => {
    setDates(dates.filter(d => d.tempId !== tempId));
  };

  const saveDatesAndFinish = async () => {
    setLoading(true);
    try {
      for (const d of dates) {
        await api.post('/important-dates', { ...d, customer_id: customerId, recurring: true });
      }
      onComplete(customerId);
    } catch (err) {
      alert('Error saving dates');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl w-full max-w-4xl h-[600px] flex overflow-hidden shadow-2xl ring-1 ring-black/5">

        {/* Left Sidebar - Steps */}
        <div className="w-1/3 bg-gray-50 p-6 border-r border-crm-border flex flex-col">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-crm-primary">New Customer</h2>
            <p className="text-sm text-crm-secondary mt-1">Complete these steps to onboard.</p>
          </div>

          <div className="space-y-6 flex-1">
            {steps.map((s, i) => (
              <div key={s.num} className="relative flex gap-4">
                {/* Vertical Line */}
                {i < steps.length - 1 && (
                  <div className={`absolute left-4 top-8 bottom-[-24px] w-0.5 ${step > s.num ? 'bg-crm-accent' : 'bg-gray-200'}`} />
                )}

                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-colors ${step > s.num ? 'bg-crm-accent border-crm-accent text-crm-primary' :
                    step === s.num ? 'bg-crm-primary border-crm-primary text-white' :
                      'bg-white border-gray-300 text-gray-400'
                  }`}>
                  {step > s.num ? <Check size={16} /> : <span className="text-xs font-bold">{s.num}</span>}
                </div>
                <div>
                  <p className={`font-medium text-sm ${step === s.num ? 'text-crm-primary' : 'text-crm-secondary'}`}>
                    {s.title}
                  </p>
                  <p className="text-xs text-crm-secondary mt-0.5">
                    {i === 0 ? 'Basic details' : i === 1 ? 'Delivery contacts' : 'Birthdays & events'}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <button onClick={onClose} className="flex items-center gap-2 text-crm-secondary hover:text-crm-primary mt-auto text-sm font-medium">
            <ChevronLeft size={16} /> Cancel Setup
          </button>
        </div>

        {/* Right Content */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="flex-1 overflow-y-auto p-8 relative">
            {/* Context Header for Mobile/Small views removed as this is a large modal */}

            {/* Step 1: Customer Info */}
            {step === 1 && (
              <div className="space-y-6 animate-fadeIn">
                <h3 className="text-xl font-bold text-crm-primary">Basic Information</h3>

                {duplicateWarning && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-4">
                    <div className="bg-yellow-100 p-2 rounded-full text-yellow-700">
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-yellow-900">Possible Duplicate</h4>
                      <p className="text-sm text-yellow-800 mt-1">
                        A customer named <strong>{duplicateWarning.name}</strong> already exists with this number.
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid gap-6">
                  <div className="group">
                    <label className="block text-sm font-medium text-crm-secondary mb-2 group-focus-within:text-crm-primary transition-colors">Full Name *</label>
                    <input
                      type="text"
                      value={customerForm.name}
                      onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl ring-1 ring-gray-200 focus:ring-2 focus:ring-crm-accent outline-none transition-all"
                      placeholder="e.g. Sarah Connor"
                    />
                  </div>

                  <div className="group">
                    <label className="block text-sm font-medium text-crm-secondary mb-2 group-focus-within:text-crm-primary transition-colors">WhatsApp Number *</label>
                    <input
                      type="text"
                      value={customerForm.whatsapp}
                      onChange={(e) => setCustomerForm({ ...customerForm, whatsapp: e.target.value })}
                      onBlur={checkDuplicate}
                      className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl ring-1 ring-gray-200 focus:ring-2 focus:ring-crm-accent outline-none transition-all"
                      placeholder="+971..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="group">
                      <label className="block text-sm font-medium text-crm-secondary mb-2">Country</label>
                      <input
                        type="text"
                        value={customerForm.country}
                        onChange={(e) => setCustomerForm({ ...customerForm, country: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl ring-1 ring-gray-200 focus:ring-2 focus:ring-crm-accent outline-none"
                        placeholder="UAE"
                      />
                    </div>
                  </div>

                  <div className="group">
                    <label className="block text-sm font-medium text-crm-secondary mb-2">Internal Notes</label>
                    <textarea
                      value={customerForm.notes}
                      onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl ring-1 ring-gray-200 focus:ring-2 focus:ring-crm-accent outline-none"
                      rows={3}
                      placeholder="Preferences, referral source, etc."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 & 3 content logic remains largely same layout but wrapped in this cleaner structure */}
            {/* Truncated for brevity... implementing similar clean inputs for Step 2 and 3 */}
            {step === 2 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-crm-primary">Recipients</h3>
                  <div className="bg-crm-accent px-3 py-1 rounded-full text-xs font-bold text-crm-primary">
                    {recipients.length} Added
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-6 ring-1 ring-gray-200">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <input
                      value={recipientForm.name}
                      onChange={e => setRecipientForm({ ...recipientForm, name: e.target.value })}
                      placeholder="Recipient Name"
                      className="px-4 py-2 bg-white rounded-lg border-0 ring-1 ring-gray-200 focus:ring-2 focus:ring-crm-accent outline-none"
                    />
                    <input
                      value={recipientForm.relationship}
                      onChange={e => setRecipientForm({ ...recipientForm, relationship: e.target.value })}
                      placeholder="Relationship"
                      className="px-4 py-2 bg-white rounded-lg border-0 ring-1 ring-gray-200 focus:ring-2 focus:ring-crm-accent outline-none"
                    />
                  </div>
                  <textarea
                    value={recipientForm.address}
                    onChange={e => setRecipientForm({ ...recipientForm, address: e.target.value })}
                    placeholder="Full Address & Phone"
                    rows={2}
                    className="w-full px-4 py-2 bg-white rounded-lg border-0 ring-1 ring-gray-200 focus:ring-2 focus:ring-crm-accent outline-none mb-4"
                  />
                  <button onClick={addRecipient} disabled={!recipientForm.name} className="w-full py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors">
                    + Add Recipient
                  </button>
                </div>

                <div className="space-y-3">
                  {recipients.map(r => (
                    <div key={r.tempId} className="flex justify-between items-center p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                      <div>
                        <p className="font-bold text-crm-primary">{r.name}</p>
                        <p className="text-sm text-crm-secondary">{r.relationship} • {r.address}</p>
                      </div>
                      <button onClick={() => removeRecipient(r.tempId)} className="text-gray-400 hover:text-red-500 p-2"><Trash2 size={16} /></button>
                    </div>
                  ))}
                  {recipients.length === 0 && (
                    <div className="text-center py-8 text-crm-secondary italic">No recipients added yet.</div>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-fadeIn">
                <h3 className="text-xl font-bold text-crm-primary">Important Dates</h3>
                <div className="bg-gray-50 rounded-2xl p-6 ring-1 ring-gray-200">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <input
                      value={dateForm.title}
                      onChange={e => setDateForm({ ...dateForm, title: e.target.value })}
                      placeholder="Event (e.g. Birthday)"
                      className="px-4 py-2 bg-white rounded-lg border-0 ring-1 ring-gray-200 focus:ring-2 focus:ring-crm-accent outline-none"
                    />
                    <input
                      type="date"
                      value={dateForm.date}
                      onChange={e => setDateForm({ ...dateForm, date: e.target.value })}
                      className="px-4 py-2 bg-white rounded-lg border-0 ring-1 ring-gray-200 focus:ring-2 focus:ring-crm-accent outline-none"
                    />
                  </div>
                  <button onClick={addDate} disabled={!dateForm.title} className="w-full py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors">
                    + Add Date
                  </button>
                </div>

                <div className="space-y-3">
                  {dates.map(d => (
                    <div key={d.tempId} className="flex justify-between items-center p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="bg-crm-accent/20 text-crm-primary p-2 rounded-lg font-bold text-xs flex flex-col items-center">
                          <span>{new Date(d.date).toLocaleString('default', { month: 'short' })}</span>
                          <span className="text-lg">{new Date(d.date).getDate()}</span>
                        </div>
                        <div>
                          <p className="font-bold text-crm-primary">{d.title}</p>
                        </div>
                      </div>
                      <button onClick={() => removeDate(d.tempId)} className="text-gray-400 hover:text-red-500 p-2"><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-crm-border bg-white flex justify-end gap-3 z-10">
            {step === 1 && (
              <button onClick={handleCreateCustomer} disabled={loading} className="px-8 py-3 bg-crm-accent text-crm-primary font-bold rounded-xl hover:bg-crm-accentHover transition-colors flex items-center gap-2">
                Next Step <ChevronRight size={18} />
              </button>
            )}
            {step === 2 && (
              <>
                <button onClick={() => setStep(3)} className="px-6 py-3 text-crm-secondary hover:bg-gray-100 rounded-xl font-medium">Skip</button>
                <button onClick={saveRecipients} disabled={loading} className="px-8 py-3 bg-crm-accent text-crm-primary font-bold rounded-xl hover:bg-crm-accentHover transition-colors">
                  Continue
                </button>
              </>
            )}
            {step === 3 && (
              <>
                <button onClick={() => onComplete(customerId)} className="px-6 py-3 text-crm-secondary hover:bg-gray-100 rounded-xl font-medium">Skip</button>
                <button onClick={saveDatesAndFinish} disabled={loading} className="px-8 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-colors flex items-center gap-2">
                  <Check size={18} /> Complete Setup
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
