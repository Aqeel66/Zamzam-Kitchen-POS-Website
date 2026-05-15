import { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  ChefHat, 
  Check, 
  X,
  RefreshCw,
  MoreVertical,
  AlertTriangle,
  Store,
  Navigation,
  Play,
  Globe,
  QrCode,
  Users,
  Activity,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

type TabType = 'PENDING' | 'PREPARING' | 'READY' | 'REJECTED';

export default function KDS() {
  const [orders, setOrders] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>('PENDING');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  
  // Rejection Modal State
  const [showRejectModal, setShowRejectModal] = useState<number | null>(null);

  const REJECTION_REASONS = [
    "Restaurant Closing Time",
    "Ingredients Out of Stock",
    "Busy"
  ];

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/settings?t=${Date.now()}`);
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders?kds=true&t=${Date.now()}`);
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching KDS orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchOrders();
    window.addEventListener('settings-updated', fetchSettings);
    const interval = setInterval(fetchOrders, 30000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('settings-updated', fetchSettings);
    };
  }, []);

  const updateStatus = async (orderId: number, newStatus: string, rejectionReason?: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus,
          rejection_reason: rejectionReason 
        })
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error('Error updating order status:', err);
    }
  };

  const deleteItem = async (orderId: number, itemId: number) => {
    if (!window.confirm('Remove this item from order?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/items/${itemId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchOrders();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to remove item');
      }
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  const handleReject = async (orderId: number, reason: string) => {
    await updateStatus(orderId, 'Rejected', reason);
    setShowRejectModal(null);
  };

  const getElapsedTime = (startTime: string) => {
    const start = new Date(startTime).getTime();
    const now = new Date().getTime();
    const diff = Math.floor((now - start) / 60000);
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    if (hours > 0) return `${hours}:${mins.toString().padStart(2, '0')}`;
    return mins;
  };

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'PENDING') return ['Ordered', 'Pending', 'Paid', 'Partially Paid'].includes(order.status);
    if (activeTab === 'PREPARING') return order.status === 'Preparing';
    if (activeTab === 'READY') return order.status === 'Ready';
    if (activeTab === 'REJECTED') return order.status === 'Rejected';
    return false;
  });

  const sortedOrders = useMemo(() => {
    const direction = settings?.branch?.order_sort_direction || 'Descending';
    
    return [...(filteredOrders || [])].sort((a, b) => {
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

  const getCounts = (statusList: string[]) => orders.filter(o => statusList.includes(o.status)).length;

  const tabs = [
    { id: 'PENDING', label: 'PENDING', count: getCounts(['Ordered', 'Pending', 'Paid', 'Partially Paid']), color: 'bg-orange-500' },
    { id: 'PREPARING', label: 'PREPARING', count: getCounts(['Preparing']), color: 'bg-zamzam-teal' },
    { id: 'READY', label: 'READY', count: getCounts(['Ready']), color: 'bg-green-500' },
    { id: 'REJECTED', label: 'REJECTED', count: getCounts(['Rejected']), color: 'bg-red-500' }
  ];

  return (
    <div className="h-full flex flex-col bg-[#f8fafc] overflow-hidden p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 bg-zamzam-teal/10 rounded-xl flex items-center justify-center relative">
            <ChefHat className="text-zamzam-teal" size={18} strokeWidth={2.5} />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-zamzam-teal text-white text-[8px] font-black rounded-full flex items-center justify-center animate-pulse border-2 border-white"></span>
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight">Kitchen Production</h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">
                {getCounts(['Ordered', 'Pending', 'Preparing', 'Paid', 'Partially Paid'])} active tickets
              </p>
              <div className="h-4 w-px bg-slate-200" />
              <div className="flex flex-col">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Queue Load</p>
                <div className="flex items-center gap-2">
                  <Activity size={12} className="text-teal-500" />
                  <p className="text-xs font-black text-slate-900 tracking-tight">{orders.filter(o => o.status !== 'Served').length} ACTIVE ORDERS</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button 
            onClick={fetchOrders}
            className="p-2 text-slate-400 hover:bg-white hover:text-zamzam-teal rounded-lg transition-all shadow-sm border border-transparent hover:border-slate-100 active:rotate-180 duration-500 bg-white"
            title="Refresh Orders"
          >
            <RefreshCw size={16} />
          </button>

          <button 
            onClick={toggleSortDirection}
            className={cn(
              "p-2 rounded-lg transition-all border flex items-center gap-2 px-3 shadow-sm",
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

          <div className="bg-white p-1.5 rounded-2xl flex border border-slate-200 shadow-sm">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={cn(
                  "relative px-4 py-1.5 text-[9px] font-black tracking-[0.15em] transition-all rounded-lg flex items-center gap-2",
                  activeTab === tab.id ? `${tab.color} text-white shadow-lg` : "text-slate-400 hover:text-slate-600"
                )}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={cn(
                    "w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black",
                    activeTab === tab.id ? "bg-white text-slate-900" : "bg-slate-100 text-slate-500"
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <AnimatePresence mode="wait">
          {sortedOrders.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center text-slate-300 gap-6"
            >
              <div className="w-32 h-32 bg-slate-100 rounded-[3rem] flex items-center justify-center">
                <ChefHat size={60} strokeWidth={1} />
              </div>
              <p className="text-xl font-black uppercase tracking-[0.2em]">No {activeTab.toLowerCase()} orders</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
              <AnimatePresence mode="popLayout">
                {sortedOrders.map((order) => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl border border-slate-100 overflow-hidden flex flex-col shadow-md shadow-slate-200/50 group hover:shadow-lg transition-all"
                  >
                    {/* Card Header */}
                    <div className="p-3 bg-slate-50/50 flex flex-col gap-2 border-b border-slate-100">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Order Ref</span>
                          <h4 className="text-sm font-black text-slate-900 tracking-tighter">#{order.order_number || order.id.toString().slice(-4)}</h4>
                          
                          {/* Table + Origin badges inline */}
                          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                          <h2 className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tight shadow-sm border self-start whitespace-nowrap",
                            order.order_type === 'Takeaway' ? "border-orange-100 bg-orange-50 text-orange-600" : 
                            order.order_type === 'Delivery' ? "border-purple-100 bg-purple-50 text-purple-600" :
                            "border-amber-100 bg-amber-50 text-amber-600"
                          )}>
                            <Navigation size={10} fill="currentColor" />
                            {order.order_type === 'Dine-In' ? (
                              <div className="flex items-center gap-2">
                                <span>Table {order.table_number || '??'}</span>
                              </div>
                            ) : order.order_type}
                          </h2>
                          {/* Origin Badge — inline beside table */}
                          <span className={cn(
                            "px-2 py-0.5 rounded-lg border text-[8px] font-black flex items-center gap-1 uppercase tracking-wider whitespace-nowrap",
                            (order.origin === 'Website' || order.origin === 'website') ? "border-blue-100 bg-blue-50/50 text-blue-600" :
                            (order.origin === 'QR Menu' || order.origin === 'qr-menu') ? "border-purple-100 bg-purple-50/50 text-purple-600" :
                            "border-teal-100 bg-teal-50/50 text-teal-600"
                          )}>
                            {(order.origin === 'Website' || order.origin === 'website') ? <Globe size={9} fill="currentColor" /> :
                             (order.origin === 'QR Menu' || order.origin === 'qr-menu') ? <QrCode size={9} strokeWidth={3} /> :
                             <Store size={9} fill="currentColor" />}
                            {(order.origin === 'Counter' || order.origin === 'In-Store' || !order.origin) ? 'Counter' : order.origin}
                          </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className={cn(
                            "flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black shadow-sm",
                            (() => {
                              const diff = parseInt(getElapsedTime(order.order_time).toString());
                              const threshold = settings?.branch?.kds_timer_minutes || 15;
                              if (diff >= threshold + 10) return 'bg-red-50 text-red-600';
                              if (diff >= threshold) return 'bg-orange-50 text-orange-600';
                              return 'bg-white text-slate-500 border border-slate-100';
                            })()
                          )}>
                            <Clock size={10} strokeWidth={3} />
                            {getElapsedTime(order.order_time)}m
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="p-3 flex-1 space-y-2">
                      {(order.items || []).map((item: any, idx: number) => (
                        <div key={idx} className="flex gap-2 group/item">
                          <div className="w-6 h-6 bg-slate-50 rounded-md flex items-center justify-center text-[10px] font-black text-slate-900 border border-slate-100 group-hover/item:bg-zamzam-teal/10 group-hover/item:text-zamzam-teal transition-colors shrink-0">
                            {item.quantity}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight leading-tight">{item.name}</p>
                              {activeTab === 'PENDING' && (
                                <button 
                                  onClick={() => deleteItem(order.id, item.id)}
                                  className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                                >
                                  <X size={14} strokeWidth={3} />
                                </button>
                              )}
                            </div>
                            {(item.customizations || []).map((c: any, cidx: number) => (
                              <p key={cidx} className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                                + {c.customization_name}
                              </p>
                            ))}
                            {item.notes && (
                              <p className="text-[10px] font-bold text-orange-600/80 italic mt-2 bg-orange-50/50 p-2 rounded-xl border border-orange-100/50">
                                "{item.notes}"
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="p-2.5 flex gap-2 bg-slate-50/50 border-t border-slate-100 mt-auto">
                      {activeTab === 'PENDING' && (
                        <>
                          <button 
                            onClick={() => setShowRejectModal(order.id)}
                            className="flex-1 bg-red-50 text-red-600 py-2 rounded-xl text-[8px] font-black uppercase tracking-[0.1em] hover:bg-red-100 transition-all border border-red-100"
                          >
                            Reject
                          </button>
                          <button 
                            onClick={() => updateStatus(order.id, 'Preparing')}
                            className="flex-[2] bg-zamzam-teal text-white py-2 px-4 rounded-xl text-[8px] font-black uppercase tracking-[0.1em] hover:bg-teal-600 transition-all shadow-md shadow-teal-900/10 flex items-center justify-center gap-1.5"
                          >
                            <Play size={14} fill="currentColor" />
                            Accept
                          </button>
                        </>
                      )}
                      {activeTab === 'PREPARING' && (
                        <button 
                          onClick={() => updateStatus(order.id, 'Ready')}
                          className="w-full bg-green-500 text-white py-2 rounded-xl text-[8px] font-black uppercase tracking-[0.1em] hover:bg-green-600 transition-all shadow-md shadow-green-900/10"
                        >
                          Complete Order
                        </button>
                      )}
                      {activeTab === 'READY' && (
                        <button 
                          onClick={() => updateStatus(order.id, 'Served')}
                          className="w-full bg-orange-500 text-white py-2 rounded-xl text-[8px] font-black uppercase tracking-[0.1em] hover:bg-orange-600 transition-all shadow-md shadow-orange-900/10"
                        >
                          Mark Served
                        </button>
                      )}
                      {activeTab === 'REJECTED' && (
                        <button 
                          onClick={() => updateStatus(order.id, 'Pending')}
                          className="w-full bg-slate-800 text-white py-2 rounded-xl text-[8px] font-black uppercase tracking-[0.1em] hover:bg-slate-700 transition-all"
                        >
                          Restore Order
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Rejection Modal */}
      <AnimatePresence>
        {showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRejectModal(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden"
            >
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <div className="flex flex-col">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Reject Order</h3>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Select a reason to proceed</p>
                </div>
                <button 
                  onClick={() => setShowRejectModal(null)}
                  className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 shadow-sm border border-slate-100"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-4 space-y-2">
                {REJECTION_REASONS.map((reason, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleReject(showRejectModal, reason)}
                    className="w-full text-left p-6 rounded-2xl hover:bg-red-50 text-slate-700 hover:text-red-600 font-bold text-sm transition-all border border-transparent hover:border-red-100 group flex items-center justify-between"
                  >
                    {reason}
                    <div className="w-6 h-6 rounded-full border-2 border-slate-100 group-hover:border-red-200 transition-colors" />
                  </button>
                ))}
              </div>

              <div className="p-8 bg-slate-50/50 border-t border-slate-50">
                <button 
                  onClick={() => setShowRejectModal(null)}
                  className="w-full py-4 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-slate-600 transition-colors"
                >
                  Go Back
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
