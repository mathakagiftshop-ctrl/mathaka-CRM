import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../App';
import { Plus, Truck, Trash2, Edit2 } from 'lucide-react';

export default function Vendors() {
  const { user } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '' });
  const [loading, setLoading] = useState(true);

  const fetchVendors = () => {
    api.get('/vendors').then(res => {
      setVendors(res.data);
      setLoading(false);
    });
  };

  useEffect(() => { fetchVendors(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      await api.put(`/vendors/${editingId}`, form);
    } else {
      await api.post('/vendors', form);
    }
    setShowModal(false);
    setEditingId(null);
    setForm({ name: '', phone: '', address: '', notes: '' });
    fetchVendors();
  };

  const handleEdit = (vendor) => {
    setForm(vendor);
    setEditingId(vendor.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this vendor?')) {
      await api.delete(`/vendors/${id}`);
      fetchVendors();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Vendors / Suppliers</h1>
        <button
          onClick={() => { setForm({ name: '', phone: '', address: '', notes: '' }); setEditingId(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
        >
          <Plus size={20} /> Add Vendor
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm divide-y">
        {loading ? (
          <p className="p-4 text-center">Loading...</p>
        ) : vendors.length === 0 ? (
          <p className="p-8 text-center text-gray-500">No vendors added yet</p>
        ) : (
          vendors.map(vendor => (
            <div key={vendor.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Truck className="text-orange-600" size={20} />
                </div>
                <div>
                  <p className="font-medium">{vendor.name}</p>
                  <p className="text-sm text-gray-500">{vendor.phone || 'No phone'} {vendor.address && `• ${vendor.address}`}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleEdit(vendor)} className="p-2 text-gray-500 hover:text-purple-600 rounded-lg">
                  <Edit2 size={18} />
                </button>
                {user?.role === 'admin' && (
                  <button onClick={() => handleDelete(vendor.id)} className="p-2 text-gray-500 hover:text-red-600 rounded-lg">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit' : 'Add'} Vendor</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Vendor Name *"
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
              <input
                value={form.phone || ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Phone"
                className="w-full px-3 py-2 border rounded-lg"
              />
              <input
                value={form.address || ''}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Address"
                className="w-full px-3 py-2 border rounded-lg"
              />
              <textarea
                value={form.notes || ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Notes"
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
              />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg">{editingId ? 'Update' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
