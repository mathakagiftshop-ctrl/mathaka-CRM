import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, Plus, Trash2, Gift, Box, ChevronDown, ChevronUp, TrendingUp, Save } from 'lucide-react';

export default function EditInvoice() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [customers, setCustomers] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [products, setProducts] = useState([]);
  const [packagingMaterials, setPackagingMaterials] = useState([]);
  const [deliveryZones, setDeliveryZones] = useState([]);

  const [customerId, setCustomerId] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [deliveryZoneId, setDeliveryZoneId] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [packages, setPackages] = useState([{
    package_name: '',
    package_price: 0,
    packaging_cost: 0,
    selectedPackaging: [],
    items: [],
    expanded: true
  }]);

  useEffect(() => {
    Promise.all([
      api.get('/customers'),
      api.get('/products?type=product'),
      api.get('/products?type=packaging'),
      api.get('/delivery-zones'),
      api.get(`/invoices/${id}`)
    ]).then(([c, p, pkg, dz, inv]) => {
      setCustomers(c.data);
      setProducts(p.data);
      setPackagingMaterials(pkg.data);
      setDeliveryZones(dz.data);

      const invoice = inv.data;
      setInvoiceNumber(invoice.invoice_number);
      setCustomerId(invoice.customer_id);
      setRecipientId(invoice.recipient_id || '');
      setDeliveryZoneId(invoice.delivery_zone_id || '');
      setDeliveryFee(parseFloat(invoice.delivery_fee) || 0);
      setDiscount(parseFloat(invoice.discount) || 0);
      setNotes(invoice.notes || '');
      setGiftMessage(invoice.gift_message || '');

      // Load packages
      if (invoice.packages && invoice.packages.length > 0) {
        setPackages(invoice.packages.map(pkg => ({
          package_name: pkg.package_name,
          package_price: parseFloat(pkg.package_price) || 0,
          packaging_cost: parseFloat(pkg.packaging_cost) || 0,
          selectedPackaging: [],
          items: (pkg.items || []).map(item => ({
            product_id: item.product_id,
            description: item.description,
            category_id: item.category_id || '',
            vendor_id: item.vendor_id || '',
            quantity: item.quantity || 1,
            unit_price: parseFloat(item.unit_price) || 0,
            cost_price: parseFloat(item.cost_price) || 0
          })),
          expanded: true
        })));
      } else if (invoice.items && invoice.items.length > 0) {
        // Legacy items - convert to single package
        setPackages([{
          package_name: 'Items',
          package_price: parseFloat(invoice.subtotal) || 0,
          packaging_cost: 0,
          selectedPackaging: [],
          items: invoice.items.map(item => ({
            product_id: item.product_id,
            description: item.description,
            category_id: item.category_id || '',
            vendor_id: item.vendor_id || '',
            quantity: item.quantity || 1,
            unit_price: parseFloat(item.unit_price) || 0,
            cost_price: parseFloat(item.cost_price) || 0
          })),
          expanded: true
        }]);
      }

      // Load recipients for customer
      if (invoice.customer_id) {
        api.get(`/recipients/customer/${invoice.customer_id}`).then(res => {
          setRecipients(res.data);
        });
      }

      setLoading(false);
    }).catch(err => {
      console.error('Error loading invoice:', err);
      alert('Failed to load invoice');
      navigate('/invoices');
    });
  }, [id]);

  useEffect(() => {
    if (customerId) {
      api.get(`/recipients/customer/${customerId}`).then(res => {
        setRecipients(res.data);
      });
    } else {
      setRecipients([]);
    }
  }, [customerId]);

  useEffect(() => {
    if (deliveryZoneId) {
      const zone = deliveryZones.find(z => z.id == deliveryZoneId);
      setDeliveryFee(zone ? parseFloat(zone.delivery_fee) : 0);
    }
  }, [deliveryZoneId, deliveryZones]);

  // Package management
  const addPackage = () => {
    setPackages([...packages, {
      package_name: '',
      package_price: 0,
      packaging_cost: 0,
      selectedPackaging: [],
      items: [],
      expanded: true
    }]);
  };

  const removePackage = (index) => {
    if (packages.length > 1) {
      setPackages(packages.filter((_, i) => i !== index));
    }
  };

  const updatePackage = (index, field, value) => {
    const newPackages = [...packages];
    newPackages[index][field] = value;
    setPackages(newPackages);
  };

  const togglePackageExpand = (index) => {
    const newPackages = [...packages];
    newPackages[index].expanded = !newPackages[index].expanded;
    setPackages(newPackages);
  };

  const addItemToPackage = (pkgIndex, product = null) => {
    const newPackages = [...packages];
    if (product) {
      newPackages[pkgIndex].items.push({
        product_id: product.id,
        description: product.name,
        category_id: product.category_id || '',
        vendor_id: '',
        quantity: 1,
        unit_price: parseFloat(product.retail_price) || 0,
        cost_price: parseFloat(product.cost_price) || 0
      });
    } else {
      newPackages[pkgIndex].items.push({
        product_id: null,
        description: '',
        category_id: '',
        vendor_id: '',
        quantity: 1,
        unit_price: 0,
        cost_price: 0
      });
    }
    setPackages(newPackages);
  };

  const removeItemFromPackage = (pkgIndex, itemIndex) => {
    const newPackages = [...packages];
    newPackages[pkgIndex].items = newPackages[pkgIndex].items.filter((_, i) => i !== itemIndex);
    setPackages(newPackages);
  };

  const updateItemInPackage = (pkgIndex, itemIndex, field, value) => {
    const newPackages = [...packages];
    newPackages[pkgIndex].items[itemIndex][field] = value;
    setPackages(newPackages);
  };

  // Calculations
  const calculatePackageCost = (pkg) => {
    const itemsCost = pkg.items.reduce((sum, item) => sum + (parseFloat(item.cost_price) || 0) * (item.quantity || 1), 0);
    return itemsCost + (parseFloat(pkg.packaging_cost) || 0);
  };

  const calculatePackageProfit = (pkg) => {
    return (parseFloat(pkg.package_price) || 0) - calculatePackageCost(pkg);
  };

  const calculatePackageMargin = (pkg) => {
    const price = parseFloat(pkg.package_price) || 0;
    if (price === 0) return 0;
    return (calculatePackageProfit(pkg) / price * 100).toFixed(1);
  };

  const subtotal = packages.reduce((sum, pkg) => sum + (parseFloat(pkg.package_price) || 0), 0);
  const totalCost = packages.reduce((sum, pkg) => sum + calculatePackageCost(pkg), 0);
  const total = subtotal - discount + deliveryFee;
  const totalProfit = total - totalCost - deliveryFee;
  const overallMargin = total > 0 ? (totalProfit / total * 100).toFixed(1) : 0;
  const overallMarkup = totalCost > 0 ? (totalProfit / totalCost * 100).toFixed(1) : 0;


  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const validPackages = packages.filter(pkg => pkg.package_name && pkg.items.length > 0);
    if (validPackages.length === 0) {
      alert('Please add at least one package with items');
      setSaving(false);
      return;
    }

    try {
      await api.put(`/invoices/${id}`, {
        customer_id: customerId,
        recipient_id: recipientId || null,
        delivery_zone_id: deliveryZoneId || null,
        delivery_fee: deliveryFee,
        gift_message: giftMessage || null,
        packages: validPackages.map(pkg => ({
          package_name: pkg.package_name,
          package_price: parseFloat(pkg.package_price) || 0,
          packaging_cost: parseFloat(pkg.packaging_cost) || 0,
          items: pkg.items.map(item => ({
            product_id: item.product_id,
            description: item.description,
            category_id: item.category_id || null,
            vendor_id: item.vendor_id || null,
            quantity: item.quantity || 1,
            unit_price: parseFloat(item.unit_price) || 0,
            cost_price: parseFloat(item.cost_price) || 0
          }))
        })),
        discount,
        notes
      });
      navigate(`/invoices/${id}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Error updating invoice');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Edit Invoice</h1>
          <p className="text-sm text-gray-500">{invoiceNumber}</p>
        </div>
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
                className="w-full px-3 py-2 border rounded-lg bg-white"
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
                className="w-full px-3 py-2 border rounded-lg bg-white"
                disabled={!customerId}
              >
                <option value="">Select recipient (optional)</option>
                {recipients.map(r => <option key={r.id} value={r.id}>{r.name} {r.relationship && `(${r.relationship})`}</option>)}
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
                className="w-full px-3 py-2 border rounded-lg bg-white"
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
                className="w-full px-3 py-2 border rounded-lg"
                min="0"
              />
            </div>
          </div>
        </div>


        {/* Packages */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Gift size={20} /> Gift Packages
            </h2>
            <button type="button" onClick={addPackage} className="text-crm-primary text-sm flex items-center gap-1 hover:bg-gray-100 px-3 py-2 rounded-lg border border-crm-border">
              <Plus size={16} /> Add Package
            </button>
          </div>

          {packages.map((pkg, pkgIndex) => (
            <div key={pkgIndex} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div
                className="p-4 bg-gray-50 border-b border-crm-border flex items-center justify-between cursor-pointer"
                onClick={() => togglePackageExpand(pkgIndex)}
              >
                <div className="flex items-center gap-3">
                  <Gift className="text-crm-primary" size={20} />
                  <input
                    value={pkg.package_name}
                    onChange={(e) => { e.stopPropagation(); updatePackage(pkgIndex, 'package_name', e.target.value); }}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Package Name *"
                    className="bg-transparent border-b border-gray-300 focus:border-crm-primary outline-none px-1 py-1 font-bold w-64 text-crm-primary"
                    required
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Package Price</div>
                    <input
                      type="number"
                      value={pkg.package_price}
                      onChange={(e) => { e.stopPropagation(); updatePackage(pkgIndex, 'package_price', e.target.value); }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-28 text-right font-bold text-crm-primary bg-white border border-crm-border rounded px-2 py-1"
                      min="0"
                    />
                  </div>
                  {packages.length > 1 && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); removePackage(pkgIndex); }} className="p-2 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 size={18} />
                    </button>
                  )}
                  {pkg.expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {pkg.expanded && (
                <div className="p-4 space-y-4">
                  {/* Quick Add Products */}
                  {products.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Quick Add Products</label>
                      <div className="flex flex-wrap gap-2">
                        {products.slice(0, 10).map(p => (
                          <button key={p.id} type="button" onClick={() => addItemToPackage(pkgIndex, p)} className="px-3 py-2 bg-crm-accent/30 text-crm-primary rounded-lg text-sm hover:bg-crm-accent font-medium">
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Package Items */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium">Items in Package</label>
                      <button type="button" onClick={() => addItemToPackage(pkgIndex)} className="text-crm-primary text-sm flex items-center gap-1 font-medium hover:underline">
                        <Plus size={14} /> Custom Item
                      </button>
                    </div>

                    {pkg.items.length === 0 ? (
                      <p className="text-gray-400 text-sm py-4 text-center border-2 border-dashed rounded-lg">Add products to this package</p>
                    ) : (
                      <div className="space-y-2">
                        {pkg.items.map((item, itemIndex) => (
                          <div key={itemIndex} className="p-3 border rounded-lg bg-gray-50">
                            <div className="flex items-start gap-3">
                              <div className="flex-1 space-y-2">
                                <input
                                  value={item.description}
                                  onChange={(e) => updateItemInPackage(pkgIndex, itemIndex, 'description', e.target.value)}
                                  placeholder="Item description *"
                                  className="w-full px-3 py-2 border rounded-lg text-sm"
                                  required
                                />
                                <div className="grid grid-cols-4 gap-2">
                                  <input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => updateItemInPackage(pkgIndex, itemIndex, 'quantity', parseInt(e.target.value) || 1)}
                                    placeholder="Qty"
                                    min="1"
                                    className="px-2 py-1 border rounded text-sm"
                                  />
                                  <div>
                                    <label className="text-xs text-gray-500">Cost</label>
                                    <input
                                      type="number"
                                      value={item.cost_price}
                                      onChange={(e) => updateItemInPackage(pkgIndex, itemIndex, 'cost_price', e.target.value)}
                                      className="w-full px-2 py-1 border rounded text-sm text-red-600"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500">Retail</label>
                                    <input
                                      type="number"
                                      value={item.unit_price}
                                      onChange={(e) => updateItemInPackage(pkgIndex, itemIndex, 'unit_price', e.target.value)}
                                      className="w-full px-2 py-1 border rounded text-sm text-green-600"
                                    />
                                  </div>
                                  <div className="text-right text-xs text-gray-500 pt-4">
                                    Cost: Rs. {((parseFloat(item.cost_price) || 0) * item.quantity).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                              <button type="button" onClick={() => removeItemFromPackage(pkgIndex, itemIndex)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Package Summary */}
                  {pkg.items.length > 0 && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-crm-border">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={16} className="text-crm-success" />
                        <span className="font-medium text-sm text-crm-primary">Package Profitability</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Total Cost:</span>
                          <span className="ml-2 text-red-600 font-medium">Rs. {calculatePackageCost(pkg).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Profit:</span>
                          <span className={`ml-2 font-medium ${calculatePackageProfit(pkg) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            Rs. {calculatePackageProfit(pkg).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Margin:</span>
                          <span className={`ml-2 font-medium ${parseFloat(calculatePackageMargin(pkg)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {calculatePackageMargin(pkg)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>


        {/* Gift Message */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><Gift size={18} /> Gift Message Card</h2>
          <textarea
            value={giftMessage}
            onChange={(e) => setGiftMessage(e.target.value)}
            placeholder="Enter a personalized message to include with the gift (optional)"
            className="w-full px-3 py-2 border rounded-lg"
            rows={3}
          />
        </div>

        {/* Summary */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 space-y-4">
          <h2 className="font-semibold">Order Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Packages Subtotal ({packages.filter(p => p.package_name).length} packages)</span>
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
                className="w-28 px-3 py-2 border rounded-lg text-right"
                min="0"
              />
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-3">
              <span>Total</span>
              <span className="text-crm-primary">Rs. {total.toLocaleString()}</span>
            </div>
          </div>

          {/* Profitability Summary */}
          <div className="p-4 bg-gray-50 rounded-lg border border-crm-border">
            <h3 className="font-medium text-crm-primary mb-3 flex items-center gap-2">
              <TrendingUp size={18} className="text-crm-success" /> Profitability Analysis
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600 block">Total Cost</span>
                <span className="text-red-600 font-semibold">Rs. {totalCost.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-600 block">Profit</span>
                <span className={`font-semibold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Rs. {totalProfit.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-600 block">Margin</span>
                <span className={`font-semibold ${parseFloat(overallMargin) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {overallMargin}%
                </span>
              </div>
              <div>
                <span className="text-gray-600 block">Markup</span>
                <span className={`font-semibold ${parseFloat(overallMarkup) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {overallMarkup}%
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Internal Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              rows={2}
              placeholder="Notes for internal use"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || !customerId || packages.every(p => !p.package_name || p.items.length === 0)}
          className="w-full bg-amber-500 text-white py-3 rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
