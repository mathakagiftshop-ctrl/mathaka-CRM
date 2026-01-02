import { useState, useEffect } from 'react';
import api from '../api';
import { Plus, Package, Edit2, Trash2, Box, Tag } from 'lucide-react';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState('product');
  const [form, setForm] = useState({
    name: '',
    description: '',
    category_id: '',
    cost_price: '',
    product_type: 'product'
  });
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

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const payload = {
      ...form,
      cost_price: parseFloat(form.cost_price) || 0
    };

    try {
      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
      } else {
        await api.post('/products', payload);
      }
      setShowModal(false);
      setEditingId(null);
      setForm({ name: '', description: '', category_id: '', cost_price: '', product_type: 'product' });
      fetchData();
    } catch (err) {
      console.error('Product save error:', err);
      setError(err.response?.data?.error || 'Failed to save product. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (product) => {
    setForm({
      name: product.name,
      description: product.description || '',
      category_id: product.category_id || '',
      cost_price: product.cost_price || '',
      product_type: product.product_type || 'product'
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

  const openAddModal = (type) => {
    setForm({
      name: '',
      description: '',
      category_id: '',
      cost_price: '',
      product_type: type
    });
    setEditingId(null);
    setError('');
    setShowModal(true);
  };

  const filteredProducts = products.filter(p => p.product_type === activeTab);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-crm-primary">Products & Packaging</h1>
        <button
          onClick={() => openAddModal(activeTab)}
          className="flex items-center gap-2 btn-primary px-4 py-2 rounded-lg"
        >
          <Plus size={20} /> Add {activeTab === 'product' ? 'Product' : 'Packaging'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-crm-border">
        <button
          onClick={() => setActiveTab('product')}
          className={`px-4 py-2 font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'product'
            ? 'border-crm-primary text-crm-primary'
            : 'border-transparent text-crm-secondary hover:text-crm-primary'
            }`}
        >
          <Package size={18} /> Products
        </button>
        <button
          onClick={() => setActiveTab('packaging')}
          className={`px-4 py-2 font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'packaging'
            ? 'border-crm-primary text-crm-primary'
            : 'border-transparent text-crm-secondary hover:text-crm-primary'
            }`}
        >
          <Box size={18} /> Packaging Materials
        </button>
      </div>

      <div className="panel bg-white divide-y divide-gray-100">
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="spinner h-8 w-8"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <p className="p-8 text-center text-crm-secondary">
            No {activeTab === 'product' ? 'products' : 'packaging materials'} yet. Add your first one!
          </p>
        ) : (
          filteredProducts.map(product => (
            <div key={product.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg border border-crm-border flex items-center justify-center ${product.product_type === 'packaging' ? 'bg-orange-50' : 'bg-crm-background'
                  }`}>
                  {product.product_type === 'packaging'
                    ? <Box className="text-orange-600" size={20} />
                    : <Package className="text-crm-primary" size={20} />
                  }
                </div>
                <div>
                  <p className="font-medium text-crm-primary">{product.name}</p>
                  <p className="text-sm text-crm-secondary">
                    {product.category_name || (product.product_type === 'packaging' ? 'Packaging' : 'No category')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm">
                    <span className="text-crm-secondary">Cost:</span>
                    <span className="ml-1 text-crm-primary font-semibold">Rs. {parseFloat(product.cost_price || 0).toLocaleString()}</span>
                  </div>
                </div>
                <button onClick={() => handleEdit(product)} className="p-2 text-crm-secondary hover:text-crm-primary">
                  <Edit2 size={18} />
                </button>
                <button onClick={() => handleDelete(product.id)} className="p-2 text-crm-secondary hover:text-crm-danger">
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
            <h2 className="text-xl font-bold mb-4">
              {editingId ? 'Edit' : 'Add'} {form.product_type === 'product' ? 'Product' : 'Packaging Material'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Name *"
                className="w-full px-3 py-2 border rounded-lg"
                required
              />

              {form.product_type === 'product' && (
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (Rs.)</label>
                  <input
                    type="number"
                    value={form.cost_price}
                    onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 border rounded-lg"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Description (optional)"
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
              />

              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg" disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-crm-primary text-white rounded-lg disabled:opacity-50 font-medium" disabled={submitting}>
                  {submitting ? 'Saving...' : (editingId ? 'Update' : 'Add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
