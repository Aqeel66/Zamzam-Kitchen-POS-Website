import { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Clock, 
  Ticket,
  Percent,
  CheckCircle2,
  X,
  Calendar,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';

const cn = (...inputs: (string | undefined | null | false)[]) => inputs.filter(Boolean).join(' ');

export default function Promotions() {
  const [promotions, setPromotions] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const generatePromoCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = 'ZK-';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const [formData, setFormData] = useState({
    code: generatePromoCode(),
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: 0,
    min_spend: 0,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    is_active: true
  });

  useEffect(() => {
    fetchPromotions();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/settings?t=${Date.now()}`);
      const data = await res.json();
      setSettings(data);
    } catch (err) { console.error('Settings Error:', err); }
  };

  const fetchPromotions = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/promotions`);
      const data = await res.json();
      setPromotions(data);
    } catch (err) { console.error('Fetch Error:', err); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/promotions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchPromotions();
        window.dispatchEvent(new CustomEvent('show-toast', { 
          detail: { message: 'Campaign Deleted', type: 'success' } 
        }));
      }
    } catch (err) { console.error('Delete Error:', err); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        code: formData.code,
        discount_type: formData.discount_type === 'percentage' ? 'Percentage' : 'Fixed',
        discount_value: formData.discount_value,
        min_spend: formData.min_spend,
        valid_from: formData.start_date,
        valid_until: formData.end_date,
        is_active: formData.is_active ? 1 : 0
      };

      const res = await fetch(`${API_BASE_URL}/promotions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchPromotions();
        setIsModalOpen(false);
        window.dispatchEvent(new CustomEvent('show-toast', { 
          detail: { message: 'Campaign Created Successfully', type: 'success' } 
        }));
        setFormData({
          code: generatePromoCode(),
          discount_type: 'percentage',
          discount_value: 0,
          min_spend: 0,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          is_active: true
        });
      }
    } catch (err) { 
      console.error('Save Error:', err); 
    } finally {
      setIsSaving(false);
    }
  };

  const currency = settings?.tenant?.currency || 'USD';

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col bg-[#F8F9FA]">
      
      {/* Header */}
      <div className="bg-white border-b border-slate-100 shadow-sm shrink-0">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-zamzam-teal rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
              <Ticket size={18} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">Promotions <span className="text-zamzam-teal">& Coupons</span></h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Campaign Engine</p>
            </div>
          </div>
          <button 
            onClick={() => {
              setFormData({...formData, code: generatePromoCode()});
              setIsModalOpen(true);
            }} 
            className="bg-zamzam-teal text-white px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-teal-500/20 hover:bg-teal-400 transition-all flex items-center gap-2 active:scale-95"
          >
            <Plus size={14} strokeWidth={3} /> New Campaign
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden"
        >
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-8 py-5">Campaign Code</th>
                <th className="px-8 py-5">Value</th>
                <th className="px-8 py-5">Min Spend</th>
                <th className="px-8 py-5">Valid Until</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {promotions.map((promo) => (
                <tr key={promo.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-zamzam-teal/10 rounded-lg flex items-center justify-center text-zamzam-teal">
                        <Ticket size={14} />
                      </div>
                      <span className="text-sm font-bold text-slate-900">{promo.code}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-zamzam-teal/10 text-zamzam-teal text-[10px] font-bold uppercase rounded-lg">
                      {promo.discount_value}{promo.discount_type?.toString().toLowerCase() === 'percentage' ? '%' : ` ${currency}`} OFF
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-xs font-bold text-slate-600">{promo.min_spend} {currency}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                      <Clock size={12} className="text-slate-300" />
                      {promo.valid_until ? new Date(promo.valid_until).toLocaleDateString() : 'Never'}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={cn(
                      "px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest",
                      promo.is_active ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                    )}>
                      {promo.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button 
                      onClick={() => handleDelete(promo.id)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {promotions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-slate-300 uppercase text-[10px] font-bold tracking-widest">
                    No campaigns found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </motion.div>
      </div>

      {/* CREATE MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
               <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                 <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest">New <span className="text-zamzam-teal">Campaign</span></h2>
                 <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 bg-white text-slate-400 rounded-lg flex items-center justify-center hover:bg-slate-100 border border-slate-200 transition-all shadow-sm">
                    <X size={16} />
                 </button>
               </div>
               
               <form onSubmit={handleSubmit} className="p-5 space-y-4">
                  <div className="space-y-1.5">
                     <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Promo Code</label>
                     <div className="relative">
                        <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input 
                          required
                          value={formData.code}
                          onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                          placeholder="E.G. SUMMER20" 
                          className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-zamzam-teal/20 focus:border-zamzam-teal transition-all shadow-sm" 
                        />
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Discount Type</label>
                       <select 
                        value={formData.discount_type}
                        onChange={(e) => setFormData({...formData, discount_type: e.target.value as any})}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-zamzam-teal/20 focus:border-zamzam-teal transition-all shadow-sm appearance-none"
                       >
                          <option value="percentage">Percentage (%)</option>
                          <option value="fixed">Fixed Amount ({currency})</option>
                       </select>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Discount Value</label>
                       <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">
                             {formData.discount_type === 'percentage' ? '%' : currency}
                          </div>
                          <input 
                            required
                            type="number" 
                            value={formData.discount_value}
                            onChange={(e) => setFormData({...formData, discount_value: parseFloat(e.target.value)})}
                            className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-8 pr-3 text-xs font-bold outline-none focus:ring-2 focus:ring-zamzam-teal/20 focus:border-zamzam-teal transition-all shadow-sm" 
                          />
                       </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Min Spend ({currency})</label>
                       <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                          <input 
                            type="number" 
                            value={formData.min_spend}
                            onChange={(e) => setFormData({...formData, min_spend: parseFloat(e.target.value)})}
                            className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-bold outline-none focus:ring-2 focus:ring-zamzam-teal/20 focus:border-zamzam-teal transition-all shadow-sm" 
                          />
                       </div>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Expiry Date</label>
                       <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                          <input 
                            type="date" 
                            value={formData.end_date}
                            onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                            className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-[11px] font-bold outline-none focus:ring-2 focus:ring-zamzam-teal/20 focus:border-zamzam-teal transition-all shadow-sm" 
                          />
                       </div>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className="w-full bg-zamzam-teal text-white py-3 mt-2 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-teal-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? 'Processing...' : 'Activate Campaign'}
                  </button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
