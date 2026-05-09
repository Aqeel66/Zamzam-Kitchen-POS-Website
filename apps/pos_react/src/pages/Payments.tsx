import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Globe, 
  ShieldCheck, 
  CheckCircle2, 
  Coins,
  QrCode,
  Zap,
  Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';

const cn = (...inputs: (string | undefined | null | false)[]) => inputs.filter(Boolean).join(' ');

export default function Payments() {
  const [activeTab, setActiveTab] = useState<'gateways' | 'qr' | 'local' | 'payouts'>('gateways');
  const [settings, setSettings] = useState<any>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/settings`);
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  if (!settings) return (
    <div className="h-full flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-slate-100 border-t-zamzam-yellow rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8 min-h-full">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-zamzam-yellow">
            <ShieldCheck size={20} className="fill-current opacity-20" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em]">Financial Hub</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Payment <span className="text-zamzam-yellow">Gateways</span></h1>
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
                <span className="text-[10px] font-black uppercase tracking-widest">Gateway Verified</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
        {[
          { id: 'gateways', label: 'Online Gateways', icon: Globe },
          { id: 'qr', label: 'QR Payments', icon: QrCode },
          { id: 'local', label: 'Local Methods', icon: Wallet },
          { id: 'payouts', label: 'Payout Settings', icon: Coins },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-3 px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all",
              activeTab === tab.id 
                ? "bg-white text-zamzam-yellow shadow-sm shadow-slate-200" 
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Main Content Area */}
        <div className="col-span-8">
          <AnimatePresence mode="wait">
            {activeTab === 'gateways' && (
              <motion.div
                key="gateways"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Stripe Section */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 group">
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-[#635BFF]/10 rounded-2xl flex items-center justify-center text-[#635BFF]">
                        <CreditCard size={32} />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-slate-900 uppercase">Stripe Connect</h2>
                        <p className="text-sm font-bold text-slate-400">Cards, Apple Pay, Google Pay</p>
                      </div>
                    </div>
                    <div className="px-4 py-2 bg-[#635BFF]/5 text-[#635BFF] rounded-xl text-[10px] font-black uppercase tracking-widest border border-[#635BFF]/10">
                      Primary
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Stripe Publishable Key</label>
                        <input 
                          type="text" 
                          defaultValue="YOUR_PUBLISHABLE_KEY_HERE"
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-mono outline-none focus:ring-4 focus:ring-[#635BFF]/5 focus:bg-white transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Stripe Secret Key</label>
                        <input 
                          type="password" 
                          defaultValue="YOUR_SECRET_KEY_HERE"
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-mono outline-none focus:ring-4 focus:ring-[#635BFF]/5 focus:bg-white transition-all"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-6 bg-[#635BFF]/5 rounded-[1.5rem] border border-[#635BFF]/10">
                      <div className="flex items-center gap-4">
                        <Zap size={20} className="text-[#635BFF]" />
                        <div>
                          <p className="text-xs font-black text-slate-900 uppercase">Webhook Auto-Sync</p>
                          <p className="text-[10px] font-bold text-[#635BFF]/60">Automatically mark orders as paid upon successful Stripe charge</p>
                        </div>
                      </div>
                      <button className="w-12 h-6 bg-[#635BFF] rounded-full relative">
                        <div className="absolute top-1 right-1 w-4 h-4 bg-white rounded-full" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* PayPal Section */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 opacity-60 hover:opacity-100 transition-all">
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-[#003087]/10 rounded-2xl flex items-center justify-center text-[#003087]">
                        <Globe size={32} />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-slate-900 uppercase">PayPal Checkout</h2>
                        <p className="text-sm font-bold text-slate-400">PayPal balance & Buy Now Pay Later</p>
                      </div>
                    </div>
                    <button className="px-6 py-3 bg-[#003087] text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Connect Account</button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'qr' && (
              <motion.div
                key="qr"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-zamzam-teal/10 rounded-2xl flex items-center justify-center text-zamzam-teal">
                        <QrCode size={32} />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-slate-900 uppercase">Scan to Pay (QR)</h2>
                        <p className="text-sm font-bold text-slate-400">Enable table-side payments for diners</p>
                      </div>
                    </div>
                    <div className="w-12 h-6 bg-zamzam-teal rounded-full relative">
                      <div className="absolute top-1 right-1 w-4 h-4 bg-white rounded-full" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">QR Provider</p>
                      <p className="text-xs font-black text-slate-900">Zamzam Internal Gateway</p>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Transaction Fee</p>
                      <p className="text-xs font-black text-slate-900">0.00% (Direct)</p>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Payout Speed</p>
                      <p className="text-xs font-black text-slate-900">Instant to Wallet</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Sidebar - Financial Summary */}
        <div className="col-span-4 space-y-6">
          <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] mb-2 opacity-60">Security Protocol</h3>
              <p className="text-2xl font-black mb-6 tracking-tight">PCI Compliance</p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center text-green-400">
                    <Lock size={16} />
                  </div>
                  <span className="text-[11px] font-bold text-white/80 uppercase tracking-wider">End-to-End Encryption</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center text-green-400">
                    <ShieldCheck size={16} />
                  </div>
                  <span className="text-[11px] font-bold text-white/80 uppercase tracking-wider">DSS Level 1 Security</span>
                </div>
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-zamzam-yellow/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Settlement Currency</h3>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-zamzam-yellow/10 text-zamzam-yellow rounded-xl flex items-center justify-center font-black">
                  {settings.tenant.currency}
                </div>
                <p className="text-xs font-black text-slate-900 uppercase">Primary Currency</p>
              </div>
              <ArrowRight size={16} className="text-slate-300" />
            </div>
            <p className="mt-4 text-[10px] font-bold text-slate-400 px-2 italic">
              * Changing your base currency will affect all reports and pending transactions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
