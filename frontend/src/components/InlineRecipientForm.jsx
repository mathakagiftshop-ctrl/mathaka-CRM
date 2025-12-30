import { useState } from 'react';
import api from '../api';
import { Plus, X, User, MapPin, Check } from 'lucide-react';

export default function InlineRecipientForm({ customerId, onRecipientAdded, onCancel }) {
  const [form, setForm] = useState({
    name: '', phone: '', address: '', relationship: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) return;
    
    setLoading(true);
    try {
      const res = await api.post('/recipients', { ...form, customer_id: customerId });
      onRecipientAdded(res.data);
    } catch (err) {
      alert('Error adding recipient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-dashed border-purple-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-purple-800 flex items-center gap-2">
          <User size={18} /> Quick Add Recipient
        </h3>
        <button onClick={onCancel} className="p-1 hover:bg-white/50 rounded">
          <X size={18} className="text-gray-500" />
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Recipient name *"
            className="px-3 py-2 border rounded-lg text-sm"
            required
          />
          <input
            value={form.relationship}
            onChange={(e) => setForm({ ...form, relationship: e.target.value })}
            placeholder="Relationship (Mother, Wife...)"
            className="px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <input
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="Phone number"
          className="w-full px-3 py-2 border rounded-lg text-sm"
        />
        <div className="flex items-start gap-2">
          <MapPin size={16} className="text-gray-400 mt-2.5 flex-shrink-0" />
          <textarea
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Delivery address"
            className="flex-1 px-3 py-2 border rounded-lg text-sm"
            rows={2}
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !form.name}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? 'Adding...' : <><Check size={16} /> Add Recipient</>}
          </button>
        </div>
      </form>
    </div>
  );
}
