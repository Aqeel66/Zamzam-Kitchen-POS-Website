import { useState, useEffect, useMemo } from 'react';
import { 
  Printer, 
  FileText, 
  Eye, 
  Clock,
  Circle,
  Banknote,
  ClipboardList,
  CheckCircle2,
  Timer,
  LayoutGrid,
  Utensils,
  Pencil,
  X,
  Users,
  Navigation,
  Globe,
  QrCode,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL, resolveImageUrl } from '../config';
import { useCart } from '../context/CartContext';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

const STATUS_FILTERS = [
  { id: 'ALL', label: 'ALL ORDERS' },
  { id: 'Pending', label: 'PENDING' },
  { id: 'Preparing', label: 'PREPARING' },
  { id: 'Ready', label: 'READY' },
  { id: 'Served', label: 'SERVED' },
  { id: 'Rejected', label: 'REJECTED' },
  { id: 'Cancelled', label: 'CANCELLED' },
];

export default function WaitingList() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currency, setCurrency] = useState('AED');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [now, setNow] = useState(new Date());
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [settings, setSettings] = useState<any>(null);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/settings?t=${Date.now()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setSettings(data);
      if (data?.tenant?.currency) setCurrency(data.tenant.currency);
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
    window.addEventListener('settings-updated', fetchSettings);
    return () => window.removeEventListener('settings-updated', fetchSettings);
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000); // API Refresh
    const tick = setInterval(() => setNow(new Date()), 1000); // Live Tick
    return () => {
      clearInterval(interval);
      clearInterval(tick);
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders?t=${Date.now()}`);
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch waiting orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    const status = (o.status || '').toLowerCase().trim();
    const filter = activeFilter.toLowerCase().trim();
    
    if (filter === 'all') return true;
    
    if (filter === 'pending') {
      return ['pending', 'ordered', 'paid'].includes(status);
    }
    
    return status === filter;
  });

  const sortedOrders = useMemo(() => {
    const direction = settings?.branch?.order_sort_direction || 'Descending';
    
    return [...filteredOrders].sort((a, b) => {
      // 1. Payment Status Priority (Unpaid First)
      // Use both payment_status and status to determine unpaid state
      const isUnpaid = (o: any) => {
        const s = (o.status || '').toLowerCase();
        const p = (o.payment_status || '').toLowerCase();
        return p === 'unpaid' || (!['paid', 'partially paid', 'ready', 'served'].includes(s));
      };

      const aUnpaid = isUnpaid(a);
      const bUnpaid = isUnpaid(b);

      if (aUnpaid && !bUnpaid) return -1;
      if (!aUnpaid && bUnpaid) return 1;

      // 2. Order Status Priority (Pending/Ordered First)
      const isPriorityStatus = (o: any) => {
        const s = (o.status || '').toLowerCase();
        return ['pending', 'ordered'].includes(s);
      };

      const aPriority = isPriorityStatus(a);
      const bPriority = isPriorityStatus(b);

      if (aPriority && !bPriority) return -1;
      if (!aPriority && bPriority) return 1;

      // 3. Chronological/Sequential Sort (Final Tier)
      // Use ID as it is the most reliable monotonic identifier
      const aId = Number(a.id) || 0;
      const bId = Number(b.id) || 0;

      if (direction === 'Ascending') {
        return aId - bId;
      } else {
        return bId - aId;
      }
    });
  }, [filteredOrders, settings?.branch?.order_sort_direction]);

  const toggleSortDirection = async () => {
    const newDirection = (settings?.branch?.order_sort_direction || 'Descending') === 'Descending' ? 'Ascending' : 'Descending';
    try {
      const res = await fetch(`${API_BASE_URL}/settings/branch`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_sort_direction: newDirection })
      });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('settings-updated'));
        window.dispatchEvent(new CustomEvent('show-toast', { 
          detail: { message: 'Sort Preference Updated Successfully', type: 'success' } 
        }));
      }
    } catch (err) {
      console.error('Failed to toggle sort:', err);
    }
  };

  const getWaitTime = (createdAt: string) => {
    const start = new Date(createdAt).getTime();
    if (isNaN(start)) return '00:00';
    const diff = Math.floor((now.getTime() - start) / 1000);
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getAvgWaitTime = () => {
    if (orders.length === 0) return '0';
    const totalDiff = orders.reduce((sum, o) => {
      const start = new Date(o.order_time || o.created_at).getTime();
      return sum + (now.getTime() - start);
    }, 0);
    const avgMins = Math.floor(totalDiff / (orders.length * 60000));
    return avgMins;
  };

  const getProgress = (createdAt: string) => {
    const start = new Date(createdAt).getTime();
    const elapsedMins = (now.getTime() - start) / (1000 * 60);
    const estimateMins = 20; // 20 min goal
    return Math.min(Math.round((elapsedMins / estimateMins) * 100), 100);
  };

  const getStatusColor = (statusRaw: string) => {
    const status = (statusRaw || '').toLowerCase();
    switch (status) {
      case 'pending': case 'ordered': return 'bg-amber-50 border-amber-200 text-amber-600';
      case 'preparing': return 'bg-blue-50 border-blue-200 text-blue-600';
      case 'ready': return 'bg-green-50 border-green-200 text-green-600';
      case 'served': return 'bg-teal-50 border-teal-200 text-teal-600';
      case 'rejected': return 'bg-red-50 border-red-200 text-red-600';
      case 'cancelled': return 'bg-slate-50 border-slate-200 text-slate-600';
      case 'paid': return 'bg-green-50 border-green-200 text-green-600';
      default: return 'bg-slate-50 border-slate-200 text-slate-600';
    }
  };

  const getStatusIcon = (statusRaw: string) => {
    const status = (statusRaw || '').toLowerCase();
    switch (status) {
      case 'pending': case 'ordered': return <Clock size={10} className="animate-pulse" />;
      case 'preparing': return <Utensils size={10} className="animate-bounce" />;
      case 'ready': return <CheckCircle2 size={10} />;
      case 'served': return <CheckCircle2 size={10} className="text-teal-500" />;
      case 'rejected': return <X size={10} />;
      case 'cancelled': return <X size={10} />;
      case 'paid': return <Banknote size={10} />;
      default: return <Circle size={10} />;
    }
  };

  return (
    <div className="min-h-full bg-transparent p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
        <div>
          <h1 className="text-lg font-black tracking-tighter uppercase mb-1 text-slate-900">Active Waiting List</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em]">Live Preparation & Queue Monitoring</p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={fetchOrders}
            className="p-2 text-slate-400 hover:text-zamzam-teal bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-lg transition-all"
            title="Refresh Orders"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          </button>

          <button 
            onClick={toggleSortDirection}
            className={cn(
              "p-2 rounded-xl transition-all border flex items-center gap-2 px-3 shadow-sm",
              (settings?.branch?.order_sort_direction || 'Descending') === 'Descending'
                ? "bg-zamzam-teal text-white border-zamzam-teal"
                : "bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-500 hover:text-white"
            )}
            title={settings?.branch?.order_sort_direction === 'Descending' ? "Newest First (Descending)" : "Oldest First (Ascending)"}
          >
            {(settings?.branch?.order_sort_direction || 'Descending') === 'Descending' ? (
              <>
                <ArrowDown size={14} strokeWidth={3} />
                <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Newest</span>
              </>
            ) : (
              <>
                <ArrowUp size={14} strokeWidth={3} />
                <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Oldest</span>
              </>
            )}
          </button>

          <div className="px-3 py-1.5 bg-white border border-slate-100 rounded-xl shadow-sm flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Timer size={14} />
            </div>
            <div>
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Avg. Wait</p>
              <p className="text-xs font-black text-slate-900 leading-none">{getAvgWaitTime()} Mins</p>
            </div>
          </div>

          <div className="px-3 py-1.5 bg-white border border-slate-100 rounded-xl shadow-sm flex items-center gap-2">
            <div className="p-1.5 bg-teal-50 text-zamzam-teal rounded-lg">
              <Users size={14} />
            </div>
            <div>
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Queue</p>
              <p className="text-xs font-black text-slate-900 leading-none">{orders.length} Orders</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-end gap-2 overflow-x-auto no-scrollbar mb-3 pb-1">
        {STATUS_FILTERS.map((filter) => {
          const isActive = activeFilter === filter.id;
          return (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 whitespace-nowrap shadow-sm",
                isActive 
                  ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/30" 
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
              )}
            >
              {filter.label}
              <span className={cn(
                "w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black",
                isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              )}>
                {filter.id === 'ALL' ? orders.length : orders.filter(o => {
                  const s = (o.status || '').toLowerCase().trim();
                  const f = filter.id.toLowerCase().trim();
                  if (f === 'pending') return ['pending', 'ordered', 'paid'].includes(s);
                  return s === f;
                }).length}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-zamzam-teal rounded-full animate-spin mx-auto" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Updating queue...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200 shadow-sm">
            <Timer size={48} className="text-slate-200 mx-auto mb-4" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No orders match the current filter</p>
          </div>
        ) : (
          sortedOrders.map((order) => {
            const orderStart = order.order_time || order.created_at;
            const progress = getProgress(orderStart);
            const isLate = progress >= 100;
            const statusLower = (order.status || '').toLowerCase();

            return (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                key={order.id}
                className={cn(
                  "group bg-white border rounded-xl p-3 flex items-center transition-all shadow-sm hover:shadow-lg",
                  isLate ? "border-red-100 hover:border-red-200 shadow-red-500/5" : "border-slate-100 hover:border-zamzam-teal/30"
                )}
              >
                {/* Actions */}
                <div className="flex items-center gap-1.5 mr-4">
                  {/* View Details */}
                  <button 
                    className="p-1.5 bg-teal-50 text-zamzam-teal rounded-lg hover:bg-zamzam-teal hover:text-white transition-all border border-teal-100 shadow-sm"
                    title="View Details"
                    onClick={() => {
                      setSelectedOrder(order);
                      setIsModalOpen(true);
                    }}
                  >
                    <Eye size={13} strokeWidth={2.5} />
                  </button>
                </div>

                {/* Info - Minimal */}
                <div className="w-[120px]">
                  <div className="text-sm font-black tracking-tight text-slate-900 mb-0.5">
                    #{(order.order_number || '').toString()}
                  </div>
                  <div className="flex flex-col gap-0.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    <div className="flex items-center gap-1">
                      <Clock size={10} className="text-zamzam-teal" />
                      {new Date(orderStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="flex items-center gap-1">
                      <LayoutGrid size={10} className="text-zamzam-teal" />
                      {order.items?.length || 0} Items
                    </div>
                  </div>
                </div>

                {/* Badges - Strictly Aligned Columns */}
                <div className="flex-1 flex items-center gap-3 px-4">
                  {/* 1. Origin Column */}
                  <div className="w-[95px] shrink-0 flex justify-start">
                    {(() => {
                      const origin = (order.origin || '').toLowerCase();
                      if (origin === 'website' || origin === 'web') {
                        return (
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-full w-full justify-center">
                            <Globe size={10} strokeWidth={3} />
                            <span className="text-[9px] font-black uppercase tracking-widest leading-none">Website</span>
                          </div>
                        );
                      } else if (origin === 'qr menu' || origin === 'qr-menu') {
                        return (
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 border border-purple-100 text-purple-600 rounded-full w-full justify-center">
                            <QrCode size={10} strokeWidth={3} />
                            <span className="text-[9px] font-black uppercase tracking-widest leading-none">QR Menu</span>
                          </div>
                        );
                      } else {
                        return (
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-teal-50 border border-teal-100 text-teal-600 rounded-full w-full justify-center">
                            <div className="w-1.5 h-1.5 bg-teal-600 rounded-full shadow-inner" />
                            <span className="text-[9px] font-black uppercase tracking-widest leading-none">Counter</span>
                          </div>
                        );
                      }
                    })()}
                  </div>

                  {/* 2. Table Column */}
                  <div className="w-[105px] shrink-0 flex justify-center">
                    {order.order_type === 'Dine-In' && (order.table_number || order.table_id) ? (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-100 text-blue-600 rounded-full w-full justify-center">
                        <Navigation size={10} fill="currentColor" />
                        <span className="text-[9px] font-black uppercase tracking-widest leading-none">Table {order.table_number || order.table_id}</span>
                      </div>
                    ) : <div className="w-full" />}
                  </div>

                  {/* 3. Status Column */}
                  <div className="w-[95px] shrink-0 flex justify-center">
                    {['pending', 'ordered', 'paid'].includes(statusLower) ? (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-200 text-amber-600 rounded-full w-full justify-center">
                        <Clock size={10} className="animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-widest leading-none">Pending</span>
                      </div>
                    ) : (
                      <div className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded-full border w-full justify-center",
                        getStatusColor(order.status)
                      )}>
                        {getStatusIcon(order.status)}
                        <span className="text-[9px] font-black uppercase tracking-widest leading-none">{order.status}</span>
                      </div>
                    )}
                  </div>

                  {/* 4. Type Column */}
                  <div className="w-[95px] shrink-0 flex justify-center">
                    <div className={cn(
                      "flex items-center gap-1.5 px-2 py-1 border rounded-full shadow-sm w-full justify-center",
                      order.order_type === 'Dine-In' ? "bg-amber-50 border-amber-100 text-amber-600" : 
                      order.order_type === 'Delivery' ? "bg-purple-50 border-purple-100 text-purple-600" :
                      "bg-orange-50 border-orange-100 text-orange-600"
                    )}>
                      <Utensils size={10} className={cn(
                        order.order_type === 'Dine-In' ? "text-amber-600" : 
                        order.order_type === 'Delivery' ? "text-purple-600" :
                        "text-orange-600"
                      )} />
                      <span className="text-[9px] font-black uppercase tracking-widest leading-none">{order.order_type || 'Takeaway'}</span>
                    </div>
                  </div>

                  {/* 5. Staff Column */}
                  <div className="w-[120px] shrink-0 flex justify-center">
                    {order.waiter_name ? (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-600 border border-indigo-700 text-white rounded-full shadow-md w-full justify-center">
                        <Users size={10} strokeWidth={3} />
                        <span className="text-[9px] font-black uppercase tracking-widest leading-none truncate max-w-[80px]">{order.waiter_name}</span>
                      </div>
                    ) : <div className="w-full" />}
                  </div>

                  {/* 6. Payment Column */}
                  <div className="w-[95px] shrink-0 flex justify-center">
                    <div className={cn(
                      "flex items-center gap-1.5 px-2 py-1 border rounded-full shadow-md w-full justify-center transition-all",
                      (order.status === 'Paid' || order.payment_status === 'Paid')
                        ? "bg-teal-600 border-teal-700 text-white"
                        : "bg-rose-50 border-rose-200 text-rose-700"
                    )}>
                      {(order.status === 'Paid' || order.payment_status === 'Paid') ? (
                        <CheckCircle2 size={10} strokeWidth={3} />
                      ) : (
                        <AlertCircle size={10} strokeWidth={3} />
                      )}
                      <span className="text-[9px] font-black uppercase tracking-widest leading-none">
                        {(order.status === 'Paid' || order.payment_status === 'Paid') ? 'PAID' : 'UNPAID'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Operational Stats (Wait & Amount) */}
                <div className="flex items-center gap-4 ml-auto pr-2 border-l border-slate-100 pl-4">
                   <div className="flex flex-col items-end gap-0.5">
                      <div className="flex items-center gap-1">
                        <Timer size={10} className={isLate ? "text-red-500 animate-pulse" : "text-slate-400"} />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Elapsed</span>
                      </div>
                      <span className={cn(
                        "text-xs font-black tracking-tighter tabular-nums leading-none",
                        isLate ? "text-red-500" : "text-slate-900"
                      )}>
                        {getWaitTime(orderStart)}
                      </span>
                      <div className="h-1 w-16 bg-slate-100 rounded-full overflow-hidden mt-0.5 shadow-inner border border-slate-200/50">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          className={cn(
                            "h-full transition-all duration-1000",
                            progress > 90 ? "bg-red-500" : progress > 50 ? "bg-orange-500" : "bg-zamzam-teal"
                          )}
                        />
                      </div>
                   </div>

                   <div className="flex flex-col items-end gap-0.5">
                      <span className="text-xs font-black text-slate-900 tracking-tighter leading-none">
                        {currency} {parseFloat(order.total_amount || order.total || 0).toFixed(2)}
                      </span>
                   </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {isModalOpen && selectedOrder && (
        <OrderDetailsModal 
          isOpen={true}
          onClose={() => setIsModalOpen(false)}
          order={selectedOrder}
          currency={currency}
        />
      )}
    </div>
  );
}

function OrderDetailsModal({ isOpen, onClose, order, currency }: any) {
  if (!isOpen || !order) return null;
  const items = order.items || [];
  const total = parseFloat(order.total_amount || order.total || 0);

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 overflow-hidden" style={{ zIndex: 99999 }}>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose} 
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" 
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-zamzam-teal uppercase tracking-tight mb-3">Order Review</h3>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">#{order.order_number || order.id}</h2>
          </div>
          <button onClick={onClose} className="p-4 text-slate-400 hover:bg-slate-50 hover:text-slate-900 rounded-3xl transition-all border border-slate-100">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="space-y-4">
            {items.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center gap-4 bg-slate-50/50 p-5 rounded-[2rem] border border-slate-100">
                <div className="w-16 h-16 bg-white rounded-2xl border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                  {item.image ? (
                    <img src={resolveImageUrl(item.image)} className="w-full h-full object-cover" />
                  ) : (
                    <ClipboardList className="text-slate-200" size={24} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-1 bg-zamzam-yellow text-zamzam-yellow-dark bg-opacity-10 text-[9px] font-black rounded-lg uppercase">x{item.quantity || 1}</span>
                    <h4 className="text-sm font-black text-slate-900 truncate">{item.name || 'Legacy Product'}</h4>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-black text-slate-900">
                    {currency} {(parseFloat(item.price || item.unit_price || 0) * (item.quantity || 1)).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between p-6 bg-slate-900 rounded-[2rem] mt-8">
            <span className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Total Amount</span>
            <span className="text-xl font-black text-white tracking-tighter">
              {currency} {total.toFixed(2)}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
