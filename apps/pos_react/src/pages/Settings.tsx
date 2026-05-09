import { useState, useEffect } from 'react';
import { 
  Store, 
  CreditCard, 
  Trash2, 
  ChevronRight,
  ShieldAlert,
  Coins,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Clock,
  Image as ImageIcon,
  MessageSquare,
  Globe,
  Settings2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';
import Communications from './Communications';
import Payments from './Payments';

const cn = (...inputs: (string | undefined | null | false)[]) => inputs.filter(Boolean).join(' ');

export default function Settings() {
  const [settings, setSettings] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<'general' | 'branding' | 'operations' | 'communications' | 'payments' | 'reset'>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/settings`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setSettings(data);
      setSaveStatus('idle');
    } catch (err) {
      console.error('Error fetching settings:', err);
      setSaveStatus('error');
    }
  };

  const handleUpdateTenant = async (fields: any) => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/settings/tenant`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      });
      if (res.ok) {
        setSaveStatus('success');
        fetchSettings();
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (err) {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateBranch = async (fields: any) => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/settings/branch`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      });
      if (res.ok) {
        setSaveStatus('success');
        fetchSettings();
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (err) {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetData = async () => {
    if (!confirm('CRITICAL WARNING: This will permanently delete ALL orders, payments, and transactions. This action cannot be undone. Are you absolutely sure?')) {
      return;
    }
    
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/settings/reset-transactions`, { method: 'POST' });
      if (res.ok) {
        alert('All transactional data has been reset successfully.');
        window.location.reload();
      }
    } catch (err) {
      alert('Failed to reset data.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!settings) return (
    <div className="h-full flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-slate-100 border-t-zamzam-teal rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-10 max-w-[1200px] mx-auto space-y-10 min-h-full">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <span className="text-[10px] font-black text-zamzam-teal uppercase tracking-[0.4em] mb-2 block">Control Center</span>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">System <span className="text-zamzam-teal">Settings</span></h1>
        </div>
        
        <AnimatePresence>
          {saveStatus === 'success' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-green-50 text-green-600 px-6 py-4 rounded-2xl flex items-center gap-3 border border-green-100 shadow-lg shadow-green-900/5"
            >
              <CheckCircle2 size={20} />
              <span className="text-xs font-black uppercase tracking-widest">Changes Saved</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex gap-10">
        {/* Navigation Sidebar */}
        <aside className="w-72 space-y-2">
          {[
            { id: 'general', label: 'General Info', icon: Store },
            { id: 'branding', label: 'Branding', icon: ImageIcon },
            { id: 'operations', label: 'Operations', icon: Settings2 },
            { id: 'communications', label: 'Communications', icon: MessageSquare },
            { id: 'payments', label: 'Payments', icon: CreditCard },
            { id: 'reset', label: 'System Reset', icon: ShieldAlert },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as any)}
              className={cn(
                "w-full flex items-center justify-between px-6 py-5 rounded-[1.5rem] transition-all group",
                activeSection === item.id 
                  ? "bg-zamzam-teal text-white shadow-xl shadow-teal-900/20" 
                  : "bg-white text-slate-400 hover:bg-slate-50 border border-slate-100"
              )}
            >
              <div className="flex items-center gap-4">
                <item.icon size={20} />
                <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
              </div>
              <ChevronRight size={16} className={cn("transition-transform", activeSection === item.id ? "translate-x-0" : "-translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0")} />
            </button>
          ))}
        </aside>

        {/* Content Area */}
        <main className="flex-1">
          <AnimatePresence mode="wait">
            {activeSection === 'general' && (
              <motion.section
                key="general"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 space-y-10"
              >
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Restaurant Name</label>
                    <input 
                      type="text" 
                      defaultValue={settings.tenant.restaurant_name}
                      onBlur={(e) => {
                        if (e.target.value !== settings.tenant.restaurant_name) {
                          handleUpdateTenant({ restaurant_name: e.target.value });
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-black outline-none focus:ring-4 focus:ring-zamzam-teal/5 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Contact Email</label>
                    <input 
                      type="email" 
                      defaultValue={settings.tenant.business_email}
                      onBlur={(e) => {
                        if (e.target.value !== settings.tenant.business_email) {
                          handleUpdateTenant({ business_email: e.target.value });
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-black outline-none focus:ring-4 focus:ring-zamzam-teal/5 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Contact Phone</label>
                    <input 
                      type="text" 
                      defaultValue={settings.tenant.business_phone}
                      onBlur={(e) => {
                        if (e.target.value !== settings.tenant.business_phone) {
                          handleUpdateTenant({ business_phone: e.target.value });
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-black outline-none focus:ring-4 focus:ring-zamzam-teal/5 focus:bg-white transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Business Address</label>
                  <textarea 
                    rows={3}
                    defaultValue={settings.tenant.business_address}
                    onBlur={(e) => {
                      if (e.target.value !== settings.tenant.business_address) {
                        handleUpdateTenant({ business_address: e.target.value });
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-black outline-none focus:ring-4 focus:ring-zamzam-teal/5 focus:bg-white transition-all resize-none"
                  />
                </div>
              </motion.section>
            )}

            {activeSection === 'branding' && (
              <motion.section
                key="branding"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 space-y-10"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Business Tagline</label>
                  <input 
                    type="text" 
                    defaultValue={settings.tenant.tagline}
                    onBlur={(e) => {
                      if (e.target.value !== settings.tenant.tagline) {
                        handleUpdateTenant({ tagline: e.target.value });
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-black outline-none focus:ring-4 focus:ring-zamzam-teal/5 focus:bg-white transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Primary Logo (App Sidebar)</label>
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                        {settings.tenant.logo_url ? (
                          <img src={settings.tenant.logo_url} className="w-full h-full object-contain p-2" />
                        ) : (
                          <ImageIcon size={24} className="text-slate-200" />
                        )}
                      </div>
                      <input 
                        type="text" 
                        placeholder="Logo URL"
                        defaultValue={settings.tenant.logo_url}
                        onBlur={(e) => {
                          if (e.target.value !== settings.tenant.logo_url) {
                            handleUpdateTenant({ logo_url: e.target.value });
                          }
                        }}
                        className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-black outline-none focus:ring-4 focus:ring-zamzam-teal/5 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Secondary Logo (Receipts)</label>
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                        {settings.tenant.secondary_logo_url ? (
                          <img src={settings.tenant.secondary_logo_url} className="w-full h-full object-contain p-2" />
                        ) : (
                          <ImageIcon size={24} className="text-slate-200" />
                        )}
                      </div>
                      <input 
                        type="text" 
                        placeholder="Logo URL"
                        defaultValue={settings.tenant.secondary_logo_url}
                        onBlur={(e) => {
                          if (e.target.value !== settings.tenant.secondary_logo_url) {
                            handleUpdateTenant({ secondary_logo_url: e.target.value });
                          }
                        }}
                        className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-black outline-none focus:ring-4 focus:ring-zamzam-teal/5 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>
              </motion.section>
            )}

            {activeSection === 'operations' && (
              <motion.section
                key="operations"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 space-y-10"
              >
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                      <Coins size={12} /> Currency Symbol
                    </label>
                    <input 
                      type="text" 
                      defaultValue={settings.tenant.currency}
                      onBlur={(e) => {
                        if (e.target.value !== settings.tenant.currency) {
                          handleUpdateTenant({ currency: e.target.value });
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-black outline-none focus:ring-4 focus:ring-zamzam-teal/5 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                      <Receipt size={12} /> Tax Rate (%)
                    </label>
                    <input 
                      type="number" 
                      defaultValue={settings.branch.tax_rate}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        if (val !== settings.branch.tax_rate) {
                          handleUpdateBranch({ tax_rate: val });
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-black outline-none focus:ring-4 focus:ring-zamzam-teal/5 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                      <Clock size={12} /> KDS Warning Timer (Mins)
                    </label>
                    <input 
                      type="number" 
                      defaultValue={settings.branch.kds_timer_minutes}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value);
                        if (val !== settings.branch.kds_timer_minutes) {
                          handleUpdateBranch({ kds_timer_minutes: val });
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-black outline-none focus:ring-4 focus:ring-zamzam-teal/5 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                      <CreditCard size={12} /> Default Gratuity (%)
                    </label>
                    <input 
                      type="number" 
                      defaultValue={settings.branch.gratuity_percentage}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        if (val !== settings.branch.gratuity_percentage) {
                          handleUpdateBranch({ gratuity_percentage: val });
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-black outline-none focus:ring-4 focus:ring-zamzam-teal/5 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </motion.section>
            )}

            {activeSection === 'communications' && (
              <motion.div
                key="communications"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[600px]"
              >
                <Communications />
              </motion.div>
            )}

            {activeSection === 'payments' && (
              <motion.div
                key="payments"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[600px]"
              >
                <Payments />
              </motion.div>
            )}

            {activeSection === 'reset' && (
              <motion.section
                key="reset"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-[2.5rem] border border-red-100 shadow-sm p-10 space-y-10"
              >
                <div className="bg-red-50 p-8 rounded-[2rem] border border-red-100">
                  <div className="flex items-center gap-4 mb-4">
                    <AlertCircle size={24} className="text-red-600" />
                    <h3 className="text-lg font-black text-red-900 uppercase tracking-tight">Reset Transactional Data</h3>
                  </div>
                  <p className="text-sm font-bold text-red-700/70 mb-8 leading-relaxed">
                    This action will permanently delete all order history, payments, and reservations. All settings and menu items will remain intact.
                  </p>
                  <button 
                    onClick={handleResetData}
                    disabled={isSaving}
                    className="bg-red-600 hover:bg-red-700 text-white font-black px-8 py-4 rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-red-900/20 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                  >
                    <Trash2 size={18} />
                    {isSaving ? 'Processing...' : 'Reset All Transactions'}
                  </button>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
