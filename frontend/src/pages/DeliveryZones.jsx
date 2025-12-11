import { useState, useEffect } from 'react';
import api from '../api';
import { Plus, MapPin, Edit2, Trash2 } from 'lucide-react';

export default function DeliveryZones() {
  const [zones, setZones] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', areas: '', delivery_fee: '' });
  const [loading, setLoading] = useState(true);

  const fetchZones = () => {
    api.get('/delivery-zones').then(res => {
      setZones(res.data);
      setLoading(false);
    });
  };

  useEffect(() => { fetchZones(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      await api.put(`/delivery-zones/${editingId}`, form);
    } else {
      await api.post('/delivery-zones', form);
    }
    setShowModal(false);
    setEditingId(null);
    setForm({ name: '', areas: '', delivery_fee: '' });
    fetchZones();
  };

  const handleEdit = (zone) => {
    setForm({ name: zone.name, areas: zone.areas || '', delivery_fee: zone.delivery_fee });
    setEditingId(zone.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this delivery zone?')) {
      await api.delete(`/delivery-zones/${id}`);
      fetchZones();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Delivery Zones</h1>
        <button
          onClick={() => { setForm({ name: '', areas: '', delivery_fee: '' }); setEditingId(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
        >
          <Plus size={20} /> Add Zone
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm divide-y">
        {loading ? (
          <p className="p-4 text-center">Loading...</p>
        ) : zones.length === 0 ? (
          <p className="p-8 text-center text-gray-500">No delivery zones configured</p>
        ) : (
          zones.map(zone => (
            <div key={zone.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <MapPin className="text-blue-600" size={20} />
                </div>
                <div>
                  <p className="font-medium">{zone.name}</p>
                  <p className="text-sm text-gray-500">{zone.areas || 'No areas specified'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-semibold text-blue-600">Rs. {parseFloat(zone.delivery_fee).toLocaleString()}</span>
                <button onClick={() => handleEdit(zone)} className="p-2 text-gray-500 hover:text-purple-600">
                  <Edit2 size={18} />
                </button>
                <button onClick={() => handleDelete(zone.id)} className="p-2 text-gray-500 hover:text-red-600">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit' : 'Add'} Delivery Zone</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Zone Name (e.g., Colombo) *"
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
              <textarea
                value={form.areas}
                onChange={(e) => setForm({ ...form, areas: e.target.value })}
                placeholder="Areas covered (e.g., Colombo 1-15, Dehiwala)"
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
              />
              <input
                type="number"
                value={form.delivery_fee}
                onChange={(e) => setForm({ ...form, delivery_fee: e.target.value })}
                placeholder="Delivery Fee (Rs.) *"
                className="w-full px-3 py-2 border rounded-lg"
                required
                min="0"
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
