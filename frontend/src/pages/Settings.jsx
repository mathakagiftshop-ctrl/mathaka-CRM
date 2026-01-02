import { useState, useEffect } from 'react';
import api from '../api';
import { Save, Upload, Building, CreditCard, Phone, Plus, Trash2 } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [bankAccounts, setBankAccounts] = useState([]);
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/settings').then(res => {
      setSettings(res.data);
      // Parse bank accounts and phone numbers from JSON strings
      try {
        setBankAccounts(JSON.parse(res.data.bank_accounts || '[]'));
      } catch { setBankAccounts([]); }
      try {
        setPhoneNumbers(JSON.parse(res.data.phone_numbers || '[]'));
      } catch { setPhoneNumbers([]); }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings', {
        ...settings,
        bank_accounts: JSON.stringify(bankAccounts),
        phone_numbers: JSON.stringify(phoneNumbers)
      });
      setMessage('Settings saved!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error saving settings');
    }
    setSaving(false);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('logo', file);

    try {
      await api.post('/settings/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSettings({ ...settings, logo_exists: true });
      setMessage('Logo uploaded!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error uploading logo');
    }
  };

  // Bank account handlers
  const addBankAccount = () => {
    setBankAccounts([...bankAccounts, { bank_name: '', account_name: '', account_number: '', branch: '' }]);
  };

  const updateBankAccount = (index, field, value) => {
    const updated = [...bankAccounts];
    updated[index][field] = value;
    setBankAccounts(updated);
  };

  const removeBankAccount = (index) => {
    setBankAccounts(bankAccounts.filter((_, i) => i !== index));
  };

  // Phone number handlers
  const addPhoneNumber = () => {
    setPhoneNumbers([...phoneNumbers, { label: '', number: '' }]);
  };

  const updatePhoneNumber = (index, field, value) => {
    const updated = [...phoneNumbers];
    updated[index][field] = value;
    setPhoneNumbers(updated);
  };

  const removePhoneNumber = (index) => {
    setPhoneNumbers(phoneNumbers.filter((_, i) => i !== index));
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-crm-primary">Settings</h1>

      {message && (
        <div className={`px-4 py-3 rounded-lg ${message.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
          {message}
        </div>
      )}

      {/* Logo */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><Upload size={18} /> Logo</h2>
        <div className="flex items-center gap-4">
          {settings.logo_exists ? (
            <img src="/api/settings/logo" alt="Logo" className="w-20 h-20 object-contain border rounded-lg" />
          ) : (
            <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
              No logo
            </div>
          )}
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
              id="logo-upload"
            />
            <label
              htmlFor="logo-upload"
              className="cursor-pointer px-4 py-2 bg-crm-primary text-white rounded-lg hover:bg-gray-800 inline-block font-medium transition-colors"
            >
              Upload Logo
            </label>
            <p className="text-xs text-gray-500 mt-1">PNG recommended. Will appear on invoices & receipts.</p>
          </div>
        </div>
      </div>

      {/* Business Info */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Building size={18} /> Business Information</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Business Name</label>
            <input
              value={settings.business_name || ''}
              onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              value={settings.business_email || ''}
              onChange={(e) => setSettings({ ...settings, business_email: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Currency Symbol</label>
            <input
              value={settings.currency || ''}
              onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Rs."
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Address</label>
            <textarea
              value={settings.business_address || ''}
              onChange={(e) => setSettings({ ...settings, business_address: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Phone Numbers */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold flex items-center gap-2"><Phone size={18} /> Phone Numbers</h2>
          <button onClick={addPhoneNumber} className="text-crm-primary text-sm flex items-center gap-1 font-medium hover:underline">
            <Plus size={16} /> Add Phone
          </button>
        </div>

        {phoneNumbers.length === 0 ? (
          <p className="text-gray-500 text-sm">No phone numbers added. Click "Add Phone" to add one.</p>
        ) : (
          <div className="space-y-3">
            {phoneNumbers.map((phone, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <input
                    value={phone.label}
                    onChange={(e) => updatePhoneNumber(index, 'label', e.target.value)}
                    placeholder="Label (e.g., WhatsApp, Office)"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    value={phone.number}
                    onChange={(e) => updatePhoneNumber(index, 'number', e.target.value)}
                    placeholder="Phone number"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <button onClick={() => removePhoneNumber(index)} className="p-2 text-red-500 hover:bg-red-50 rounded">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bank Accounts */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold flex items-center gap-2"><CreditCard size={18} /> Bank Accounts</h2>
          <button onClick={addBankAccount} className="text-crm-primary text-sm flex items-center gap-1 font-medium hover:underline">
            <Plus size={16} /> Add Account
          </button>
        </div>

        {bankAccounts.length === 0 ? (
          <p className="text-gray-500 text-sm">No bank accounts added. Click "Add Account" to add one.</p>
        ) : (
          <div className="space-y-4">
            {bankAccounts.map((account, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">Account {index + 1}</span>
                  <button onClick={() => removeBankAccount(index)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    value={account.bank_name}
                    onChange={(e) => updateBankAccount(index, 'bank_name', e.target.value)}
                    placeholder="Bank Name"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    value={account.account_name}
                    onChange={(e) => updateBankAccount(index, 'account_name', e.target.value)}
                    placeholder="Account Name"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    value={account.account_number}
                    onChange={(e) => updateBankAccount(index, 'account_number', e.target.value)}
                    placeholder="Account Number"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    value={account.branch}
                    onChange={(e) => updateBankAccount(index, 'branch', e.target.value)}
                    placeholder="Branch"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invoice/Receipt Prefixes */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="font-semibold">Document Prefixes</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Invoice Prefix</label>
            <input
              value={settings.invoice_prefix || ''}
              onChange={(e) => setSettings({ ...settings, invoice_prefix: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="INV"
            />
            <p className="text-xs text-gray-500 mt-1">e.g., INV-2025-0001</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Receipt Prefix</label>
            <input
              value={settings.receipt_prefix || ''}
              onChange={(e) => setSettings({ ...settings, receipt_prefix: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="RCP"
            />
            <p className="text-xs text-gray-500 mt-1">e.g., RCP-2025-0001</p>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-6 py-3 bg-crm-primary text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 font-bold transition-colors"
      >
        <Save size={18} /> {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}
