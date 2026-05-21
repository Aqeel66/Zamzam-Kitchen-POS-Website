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
  ArrowDown,
  Eye,
  CreditCard,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

const formatTableNumber = (num: string | number) => {
  if (!num) return '';
  const str = num.toString().trim();
  const clean = str.replace(/^[t\s\-_–—]+/i, '');
  return 'T-' + clean;
};

type TabType = 'PENDING' | 'PREPARING' | 'READY' | 'REJECTED';

export default function KDS() {
  const [orders, setOrders] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>('PENDING');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  
  // Modals State
  const [showRejectModal, setShowRejectModal] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

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
        if (selectedOrder?.id === orderId) {
          const updatedOrder = { ...selectedOrder, status: newStatus };
          setSelectedOrder(updatedOrder);
          if (newStatus === 'Served' || (activeTab !== 'REJECTED' && newStatus === 'Rejected')) {
            setSelectedOrder(null);
          }
        }
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
        if (selectedOrder?.id === orderId) {
          const updatedItems = selectedOrder.items.filter((item: any) => item.id !== itemId);
          setSelectedOrder({ ...selectedOrder, items: updatedItems });
        }
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

  const isPaid = (order: any) => {
    const p = (order.payment_status || '').toLowerCase();
    const s = (order.status || '').toLowerCase();
    return p === 'paid' || s === 'paid' || s === 'partially paid';
  };

  const isSplitRelated = (o: any) => {
    if (!o) return false;
    const status = (o.status || '').toLowerCase().trim();
    const isChild = o.parent_order_id !== null && o.parent_order_id !== undefined && o.parent_order_id !== 0 && o.parent_order_id !== '0' && o.parent_order_id !== '';
    const isParent = status === 'partially paid';
    const hasSuffix = o.order_number && String(o.order_number).includes('-S');
    return isChild || isParent || hasSuffix;
  };

  const filteredOrders = orders.filter(order => {
    // Exclude all split-related parent and child orders completely from KDS screens
    if (isSplitRelated(order)) return false;

    const status = (order.status || '').toLowerCase().trim();
    if (activeTab === 'PENDING') return ['ordered', 'pending', 'paid'].includes(status);
    if (activeTab === 'PREPARING') return status === 'preparing';
    if (activeTab === 'READY') return status === 'ready';
    if (activeTab === 'REJECTED') return status === 'rejected';
    return false;
  });

  const sortedOrders = useMemo(() => {
    const direction = settings?.branch?.order_sort_direction || 'Descending';
    
    return [...(filteredOrders || [])].sort((a, b) => {
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
          detail: { message: 'Sort Preference Updated', type: 'success' } 
        }));
      }
    } catch (err) {
      console.error('Failed to toggle sort:', err);
    }
  };

  const getCounts = (statusList: string[]) => {
    const list = statusList.map(s => s.toLowerCase());
    return orders.filter(o => {
      // Exclude all split-related parent and child orders from tab counters
      if (isSplitRelated(o)) return false;
      return list.includes((o.status || '').toLowerCase());
    }).length;
  };

  const tabs = [
    { id: 'PENDING', label: 'PENDING', count: getCounts(['Ordered', 'Pending', 'Paid']), color: 'bg-orange-500' },
    { id: 'PREPARING', label: 'PREPARING', count: getCounts(['Preparing']), color: 'bg-zamzam-teal' },
    { id: 'READY', label: 'READY', count: getCounts(['Ready']), color: 'bg-green-500' },
    { id: 'REJECTED', label: 'REJECTED', count: getCounts(['Rejected']), color: 'bg-red-500' }
  ];

  return (
    <div className="h-full flex flex-col bg-[#f8fafc] overflow-hidden p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 px-2">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/10">
            <ChefHat size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight uppercase">Kitchen <span className="text-zamzam-teal">Display</span></h1>
            <div className="flex items-center gap-3 mt-0.5">
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">Live Stream</p>
              <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[8px] font-bold text-slate-900 uppercase tracking-widest">{orders.filter(o => o.status !== 'Served' && !isSplitRelated(o)).length} Active</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={fetchOrders}
            className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 hover:text-zamzam-teal shadow-sm border border-slate-100 transition-all active:rotate-180 duration-500"
          >
            <RefreshCw size={16} />
          </button>

          <button 
            onClick={toggleSortDirection}
            className={cn(
              "h-10 px-4 rounded-xl transition-all border flex items-center gap-2 shadow-sm",
              (settings?.branch?.order_sort_direction || 'Descending') === 'Descending'
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white border-slate-100 text-slate-600 hover:border-slate-300"
            )}
          >
            {(settings?.branch?.order_sort_direction || 'Descending') === 'Descending' ? <ArrowDown size={14} strokeWidth={3} /> : <ArrowUp size={14} strokeWidth={3} />}
            <span className="text-[10px] font-bold uppercase tracking-widest">Sort</span>
          </button>

          <div className="bg-slate-100/50 p-1 rounded-xl flex border border-slate-200/50">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={cn(
                  "relative px-4 py-2 text-[9px] font-bold tracking-[0.05em] transition-all rounded-lg flex items-center gap-2",
                  activeTab === tab.id ? `${tab.color} text-white shadow-md` : "text-slate-400 hover:text-slate-600"
                )}
              >
                {tab.label}
                <span className={cn(
                  "px-1.5 py-0.5 rounded-md text-[8px] font-bold",
                  activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500"
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Box Style Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          <AnimatePresence mode="popLayout">
            {sortedOrders.map((order) => {
              const elapsed = parseInt(getElapsedTime(order.order_time).toString());
              const paid = isPaid(order);
              const threshold = settings?.branch?.kds_timer_minutes || 15;
              const isLate = elapsed >= threshold + 10;
              const isWarning = elapsed >= threshold;

              return (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => setSelectedOrder(order)}
                  className={cn(
                    "bg-white rounded-3xl border-2 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col relative group",
                    paid ? "border-green-500/20 hover:border-green-500" : "border-red-500/20 hover:border-red-500",
                    isLate ? "bg-red-50/10" : isWarning ? "bg-orange-50/10" : ""
                  )}
                >
                  {/* Card Header */}
                  <div className={cn(
                    "px-4 py-3 border-b flex items-center justify-between",
                    paid ? "bg-green-50/50 border-green-100" : "bg-red-50/50 border-red-100"
                  )}>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex flex-col items-center justify-center font-bold text-[10px] border shadow-sm",
                        isLate ? "bg-red-500 text-white border-red-500" : 
                        isWarning ? "bg-orange-500 text-white border-orange-500" : 
                        "bg-white text-slate-900 border-slate-100"
                      )}>
                        <span>{elapsed}m</span>
                      </div>
                      <div>
                        <h4 className="text-[13px] font-bold text-slate-900 tracking-tight leading-none uppercase">#{order.order_number || order.id.toString().slice(-4)}</h4>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                          {new Date(order.order_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className={cn(
                      "px-2 py-0.5 rounded-md text-[7px] font-bold uppercase tracking-widest border",
                      paid ? "bg-green-100/50 text-green-600 border-green-200" : "bg-red-100/50 text-red-600 border-red-200"
                    )}>
                      {paid ? 'Paid' : 'Unpaid'}
                    </div>
                  </div>

                  {/* Subheader Info */}
                  <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-5 h-5 rounded-md flex items-center justify-center text-[10px]",
                        (order.origin === 'Website' || order.origin === 'website') ? "bg-blue-50 text-blue-600" :
                        (order.origin === 'QR Menu' || order.origin === 'qr-menu') ? "bg-purple-50 text-purple-600" :
                        "bg-teal-50 text-teal-600"
                      )}>
                        {(order.origin === 'Website' || order.origin === 'website') ? <Globe size={10} /> :
                         (order.origin === 'QR Menu' || order.origin === 'qr-menu') ? <QrCode size={10} /> :
                         <Store size={10} />}
                      </div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">{order.order_type}</span>
                    </div>
                    {order.order_type === 'Dine-In' && (
                      <div className="flex items-center gap-1">
                        <Users size={10} className="text-zamzam-teal" />
                        <span className="text-[10px] font-bold text-zamzam-teal uppercase">Table {formatTableNumber(order.table_number || '??')}</span>
                      </div>
                    )}
                  </div>

                  {/* Items List */}
                  <div className="flex-1 p-4 space-y-2.5 overflow-hidden">
                    {order.items?.slice(0, 5).map((item: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-md bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {item.quantity}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-slate-800 uppercase tracking-tight leading-tight truncate">{item.name}</p>
                          {item.notes && <p className="text-[8px] text-orange-600 font-bold italic truncate">"{item.notes}"</p>}
                        </div>
                      </div>
                    ))}
                    {(order.items?.length || 0) > 5 && (
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-9">
                        + {order.items.length - 5} more items
                      </p>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center gap-2">
                    <div className="flex-1">
                      {activeTab === 'PENDING' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); updateStatus(order.id, 'Preparing'); }}
                          className="w-full bg-zamzam-teal text-white py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest shadow-lg shadow-teal-500/10 hover:bg-teal-600 transition-all active:scale-95"
                        >
                          Accept
                        </button>
                      )}
                      {activeTab === 'PREPARING' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); updateStatus(order.id, 'Ready'); }}
                          className="w-full bg-green-500 text-white py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest shadow-lg shadow-green-500/10 hover:bg-green-600 transition-all active:scale-95"
                        >
                          Ready
                        </button>
                      )}
                      {activeTab === 'READY' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); updateStatus(order.id, 'Served'); }}
                          className="w-full bg-orange-500 text-white py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest shadow-lg shadow-orange-500/10 hover:bg-orange-600 transition-all active:scale-95"
                        >
                          Served
                        </button>
                      )}
                      {activeTab === 'REJECTED' && (
                        <div className="text-center py-2">
                          <span className="text-[8px] font-bold text-red-500 uppercase tracking-widest">Rejected</span>
                          {order.rejection_reason && (
                            <p className="text-[8px] text-red-400 mt-1 uppercase tracking-wider bg-red-50 px-2 py-1 rounded-md mx-auto max-w-[90%] truncate" title={order.rejection_reason}>
                              Reason: {order.rejection_reason}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-zamzam-teal transition-colors">
                      <Eye size={16} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative bg-white w-full max-w-sm h-full shadow-2xl flex flex-col border-l border-slate-100"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                  <div className="flex items-center gap-2 text-zamzam-teal mb-1">
                    <ChefHat size={14} />
                    <span className="text-[8px] font-bold uppercase tracking-[0.3em]">Ticket Detail</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight uppercase">
                    Order <span className="text-zamzam-teal">#{selectedOrder.order_number || selectedOrder.id.toString().slice(-4)}</span>
                  </h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-[7px] font-bold uppercase tracking-widest border",
                      isPaid(selectedOrder) ? "bg-green-50 text-green-600 border-green-100" : "bg-red-50 text-red-600 border-red-100"
                    )}>
                      {isPaid(selectedOrder) ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all shadow-sm border border-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Content - STRAIGHT LINE ITEMS */}
              <div className="flex-1 overflow-y-auto p-0 no-scrollbar">
                <div className="p-6 pb-2">
                  <h3 className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">Production Items</h3>
                </div>
                
                <div className="divide-y divide-slate-100">
                  {selectedOrder.items?.map((item: any, idx: number) => (
                    <div key={idx} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors group/item">
                      <div className="w-9 h-9 bg-slate-900 text-white rounded-lg flex items-center justify-center text-xs font-bold shrink-0">
                        {item.quantity}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[13px] font-bold text-slate-800 uppercase tracking-tight leading-tight truncate">{item.name}</h4>
                        {item.customizations?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.customizations.map((c: any, cidx: number) => (
                              <span key={cidx} className="text-[8px] font-bold uppercase text-slate-400">
                                + {c.customization_name}{cidx < item.customizations.length - 1 ? ',' : ''}
                              </span>
                            ))}
                          </div>
                        )}
                        {item.notes && (
                          <p className="text-[9px] font-bold text-orange-600 italic mt-1 leading-snug">"{item.notes}"</p>
                        )}
                      </div>
                      <button 
                        onClick={() => deleteItem(selectedOrder.id, item.id)}
                        className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-all"
                        title="Remove Item"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Additional Info Squeezed */}
                <div className="p-6 mt-4 grid grid-cols-2 gap-3 border-t border-slate-50">
                  <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                    <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Service</span>
                    <p className="text-[10px] font-bold text-slate-900 uppercase tracking-tight">{selectedOrder.order_type}</p>
                    {selectedOrder.table_number && <p className="text-[8px] font-bold text-zamzam-teal">{formatTableNumber(selectedOrder.table_number)}</p>}
                  </div>
                  <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                    <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Guest</span>
                    <p className="text-[10px] font-bold text-slate-900 uppercase tracking-tight truncate">{selectedOrder.customer_name || 'Guest'}</p>
                    <p className="text-[8px] font-bold text-slate-500 mt-0.5 truncate">{selectedOrder.customer_phone || '---'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[7px] font-bold text-slate-400 uppercase tracking-[0.2em] block">Time</span>
                    <p className="text-[10px] font-bold text-slate-900 uppercase">
                      {new Date(selectedOrder.order_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Elapsed: {getElapsedTime(selectedOrder.order_time)} min</p>
                  </div>
                </div>

                {/* Rejection Reason in Detail View */}
                {selectedOrder.status === 'Rejected' && selectedOrder.rejection_reason && (
                  <div className="mx-6 mt-4 p-4 rounded-2xl bg-red-50 border border-red-100 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-red-800 font-bold text-[9px] uppercase tracking-wider">
                      <X size={14} className="text-red-600" />
                      <span>Rejection Reason</span>
                    </div>
                    <p className="text-[10px] text-red-700 leading-normal font-medium">
                      {selectedOrder.rejection_reason}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex gap-3">
                {activeTab === 'PENDING' && (
                  <>
                    <button 
                      onClick={() => setShowRejectModal(selectedOrder.id)}
                      className="flex-1 py-3 bg-white text-red-500 border border-red-100 rounded-xl font-bold text-[9px] uppercase tracking-widest hover:bg-red-50 transition-all"
                    >
                      Reject
                    </button>
                    <button 
                      onClick={() => updateStatus(selectedOrder.id, 'Preparing')}
                      className="flex-[2] py-3 bg-zamzam-teal text-white rounded-xl font-bold text-[9px] uppercase tracking-widest shadow-lg shadow-teal-500/10 hover:bg-teal-600 active:scale-95 transition-all"
                    >
                      Start Prep
                    </button>
                  </>
                )}
                {activeTab === 'PREPARING' && (
                  <button 
                    onClick={() => updateStatus(selectedOrder.id, 'Ready')}
                    className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold text-[9px] uppercase tracking-widest shadow-lg shadow-green-500/10 hover:bg-green-600 transition-all"
                  >
                    Mark Ready
                  </button>
                )}
                {activeTab === 'READY' && (
                  <button 
                    onClick={() => updateStatus(selectedOrder.id, 'Served')}
                    className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold text-[9px] uppercase tracking-widest shadow-lg shadow-orange-500/10 hover:bg-orange-600 transition-all"
                  >
                    Mark Served
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rejection Modal */}
      <AnimatePresence>
        {showRejectModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowRejectModal(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white w-full max-w-xs rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <div className="flex flex-col">
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight uppercase">Reject</h3>
                  <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Select Reason</p>
                </div>
                <button onClick={() => setShowRejectModal(null)} className="p-2 text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>
              <div className="p-3 space-y-1">
                {REJECTION_REASONS.map((reason, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleReject(showRejectModal, reason)}
                    className="w-full text-left p-4 rounded-xl hover:bg-red-50 text-slate-700 hover:text-red-600 font-bold text-xs transition-all flex items-center justify-between group"
                  >
                    {reason}
                    <div className="w-4 h-4 rounded-full border border-slate-200 group-hover:border-red-200" />
                  </button>
                ))}
              </div>
              <div className="p-6 bg-slate-50/50 border-t border-slate-50">
                <button onClick={() => setShowRejectModal(null)} className="w-full py-2 text-slate-400 text-[8px] font-bold uppercase tracking-widest">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
