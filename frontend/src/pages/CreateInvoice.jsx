import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, Plus, Trash2, Package, Gift } from 'lucide-react';

export default function CreateInvoice() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedCustomer = searchParams.get('customer');

  const [customers, setCustomers] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [deliveryZones, setDeliveryZones] = useState([]);

  const [customerId, setCustomerId] = useState(preselectedCustomer || '');
  const [recipientId, setRecipientId] = useState('');
  const [deliveryZoneId, setDeliveryZoneId] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const [items, setItems] = useState([{ description: '', category_id: '', vendor_id: '', quantity: 1, unit_price: 0 }]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/customers'),
      api.get('/categories'),
      api.get('/vendors'),
      api.get('/products'),
      api.get('/delivery-zones')
    ]).then(([c, cat, v, p, dz]) => {
      setCustomers(c.data);
      setCategories(cat.data);
      setVendors(v.data);
      setProducts(p.data);
      setDeliveryZones(dz.data);
    });
  }, []);

  useEffect(() => {
    if (customerId) {
      api.get(`/recipients/customer/${customerId}`).then(res => setRecipients(res.data));
    } else {
      setRecipients([]);
    }
  }, [customerId]);

  // Update delivery fee when zone changes
  useEffect(() => {
    if (deliveryZoneId) {
      const zone = deliveryZones.find(z => z.id == deliveryZoneId);
      setDeliveryFee(zone ? parseFloat(zone.delivery_fee) : 0);
    } else {
      setDeliveryFee(0);
    }
  }, [deliveryZoneId, deliveryZones]);

  const addItem = () => {
    setItems([...items, { description: '', category_id: '', vendor_id: '', quantity: 1, unit_price: 0 }]);
  };

  const addProductItem = (product) => {
    setItems([...items, {
      description: product.name,
      category_id: product.category_id || '',
      vendor_id: '',
      quantity: 1,
      unit_price: parseFloat(product.price)
    }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const total = subtotal - discount + deliveryFee;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/invoices', {
        customer_id: customerId,
        recipient_id: recipientId || null,
        delivery_zone_id: deliveryZoneId || null,
        delivery_fee: deliveryFee,
        gift_message: giftMessage || null,
        items,
        discount,
        notes
      });
      navigate(`/invoices/${res.data.id}`);
    } catch (err) {
      alert('Error creating invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg touch-target flex items-center justify-center">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl sm:text-2xl font-bold">Create Order</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Selection */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 space-y-4">
          <h2 className="font-semibold">Customer Details</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Customer *</label>
              <select
                value={customerId}
                onChange={(e) => { setCustomerId(e.target.value); setRecipientId(''); }}
                className="w-full px-3 py-3 sm:py-2 border rounded-lg bg-white"
                required
              >
                <option value="">Select customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.whatsapp})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Deliver To</label>
              <select
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                className="w-full px-3 py-3 sm:py-2 border rounded-lg bg-white"
                disabled={!customerId}
              >
                <option value="">Select recipient (optional)</option>
                {recipients.map(r => <option key={r.id} value={r.id}>{r.name} - {r.address}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Delivery Zone */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 space-y-4">
          <h2 className="font-semibold">Delivery</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Delivery Zone</label>
              <select
                value={deliveryZoneId}
                onChange={(e) => setDeliveryZoneId(e.target.value)}
                className="w-full px-3 py-3 sm:py-2 border rounded-lg bg-white"
              >
                <option value="">Select zone (optional)</option>
                {deliveryZones.map(z => (
                  <option key={z.id} value={z.id}>{z.name} - Rs. {parseFloat(z.delivery_fee).toLocaleString()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Delivery Fee</label>
              <input
                type="number"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-3 sm:py-2 border rounded-lg"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Quick Add Products */}
        {products.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2"><Package size={18} /> Quick Add Products</h2>
            <div className="flex flex-wrap gap-2">
              {products.slice(0, 12).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addProductItem(p)}
                  className="px-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm hover:bg-purple-100 active:bg-purple-200 touch-target"
                >
                  {p.name} - Rs. {parseFloat(p.price).toLocaleString()}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Items */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold">Items</h2>
            <button type="button" onClick={addItem} className="text-purple-600 text-sm flex items-center gap-1 touch-target">
              <Plus size={16} /> Add Item
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="p-3 sm:p-4 border rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Item {index + 1}</span>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(index)} className="text-red-500 p-2 touch-target">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
                <input
                  value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                  placeholder="Description *"
                  className="w-full px-3 py-3 sm:py-2 border rounded-lg"
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={item.category_id}
                    onChange={(e) => updateItem(index, 'category_id', e.target.value)}
                    className="px-3 py-3 sm:py-2 border rounded-lg bg-white text-sm"
                  >
                    <option value="">Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select
                    value={item.vendor_id}
                    onChange={(e) => updateItem(index, 'vendor_id', e.target.value)}
                    className="px-3 py-3 sm:py-2 border rounded-lg bg-white text-sm"
                  >
                    <option value="">Vendor</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    placeholder="Qty"
                    min="1"
                    className="px-3 py-3 sm:py-2 border rounded-lg"
                  />
                  <input
                    type="number"
                    value={item.unit_price}
                    onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                    placeholder="Price"
                    min="0"
                    className="px-3 py-3 sm:py-2 border rounded-lg"
                  />
                </div>
                <div className="text-right text-sm text-gray-500">
                  Line Total: Rs. {(item.quantity * item.unit_price).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gift Message */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><Gift size={18} /> Gift Message Card</h2>
          <textarea
            value={giftMessage}
            onChange={(e) => setGiftMessage(e.target.value)}
            placeholder="Enter a personalized message to include with the gift (optional)"
            className="w-full px-3 py-3 sm:py-2 border rounded-lg"
            rows={3}
          />
        </div>

        {/* Summary */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 space-y-4">
          <h2 className="font-semibold">Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>Rs. {subtotal.toLocaleString()}</span>
            </div>
            {deliveryFee > 0 && (
              <div className="flex justify-between text-blue-600">
                <span>Delivery Fee</span>
                <span>Rs. {deliveryFee.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-center gap-2">
              <span>Discount</span>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-28 sm:w-32 px-3 py-2 border rounded-lg text-right"
                min="0"
              />
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-3">
              <span>Total</span>
              <span className="text-purple-600">Rs. {total.toLocaleString()}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Internal Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-3 sm:py-2 border rounded-lg"
              rows={2}
              placeholder="Notes for internal use (not shown on invoice)"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !customerId || items.some(i => !i.description)}
          className="w-full bg-purple-600 text-white py-4 sm:py-3 rounded-lg font-medium hover:bg-purple-700 active:bg-purple-800 disabled:opacity-50 touch-target"
        >
          {loading ? 'Creating...' : 'Create Order'}
        </button>
      </form>
    </div>
  );
}
