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
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-crm-border flex justify-between items-center bg-white">
          <h2 className="text-lg font-bold text-crm-primary flex items-center gap-2">
            <Zap size={20} className="text-crm-warning" /> Quick Order
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-crm-background rounded-lg text-crm-secondary hover:text-crm-primary">
            <X size={20} />
          </button>
        </div>

        {/* Progress */}
        <div className="px-4 py-3 bg-crm-background border-b border-crm-border">
          <div className="flex items-center justify-between text-sm">
            {['Customer', 'Package', 'Review'].map((label, i) => (
              <div key={label} className="flex items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step > i + 1 ? 'bg-crm-success text-white' :
                    step === i + 1 ? 'bg-crm-primary text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                  {step > i + 1 ? <Check size={14} /> : i + 1}
                </div>
                <span className={`ml-1 ${step === i + 1 ? 'text-crm-primary font-medium' : 'text-crm-secondary'}`}>{label}</span>
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
                <label className="block text-sm font-medium mb-2 text-crm-secondary">Select Customer</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-4 py-3 border border-crm-border rounded-xl bg-white focus:ring-1 focus:ring-crm-primary outline-none"
                >
                  <option value="">Choose a customer...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.whatsapp})</option>
                  ))}
                </select>
              </div>

              {customerId && recipients.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-crm-secondary">Deliver To</label>
                  <div className="space-y-2">
                    {recipients.map(r => (
                      <button
                        key={r.id}
                        onClick={() => setRecipientId(r.id)}
                        className={`w-full p-3 border rounded-xl text-left transition-all ${recipientId == r.id
                            ? 'border-crm-primary bg-crm-background ring-1 ring-crm-primary'
                            : 'border-crm-border hover:border-crm-secondary'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <Users size={18} className="text-crm-secondary" />
                          <div>
                            <p className="font-medium text-crm-primary">{r.name}</p>
                            {r.relationship && <p className="text-xs text-crm-secondary">{r.relationship}</p>}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {customerId && recipients.length === 0 && (
                <div className="p-4 bg-crm-background rounded-xl text-center border border-crm-border">
                  <p className="text-sm text-crm-secondary">No recipients found for this customer</p>
                  <button
                    onClick={() => navigate(`/customers/${customerId}`)}
                    className="text-sm text-crm-accent hover:underline mt-1"
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
                <label className="block text-sm font-medium mb-2 text-crm-secondary">Select Package Template</label>
                {templates.length === 0 ? (
                  <div className="p-4 bg-crm-background rounded-xl text-center">
                    <Sparkles className="mx-auto text-crm-secondary mb-2" size={32} />
                    <p className="text-sm text-crm-secondary">No templates available</p>
                    <button
                      onClick={() => navigate('/invoices/new')}
                      className="text-sm text-crm-accent hover:underline mt-1"
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
                        className={`w-full p-3 border rounded-xl text-left transition-all ${templateId == t.id
                            ? 'border-crm-primary bg-crm-background ring-1 ring-crm-primary'
                            : 'border-crm-border hover:border-crm-secondary'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Package size={18} className="text-crm-secondary" />
                            <div>
                              <p className="font-medium text-crm-primary">{t.name}</p>
                              <p className="text-xs text-crm-secondary">{t.items?.length || 0} items</p>
                            </div>
                          </div>
                          <span className="font-medium text-crm-primary">Rs. {parseFloat(t.total_price || 0).toLocaleString()}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {templateId && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-crm-secondary">Adjust Price (optional)</label>
                  <input
                    type="number"
                    value={packagePrice}
                    onChange={(e) => setPackagePrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 border border-crm-border rounded-xl focus:ring-1 focus:ring-crm-primary outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2 text-crm-secondary">Delivery Zone</label>
                <select
                  value={deliveryZoneId}
                  onChange={(e) => setDeliveryZoneId(e.target.value)}
                  className="w-full px-4 py-3 border border-crm-border rounded-xl bg-white focus:ring-1 focus:ring-crm-primary outline-none"
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
              <div className="p-4 bg-crm-background rounded-xl space-y-3 border border-crm-border">
                <div className="flex justify-between">
                  <span className="text-crm-secondary">Customer</span>
                  <span className="font-medium text-crm-primary">{selectedCustomer?.name}</span>
                </div>
                {selectedRecipient && (
                  <div className="flex justify-between">
                    <span className="text-crm-secondary">Deliver To</span>
                    <span className="font-medium text-crm-primary">{selectedRecipient.name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-crm-secondary">Package</span>
                  <span className="font-medium text-crm-primary">{selectedTemplate?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-crm-secondary">Package Price</span>
                  <span className="font-medium text-crm-primary">Rs. {packagePrice.toLocaleString()}</span>
                </div>
                {deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-crm-secondary">Delivery ({selectedZone?.name})</span>
                    <span className="font-medium text-crm-primary">Rs. {deliveryFee.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-crm-border">
                  <span className="font-bold text-crm-primary">Total</span>
                  <span className="font-bold text-crm-primary">Rs. {total.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-crm-secondary">Gift Message (optional)</label>
                <textarea
                  value={giftMessage}
                  onChange={(e) => setGiftMessage(e.target.value)}
                  placeholder="Add a personalized message..."
                  className="w-full px-4 py-3 border border-crm-border rounded-xl focus:ring-1 focus:ring-crm-primary outline-none"
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-crm-border bg-gray-50 flex justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 border border-crm-border text-crm-secondary rounded-lg hover:bg-white transition-colors"
            >
              Back
            </button>
          ) : (
            <button onClick={onClose} className="px-4 py-2 border border-crm-border text-crm-secondary rounded-lg hover:bg-white transition-colors">
              Cancel
            </button>
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="px-6 py-2 btn-primary rounded-lg disabled:opacity-50 flex items-center gap-2"
            >
              Next <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleCreateOrder}
              disabled={loading}
              className="px-6 py-2 bg-crm-success text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-2 shadow-sm"
            >
              {loading ? 'Creating...' : <><Check size={18} /> Create Order</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
