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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-crm-border flex justify-between items-center bg-white">
          <h2 className="text-xl font-bold text-crm-primary">New Customer Setup</h2>
          <button onClick={onClose} className="p-2 hover:bg-crm-background rounded-lg text-crm-secondary hover:text-crm-primary">
            <X size={20} />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-crm-border bg-crm-background">
          <div className="flex items-center justify-between">
            {steps.map((s, i) => (
              <div key={s.num} className="flex items-center">
                <div className={`flex items-center gap-2 ${step >= s.num ? 'text-crm-primary' : 'text-crm-secondary'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step > s.num ? 'bg-crm-success text-white' :
                      step === s.num ? 'bg-crm-primary text-white' : 'bg-gray-200'
                    }`}>
                    {step > s.num ? <Check size={16} /> : <s.icon size={16} />}
                  </div>
                  <span className="text-sm font-medium hidden sm:block">{s.title}</span>
                </div>
                {i < steps.length - 1 && (
                  <ChevronRight className="mx-2 text-crm-border" size={20} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Customer Info */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-crm-secondary mb-4">Let's start with the basic customer information.</p>

              {duplicateWarning && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Possible duplicate!</p>
                    <p className="text-sm text-yellow-700">Customer exists: <strong>{duplicateWarning.name}</strong></p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1 text-crm-secondary">Name *</label>
                <input
                  type="text"
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  className="w-full px-4 py-3 border border-crm-border rounded-xl focus:ring-1 focus:ring-crm-primary outline-none"
                  placeholder="Customer name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-crm-secondary">WhatsApp Number *</label>
                <input
                  type="text"
                  value={customerForm.whatsapp}
                  onChange={(e) => setCustomerForm({ ...customerForm, whatsapp: e.target.value })}
                  onBlur={checkDuplicate}
                  className="w-full px-4 py-3 border border-crm-border rounded-xl focus:ring-1 focus:ring-crm-primary outline-none"
                  placeholder="+971XXXXXXXXX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-crm-secondary">Country</label>
                <input
                  type="text"
                  value={customerForm.country}
                  onChange={(e) => setCustomerForm({ ...customerForm, country: e.target.value })}
                  className="w-full px-4 py-3 border border-crm-border rounded-xl focus:ring-1 focus:ring-crm-primary outline-none"
                  placeholder="UAE, Qatar, Saudi..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-crm-secondary">Notes</label>
                <textarea
                  value={customerForm.notes}
                  onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
                  className="w-full px-4 py-3 border border-crm-border rounded-xl focus:ring-1 focus:ring-crm-primary outline-none"
                  rows={2}
                  placeholder="Any notes about this customer..."
                />
              </div>
            </div>
          )}

          {/* Step 2: Recipients */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-crm-secondary mb-4">Add recipients in Sri Lanka who will receive gifts.</p>

              {/* Add Recipient Form */}
              <div className="p-4 bg-crm-background rounded-xl space-y-3 border border-crm-border">
                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    value={recipientForm.name}
                    onChange={(e) => setRecipientForm({ ...recipientForm, name: e.target.value })}
                    placeholder="Recipient name *"
                    className="px-3 py-2 border border-crm-border rounded-lg"
                  />
                  <input
                    value={recipientForm.relationship}
                    onChange={(e) => setRecipientForm({ ...recipientForm, relationship: e.target.value })}
                    placeholder="Relationship (Mother, Wife...)"
                    className="px-3 py-2 border border-crm-border rounded-lg"
                  />
                </div>
                <input
                  value={recipientForm.phone}
                  onChange={(e) => setRecipientForm({ ...recipientForm, phone: e.target.value })}
                  placeholder="Phone number"
                  className="w-full px-3 py-2 border border-crm-border rounded-lg"
                />
                <textarea
                  value={recipientForm.address}
                  onChange={(e) => setRecipientForm({ ...recipientForm, address: e.target.value })}
                  placeholder="Delivery address"
                  className="w-full px-3 py-2 border border-crm-border rounded-lg"
                  rows={2}
                />
                <button
                  type="button"
                  onClick={addRecipient}
                  disabled={!recipientForm.name}
                  className="w-full py-2 btn-ghost border border-crm-border text-crm-primary rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Plus size={18} /> Add Recipient
                </button>
              </div>

              {/* Recipients List */}
              {recipients.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-crm-secondary">Added Recipients ({recipients.length})</h3>
                  {recipients.map(r => (
                    <div key={r.tempId} className="p-3 bg-white border border-crm-border rounded-lg flex justify-between items-start">
                      <div>
                        <p className="font-medium text-crm-primary">{r.name} {r.relationship && <span className="text-crm-secondary">({r.relationship})</span>}</p>
                        {r.address && <p className="text-sm text-crm-secondary">{r.address}</p>}
                      </div>
                      <button onClick={() => removeRecipient(r.tempId)} className="p-1 text-crm-danger hover:bg-red-50 rounded">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Important Dates */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-crm-secondary mb-4">Add birthdays, anniversaries, and other important dates.</p>

              {/* Add Date Form */}
              <div className="p-4 bg-crm-background rounded-xl space-y-3 border border-crm-border">
                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    value={dateForm.title}
                    onChange={(e) => setDateForm({ ...dateForm, title: e.target.value })}
                    placeholder="Event (Birthday, Anniversary...) *"
                    className="px-3 py-2 border border-crm-border rounded-lg"
                  />
                  <input
                    type="date"
                    value={dateForm.date}
                    onChange={(e) => setDateForm({ ...dateForm, date: e.target.value })}
                    className="px-3 py-2 border border-crm-border rounded-lg"
                  />
                </div>
                {recipients.length > 0 && (
                  <select
                    value={dateForm.recipient_id}
                    onChange={(e) => setDateForm({ ...dateForm, recipient_id: e.target.value })}
                    className="w-full px-3 py-2 border border-crm-border rounded-lg"
                  >
                    <option value="">For whom? (optional)</option>
                    {recipients.map(r => <option key={r.tempId} value={r.tempId}>{r.name}</option>)}
                  </select>
                )}
                <textarea
                  value={dateForm.notes}
                  onChange={(e) => setDateForm({ ...dateForm, notes: e.target.value })}
                  placeholder="Notes (gift preferences, etc.)"
                  className="w-full px-3 py-2 border border-crm-border rounded-lg"
                  rows={2}
                />
                <button
                  type="button"
                  onClick={addDate}
                  disabled={!dateForm.title || !dateForm.date}
                  className="w-full py-2 btn-ghost border border-crm-border text-crm-primary rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Plus size={18} /> Add Date
                </button>
              </div>

              {/* Dates List */}
              {dates.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-crm-secondary">Added Dates ({dates.length})</h3>
                  {dates.map(d => (
                    <div key={d.tempId} className="p-3 bg-white border border-crm-border rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-medium text-crm-primary">{d.title}</p>
                        <p className="text-sm text-crm-accent">{d.date}</p>
                      </div>
                      <button onClick={() => removeDate(d.tempId)} className="p-1 text-crm-danger hover:bg-red-50 rounded">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-crm-border bg-gray-50 flex justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 border border-crm-border text-crm-secondary rounded-lg flex items-center gap-2 hover:bg-white transition-colors"
            >
              <ChevronLeft size={18} /> Back
            </button>
          ) : (
            <button onClick={onClose} className="px-4 py-2 border border-crm-border text-crm-secondary rounded-lg hover:bg-white transition-colors">
              Cancel
            </button>
          )}

          {step === 1 && (
            <button
              onClick={handleCreateCustomer}
              disabled={loading || !customerForm.name || !customerForm.whatsapp}
              className="px-6 py-2 btn-primary rounded-lg disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? 'Creating...' : 'Next'} <ChevronRight size={18} />
            </button>
          )}

          {step === 2 && (
            <div className="flex gap-2">
              <button
                onClick={() => setStep(3)}
                className="px-4 py-2 text-crm-secondary hover:text-crm-primary hover:bg-crm-background rounded-lg"
              >
                Skip
              </button>
              <button
                onClick={saveRecipients}
                disabled={loading}
                className="px-6 py-2 btn-primary rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? 'Saving...' : recipients.length > 0 ? 'Save & Continue' : 'Next'} <ChevronRight size={18} />
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="flex gap-2">
              <button
                onClick={() => onComplete(customerId)}
                className="px-4 py-2 text-crm-secondary hover:text-crm-primary hover:bg-crm-background rounded-lg"
              >
                Skip & Finish
              </button>
              <button
                onClick={saveDatesAndFinish}
                disabled={loading}
                className="px-6 py-2 bg-crm-success text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-2 shadow-sm"
              >
                {loading ? 'Saving...' : <><Check size={18} /> Complete Setup</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
