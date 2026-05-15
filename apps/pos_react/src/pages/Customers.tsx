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
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      fetchCustomerOrders(selectedCustomer.id);
    }
  }, [selectedCustomer]);

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/customers`);
      const data = await res.json();
      setCustomers(data);
      if (data.length > 0 && !selectedCustomer) {
        setSelectedCustomer(data[0]);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const fetchCustomerOrders = async (id: number) => {
    try {
      // In a real app, we'd have a specific endpoint /api/orders?customer_id=X
      // For now we'll fetch all and filter to demonstrate the UI
      const res = await fetch(`${API_BASE_URL}/orders`);
      const allOrders = await res.json();
      const filtered = allOrders.filter((o: any) => o.customer_id === id);
      setCustomerOrders(filtered);
    } catch (err) {
      console.error('Error fetching customer orders:', err);
    }
  };

  const filteredCustomers = customers.filter(c => 
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  );

  return (
    <div className="h-full flex bg-slate-50/50">
      {/* Left Sidebar: List */}
      <aside className="w-[400px] bg-white border-r border-slate-100 flex flex-col p-8 gap-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-zamzam-teal uppercase tracking-[0.4em] mb-1 block">Directory</span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Customer <span className="text-zamzam-teal">Hub</span></h1>
            </div>
            <button className="w-12 h-12 bg-zamzam-teal text-white rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20 hover:scale-105 active:scale-95 transition-all">
              <UserPlus size={22} />
            </button>
          </div>

          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-zamzam-teal transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold shadow-sm outline-none focus:ring-4 focus:ring-zamzam-teal/5 focus:bg-white transition-all"
            />
          </div>
        </div>

        <nav className="flex-1 space-y-3 overflow-auto pr-2 custom-scrollbar">
          {filteredCustomers.map((customer) => (
            <button
              key={customer.id}
              onClick={() => setSelectedCustomer(customer)}
              className={cn(
                "w-full flex items-center gap-4 p-5 rounded-[2rem] transition-all group border text-left",
                selectedCustomer?.id === customer.id 
                  ? "bg-zamzam-teal text-white border-zamzam-teal shadow-xl shadow-teal-900/20" 
                  : "bg-white text-slate-400 border-slate-100 hover:border-zamzam-teal/30 hover:bg-teal-50/30"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm border-2",
                selectedCustomer?.id === customer.id ? "bg-white/20 border-white/30 text-white" : "bg-slate-100 border-transparent text-slate-400"
              )}>
                {customer.first_name?.[0]}{customer.last_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-black uppercase tracking-tight truncate", selectedCustomer?.id === customer.id ? "text-white" : "text-slate-900")}>
                  {customer.first_name} {customer.last_name}
                </p>
                <p className={cn("text-[10px] font-bold mt-0.5", selectedCustomer?.id === customer.id ? "text-white/60" : "text-slate-400")}>
                  {customer.phone || 'No phone'}
                </p>
              </div>
              <ChevronRight size={16} className={cn("transition-transform", selectedCustomer?.id === customer.id ? "translate-x-0" : "-translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0")} />
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Area: Detailed Profile */}
      <main className="flex-1 overflow-auto p-12">
        <AnimatePresence mode="wait">
          {selectedCustomer ? (
            <motion.div
              key={selectedCustomer.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-10"
            >
              {/* Profile Header Card */}
              <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8">
                  <div className="flex gap-2">
                    <span className="bg-zamzam-yellow/10 text-zamzam-yellow text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-widest flex items-center gap-2">
                      <Star size={12} fill="currentColor" /> VIP Regular
                    </span>
                    <button className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-all">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-8 relative z-10">
                  <div className="w-32 h-32 bg-zamzam-teal rounded-[2.5rem] flex items-center justify-center text-4xl font-black text-white shadow-2xl shadow-teal-500/30 ring-8 ring-teal-50">
                    {selectedCustomer.first_name?.[0]}{selectedCustomer.last_name?.[0]}
                  </div>
                  <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2">
                      {selectedCustomer.first_name} <span className="text-zamzam-teal">{selectedCustomer.last_name}</span>
                    </h2>
                    <div className="flex flex-wrap gap-6 mt-4">
                      <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
                        <Phone size={14} className="text-zamzam-teal" /> {selectedCustomer.phone || 'N/A'}
                      </div>
                      <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
                        <Mail size={14} className="text-zamzam-teal" /> {selectedCustomer.email || 'N/A'}
                      </div>
                      <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
                        <MapPin size={14} className="text-zamzam-teal" /> {selectedCustomer.origin || 'In-Store'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Stats Banner */}
                <div className="grid grid-cols-3 gap-6 mt-12 pt-10 border-t border-slate-50">
                  <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100/50">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Orders</p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-black text-slate-900">{customerOrders.length}</span>
                      <ShoppingBag size={20} className="text-zamzam-teal opacity-30" />
                    </div>
                  </div>
                  <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100/50">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lifetime Spend</p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-black text-slate-900">
                        {customerOrders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0).toLocaleString()} <span className="text-xs text-slate-400">AED</span>
                      </span>
                      <TrendingUp size={20} className="text-green-500 opacity-30" />
                    </div>
                  </div>
                  <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100/50">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Joined Since</p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-black text-slate-900">
                        {new Date(selectedCustomer.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                      </span>
                      <Calendar size={20} className="text-blue-500 opacity-30" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Order History Table */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-4">
                  <div className="flex items-center gap-3">
                    <History size={20} className="text-zamzam-teal" />
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Order History</h3>
                  </div>
                  <button className="text-[10px] font-black text-zamzam-teal uppercase tracking-widest hover:underline">View Full Statement</button>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Order ID</th>
                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {customerOrders.length > 0 ? customerOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                          <td className="px-8 py-6">
                            <span className="text-sm font-black text-slate-900">#{order.id}</span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-tight">
                              <Clock size={14} /> {new Date(order.created_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest">
                              {order.order_type}
                            </span>
                          </td>
                          <td className="px-8 py-6 font-black text-slate-900 text-sm">
                            {parseFloat(order.total_amount).toLocaleString()} <span className="text-[10px] text-slate-300">AED</span>
                          </td>
                          <td className="px-8 py-6">
                            <span className={cn(
                              "text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest inline-flex items-center gap-2",
                              order.status === 'Completed' || order.status === 'Paid' ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"
                            )}>
                              {order.status === 'Completed' || order.status === 'Paid' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} className="px-8 py-20 text-center text-slate-300">
                            <p className="text-xs font-black uppercase tracking-widest">No order history found for this customer.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-6">
              <Users size={80} strokeWidth={1} className="opacity-20" />
              <p className="text-sm font-black uppercase tracking-[0.2em] opacity-50">Select a customer to view profile</p>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
