import { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Settings2, 
  Bell, 
  CheckCircle2, 
  Plus,
  MessageCircle,
  Mail,
  Server,
  Lock,
  User,
  Hash,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';

const cn = (...inputs: (string | undefined | null | false)[]) => inputs.filter(Boolean).join(' ');

export default function Communications() {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'sms' | 'email' | 'templates' | 'history'>('whatsapp');
  const [settings, setSettings] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/settings?t=${Date.now()}`);
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const handleUpdateMessaging = async (provider: string, fields: any) => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/settings/messaging`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_name: provider, ...fields })
      });
      if (res.ok) {
        setSaveStatus('success');
        fetchSettings();
        window.dispatchEvent(new CustomEvent('show-toast', { 
          detail: { message: `${provider} Settings Updated`, type: 'success' } 
        }));
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (err) {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateEmail = async (provider: string, fields: any) => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/settings/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_name: provider, ...fields })
      });
      if (res.ok) {
        setSaveStatus('success');
        fetchSettings();
        window.dispatchEvent(new CustomEvent('show-toast', { 
          detail: { message: `${provider} Settings Updated`, type: 'success' } 
        }));
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
        window.dispatchEvent(new CustomEvent('show-toast', { 
          detail: { message: 'Operational Settings Updated', type: 'success' } 
        }));
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (err) {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!settings) return (
    <div className="h-full flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-slate-100 border-t-zamzam-teal rounded-full animate-spin" />
    </div>
  );

  const twilio = settings.messaging?.find((m: any) => m.provider_name === 'Twilio') || {};
  const smtp = settings.email?.find((e: any) => e.provider_name === 'SMTP') || {};

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8 min-h-full">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-zamzam-teal">
            <MessageCircle size={20} className="fill-current opacity-20" />
            <span className="text-[10px] font-bold uppercase tracking-[0.4em]">Notification Hub</span>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Customer <span className="text-zamzam-teal">Communications</span></h1>
        </div>

        <div className="flex items-center gap-3">
          <AnimatePresence>
            {saveStatus === 'success' && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-green-50 text-green-600 px-4 py-2 rounded-xl flex items-center gap-2 border border-green-100"
              >
                <CheckCircle2 size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Settings Synchronized</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
        {[
          { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
          { id: 'sms', label: 'SMS Gateway', icon: Smartphone },
          { id: 'email', label: 'Email (SMTP)', icon: Mail },
          { id: 'templates', label: 'Templates', icon: Settings2 },
          { id: 'history', label: 'Logs', icon: Bell },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-3 px-6 py-3 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all",
              activeTab === tab.id 
                ? "bg-white text-zamzam-teal shadow-sm shadow-slate-200" 
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Main Content */}
        <div className="col-span-8">
          <AnimatePresence mode="wait">
            {(activeTab === 'whatsapp' || activeTab === 'sms') && (
              <motion.div
                key="twilio"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-500">
                        {activeTab === 'whatsapp' ? <MessageCircle size={32} /> : <Smartphone size={32} />}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 uppercase">Twilio {activeTab === 'whatsapp' ? 'WhatsApp' : 'SMS'} API</h2>
                        <p className="text-sm font-bold text-slate-400">Global messaging infrastructure for Zamzam Kitchen</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleUpdateMessaging('Twilio', { is_active: !twilio.is_active })}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all",
                        twilio.is_active 
                          ? "bg-green-50 text-green-600 border-green-100" 
                          : "bg-slate-50 text-slate-400 border-slate-100"
                      )}
                    >
                      {twilio.is_active ? 'Active' : 'Disabled'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                        <User size={12} /> Account SID
                      </label>
                      <input 
                        type="text" 
                        defaultValue={twilio.account_sid || ''}
                        onBlur={(e) => handleUpdateMessaging('Twilio', { account_sid: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-mono outline-none focus:ring-4 focus:ring-zamzam-teal/5 focus:bg-white transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                        <Lock size={12} /> Auth Token
                      </label>
                      <input 
                        type="password" 
                        defaultValue={twilio.auth_token || ''}
                        onBlur={(e) => handleUpdateMessaging('Twilio', { auth_token: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-mono outline-none focus:ring-4 focus:ring-zamzam-teal/5 focus:bg-white transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                        <Hash size={12} /> Sender Number
                      </label>
                      <input 
                        type="text" 
                        defaultValue={twilio.sender_number || ''}
                        onBlur={(e) => handleUpdateMessaging('Twilio', { sender_number: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:ring-4 focus:ring-zamzam-teal/5 focus:bg-white transition-all"
                        placeholder="+966XXXXXXXXX"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                        <Activity size={12} /> Environment
                      </label>
                      <select 
                        defaultValue={twilio.environment || 'sandbox'}
                        onChange={(e) => handleUpdateMessaging('Twilio', { environment: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:ring-4 focus:ring-zamzam-teal/5 focus:bg-white transition-all appearance-none"
                      >
                        <option value="sandbox">Sandbox / Testing</option>
                        <option value="production">Production / Live</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Status Triggers (Parity with Flutter) */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-6 px-2">Automatic Event Triggers</h3>
                  <div className="space-y-4">
                    {[
                      { id: 'notify_order_confirmed', label: 'Order Confirmed', sub: 'Sent when the customer finishes checkout' },
                      { id: 'notify_order_ready', label: 'Order Ready for Collection', sub: 'Triggered from KDS when items are bumped' },
                      { id: 'notify_reservation_reminder', label: 'Reservation Reminder', sub: 'Sent 2 hours before the booked time' },
                    ].map((trigger) => (
                      <div key={trigger.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-zamzam-teal/20 transition-all group">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                            settings.branch[trigger.id] ? "bg-zamzam-teal/10 text-zamzam-teal" : "bg-slate-200 text-slate-400"
                          )}>
                            <Bell size={18} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 uppercase tracking-tight">{trigger.label}</p>
                            <p className="text-[10px] font-bold text-slate-400">{trigger.sub}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleUpdateBranch({ [trigger.id]: !settings.branch[trigger.id] })}
                          className={cn(
                            "w-12 h-6 rounded-full transition-all relative",
                            settings.branch[trigger.id] ? "bg-zamzam-teal" : "bg-slate-300"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                            settings.branch[trigger.id] ? "right-1" : "left-1"
                          )} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'email' && (
              <motion.div
                key="email"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                        <Mail size={32} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 uppercase">SMTP Email Gateway</h2>
                        <p className="text-sm font-bold text-slate-400">Configure your professional email relay</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleUpdateEmail('SMTP', { is_active: !smtp.is_active })}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all",
                        smtp.is_active 
                          ? "bg-blue-50 text-blue-600 border-blue-100" 
                          : "bg-slate-50 text-slate-400 border-slate-100"
                      )}
                    >
                      {smtp.is_active ? 'Active' : 'Disabled'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                        <Server size={12} /> SMTP Host
                      </label>
                      <input 
                        type="text" 
                        defaultValue={smtp.smtp_host || ''}
                        onBlur={(e) => handleUpdateEmail('SMTP', { smtp_host: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white transition-all"
                        placeholder="smtp.gmail.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                        <Hash size={12} /> SMTP Port
                      </label>
                      <input 
                        type="number" 
                        defaultValue={smtp.smtp_port || 587}
                        onBlur={(e) => handleUpdateEmail('SMTP', { smtp_port: parseInt(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                        <User size={12} /> SMTP Username
                      </label>
                      <input 
                        type="text" 
                        defaultValue={smtp.smtp_user || ''}
                        onBlur={(e) => handleUpdateEmail('SMTP', { smtp_user: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                        <Lock size={12} /> SMTP Password
                      </label>
                      <input 
                        type="password" 
                        defaultValue={smtp.smtp_pass || ''}
                        onBlur={(e) => handleUpdateEmail('SMTP', { smtp_pass: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                        <Mail size={12} /> From Email
                      </label>
                      <input 
                        type="email" 
                        defaultValue={smtp.from_email || ''}
                        onBlur={(e) => handleUpdateEmail('SMTP', { from_email: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                        <User size={12} /> From Name
                      </label>
                      <input 
                        type="text" 
                        defaultValue={smtp.from_name || ''}
                        onBlur={(e) => handleUpdateEmail('SMTP', { from_name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'templates' && (
              <motion.div
                key="templates"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-bold text-slate-900 uppercase">Message Templates</h2>
                    <button className="flex items-center gap-2 px-6 py-3 bg-zamzam-teal text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-teal-900/20 active:scale-95 transition-all">
                      <Plus size={16} /> New Template
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6 hover:border-zamzam-teal/20 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <span className="px-3 py-1 bg-zamzam-teal/10 text-zamzam-teal text-[9px] font-bold uppercase tracking-widest rounded-lg">Order Ready</span>
                        <Settings2 size={16} className="text-slate-300 cursor-pointer hover:text-zamzam-teal transition-colors" />
                      </div>
                      <p className="text-xs font-bold text-slate-600 italic mb-4 leading-relaxed">
                        "Salam [CustomerName]! Your order #[OrderID] is hot and ready for collection at Zamzam Kitchen. See you soon!"
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        <span className="text-[10px] font-bold text-slate-400">Approved by Meta</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6 hover:border-zamzam-teal/20 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <span className="px-3 py-1 bg-zamzam-yellow/10 text-zamzam-yellow text-[9px] font-bold uppercase tracking-widest rounded-lg">Welcome</span>
                        <Settings2 size={16} className="text-slate-300 cursor-pointer hover:text-zamzam-teal transition-colors" />
                      </div>
                      <p className="text-xs font-bold text-slate-600 italic mb-4 leading-relaxed">
                        "Welcome to the Zamzam family, [CustomerName]! We've received your reservation for [Time] at [Table]. Mabrook!"
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        <span className="text-[10px] font-bold text-slate-400">Approved by Meta</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar / Quick Actions */}
        <div className="col-span-4 space-y-6">
          <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] mb-2 opacity-60">Status Check</h3>
              <p className="text-2xl font-bold mb-6 tracking-tight">API Reliability</p>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Twilio Status</span>
                  <span className={cn("text-[10px] font-bold uppercase tracking-widest", twilio.is_active ? "text-green-400" : "text-slate-500")}>
                    {twilio.is_active ? '99.9% Online' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">SMTP Status</span>
                  <span className={cn("text-[10px] font-bold uppercase tracking-widest", smtp.is_active ? "text-green-400" : "text-slate-500")}>
                    {smtp.is_active ? 'Operational' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Local Gateway</span>
                  <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Connected</span>
                </div>
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-zamzam-teal/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-6">Template Variables</h3>
            <div className="space-y-3">
              {[
                { key: '[CustomerName]', desc: 'First & Last name' },
                { key: '[OrderID]', desc: '6-digit Order Reference' },
                { key: '[Table]', desc: 'Reserved table name/number' },
                { key: '[Time]', desc: 'Booking or Collection time' },
                { key: '[Total]', desc: 'Total bill amount' },
              ].map((v) => (
                <div key={v.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-zamzam-teal/20 transition-all">
                  <code className="text-[10px] font-bold text-zamzam-teal">{v.key}</code>
                  <span className="text-[10px] font-bold text-slate-400">{v.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
