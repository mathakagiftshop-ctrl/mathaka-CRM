import { useState, useEffect } from 'react';
import api from '../api';
import { Package, Sparkles, ChevronRight, X, Save, Check } from 'lucide-react';

export default function PackageTemplateSelector({ onSelectTemplate, onClose, currentPackage }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/packages');
      setTemplates(res.data);
    } catch (err) {
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!saveName || !currentPackage) return;

    setSaving(true);
    try {
      await api.post('/packages', {
        name: saveName,
        description: saveDescription,
        total_price: currentPackage.package_price || 0,
        items: currentPackage.items.map(item => ({
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price
        }))
      });
      setShowSaveForm(false);
      setSaveName('');
      setSaveDescription('');
      fetchTemplates();
    } catch (err) {
      alert('Error saving template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-crm-border flex justify-between items-center bg-white">
          <h2 className="text-lg font-bold text-crm-primary flex items-center gap-2">
            <Package size={20} className="text-crm-accent" /> Package Templates
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-crm-background rounded-lg text-crm-secondary hover:text-crm-primary">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Save Current as Template */}
          {currentPackage && currentPackage.items?.length > 0 && (
            <div className="mb-4">
              {showSaveForm ? (
                <div className="p-4 bg-crm-background rounded-xl border border-crm-border space-y-3">
                  <h3 className="font-medium text-crm-primary">Save Current Package as Template</h3>
                  <input
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="Template name *"
                    className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:ring-1 focus:ring-crm-primary outline-none"
                  />
                  <textarea
                    value={saveDescription}
                    onChange={(e) => setSaveDescription(e.target.value)}
                    placeholder="Description (optional)"
                    className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:ring-1 focus:ring-crm-primary outline-none"
                    rows={2}
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowSaveForm(false)}
                      className="px-3 py-2 text-sm text-crm-secondary hover:bg-white border border-transparent hover:border-crm-border rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAsTemplate}
                      disabled={saving || !saveName}
                      className="px-4 py-2 bg-crm-success text-white rounded-lg text-sm hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-2 shadow-sm"
                    >
                      {saving ? 'Saving...' : <><Save size={16} /> Save Template</>}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowSaveForm(true)}
                  className="w-full p-3 border-2 border-dashed border-crm-border rounded-xl text-crm-secondary hover:text-crm-primary hover:border-crm-primary hover:bg-crm-background flex items-center justify-center gap-2 transition-all"
                >
                  <Save size={18} /> Save Current Package as Template
                </button>
              )}
            </div>
          )}

          {/* Templates List */}
          {loading ? (
            <div className="text-center py-8 text-crm-secondary">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8">
              <Sparkles className="mx-auto text-crm-border mb-2" size={40} />
              <p className="text-crm-secondary">No templates saved yet</p>
              <p className="text-sm text-crm-secondary opacity-70">Create a package and save it as a template for quick reuse</p>
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-crm-secondary mb-3">Available Templates</h3>
              {templates.map(template => (
                <button
                  key={template.id}
                  onClick={() => onSelectTemplate(template)}
                  className="w-full p-4 bg-white border border-crm-border rounded-xl hover:border-crm-primary hover:shadow-md transition-all text-left group"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-crm-primary group-hover:text-crm-accent transition-colors">{template.name}</h4>
                      {template.description && (
                        <p className="text-sm text-crm-secondary mt-1">{template.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-crm-secondary opacity-80">
                        <span>{template.items?.length || 0} items</span>
                        <span>Rs. {parseFloat(template.total_price || 0).toLocaleString()}</span>
                      </div>
                    </div>
                    <ChevronRight className="text-crm-border group-hover:text-crm-accent transition-colors" size={20} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-crm-border bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2 text-crm-secondary hover:bg-white border border-transparent hover:border-crm-border rounded-lg transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
