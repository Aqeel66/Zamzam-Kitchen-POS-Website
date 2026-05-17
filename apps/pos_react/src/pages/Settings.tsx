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
  Settings2,
  Palette,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL, resolveImageUrl } from '../config';
import Communications from './Communications';
import Payments from './Payments';

const cn = (...inputs: (string | undefined | null | false)[]) => inputs.filter(Boolean).join(' ');

function SettingsToggle({ label, sublabel, enabled, onToggle, disabled = false }: any) {
  return (
    <div className="flex items-center justify-between group">
      <div className="space-y-1">
        <h4 className="text-sm font-bold text-slate-800">{label}</h4>
        <p className="text-[10px] font-bold text-slate-400 uppercase">{sublabel}</p>
      </div>
      <button 
        disabled={disabled}
        onClick={onToggle}
        className={cn(
          "w-14 h-7 rounded-full transition-all relative p-1",
          disabled ? "opacity-50 cursor-not-allowed" : "",
          enabled ? "bg-orange-500 shadow-lg shadow-orange-500/20" : "bg-slate-200"
        )}
      >
        <div className={cn(
          "w-5 h-5 bg-white rounded-full transition-transform shadow-sm",
          enabled ? "translate-x-7" : "translate-x-0"
        )} />
      </button>
    </div>
  );
}

function SettingsInput({ label, sublabel, value, onSave, type = "number", disabled = false }: any) {
  const [localValue, setLocalValue] = useState(value);
  
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <div className="flex items-center justify-between group">
      <div className="space-y-1">
        <h4 className="text-sm font-bold text-slate-800">{label}</h4>
        <p className="text-[10px] font-bold text-slate-400 uppercase">{sublabel}</p>
      </div>
      <div className="relative flex items-center gap-3">
        <input 
          disabled={disabled}
          type={type} 
          value={localValue || (type === 'number' ? 0 : '')}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={() => {
            const finalVal = type === 'number' ? parseFloat(localValue) : localValue;
            if (finalVal !== value) onSave(finalVal);
          }}
          className={cn(
            "w-32 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-right text-xs font-bold outline-none focus:ring-4 focus:ring-orange-500/5 focus:bg-white transition-all",
            disabled ? "opacity-50 cursor-not-allowed" : ""
          )}
        />
        {value === localValue && (
          <div className="absolute -right-6 text-emerald-500">
            <CheckCircle2 size={14} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function Settings() {
  const [settings, setSettings] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<'general' | 'branding' | 'operations' | 'communications' | 'payments' | 'reset'>('general');
  // Refresh comment to trigger Vite re-transform
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/settings?t=${Date.now()}`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setSettings(data);
      setSaveStatus('idle');
    } catch (err: any) {
      console.error('Error fetching settings:', err);
      setSaveStatus('error');
      // If settings is null and we hit an error, we need to signal that we stopped loading
      if (!settings) {
        setSettings({ _error: err.message });
      }
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
        await fetchSettings();
        window.dispatchEvent(new CustomEvent('settings-updated'));
        window.dispatchEvent(new CustomEvent('show-toast', { 
          detail: { message: 'Settings Updated Successfully', type: 'success' } 
        }));
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (err) {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (file: File, endpoint: string, fieldName: string = 'image') => {
    setIsSaving(true);
    const formData = new FormData();
    formData.append(fieldName, file);

    try {
      const res = await fetch(`${API_BASE_URL}/upload/${endpoint}`, {
        method: 'POST',
        body: formData,
      });
      
      if (res.ok) {
        setSaveStatus('success');
        await fetchSettings();
        window.dispatchEvent(new CustomEvent('show-toast', { 
          detail: { message: 'Media Uploaded Successfully', type: 'success' } 
        }));
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        throw new Error('Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
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
        await fetchSettings();
        window.dispatchEvent(new CustomEvent('settings-updated'));
        window.dispatchEvent(new CustomEvent('show-toast', { 
          detail: { message: 'Operations Updated Successfully', type: 'success' } 
        }));
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
    <div className="h-full flex flex-col items-center justify-center gap-6">
      <div className="w-12 h-12 border-4 border-slate-100 border-t-zamzam-teal rounded-full animate-spin" />
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Initialising System Settings...</p>
    </div>
  );

  if (settings._error) return (
    <div className="h-full flex flex-col items-center justify-center gap-6 p-10 text-center">
      <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center shadow-lg shadow-red-900/5 mb-2">
        <ShieldAlert size={32} />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-bold text-slate-900 uppercase">Connection Failed</h3>
        <p className="text-xs font-bold text-slate-400 max-w-xs mx-auto">We couldn't retrieve the system configuration. This might be due to a server error or database sync issue.</p>
        <p className="text-[10px] font-bold text-red-500/60 uppercase tracking-widest pt-2">Error: {settings._error}</p>
      </div>
      <button 
        onClick={() => { setSettings(null); fetchSettings(); }}
        className="mt-4 bg-zamzam-teal text-white px-8 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-teal-900/10 hover:scale-105 active:scale-95 transition-all"
      >
        Retry Connection
      </button>
    </div>
  );

  return (
    <div className="p-10 max-w-[1200px] mx-auto space-y-10 min-h-full">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <span className="text-[10px] font-bold text-zamzam-teal uppercase tracking-[0.4em] mb-2 block">Control Center</span>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">System <span className="text-zamzam-teal">Settings</span></h1>
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
              <span className="text-xs font-bold uppercase tracking-widest">Changes Saved</span>
            </motion.div>
          )}
          {saveStatus === 'error' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-red-50 text-red-600 px-6 py-4 rounded-2xl flex items-center gap-3 border border-red-100 shadow-lg shadow-red-900/5"
            >
              <ShieldAlert size={20} />
              <span className="text-xs font-bold uppercase tracking-widest">Save Failed</span>
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
                <span className="text-xs font-bold uppercase tracking-widest">{item.label}</span>
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
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Restaurant Name</label>
                    <input 
                      type="text" 
                      defaultValue={settings?.tenant?.restaurant_name || ''}
                      onBlur={(e) => {
                        if (e.target.value !== settings?.tenant?.restaurant_name) {
                          handleUpdateTenant({ restaurant_name: e.target.value });
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:ring-4 focus:ring-zamzam-teal/5 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Contact Email</label>
                    <input 
                      type="email" 
                      defaultValue={settings?.tenant?.business_email || ''}
                      onBlur={(e) => {
                        if (e.target.value !== settings?.tenant?.business_email) {
                          handleUpdateTenant({ business_email: e.target.value });
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:ring-4 focus:ring-zamzam-teal/5 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Contact Phone</label>
                    <input 
                      type="text" 
                      defaultValue={settings?.tenant?.business_phone || ''}
                      onBlur={(e) => {
                        if (e.target.value !== settings?.tenant?.business_phone) {
                          handleUpdateTenant({ business_phone: e.target.value });
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:ring-4 focus:ring-zamzam-teal/5 focus:bg-white transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Business Address</label>
                  <textarea 
                    rows={3}
                    defaultValue={settings?.tenant?.business_address || ''}
                    onBlur={(e) => {
                      if (e.target.value !== settings?.tenant?.business_address) {
                        handleUpdateTenant({ business_address: e.target.value });
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:ring-4 focus:ring-zamzam-teal/5 focus:bg-white transition-all resize-none"
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
                className="space-y-8"
              >
                {/* Tagline Card */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Business Tagline</label>
                    <input 
                      type="text" 
                      defaultValue={settings?.tenant?.tagline || ''}
                      onBlur={(e) => {
                        if (e.target.value !== settings?.tenant?.tagline) {
                          handleUpdateTenant({ tagline: e.target.value });
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:ring-4 focus:ring-zamzam-teal/5 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  {/* Appearance Card */}
                  <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 space-y-8">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-zamzam-teal/10 rounded-xl flex items-center justify-center text-zamzam-teal">
                        <Settings2 size={16} />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Button Styling</h3>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">UI Theme Mode</label>
                        <select 
                          value={settings?.tenant?.theme_mode || 'Adaptive'}
                          onChange={(e) => handleUpdateTenant({ theme_mode: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:ring-4 focus:ring-zamzam-teal/5 focus:bg-white transition-all appearance-none"
                        >
                          <option value="Light">Light Mode</option>
                          <option value="Dark">Dark Mode</option>
                          <option value="Adaptive">Adaptive (System Default)</option>
                          <option value="Zamzam Classic">Zamzam Classic</option>
                          <option value="Emerald Green">Emerald Green</option>
                          <option value="Aura Purple">Aura Purple</option>
                          <option value="Midnight Blue">Midnight Blue</option>
                        </select>
                      </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center px-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Primary Button Color</label>
                            <button 
                              onClick={() => handleUpdateTenant({ primary_accent_color: '#0D9488' })}
                              className="text-[9px] font-bold text-zamzam-teal hover:underline uppercase tracking-widest"
                            >
                              Reset Default
                            </button>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="relative group">
                              <input 
                                type="color" 
                                value={settings?.tenant?.primary_accent_color || '#0D9488'}
                                onChange={(e) => handleUpdateTenant({ primary_accent_color: e.target.value })}
                                className="w-16 h-16 rounded-2xl border-4 border-white shadow-lg cursor-pointer ring-1 ring-slate-200"
                              />
                              <div className="absolute -top-2 -right-2 bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg scale-0 group-active:scale-100 transition-transform">
                                <Check size={14} strokeWidth={4} />
                              </div>
                            </div>
                            <div className="flex-1">
                              <input 
                                type="text" 
                                value={settings?.tenant?.primary_accent_color || '#0D9488'}
                                onChange={(e) => handleUpdateTenant({ primary_accent_color: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold uppercase outline-none focus:ring-4 focus:ring-zamzam-teal/5 focus:bg-white transition-all"
                              />
                            </div>
                          </div>
                        </div>
                    </div>
                  </div>

                  {/* Assets Card */}
                  <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 space-y-8">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-zamzam-yellow/10 rounded-xl flex items-center justify-center text-zamzam-yellow">
                        <Palette size={16} />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Visual Assets</h3>
                    </div>

                    <div className="grid grid-cols-1 gap-10">
                      {/* Primary Logo */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Primary Brand Logo</label>
                          <span className="text-[8px] font-bold bg-blue-50 text-blue-500 px-2 py-1 rounded-full uppercase tracking-tighter">High Res (PNG/SVG)</span>
                        </div>
                        <div className="flex items-center gap-6 p-6 bg-slate-50/50 rounded-3xl border border-slate-100 group transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-200/50">
                          <div className="w-24 h-24 bg-white rounded-2xl border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm transition-transform group-hover:scale-105">
                            {settings?.tenant?.logo_url ? (
                              <img 
                                src={resolveImageUrl(settings?.tenant?.logo_url) || ''} 
                                className="w-[80%] h-[80%] object-contain" 
                              />
                            ) : (
                              <ImageIcon className="text-slate-200" size={32} />
                            )}
                          </div>
                          <div className="flex-1 space-y-3">
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Used for sidebar, login screen, and main system branding.</p>
                            <label className="inline-block">
                              <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleImageUpload(file, 'logo', 'logo');
                                }}
                              />
                              <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 cursor-pointer shadow-sm transition-all active:scale-95">
                                Upload New Logo
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Receipt Logo */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Receipt Logo</label>
                          <span className="text-[8px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-full uppercase tracking-tighter">Thermal Optimized</span>
                        </div>
                        <div className="flex items-center gap-6 p-6 bg-slate-50/50 rounded-3xl border border-slate-100 group transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-200/50">
                          <div className="w-24 h-24 bg-white rounded-2xl border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm transition-transform group-hover:scale-105">
                            {settings?.tenant?.secondary_logo_url ? (
                              <img 
                                src={resolveImageUrl(settings?.tenant?.secondary_logo_url) || ''} 
                                className="w-[80%] h-[80%] object-contain grayscale brightness-75 contrast-125" 
                              />
                            ) : (
                              <ImageIcon className="text-slate-200" size={32} />
                            )}
                          </div>
                          <div className="flex-1 space-y-3">
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Black & white version optimized for thermal printers and PDF invoices.</p>
                            <label className="inline-block">
                              <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleImageUpload(file, 'secondary-logo', 'logo');
                                }}
                              />
                              <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 cursor-pointer shadow-sm transition-all active:scale-95">
                                Upload Receipt Logo
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Background Images Card */}
                  <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 space-y-8 col-span-2">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500">
                        <Settings2 size={16} />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Background Images</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Login Background</label>
                        <div className="relative group rounded-2xl overflow-hidden border border-slate-100 aspect-video bg-slate-50 flex items-center justify-center">
                          {settings?.tenant?.login_background_url ? (
                            <img 
                              src={resolveImageUrl(settings?.tenant?.login_background_url) || ''} 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <ImageIcon className="text-slate-200" size={48} />
                          )}
                          <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(file, 'login-bg', 'image');
                              }}
                            />
                            <span className="text-white text-xs font-bold uppercase tracking-widest">Change Background</span>
                          </label>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Hero Background</label>
                        <div className="relative group rounded-2xl overflow-hidden border border-slate-100 aspect-video bg-slate-50 flex items-center justify-center">
                          {settings?.tenant?.hero_background_url ? (
                            <img 
                              src={resolveImageUrl(settings?.tenant?.hero_background_url) || ''} 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <ImageIcon className="text-slate-200" size={48} />
                          )}
                          <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(file, 'hero-bg', 'image');
                              }}
                            />
                            <span className="text-white text-xs font-bold uppercase tracking-widest">Change Background</span>
                          </label>
                        </div>
                      </div>
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
                className="space-y-8 pb-20"
              >
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Operations Settings</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Configure your restaurant floor and kitchen rules.</p>
                </div>

                {/* Restaurant Timings Section */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-10 py-6 border-b border-slate-50 bg-slate-50/50 flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500">
                      <Clock size={16} />
                    </div>
                    <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.2em]">Restaurant Timings</h3>
                  </div>
                  <div className="p-10 space-y-8">
                    <SettingsInput 
                      disabled={isSaving}
                      label="Opening Time"
                      sublabel="When restaurant starts operating"
                      type="time"
                      value={settings?.branch?.opening_time?.substring(0, 5) || '12:00'}
                      onSave={(val: any) => handleUpdateBranch({ opening_time: val + ':00' })}
                    />
                    <SettingsInput 
                      disabled={isSaving}
                      label="Closing Time"
                      sublabel="When restaurant stops operating"
                      type="time"
                      value={settings?.branch?.closing_time?.substring(0, 5) || '23:00'}
                      onSave={(val: any) => handleUpdateBranch({ closing_time: val + ':00' })}
                    />
                    <SettingsInput 
                      disabled={isSaving}
                      label="First Order Time"
                      sublabel="Earliest time orders are accepted"
                      type="time"
                      value={settings?.branch?.first_order_time?.substring(0, 5) || '12:00'}
                      onSave={(val: any) => handleUpdateBranch({ first_order_time: val + ':00' })}
                    />
                    <SettingsInput 
                      disabled={isSaving}
                      label="Last Order Time"
                      sublabel="Latest time orders are accepted"
                      type="time"
                      value={settings?.branch?.last_order_time?.substring(0, 5) || '22:30'}
                      onSave={(val: any) => handleUpdateBranch({ last_order_time: val + ':00' })}
                    />
                  </div>
                </div>

                {/* Taxes & Fees Section */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-10 py-6 border-b border-slate-50 bg-slate-50/50">
                    <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.2em]">Taxes & Fees</h3>
                  </div>
                  <div className="p-10 space-y-8">
                    {/* Enable Tax */}
                    <SettingsToggle 
                      disabled={isSaving}
                      label="Enable Tax"
                      sublabel="Apply tax to all orders"
                      enabled={settings?.branch?.is_tax_enabled === 1}
                      onToggle={() => handleUpdateBranch({ is_tax_enabled: settings?.branch?.is_tax_enabled ? 0 : 1 })}
                    />

                    {/* Tax Rate */}
                    <SettingsInput 
                      disabled={isSaving}
                      label="Tax Rate (%)"
                      sublabel="Percentage to charge"
                      value={settings?.branch?.tax_rate}
                      onSave={(val: any) => handleUpdateBranch({ tax_rate: val })}
                    />

                    {/* Service Charge */}
                    <SettingsInput 
                      disabled={isSaving}
                      label="Service Charge (%)"
                      sublabel="Optional gratuity fee"
                      value={settings?.branch?.gratuity_percentage}
                      onSave={(val: any) => handleUpdateBranch({ gratuity_percentage: val })}
                    />
                  </div>
                </div>

                {/* Kitchen & Floor Section */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-10 py-6 border-b border-slate-50 bg-slate-50/50">
                    <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.2em]">Kitchen & Floor</h3>
                  </div>
                  <div className="p-10 space-y-8">
                    {/* KDS Timer */}
                    <SettingsInput 
                      disabled={isSaving}
                      label="KDS Timer (Minutes)"
                      sublabel="Warning threshold for orders"
                      value={settings?.branch?.kds_timer_minutes}
                      onSave={(val: any) => handleUpdateBranch({ kds_timer_minutes: val })}
                    />

                    {/* QR Table Ordering */}
                    <div className="flex items-center justify-between group">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-800">QR Table Ordering</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Allow customers to order from table</p>
                      </div>
                      <button 
                        disabled={isSaving}
                        onClick={() => handleUpdateBranch({ allow_qr_pay: !settings?.branch?.allow_qr_pay })}
                        className={cn(
                          "w-14 h-7 rounded-full transition-all relative p-1",
                          isSaving ? "opacity-50 cursor-not-allowed" : "",
                          settings?.branch?.allow_qr_pay ? "bg-orange-500 shadow-lg shadow-orange-500/20" : "bg-slate-200"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 bg-white rounded-full transition-transform shadow-sm",
                          settings?.branch?.allow_qr_pay ? "translate-x-7" : "translate-x-0"
                        )} />
                      </button>
                    </div>

                    {/* Payment Policy */}
                    <div className="flex items-center justify-between group">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-800">Payment Policy</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Determine when payment is collected</p>
                      </div>
                      <select 
                        disabled={isSaving}
                        value={settings?.branch?.payment_policy || 'Pay Last'}
                        onChange={(e) => handleUpdateBranch({ payment_policy: e.target.value })}
                        className={cn(
                          "bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-orange-500/5 focus:bg-white transition-all appearance-none min-w-[120px] text-right",
                          isSaving ? "opacity-50 cursor-not-allowed" : ""
                        )}
                      >
                        <option value="Pay First">Pay First</option>
                        <option value="Pay Last">Pay Last</option>
                        <option value="Pay All">Pay All</option>
                      </select>
                    </div>

                    {/* Order Sort */}
                    <SettingsToggle 
                      disabled={isSaving}
                      label="Newest Orders First"
                      sublabel={settings?.branch?.order_sort_direction === 'Descending' ? "Showing latest orders at the top" : "Showing oldest orders at the top"}
                      enabled={settings?.branch?.order_sort_direction === 'Descending'}
                      onToggle={() => handleUpdateBranch({ 
                        order_sort_direction: settings?.branch?.order_sort_direction === 'Descending' ? 'Ascending' : 'Descending' 
                      })}
                    />
                  </div>
                </div>

                {/* Order Channels Section */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-10 py-6 border-b border-slate-50 bg-slate-50/50">
                    <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.2em]">Order Channels</h3>
                  </div>
                  <div className="p-10 space-y-8">
                    {/* Home Delivery */}
                    <SettingsToggle 
                      disabled={isSaving}
                      label="Home Delivery"
                      sublabel="Enable delivery options on website"
                      enabled={settings?.branch?.allow_delivery === 1}
                      onToggle={() => handleUpdateBranch({ allow_delivery: settings?.branch?.allow_delivery ? 0 : 1 })}
                    />

                    {/* Customer Pickup */}
                    <SettingsToggle 
                      disabled={isSaving}
                      label="Customer Pickup"
                      sublabel="Enable pickup options on website"
                      enabled={settings?.branch?.allow_pickup === 1}
                      onToggle={() => handleUpdateBranch({ allow_pickup: settings?.branch?.allow_pickup ? 0 : 1 })}
                    />
                  </div>
                </div>

                {/* Reservations Section */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-10 py-6 border-b border-slate-50 bg-slate-50/50">
                    <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.2em]">Reservations</h3>
                  </div>
                  <div className="p-10 space-y-8">
                    {/* Enable Booking Fee */}
                    <div className="flex items-center justify-between group">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-800">Enable Booking Fee</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Charge a fee for table bookings</p>
                      </div>
                      <button 
                        disabled={isSaving}
                        onClick={() => handleUpdateBranch({ is_booking_fee_enabled: settings?.branch?.is_booking_fee_enabled ? 0 : 1 })}
                        className={cn(
                          "w-14 h-7 rounded-full transition-all relative p-1",
                          isSaving ? "opacity-50 cursor-not-allowed" : "",
                          settings?.branch?.is_booking_fee_enabled ? "bg-orange-500 shadow-lg shadow-orange-500/20" : "bg-slate-200"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 bg-white rounded-full transition-transform shadow-sm",
                          settings?.branch?.is_booking_fee_enabled ? "translate-x-7" : "translate-x-0"
                        )} />
                      </button>
                    </div>

                    {/* Booking Fee Amount */}
                    <SettingsInput 
                      disabled={isSaving}
                      label="Booking Fee Amount"
                      sublabel="Flat amount per reservation"
                      value={settings?.branch?.booking_fee_amount}
                      onSave={(val: any) => handleUpdateBranch({ booking_fee_amount: val })}
                    />

                    {/* Reservation Gap */}
                    <SettingsInput 
                      disabled={isSaving}
                      label="Reservation Gap (Minutes)"
                      sublabel="Buffer time between bookings"
                      value={settings?.branch?.reservation_gap_minutes || 30}
                      onSave={(val: any) => handleUpdateBranch({ reservation_gap_minutes: val })}
                    />

                    {/* Default Stay Duration */}
                    <SettingsInput 
                      disabled={isSaving}
                      label="Default Stay Duration (Minutes)"
                      sublabel="Estimated table occupancy time"
                      value={settings?.branch?.default_stay_duration_minutes || 60}
                      onSave={(val: any) => handleUpdateBranch({ default_stay_duration_minutes: val })}
                    />
                  </div>
                </div>

                {/* Receipt Customization Section */}
                <div className="bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden relative border border-slate-800">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                  <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Receipt Designer</h3>
                      <p className="text-[10px] font-bold text-white/40 uppercase mt-1">Configure thermal & digital templates</p>
                    </div>
                    <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                      <Receipt size={20} />
                    </div>
                  </div>
                  <div className="p-10 space-y-8">
                    {/* Receipt Header */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-2">Receipt Header</label>
                      <textarea 
                        rows={3}
                        defaultValue={settings?.branch?.receipt_header || ''}
                        onBlur={(e) => {
                          if (e.target.value !== settings?.branch?.receipt_header) {
                            handleUpdateBranch({ receipt_header: e.target.value });
                          }
                        }}
                        placeholder="Enter restaurant address, VAT number, or welcome message..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-xs font-bold text-white outline-none focus:border-orange-500 transition-all resize-none no-scrollbar"
                      />
                    </div>

                    {/* Receipt Footer */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-2">Receipt Footer</label>
                      <textarea 
                        rows={3}
                        defaultValue={settings?.branch?.receipt_footer || ''}
                        onBlur={(e) => {
                          if (e.target.value !== settings?.branch?.receipt_footer) {
                            handleUpdateBranch({ receipt_footer: e.target.value });
                          }
                        }}
                        placeholder="Thank you for visiting! Follow us @zamzamkitchen"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-xs font-bold text-white outline-none focus:border-orange-500 transition-all resize-none no-scrollbar"
                      />
                    </div>

                    {/* QR Code Toggle */}
                    <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white">Show Loyalty QR</h4>
                        <p className="text-[10px] font-bold text-white/30 uppercase">Include QR for points & digital receipt</p>
                      </div>
                      <button 
                        onClick={() => handleUpdateBranch({ show_qr_on_receipt: settings?.branch?.show_qr_on_receipt ? 0 : 1 })}
                        className={cn(
                          "w-14 h-7 rounded-full transition-all relative p-1",
                          settings?.branch?.show_qr_on_receipt ? "bg-orange-500 shadow-lg shadow-orange-500/20" : "bg-white/10"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 bg-white rounded-full transition-transform shadow-sm",
                          settings?.branch?.show_qr_on_receipt ? "translate-x-7" : "translate-x-0"
                        )} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10">
                   <div className="space-y-4">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                      <Coins size={14} className="text-zamzam-teal" /> 
                      System Currency
                    </label>
                    <div className="flex gap-4">
                      <select 
                        value={['AED', 'USD', 'SAR', 'QAR', 'OMR', 'BHD'].includes(settings?.tenant?.currency) ? settings?.tenant?.currency : 'Custom'}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val !== 'Custom') {
                            handleUpdateTenant({ currency: val });
                          }
                        }}
                        className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:ring-4 focus:ring-zamzam-teal/5 focus:bg-white transition-all appearance-none min-w-[140px]"
                      >
                        <option value="AED">AED (Dirham)</option>
                        <option value="USD">USD (Dollar)</option>
                        <option value="SAR">SAR (Riyal)</option>
                        <option value="QAR">QAR (Riyal)</option>
                        <option value="OMR">OMR (Rial)</option>
                        <option value="BHD">BHD (Dinar)</option>
                        <option value="Custom">Custom...</option>
                      </select>
                      
                      {(!['AED', 'USD', 'SAR', 'QAR', 'OMR', 'BHD'].includes(settings?.tenant?.currency) || settings?.tenant?.currency === 'Custom') && (
                        <input 
                          type="text" 
                          placeholder="Enter Currency Code..."
                          defaultValue={settings?.tenant?.currency || ''}
                          onBlur={(e) => handleUpdateTenant({ currency: e.target.value })}
                          className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:ring-4 focus:ring-zamzam-teal/5 focus:bg-white transition-all"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </motion.section>)}
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
                    <h3 className="text-lg font-bold text-red-900 uppercase tracking-tight">Reset Transactional Data</h3>
                  </div>
                  <p className="text-sm font-bold text-red-700/70 mb-8 leading-relaxed">
                    This action will permanently delete all order history, payments, and reservations. All settings and menu items will remain intact.
                  </p>
                  <button 
                    onClick={handleResetData}
                    disabled={isSaving}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-4 rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-red-900/20 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
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
