import { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Phone, 
  Mail, 
  Calendar, 
  ShoppingBag, 
  ChevronRight, 
  Star,
  Clock,
  UserPlus,
  MapPin,
  TrendingUp,
  History,
  MoreVertical,
  CheckCircle2,
  Globe,
  QrCode,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/customers`);
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomerOrders = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders?customer_id=${id}`);
      const data = await res.json();
      setCustomerOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching customer orders:', err);
    }
  };

  const handleRowClick = (customer: any) => {
    setSelectedCustomer(customer);
    fetchCustomerOrders(customer.id);
    setIsModalOpen(true);
  };

  const filteredCustomers = (customers || []).filter(c => 
    `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone || '').includes(searchQuery)
  );

  return (
    <div className="h-full bg-[#F8FAFC] p-8 overflow-hidden flex flex-col gap-8">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-slate-900/10">
            <Users size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight uppercase">Customer <span className="text-zamzam-teal">Registry</span></h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">Manage guest profiles and loyalty data</p>
          </div>
        </div>
        <button className="bg-zamzam-teal text-white px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-teal-500/20 flex items-center gap-3 hover:bg-teal-600 transition-all active:scale-95 group">
          <UserPlus size={20} strokeWidth={3} />
          New Customer Profile
        </button>
      </div>

      {/* Directory Control Bar */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between gap-6">
        <div className="relative flex-1 group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-zamzam-teal transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="SEARCH GUESTS BY NAME OR PHONE..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-16 pr-8 text-[11px] font-bold uppercase outline-none focus:border-zamzam-teal focus:bg-white transition-all shadow-inner"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl">
            <Users size={16} className="text-slate-400" />
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">Total: {customers.length}</span>
          </div>
        </div>
      </div>

      {/* Main Tabular View */}
      <div className="flex-1 bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="overflow-y-auto no-scrollbar flex-1">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-200">
               <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                <Users size={48} strokeWidth={1} />
              </motion.div>
              <p className="text-[10px] font-bold uppercase tracking-widest mt-6">Syncing Directory...</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-200 gap-4">
              <Users size={64} strokeWidth={1} className="opacity-50" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">No guest profiles found</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 border-b border-slate-100 sticky top-0 z-10 backdrop-blur-md">
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="pl-10 py-6">Customer Name</th>
                  <th className="px-8 py-6">Contact Info</th>
                  <th className="px-8 py-6">Origin</th>
                  <th className="px-8 py-6 text-center">Engagement</th>
                  <th className="pr-10 py-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredCustomers.map((customer) => (
                  <tr 
                    key={customer.id} 
                    onClick={() => handleRowClick(customer)}
                    className="group cursor-pointer hover:bg-slate-50/50 transition-all"
                  >
                    <td className="pl-10 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-sm font-bold text-zamzam-yellow shadow-lg shadow-slate-900/10 group-hover:scale-105 transition-transform">
                          {customer.first_name?.[0]}{customer.last_name?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 uppercase tracking-tight group-hover:text-zamzam-teal transition-colors">
                            {customer.first_name} {customer.last_name}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">ID: #CST-{customer.id.toString().padStart(4, '0')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-600 font-bold text-[10px] uppercase">
                          <Phone size={12} className="text-zamzam-teal" /> {customer.phone || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase">
                          <Mail size={12} /> {customer.email || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className={cn(
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-widest",
                        (customer.origin || '').toLowerCase() === 'website' ? "bg-indigo-50 border-indigo-100 text-indigo-600" :
                        (customer.origin || '').toLowerCase() === 'qr-menu' ? "bg-teal-50 border-teal-100 text-teal-600" :
                        "bg-slate-50 border-slate-100 text-slate-500"
                      )}>
                        {(() => {
                          const origin = (customer.origin || '').toLowerCase();
                          if (origin === 'website' || origin === 'web') return <><Globe size={12} /> Website</>;
                          if (origin === 'qr menu' || origin === 'qr-menu') return <><QrCode size={12} /> QR Menu</>;
                          return <><MapPin size={12} /> Counter</>;
                        })()}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[11px] font-bold text-slate-900">{customer.order_count || '0'} Orders</span>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={10} fill={s <= 4 ? "currentColor" : "none"} className={s <= 4 ? "text-zamzam-yellow" : "text-slate-200"} />
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="pr-10 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="w-10 h-10 bg-slate-50 text-slate-400 hover:text-zamzam-teal hover:bg-zamzam-teal/10 rounded-xl flex items-center justify-center border border-slate-100 transition-all"><History size={16} /></button>
                        <button className="w-10 h-10 bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl flex items-center justify-center border border-slate-100 transition-all"><ChevronRight size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Customer Detail Modal */}
      <AnimatePresence>
        {isModalOpen && selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-end">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-[600px] h-full bg-white shadow-2xl flex flex-col"
            >
              <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-zamzam-teal rounded-[1.8rem] flex items-center justify-center text-3xl font-bold text-white shadow-2xl shadow-teal-500/20 ring-4 ring-white/10">
                    {selectedCustomer.first_name?.[0]}{selectedCustomer.last_name?.[0]}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold uppercase tracking-tighter">{selectedCustomer.first_name} {selectedCustomer.last_name}</h2>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em] mt-1">Guest Insights</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-12 h-12 bg-white/10 text-white rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-10 no-scrollbar">
                {/* Statistics Grid */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Total Visits</p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-slate-900">{customerOrders.length}</span>
                      <ShoppingBag className="text-zamzam-teal opacity-20" size={32} />
                    </div>
                  </div>
                  <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Total Revenue</p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-slate-900">
                        {customerOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0).toFixed(2)} <span className="text-xs text-slate-400">USD</span>
                      </span>
                      <TrendingUp className="text-green-500 opacity-20" size={32} />
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 space-y-6">
                   <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <UserPlus size={14} className="text-zamzam-teal" /> Verified Contact Methods
                   </h3>
                   <div className="grid grid-cols-1 gap-4">
                      <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <Phone className="text-zamzam-teal" size={20} />
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Phone Number</p>
                          <p className="text-sm font-bold text-slate-900">{selectedCustomer.phone || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <Mail className="text-zamzam-teal" size={20} />
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Email Identity</p>
                          <p className="text-sm font-bold text-slate-900">{selectedCustomer.email || 'N/A'}</p>
                        </div>
                      </div>
                   </div>
                </div>

                {/* Order History Table */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <History size={14} className="text-zamzam-teal" /> Transactional Activity
                    </h3>
                  </div>
                  <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          <th className="px-6 py-4">Order Node</th>
                          <th className="px-6 py-4">Date</th>
                          <th className="px-6 py-4 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {customerOrders.length > 0 ? customerOrders.map(o => (
                          <tr key={o.id} className="text-xs hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-900">#ORD-{o.id}</td>
                            <td className="px-6 py-4 text-slate-400 font-bold uppercase">{new Date(o.created_at).toLocaleDateString('en-GB')}</td>
                            <td className="px-6 py-4 text-right font-bold text-slate-900">${parseFloat(o.total_amount).toFixed(2)}</td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={3} className="px-6 py-10 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">No previous transactions</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
