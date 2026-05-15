import { useState, useEffect } from 'react';
import { 
  Clock, 
  ChefHat, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  Check, 
  RefreshCw,
  MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

export default function KDS() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000); // Auto refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders?kds=true`);
      const data = await res.json();
      setOrders(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching KDS orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (orderId: number, newStatus: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error('Error updating order status:', err);
    }
  };

  const getElapsedTime = (startTime: string) => {
    const start = new Date(startTime).getTime();
    const now = new Date().getTime();
    const diff = Math.floor((now - start) / 60000);
    return diff;
  };

  const getTimeColor = (minutes: number) => {
    if (minutes > 20) return 'text-red-500 bg-red-50';
    if (minutes > 10) return 'text-orange-500 bg-orange-50';
    return 'text-zamzam-teal bg-teal-50';
  };

  const columns = [
    { id: 'New', title: 'New Orders', statuses: ['Ordered', 'Pending'], icon: AlertCircle, color: 'text-orange-500' },
    { id: 'Preparing', title: 'Preparing', statuses: ['Preparing'], icon: ChefHat, color: 'text-zamzam-teal' },
    { id: 'Ready', title: 'Ready / Served', statuses: ['Ready', 'Served', 'Paid'], icon: CheckCircle2, color: 'text-green-500' },
  ];

  return (
    <div className="h-full flex flex-col bg-bg-main overflow-hidden">
      {/* Top Header */}
      <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white/50 backdrop-blur-md">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Kitchen <span className="text-zamzam-teal">Display</span></h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Terminal • Updated {lastUpdated.toLocaleTimeString()}</p>
          </div>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={fetchOrders}
            className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-zamzam-teal hover:border-zamzam-teal transition-all"
          >
            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <div className="bg-white border border-slate-200 px-6 py-4 rounded-2xl flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-zamzam-teal" />
              <span className="text-[10px] font-black text-slate-600 uppercase">On Time</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-[10px] font-black text-slate-600 uppercase">Warning</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-[10px] font-black text-slate-600 uppercase">Delayed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-8">
        <div className="flex gap-8 h-full min-w-[1200px]">
          {columns.map((col) => (
            <div key={col.id} className="flex-1 flex flex-col gap-6 min-w-[380px]">
              <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-slate-100 shadow-sm", col.color)}>
                    <col.icon size={20} />
                  </div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">{col.title}</h2>
                </div>
                <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black">
                  {orders.filter(o => col.statuses.includes(o.status)).length}
                </span>
              </div>

              <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar pb-10">
                <AnimatePresence mode="popLayout">
                  {orders
                    .filter(o => col.statuses.includes(o.status))
                    .map((order) => (
                      <motion.div
                        key={order.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col"
                      >
                        {/* Ticket Header */}
                        <div className="p-6 bg-slate-50/50 flex items-center justify-between border-b border-slate-100">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Order #{order.order_number.slice(-5)}</p>
                            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                              {order.order_type === 'Dine-In' ? `Table ${order.table_number || '??'}` : order.order_type}
                            </h3>
                          </div>
                          <div className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black",
                            getTimeColor(getElapsedTime(order.order_time))
                          )}>
                            <Clock size={14} />
                            {getElapsedTime(order.order_time)}m
                          </div>
                        </div>

                        {/* Ticket Body */}
                        <div className="p-6 flex-1 space-y-4">
                          {(order.items || []).map((item: any, idx: number) => (
                            <div key={idx} className="flex gap-4">
                              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-black text-slate-600 border border-slate-200">
                                {item.quantity}x
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-black text-slate-900 uppercase leading-none">{item.name}</p>
                                {item.variant && (
                                  <p className="text-[10px] font-bold text-zamzam-teal uppercase mt-1">
                                    • {item.variant.name}
                                  </p>
                                )}
                                {item.extras?.map((e: any, i: number) => (
                                  <p key={i} className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                                    + {e.name}
                                  </p>
                                ))}
                                {item.notes && (
                                  <div className="mt-2 bg-yellow-50/50 border border-yellow-100 p-2 rounded-lg">
                                    <p className="text-[9px] font-bold text-yellow-700 uppercase leading-tight italic">"{item.notes}"</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Ticket Footer Actions */}
                        <div className="p-4 bg-slate-50/30 border-t border-slate-100 flex gap-3">
                          {order.status === 'Ordered' || order.status === 'Pending' ? (
                            <button 
                              onClick={() => updateStatus(order.id, 'Preparing')}
                              className="flex-1 bg-zamzam-teal text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-teal-700 transition-colors shadow-lg shadow-teal-900/10"
                            >
                              <Play size={14} fill="currentColor" />
                              Start Prep
                            </button>
                          ) : order.status === 'Preparing' ? (
                            <button 
                              onClick={() => updateStatus(order.id, 'Ready')}
                              className="flex-1 bg-green-500 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-green-600 transition-colors shadow-lg shadow-green-900/10"
                            >
                              <Check size={16} strokeWidth={3} />
                              Mark Ready
                            </button>
                          ) : (
                            <div className="flex-1 flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest py-4">
                              <CheckCircle2 size={16} className="text-green-500" />
                              Completed
                            </div>
                          )}
                          <button className="p-4 bg-white border border-slate-200 text-slate-300 hover:text-slate-900 rounded-xl transition-all">
                            <MoreVertical size={18} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
