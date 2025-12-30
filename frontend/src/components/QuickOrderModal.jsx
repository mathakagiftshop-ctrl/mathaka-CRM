import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { X, User, Users, Package, MapPin, Zap, ChevronRight, Check, Sparkles } from 'lucide-react';

export default function QuickOrderModal({ onClose, preselectedCustomer = null, preselectedOccasion = null }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Data
  const [customers, setCustomers] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [deliveryZones, setDeliveryZones] = useState([]);

  // Selections
  const [customerId, setCustomerId] = useState(preselectedCustomer || '');
  const [recipientId, setRecipientId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [deliveryZoneId, setDeliveryZoneId] = useState('');
  const [packagePrice, setPackagePrice] = useState(0);
  const [giftMessage, setGiftMessage] = useState(preselectedOccasion ? `Happy ${preselectedOccasion}! 🎁` : '');

  useEffect(() => {
    Promise.all([
      api.get('/customers'),
      api.get('/packages'),
      api.get('/delivery-zones')
    ]).then(([c, p, dz]) => {
      setCustomers(c.data);
      setTemplates(p.data);
      setDeliveryZones(dz.data);
    });
  }, []);

  useEffect(() => {
    if (customerId) {
      api.get(`/recipients/customer/${customerId}`).then(res => {
        setRecipients(res.data);
        // Auto-select if only one recipient
        if (res.data.length === 1) {
          setRecipientId(res.data[0].id);
        }
      });
    } else {
      setRecipients([]);
      setRecipientId('');
    }
  }, [customerId]);

  useEffect(() => {
    if (templateId) {
      const template = templates.find(t => t.id == templateId);
      if (template) {
        setPackagePrice(parseFloat(template.total_price) || 0);
      }
    }
  }, [templateId, templates]);

  const selectedCustomer = customers.find(c => c.id == customerId);
  const selectedRecipient = recipients.find(r => r.id == recipientId);
  const selectedTemplate = templates.find(t => t.id == templateId);
  const selectedZone = deliveryZones.find(z => z.id == deliveryZoneId);
  const deliveryFee = selectedZone ? parseFloat(selectedZone.delivery_fee) : 0;
  const total = packagePrice + deliveryFee;

  const handleCreateOrder = async () => {
    if (!customerId || !templateId) return;
    
    setLoading(true);
    try {
      const template = templates.find(t => t.id == templateId);
      
      const res = await api.post('/invoices', {
        customer_id: customerId,
        recipient_id: recipientId || null,
        delivery_zone_id: deliveryZoneId || null,
        delivery_fee: deliveryFee,
        gift_message: giftMessage || null,
        packages: [{
          package_name: template.name,
          package_price: packagePrice,
          packaging_cost: 0,
          items: (template.items || []).map(item => ({
            product_id: item.product_id,
            description: item.description,
            quantity: item.quantity || 1,
            unit_price: parseFloat(item.unit_price) || 0,
            cost_price: 0
          }))
        }],
        discount: 0,
        notes: 'Created via Quick Order'
      });
      
      navigate(`/invoices/${res.data.id}`);
    } catch (err) {
      alert('Error creating order');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return customerId;
    if (step === 2) return templateId;
    if (step === 3) return true;
    return false;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-yellow-50 to-orange-50">
          <h2 className="text-lg font-bold text-orange-800 flex items-center gap-2">
            <Zap size={20} /> Quick Order
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Progress */}
        <div className="px-4 py-3 bg-gray-50 border-b">
          <div className="flex items-center justify-between text-sm">
            {['Customer', 'Package', 'Review'].map((label, i) => (
              <div key={label} className="flex items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  step > i + 1 ? 'bg-green-500 text-white' :
                  step === i + 1 ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step > i + 1 ? <Check size={14} /> : i + 1}
                </div>
                <span className={`ml-1 ${step === i + 1 ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>{label}</span>
                {i < 2 && <ChevronRight className="mx-2 text-gray-300" size={16} />}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Step 1: Customer */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Select Customer</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl bg-white"
                >
                  <option value="">Choose a customer...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.whatsapp})</option>
                  ))}
                </select>
              </div>

              {customerId && recipients.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Deliver To</label>
                  <div className="space-y-2">
                    {recipients.map(r => (
                      <button
                        key={r.id}
                        onClick={() => setRecipientId(r.id)}
                        className={`w-full p-3 border rounded-xl text-left transition-all ${
                          recipientId == r.id 
                            ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200' 
                            : 'hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Users size={18} className="text-gray-400" />
                          <div>
                            <p className="font-medium">{r.name}</p>
                            {r.relationship && <p className="text-xs text-gray-500">{r.relationship}</p>}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {customerId && recipients.length === 0 && (
                <div className="p-4 bg-yellow-50 rounded-xl text-center">
                  <p className="text-sm text-yellow-700">No recipients found for this customer</p>
                  <button
                    onClick={() => navigate(`/customers/${customerId}`)}
                    className="text-sm text-orange-600 hover:underline mt-1"
                  >
                    Add recipients first →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Package */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Select Package Template</label>
                {templates.length === 0 ? (
                  <div className="p-4 bg-gray-50 rounded-xl text-center">
                    <Sparkles className="mx-auto text-gray-300 mb-2" size={32} />
                    <p className="text-sm text-gray-500">No templates available</p>
                    <button
                      onClick={() => navigate('/invoices/new')}
                      className="text-sm text-orange-600 hover:underline mt-1"
                    >
                      Create a full order instead →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {templates.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setTemplateId(t.id)}
                        className={`w-full p-3 border rounded-xl text-left transition-all ${
                          templateId == t.id 
                            ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200' 
                            : 'hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Package size={18} className="text-gray-400" />
                            <div>
                              <p className="font-medium">{t.name}</p>
                              <p className="text-xs text-gray-500">{t.items?.length || 0} items</p>
                            </div>
                          </div>
                          <span className="font-medium text-orange-600">Rs. {parseFloat(t.total_price || 0).toLocaleString()}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {templateId && (
                <div>
                  <label className="block text-sm font-medium mb-2">Adjust Price (optional)</label>
                  <input
                    type="number"
                    value={packagePrice}
                    onChange={(e) => setPackagePrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 border rounded-xl"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Delivery Zone</label>
                <select
                  value={deliveryZoneId}
                  onChange={(e) => setDeliveryZoneId(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl bg-white"
                >
                  <option value="">Select zone (optional)</option>
                  {deliveryZones.map(z => (
                    <option key={z.id} value={z.id}>{z.name} - Rs. {parseFloat(z.delivery_fee).toLocaleString()}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer</span>
                  <span className="font-medium">{selectedCustomer?.name}</span>
                </div>
                {selectedRecipient && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Deliver To</span>
                    <span className="font-medium">{selectedRecipient.name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Package</span>
                  <span className="font-medium">{selectedTemplate?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Package Price</span>
                  <span className="font-medium">Rs. {packagePrice.toLocaleString()}</span>
                </div>
                {deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery ({selectedZone?.name})</span>
                    <span className="font-medium">Rs. {deliveryFee.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-bold">Total</span>
                  <span className="font-bold text-orange-600">Rs. {total.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Gift Message (optional)</label>
                <textarea
                  value={giftMessage}
                  onChange={(e) => setGiftMessage(e.target.value)}
                  placeholder="Add a personalized message..."
                  className="w-full px-4 py-3 border rounded-xl"
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 border rounded-lg hover:bg-gray-100"
            >
              Back
            </button>
          ) : (
            <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-100">
              Cancel
            </button>
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
            >
              Next <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleCreateOrder}
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? 'Creating...' : <><Check size={18} /> Create Order</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
