import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, Plus, Trash2, Package, Gift, Box, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';

export default function CreateInvoice() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedCustomer = searchParams.get('customer');

  const [customers, setCustomers] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [packagingMaterials, setPackagingMaterials] = useState([]);
  const [deliveryZones, setDeliveryZones] = useState([]);

  const [customerId, setCustomerId] = useState(preselectedCustomer || '');
  const [recipientId, setRecipientId] = useState('');
  const [deliveryZoneId, setDeliveryZoneId] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Package-based state
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
      api.get('/categories'),
      api.get('/vendors'),
      api.get('/products?type=product'),
      api.get('/products?type=packaging'),
      api.get('/delivery-zones')
    ]).then(([c, cat, v, p, pkg, dz]) => {
      setCustomers(c.data);
      setCategories(cat.data);
      setVendors(v.data);
      setProducts(p.data);
      setPackagingMaterials(pkg.data);
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

  useEffect(() => {
    if (deliveryZoneId) {
      const zone = deliveryZones.find(z => z.id == deliveryZoneId);
      setDeliveryFee(zone ? parseFloat(zone.delivery_fee) : 0);
    } else {
      setDeliveryFee(0);
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

  // Item management within package
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

  // Packaging material management
  const togglePackagingMaterial = (pkgIndex, material) => {
    const newPackages = [...packages];
    const selected = newPackages[pkgIndex].selectedPackaging;
    const existingIndex = selected.findIndex(p => p.id === material.id);
    
    if (existingIndex >= 0) {
      selected.splice(existingIndex, 1);
    } else {
      selected.push({ ...material, quantity: 1 });
    }
    
    // Recalculate packaging cost
    newPackages[pkgIndex].packaging_cost = selected.reduce(
      (sum, p) => sum + (parseFloat(p.cost_price) || 0) * (p.quantity || 1), 0
    );
    
    setPackages(newPackages);
  };

  const updatePackagingQuantity = (pkgIndex, materialId, quantity) => {
    const newPackages = [...packages];
    const material = newPackages[pkgIndex].selectedPackaging.find(p => p.id === materialId);
    if (material) {
      material.quantity = quantity;
      // Recalculate packaging cost
      newPackages[pkgIndex].packaging_cost = newPackages[pkgIndex].selectedPackaging.reduce(
        (sum, p) => sum + (parseFloat(p.cost_price) || 0) * (p.quantity || 1), 0
      );
    }
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
    setLoading(true);
    
    // Validate packages
    const validPackages = packages.filter(pkg => pkg.package_name && pkg.items.length > 0);
    if (validPackages.length === 0) {
      alert('Please add at least one package with items');
      setLoading(false);
      return;
    }

    try {
      const res = await api.post('/invoices', {
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
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg">
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

        {/* Packages */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Gift size={20} /> Gift Packages
            </h2>
            <button
              type="button"
              onClick={addPackage}
              className="text-purple-600 text-sm flex items-center gap-1 hover:bg-purple-50 px-3 py-2 rounded-lg"
            >
              <Plus size={16} /> Add Package
            </button>
          </div>

          {packages.map((pkg, pkgIndex) => (
            <div key={pkgIndex} className="bg-white rounded-xl shadow-sm overflow-hidden">
              {/* Package Header */}
              <div 
                className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 flex items-center justify-between cursor-pointer"
                onClick={() => togglePackageExpand(pkgIndex)}
              >
                <div className="flex items-center gap-3">
                  <Gift className="text-purple-600" size={20} />
                  <input
                    value={pkg.package_name}
                    onChange={(e) => { e.stopPropagation(); updatePackage(pkgIndex, 'package_name', e.target.value); }}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Package Name (e.g., Birthday Surprise Box) *"
                    className="bg-transparent border-b border-purple-300 focus:border-purple-600 outline-none px-1 py-1 font-medium w-64"
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
                      className="w-28 text-right font-bold text-purple-600 bg-white border rounded px-2 py-1"
                      min="0"
                    />
                  </div>
                  {packages.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removePackage(pkgIndex); }}
                      className="p-2 text-red-500 hover:bg-red-50 rounded"
                    >
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
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => addItemToPackage(pkgIndex, p)}
                            className="px-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm hover:bg-purple-100"
                          >
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
                      <button
                        type="button"
                        onClick={() => addItemToPackage(pkgIndex)}
                        className="text-purple-600 text-sm flex items-center gap-1"
                      >
                        <Plus size={14} /> Custom Item
                      </button>
                    </div>
                    
                    {pkg.items.length === 0 ? (
                      <p className="text-gray-400 text-sm py-4 text-center border-2 border-dashed rounded-lg">
                        Add products to this package
                      </p>
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
                                      placeholder="Cost"
                                      className="w-full px-2 py-1 border rounded text-sm text-red-600"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500">Retail</label>
                                    <input
                                      type="number"
                                      value={item.unit_price}
                                      onChange={(e) => updateItemInPackage(pkgIndex, itemIndex, 'unit_price', e.target.value)}
                                      placeholder="Retail"
                                      className="w-full px-2 py-1 border rounded text-sm text-green-600"
                                    />
                                  </div>
                                  <div className="text-right text-xs text-gray-500 pt-4">
                                    Cost: Rs. {((parseFloat(item.cost_price) || 0) * item.quantity).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeItemFromPackage(pkgIndex, itemIndex)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Packaging Materials */}
                  {packagingMaterials.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                        <Box size={16} /> Packaging Materials
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {packagingMaterials.map(m => {
                          const isSelected = pkg.selectedPackaging.some(p => p.id === m.id);
                          const selectedItem = pkg.selectedPackaging.find(p => p.id === m.id);
                          return (
                            <div key={m.id} className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => togglePackagingMaterial(pkgIndex, m)}
                                className={`px-3 py-2 rounded-lg text-sm ${
                                  isSelected 
                                    ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-300' 
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {m.name} (Rs. {parseFloat(m.cost_price).toLocaleString()})
                              </button>
                              {isSelected && (
                                <input
                                  type="number"
                                  value={selectedItem?.quantity || 1}
                                  onChange={(e) => updatePackagingQuantity(pkgIndex, m.id, parseInt(e.target.value) || 1)}
                                  className="w-12 px-1 py-1 border rounded text-sm text-center"
                                  min="1"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {pkg.packaging_cost > 0 && (
                        <p className="text-sm text-orange-600 mt-2">
                          Packaging Cost: Rs. {pkg.packaging_cost.toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Package Summary */}
                  {pkg.items.length > 0 && (
                    <div className="p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={16} className="text-green-600" />
                        <span className="font-medium text-sm">Package Profitability</span>
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
            className="w-full px-3 py-3 sm:py-2 border rounded-lg"
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
                className="w-28 sm:w-32 px-3 py-2 border rounded-lg text-right"
                min="0"
              />
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-3">
              <span>Total</span>
              <span className="text-purple-600">Rs. {total.toLocaleString()}</span>
            </div>
          </div>

          {/* Profitability Summary (Internal) */}
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <h3 className="font-medium text-green-800 mb-3 flex items-center gap-2">
              <TrendingUp size={18} /> Profitability Analysis (Internal)
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
              className="w-full px-3 py-3 sm:py-2 border rounded-lg"
              rows={2}
              placeholder="Notes for internal use (not shown on invoice)"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !customerId || packages.every(p => !p.package_name || p.items.length === 0)}
          className="w-full bg-purple-600 text-white py-4 sm:py-3 rounded-lg font-medium hover:bg-purple-700 active:bg-purple-800 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Order'}
        </button>
      </form>
    </div>
  );
}
