import { useState, useEffect } from 'react';
import api from '../api';
import { Plus, Package, Edit2, Trash2 } from 'lucide-react';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', category_id: '', price: '' });
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    Promise.all([
      api.get('/products'),
      api.get('/categories')
    ]).then(([p, c]) => {
      setProducts(p.data);
      setCategories(c.data);
      setLoading(false);
    });
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      await api.put(`/products/${editingId}`, form);
    } else {
      await api.post('/products', form);
    }
    setShowModal(false);
    setEditingId(null);
    setForm({ name: '', description: '', category_id: '', price: '' });
    fetchData();
  };

  const handleEdit = (product) => {
    setForm({
      name: product.name,
      description: product.description || '',
      category_id: product.category_id || '',
      price: product.price
    });
    setEditingId(product.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this product?')) {
      await api.delete(`/products/${id}`);
      fetchData();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Products / Gift Catalog</h1>
        <button
          onClick={() => { setForm({ name: '', description: '', category_id: '', price: '' }); setEditingId(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
        >
          <Plus size={20} /> Add Product
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm divide-y">
        {loading ? (
          <p className="p-4 text-center">Loading...</p>
        ) : products.length === 0 ? (
          <p className="p-8 text-center text-gray-500">No products yet. Add your first product!</p>
        ) : (
          products.map(product => (
            <div key={product.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Package className="text-purple-600" size={20} />
                </div>
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-gray-500">{product.category_name || 'No category'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-semibold text-purple-600">Rs. {parseFloat(product.price).toLocaleString()}</span>
                <button onClick={() => handleEdit(product)} className="p-2 text-gray-500 hover:text-purple-600">
                  <Edit2 size={18} />
                </button>
                <button onClick={() => handleDelete(product.id)} className="p-2 text-gray-500 hover:text-red-600">
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
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit' : 'Add'} Product</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Product Name *"
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Select Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="Price (Rs.) *"
                className="w-full px-3 py-2 border rounded-lg"
                required
                min="0"
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Description (optional)"
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
