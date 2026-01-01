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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl w-full max-w-4xl h-[600px] flex overflow-hidden shadow-2xl ring-1 ring-black/5">

        {/* Left Sidebar - Steps */}
        <div className="w-1/3 bg-gray-50 p-6 border-r border-crm-border flex flex-col">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-crm-primary flex items-center gap-2">
              <Zap className="text-crm-accent fill-crm-accent" size={24} /> Quick Order
            </h2>
            <p className="text-sm text-crm-secondary mt-1">Create a new order in 3 simple steps.</p>
          </div>

          <div className="space-y-6 flex-1">
            {['Customer Selection', 'Package & Items', 'Review & Confirm'].map((label, i) => (
              <div key={label} className="relative flex gap-4">
                {/* Vertical Line */}
                {i < 2 && (
                  <div className={`absolute left-4 top-8 bottom-[-24px] w-0.5 ${step > i + 1 ? 'bg-crm-accent' : 'bg-gray-200'}`} />
                )}

                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-colors ${step > i + 1 ? 'bg-crm-accent border-crm-accent text-crm-primary' :
                    step === i + 1 ? 'bg-crm-primary border-crm-primary text-white' :
                      'bg-white border-gray-300 text-gray-400'
                  }`}>
                  {step > i + 1 ? <Check size={16} /> : <span className="text-xs font-bold">{i + 1}</span>}
                </div>
                <div>
                  <p className={`font-medium text-sm ${step === i + 1 ? 'text-crm-primary' : 'text-crm-secondary'}`}>
                    {label}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <button onClick={onClose} className="flex items-center gap-2 text-crm-secondary hover:text-crm-primary mt-auto text-sm font-medium">
            <ChevronRight className="rotate-180" size={16} /> Cancel Order
          </button>
        </div>

        {/* Right Content */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="flex-1 overflow-y-auto p-8 relative">

            {/* Step 1: Customer */}
            {step === 1 && (
              <div className="space-y-6 animate-fadeIn">
                <h3 className="text-xl font-bold text-crm-primary">Find Customer</h3>

                <div className="group">
                  <label className="block text-sm font-medium mb-2 text-crm-secondary group-focus-within:text-crm-primary">Select Customer</label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl ring-1 ring-gray-200 focus:ring-2 focus:ring-crm-accent outline-none transition-all"
                  >
                    <option value="">Choose a customer...</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.whatsapp})</option>
                    ))}
                  </select>
                </div>

                {customerId && recipients.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium mb-3 text-crm-secondary">Deliver To</label>
                    <div className="space-y-3">
                      {recipients.map(r => (
                        <button
                          key={r.id}
                          onClick={() => setRecipientId(r.id)}
                          className={`w-full p-4 border rounded-xl text-left transition-all ${recipientId == r.id
                            ? 'border-crm-primary bg-crm-background ring-1 ring-crm-primary shadow-sm'
                            : 'border-crm-border hover:border-crm-primary hover:bg-gray-50'
                            }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-full ${recipientId == r.id ? 'bg-crm-primary text-white' : 'bg-gray-100 text-gray-500'}`}>
                              <Users size={18} />
                            </div>
                            <div>
                              <p className="font-bold text-crm-primary">{r.name}</p>
                              {r.relationship && <p className="text-xs text-crm-secondary">{r.relationship}</p>}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {customerId && recipients.length === 0 && (
                  <div className="p-6 bg-gray-50 rounded-2xl text-center border-2 border-dashed border-gray-200">
                    <p className="text-crm-secondary font-medium">No recipients found</p>
                    <button
                      onClick={() => navigate(`/customers/${customerId}`)}
                      className="text-sm text-crm-primary underline font-bold mt-2 hover:text-crm-accentHover"
                    >
                      Add recipients to profile →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Package */}
            {step === 2 && (
              <div className="space-y-6 animate-fadeIn">
                <h3 className="text-xl font-bold text-crm-primary">Select Package</h3>

                <div>
                  {templates.length === 0 ? (
                    <div className="p-8 bg-gray-50 rounded-2xl text-center">
                      <Sparkles className="mx-auto text-crm-secondary mb-3" size={32} />
                      <p className="text-crm-secondary">No templates available</p>
                      <button
                        onClick={() => navigate('/invoices/new')}
                        className="text-sm font-bold text-crm-primary underline mt-2"
                      >
                        Go to Full Order Form →
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {templates.map(t => (
                        <button
                          key={t.id}
                          onClick={() => setTemplateId(t.id)}
                          className={`w-full p-4 border rounded-xl text-left transition-all ${templateId == t.id
                            ? 'border-crm-primary bg-crm-background ring-1 ring-crm-primary shadow-md'
                            : 'border-crm-border hover:border-crm-primary hover:bg-gray-50'
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`p-2 rounded-lg ${templateId == t.id ? 'bg-crm-accent text-crm-primary' : 'bg-gray-100 text-gray-500'}`}>
                                <Package size={20} />
                              </div>
                              <div>
                                <p className="font-bold text-crm-primary">{t.name}</p>
                                <p className="text-xs text-crm-secondary">{t.items?.length || 0} items included</p>
                              </div>
                            </div>
                            <span className="font-bold text-crm-primary text-lg">Rs. {parseFloat(t.total_price || 0).toLocaleString()}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {templateId && (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-bold uppercase text-crm-secondary mb-1">Custom Price</label>
                      <input
                        type="number"
                        value={packagePrice}
                        onChange={(e) => setPackagePrice(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white px-3 py-2 rounded-lg border border-gray-200 font-medium"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold uppercase text-crm-secondary mb-1">Delivery Zone</label>
                      <select
                        value={deliveryZoneId}
                        onChange={(e) => setDeliveryZoneId(e.target.value)}
                        className="w-full bg-white px-3 py-2 rounded-lg border border-gray-200 text-sm"
                      >
                        <option value="">Select a zone...</option>
                        {deliveryZones.map(z => (
                          <option key={z.id} value={z.id}>{z.name} (+ Rs. {parseFloat(z.delivery_fee).toLocaleString()})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <div className="space-y-6 animate-fadeIn">
                <h3 className="text-xl font-bold text-crm-primary">Review Order</h3>

                <div className="p-6 bg-gray-50 rounded-2xl space-y-4 border border-gray-100 ring-1 ring-black/5">
                  <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                    <span className="text-crm-secondary font-medium">Customer</span>
                    <div className="text-right">
                      <p className="font-bold text-crm-primary">{selectedCustomer?.name}</p>
                      <p className="text-xs text-crm-secondary">{selectedRecipient?.name ? `to ${selectedRecipient.name}` : 'No recipient selected'}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                    <span className="text-crm-secondary font-medium">Package</span>
                    <div className="text-right">
                      <p className="font-bold text-crm-primary">{selectedTemplate?.name}</p>
                      <p className="text-xs text-crm-secondary">{selectedTemplate?.items?.length} items</p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-crm-secondary">Subtotal</span>
                      <span className="font-medium">Rs. {packagePrice.toLocaleString()}</span>
                    </div>
                    {deliveryFee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-crm-secondary">Delivery ({selectedZone?.name})</span>
                        <span className="font-medium">Rs. {deliveryFee.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-3 border-t border-gray-300 mt-2">
                      <span className="font-bold text-lg text-crm-primary">Total</span>
                      <span className="font-bold text-lg text-crm-primary">Rs. {total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-crm-primary mb-2">Gift Message</label>
                  <textarea
                    value={giftMessage}
                    onChange={(e) => setGiftMessage(e.target.value)}
                    placeholder="Write a lovely message..."
                    className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl ring-1 ring-gray-200 focus:ring-2 focus:ring-crm-accent outline-none transition-all"
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-crm-border bg-white flex justify-end gap-3 z-10">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-3 text-crm-secondary hover:bg-gray-100 rounded-xl font-medium transition-colors"
              >
                Back
              </button>
            )}

            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="px-8 py-3 btn-primary rounded-xl disabled:opacity-50 flex items-center gap-2 font-bold"
              >
                Next Step <ChevronRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleCreateOrder}
                disabled={loading}
                className="px-8 py-3 bg-crm-success text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all font-bold"
              >
                {loading ? 'Processing...' : <><Check size={18} /> Confirm Order</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
