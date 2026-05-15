import { useState, useEffect } from 'react';
import { 
  Ticket, 
  Plus, 
  Search, 
  Trash2, 
  Calendar, 
  DollarSign, 
  Percent,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';

interface Promotion {
  id: number;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_spend: number;
  valid_until: string | null;
  is_active: number;
  created_at?: string;
}

export default function Promotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    min_spend: '0',
    valid_until: ''
  });

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/promotions`);
      const data = await response.json();
      setPromotions(data);
    } catch (error) {
      console.error('Fetch Promos Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/promotions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          discount_value: parseFloat(formData.discount_value),
          min_spend: parseFloat(formData.min_spend),
          valid_until: formData.valid_until || null
        })
      });

      if (response.ok) {
        setIsModalOpen(false);
        setFormData({ code: '', discount_type: 'percentage', discount_value: '', min_spend: '0', valid_until: '' });
        fetchPromotions();
      } else {
        const error = await response.json();
        alert(error.message);
      }
    } catch (error) {
      console.error('Create Promo Error:', error);
    }
  };

  const toggleStatus = async (id: number, currentStatus: number) => {
    try {
      await fetch(`${API_BASE_URL}/promotions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: currentStatus === 1 ? 0 : 1 })
      });
      fetchPromotions();
    } catch (error) {
      console.error('Toggle Status Error:', error);
    }
  };

  const deletePromo = async (id: number) => {
    if (!confirm('Are you sure you want to delete this promo code?')) return;
    try {
      await fetch(`${API_BASE_URL}/promotions/${id}`, { method: 'DELETE' });
      fetchPromotions();
    } catch (error) {
      console.error('Delete Promo Error:', error);
    }
  };

  const filteredPromos = promotions.filter(p => 
    p.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Promotions <span className="text-zamzam-teal">&</span> Coupons</h1>
          <p className="text-slate-400 font-bold mt-1 uppercase tracking-widest text-xs flex items-center gap-2">
            <Ticket size={14} className="text-zamzam-teal" />
            Manage marketing campaigns and discounts
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-zamzam-teal text-white px-8 py-4 rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-teal-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
        >
          <Plus size={18} />
          Create New Code
        </button>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-6">
        {[
          { label: 'Active Codes', value: promotions.filter(p => p.is_active).length, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
          { label: 'Total Codes', value: promotions.length, icon: Ticket, color: 'text-zamzam-teal', bg: 'bg-teal-50' },
          { label: 'Expired/Inactive', value: promotions.filter(p => !p.is_active).length, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-6">
            <div className={`w-16 h-16 ${stat.bg} rounded-2xl flex items-center justify-center`}>
              <stat.icon className={stat.color} size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="relative group max-w-md">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-zamzam-teal transition-colors" size={20} />
        <input 
          type="text"
          placeholder="Search by promo code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-slate-100 rounded-[1.5rem] py-4 pl-14 pr-6 text-sm font-bold shadow-sm focus:ring-4 focus:ring-zamzam-teal/5 focus:border-zamzam-teal outline-none transition-all"
        />
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-zamzam-teal rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredPromos.map((promo) => (
              <motion.div
                layout
                key={promo.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all overflow-hidden flex flex-col"
              >
                <div className="p-8 pb-4">
                  <div className="flex items-start justify-between mb-6">
                    <div className="bg-zamzam-teal/5 p-4 rounded-2xl">
                      <Ticket className="text-zamzam-teal" size={32} />
                    </div>
                    <button 
                      onClick={() => toggleStatus(promo.id, promo.is_active)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        promo.is_active 
                        ? 'bg-green-50 text-green-600 border border-green-100' 
                        : 'bg-red-50 text-red-600 border border-red-100'
                      }`}
                    >
                      {promo.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>

                  <h3 className="text-3xl font-black text-slate-900 tracking-tighter mb-2 font-mono">{promo.code}</h3>
                  <div className="flex items-center gap-2 text-zamzam-teal font-black text-sm uppercase tracking-tight">
                    {promo.discount_type === 'percentage' ? <Percent size={14} /> : <DollarSign size={14} />}
                    {promo.discount_value}{promo.discount_type === 'percentage' ? '%' : ' AED'} OFF
                  </div>
                </div>

                <div className="mt-auto bg-slate-50/50 p-8 border-t border-slate-50 space-y-4">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Clock size={14} />
                      Min Spend
                    </span>
                    <span className="text-slate-900">{promo.min_spend} AED</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Calendar size={14} />
                      Valid Until
                    </span>
                    <span className="text-slate-900">
                      {promo.valid_until ? new Date(promo.valid_until).toLocaleDateString() : 'No Expiry'}
                    </span>
                  </div>
                  
                  <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                     <button 
                      onClick={() => deletePromo(promo.id)}
                      className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                     >
                        <Trash2 size={18} />
                     </button>
                     <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                        Details <ChevronRight size={14} />
                     </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[3rem] shadow-2xl overflow-hidden p-10"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase">New Promotion</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Configure your discount code</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-slate-600 transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Promo Code</label>
                  <input 
                    required
                    type="text"
                    placeholder="E.G. ZAMZAM50"
                    value={formData.code}
                    onChange={e => setFormData({...formData, code: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-black focus:ring-4 focus:ring-zamzam-teal/10 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Type</label>
                    <select 
                      value={formData.discount_type}
                      onChange={e => setFormData({...formData, discount_type: e.target.value as any})}
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-black focus:ring-4 focus:ring-zamzam-teal/10 outline-none appearance-none"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (AED)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Value</label>
                    <input 
                      required
                      type="number"
                      placeholder="Value"
                      value={formData.discount_value}
                      onChange={e => setFormData({...formData, discount_value: e.target.value})}
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-black focus:ring-4 focus:ring-zamzam-teal/10 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Min Spend</label>
                    <input 
                      type="number"
                      placeholder="0"
                      value={formData.min_spend}
                      onChange={e => setFormData({...formData, min_spend: e.target.value})}
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-black focus:ring-4 focus:ring-zamzam-teal/10 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Expiry Date</label>
                    <input 
                      type="date"
                      value={formData.valid_until}
                      onChange={e => setFormData({...formData, valid_until: e.target.value})}
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-black focus:ring-4 focus:ring-zamzam-teal/10 outline-none"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-zamzam-teal text-white py-5 rounded-3xl font-black uppercase tracking-widest text-sm shadow-xl shadow-teal-500/20 mt-4 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Create Promotion
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
