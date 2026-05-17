import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  AlertCircle,
  Store,
  Trash2,
  ChefHat,
  Search,
  Split,
  Merge,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL, resolveImageUrl } from '../config';
import { useCart } from '../context/CartContext';
import ShareSplitModal from '../components/ShareSplitModal';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

const STATUS_FILTERS = [
  { id: 'ALL', label: 'ALL WAITING' },
  { id: 'Pending', label: 'PENDING' },
  { id: 'Preparing', label: 'PREPARING' },
  { id: 'Ready', label: 'READY' },
  { id: 'Served', label: 'SERVED' },
  { id: 'Rejected', label: 'REJECTED' },
  { id: 'Cancelled', label: 'CANCELLED' },
  { id: 'Split', label: 'SPLIT BILLS' },
];

export default function WaitingList() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currency, setCurrency] = useState('AED');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [orderToMerge, setOrderToMerge] = useState<any>(null);
  const [orderToSplit, setOrderToSplit] = useState<any>(null);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [splitItems, setSplitItems] = useState<Record<number, number>>({});
  const [splitStep, setSplitStep] = useState(0); // 0: Count, 1: Mode, 2: Item Selection
  const [splitCount, setSplitCount] = useState(2);
  const [splitMode, setSplitMode] = useState<'equal' | 'item'>('item');
  const splitTotalAmount = useMemo(() => {
    if (!orderToSplit || !orderToSplit.items) return 0;
    return orderToSplit.items.reduce((sum: number, item: any) => {
      const qty = splitItems[item.id] || 0;
      return sum + (qty * parseFloat(item.price || 0));
    }, 0);
  }, [orderToSplit, splitItems]);
  const [mergeTargetOrder, setMergeTargetOrder] = useState<any>(null);
  const [now, setNow] = useState(new Date());
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareOrderIds, setShareOrderIds] = useState<number[]>([]);
  const { loadOrderIntoCart } = useCart();

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/settings?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        if (data?.tenant?.currency) setCurrency(data.tenant.currency);
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchSettings();
    window.addEventListener('settings-updated', fetchSettings);
    const interval = setInterval(fetchOrders, 10000);
    const tick = setInterval(() => setNow(new Date()), 1000);
    fetchOrders();
    return () => {
      clearInterval(interval);
      clearInterval(tick);
      window.removeEventListener('settings-updated', fetchSettings);
    };
  }, []);

  const [isOrdersFetching, setIsOrdersFetching] = useState(false);
  const fetchOrders = async () => {
    if (isOrdersFetching) return;
    setIsOrdersFetching(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(`${API_BASE_URL}/orders?includeSplits=true&t=${Date.now()}`, { signal: controller.signal });
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch (err) { 
      console.error('Failed to fetch orders:', err); 
    } finally { 
      setIsLoading(false); 
      setIsOrdersFetching(false);
      clearTimeout(timeoutId);
    }
  };

  const isPaid = (order: any) => {
    if (!order) return false;
    const p = (order.payment_status || '').toLowerCase();
    const s = (order.status || '').toLowerCase();
    return p === 'paid' || s === 'paid' || s === 'partially paid';
  };

  const getElapsedTime = (startTime: string) => {
    if (!startTime) return 0;
    const start = new Date(startTime).getTime();
    if (isNaN(start)) return 0;
    const diff = Math.floor((now.getTime() - start) / 60000);
    return isNaN(diff) ? 0 : diff;
  };

  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    return orders.filter(o => {
      if (!o) return false;
      const status = (o.status || '').toLowerCase().trim();
      const filter = activeFilter.toLowerCase().trim();
      const search = (searchQuery || '').toLowerCase();
      const matchesSearch = (o.order_number || '').toString().includes(search) || (o.customer_name || '').toLowerCase().includes(search);

      const isChildOrder = o.parent_order_id !== null && o.parent_order_id !== undefined && o.parent_order_id !== 0 && o.parent_order_id !== '0' && o.parent_order_id !== '';
      const isParentOrder = status === 'partially paid';
      const hasSuffix = o.order_number && String(o.order_number).includes('-S');
      const isSplitRelated = isChildOrder || isParentOrder || hasSuffix;

      if (filter === 'split') {
        // Show BOTH split parent and split child orders under the SPLIT BILLS filter
        return isSplitRelated && matchesSearch;
      }

      // For all other standard queues, EXCLUDE split-related parent and child orders
      if (isSplitRelated) return false;

      if (filter === 'all') return matchesSearch && status !== 'served' && status !== 'cancelled' && status !== 'rejected';
      if (filter === 'pending') return matchesSearch && ['pending', 'ordered', 'paid'].includes(status);
      return matchesSearch && status === filter;
    });
  }, [orders, activeFilter, searchQuery]);

  const sortedOrders = useMemo(() => {
    const direction = settings?.branch?.order_sort_direction || 'Descending';
    return [...filteredOrders].sort((a, b) => {
      if (!a || !b) return 0;
      const aId = Number(a.id) || 0;
      const bId = Number(b.id) || 0;
      return direction === 'Ascending' ? aId - bId : bId - aId;
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
      if (res.ok) window.dispatchEvent(new CustomEvent('settings-updated'));
    } catch (err) { console.error(err); }
  };

  const handlePay = (order: any) => {
    navigate('/orders', { state: { autoCheckout: true, orderToPay: order } });
  };

  const handleEdit = (order: any) => {
    loadOrderIntoCart(order);
    navigate('/orders');
  };

  const handlePrint = async (orderId: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/print`);
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Printing Receipt...', type: 'success' } }));
      }
    } catch (err) { console.error(err); }
  };

  const handlePDF = async (order: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${order.id}/pdf`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${order.order_number || order.id}.pdf`;
      a.click();
    } catch (err) { console.error(err); }
  };

  const handleSplit = (order: any) => {
    setOrderToSplit(order);
    setSplitStep(0);
    setSplitCount(2);
    const initialSplit: Record<number, number> = {};
    order.items?.forEach((item: any) => {
      initialSplit[item.id] = 0;
    });
    setSplitItems(initialSplit);
    setIsSplitModalOpen(true);
  };

  const confirmEqualSplit = async () => {
    if (!orderToSplit) return;
    try {
      console.log('Splitting Order (Waiting):', orderToSplit.id, 'into', splitCount, 'parts');
      const res = await fetch(`${API_BASE_URL}/orders/split-equal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceOrderId: orderToSplit.id,
          splitCount
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('show-toast', { 
          detail: { message: `Bill split into ${splitCount} equal parts`, type: 'success' } 
        }));
        
        // Open the Share Split modal
        if (data.newOrderIds && Array.isArray(data.newOrderIds)) {
          setShareOrderIds(data.newOrderIds);
          setIsShareModalOpen(true);
        }

        // Automatically trigger printing for all split bills
        if (data.newOrderIds && Array.isArray(data.newOrderIds)) {
          for (const id of data.newOrderIds) {
            try {
              await fetch(`${API_BASE_URL}/orders/${id}/print`);
            } catch (pErr) { console.error('Auto-print error:', pErr); }
          }
        }

        setIsSplitModalOpen(false);
        setOrderToSplit(null);
        fetchOrders();
      } else {
        window.dispatchEvent(new CustomEvent('show-toast', { 
          detail: { message: data.error || data.message || 'Split Failed', type: 'error' } 
        }));
      }
    } catch (err) { 
      console.error('Equal Split Error (Waiting):', err);
      window.dispatchEvent(new CustomEvent('show-toast', { 
        detail: { message: 'Network error during split', type: 'error' } 
      }));
    }
  };

  const confirmSplit = async () => {
    if (!orderToSplit) return;
    const itemsToMove = Object.entries(splitItems)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => ({ id: parseInt(id), quantity: qty }));

    if (itemsToMove.length === 0) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Select items to split', type: 'error' } }));
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/orders/split`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceOrderId: orderToSplit.id,
          itemsToMove
        })
      });

      if (res.ok) {
        const data = await res.json();
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Order Split Successfully', type: 'success' } }));
        
        // Open the Share Split modal showing both child order shares
        const idsToShare = [];
        if (data.remainingOrderId) {
          idsToShare.push(data.remainingOrderId);
        } else {
          idsToShare.push(orderToSplit.id);
        }
        if (data.newOrderId) {
          idsToShare.push(data.newOrderId);
        }
        setShareOrderIds(idsToShare);
        setIsShareModalOpen(true);

        // Auto-print both child orders
        try {
          if (data.remainingOrderId) {
            await fetch(`${API_BASE_URL}/orders/${data.remainingOrderId}/print`);
          } else {
            await fetch(`${API_BASE_URL}/orders/${orderToSplit.id}/print`);
          }
          if (data.newOrderId) {
            await fetch(`${API_BASE_URL}/orders/${data.newOrderId}/print`);
          }
        } catch (pErr) { console.error('Auto-print error:', pErr); }

        setIsSplitModalOpen(false);
        setOrderToSplit(null);
        setSplitItems({});
        fetchOrders();
      } else {
        const data = await res.json();
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: data.error || data.message || 'Split Failed', type: 'error' } }));
      }
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Network error during split', type: 'error' } }));
    }
  };

  const handleMerge = (order: any) => {
    setOrderToMerge(order);
    setIsMergeModalOpen(true);
  };

  const confirmMerge = async () => {
    if (!orderToMerge || !mergeTargetOrder) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/orders/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceOrderId: orderToMerge.id,
          targetOrderId: mergeTargetOrder.id
        })
      });

      if (res.ok) {
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Orders Merged Successfully', type: 'success' } }));
        setIsMergeModalOpen(false);
        setOrderToMerge(null);
        setMergeTargetOrder(null);
        fetchOrders();
      } else {
        const data = await res.json();
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: data.error || 'Merge Failed', type: 'error' } }));
      }
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Network error during merge', type: 'error' } }));
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#f8fafc] overflow-hidden p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 px-2">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/10">
            <Timer size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight uppercase">Live <span className="text-zamzam-teal">Waitlist</span></h1>
            <div className="flex items-center gap-3 mt-0.5">
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">Real-time Queue</p>
              <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[8px] font-bold text-slate-900 uppercase tracking-widest">{filteredOrders.length} In Queue</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="SEARCH WAITING..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-10 pr-4 bg-white border border-slate-100 rounded-xl text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-zamzam-teal/20 focus:border-zamzam-teal transition-all w-64 shadow-sm"
            />
          </div>

          <button onClick={fetchOrders} className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 hover:text-zamzam-teal shadow-sm border border-slate-100 transition-all"><RefreshCw size={16} /></button>

          <button 
            onClick={toggleSortDirection}
            className={cn("h-10 px-4 rounded-xl transition-all border flex items-center gap-2 shadow-sm", (settings?.branch?.order_sort_direction || 'Descending') === 'Descending' ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-100 text-slate-600")}
          >
            {(settings?.branch?.order_sort_direction || 'Descending') === 'Descending' ? <ArrowDown size={14} strokeWidth={3} /> : <ArrowUp size={14} strokeWidth={3} />}
            <span className="text-[10px] font-bold uppercase tracking-widest">Sort</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs Sub-header */}
      <div className="shrink-0 px-2">
        <div className="bg-slate-100/50 p-1 rounded-2xl flex border border-slate-200/50 overflow-x-auto no-scrollbar w-full shadow-sm">
          {STATUS_FILTERS.map(filter => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={cn(
                "px-5 py-2.5 text-[10px] font-bold tracking-[0.05em] transition-all rounded-xl shrink-0 uppercase",
                activeFilter === filter.id 
                  ? "bg-zamzam-teal text-white shadow-md shadow-teal-900/15" 
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/40"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="overflow-y-auto no-scrollbar flex-1">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100 sticky top-0 z-10">
              <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="pl-6 py-3">Order / Info</th>
                <th className="px-4 py-3">Origin</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Time Laps</th>
                <th className="pr-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <AnimatePresence mode="popLayout">
                {sortedOrders.map((order) => {
                  if (!order) return null;
                  const paid = isPaid(order);
                  const elapsed = getElapsedTime(order.order_time);
                  
                  return (
                    <motion.tr 
                      key={order.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setSelectedOrder(order)}
                      className={cn("group cursor-pointer transition-all border-l-2", paid ? "hover:bg-green-50/30 border-l-green-500" : "hover:bg-red-50/30 border-l-red-500")}
                    >
                      <td className="pl-6 py-2.5">
                        <div className="flex items-center gap-4">
                          {/* Actions */}
                          <div className="flex items-center gap-1.5">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handlePay(order); }}
                              className={cn("w-7 h-7 bg-green-50 text-green-600 rounded-lg flex items-center justify-center hover:bg-green-100 transition-all", paid && "opacity-0 pointer-events-none")}
                              title="Pay"
                            >
                              <Banknote size={14} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleEdit(order); }}
                              className="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-100 transition-colors"
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handlePrint(order.id); }}
                              className="w-7 h-7 bg-slate-50 text-slate-600 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-colors"
                              title="Print"
                            >
                              <Printer size={14} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handlePDF(order); }}
                              className="w-7 h-7 bg-red-50 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-100 transition-colors"
                              title="PDF"
                            >
                              <FileText size={14} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleSplit(order); }}
                              className="w-7 h-7 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center hover:bg-purple-100 transition-colors"
                              title="Split"
                            >
                              <Split size={14} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleMerge(order); }}
                              className="w-7 h-7 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center hover:bg-orange-100 transition-colors"
                              title="Merge"
                            >
                              <Merge size={14} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
                              className="w-7 h-7 bg-teal-50 text-teal-600 rounded-lg flex items-center justify-center hover:bg-teal-100 transition-colors"
                              title="View"
                            >
                              <Eye size={14} />
                            </button>
                          </div>

                          <div className="flex items-center gap-3 ml-2 border-l border-slate-100 pl-4">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5 text-slate-400">
                                <Clock size={10} />
                                <span className="text-[9px] font-bold uppercase tracking-tight">{order.order_time ? new Date(order.order_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---'}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-400 mt-0.5">
                                <ClipboardList size={10} />
                                <span className="text-[9px] font-bold uppercase tracking-tight">{order.items?.length || 0} Items</span>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-900 tracking-tight uppercase leading-none">#{order.order_number || order.id?.toString().slice(-4)}</h4>
                              <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                {order.customer_name && order.customer_name !== 'Guest' ? order.customer_name : (order.table_number ? `TABLE ${order.table_number}` : 'WALK-IN GUEST')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </td>
                      {/* Origin */}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", (order.origin || '').toLowerCase() === 'website' ? "bg-blue-50 text-blue-600" : "bg-teal-50 text-teal-600")}>
                            {(order.origin || '').toLowerCase() === 'website' ? <Globe size={10} /> : <Store size={10} />}
                          </div>
                          <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tight">{order.origin || 'In-Store'}</span>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-2.5">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-slate-900 uppercase tracking-tight">{order.order_type || 'Dine-In'}</span>
                          {order.table_number && (
                            <span className="text-[7px] font-bold text-zamzam-teal uppercase tracking-widest mt-0.5">Table {order.table_number}</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-2.5 text-center">
                        <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[8px] font-bold uppercase tracking-widest border", paid ? "bg-green-50 text-green-600 border-green-100" : "bg-red-50 text-red-600 border-red-100")}>
                          <div className={cn("w-1.5 h-1.5 rounded-full", paid ? "bg-green-500" : "bg-red-500")} />
                          {paid ? 'Paid' : 'Unpaid'}
                        </div>
                      </td>

                      {/* Time Laps */}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3 justify-end">
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] font-black text-slate-900 leading-none">{elapsed}m</span>
                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min((elapsed / (settings?.branch?.kds_timer_minutes || 15)) * 100, 100)}%` }}
                                className={cn(
                                  "h-full transition-all duration-1000",
                                  elapsed > (settings?.branch?.kds_timer_minutes || 15) ? "bg-red-500" : "bg-zamzam-teal"
                                )}
                              />
                            </div>
                          </div>
                          <Timer size={12} className="text-slate-400 shrink-0" />
                        </div>
                      </td>

                      {/* Action */}
                      <td className="pr-6 py-2.5 text-right">
                        <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
                            className="p-1.5 text-slate-400 hover:text-zamzam-teal transition-colors"
                          >
                            <Navigation size={12} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedOrder(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="relative bg-white w-full max-w-sm h-full shadow-2xl flex flex-col border-l border-slate-100">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                  <div className="flex items-center gap-2 text-zamzam-teal mb-1">
                    <Users size={14} />
                    <span className="text-[8px] font-bold uppercase tracking-[0.3em]">Guest Detail</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight uppercase">#{selectedOrder.order_number || selectedOrder.id}</h2>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 transition-all"><X size={18} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-0 no-scrollbar">
                {/* Order Metadata Section */}
                <div className="p-6 bg-slate-50/50 border-b border-slate-100 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[7px] font-bold text-slate-400 uppercase tracking-[0.2em] block">Service Type</span>
                    <p className="text-[10px] font-bold text-slate-900 uppercase">{selectedOrder.order_type || 'Takeaway'}</p>
                    {selectedOrder.table_number && (
                      <div className="flex items-center gap-1.5 text-zamzam-teal mt-1">
                        <Utensils size={10} />
                        <span className="text-[9px] font-bold uppercase">Table {selectedOrder.table_number}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <span className="text-[7px] font-bold text-slate-400 uppercase tracking-[0.2em] block">Staff</span>
                    <p className="text-[10px] font-bold text-slate-900 uppercase truncate">{selectedOrder.waiter_name || 'System'}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Served by</p>
                  </div>
                </div>

                <div className="p-6 pb-2 border-b border-slate-50 bg-white">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">Customer Identity</span>
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                      {(selectedOrder.customer_name || 'G')[0].toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight">{selectedOrder.customer_name || 'Guest Customer'}</h4>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{selectedOrder.customer_phone || 'Walk-in Guest'}</p>
                    </div>
                  </div>
                </div>

                {selectedOrder.status === 'Partially Paid' && (
                  <div className="mx-6 my-4 p-4 rounded-2xl bg-amber-50 border border-amber-100 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-amber-800 font-bold text-[9px] uppercase tracking-wider">
                      <Split size={14} className="text-amber-600" />
                      <span>This order has split bills</span>
                    </div>
                    <p className="text-[10px] text-amber-700 leading-normal font-medium">
                      The bill was split to accommodate guests. You can view, print, or share the split receipts.
                    </p>
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch(`${API_BASE_URL}/orders?parentId=${selectedOrder.id}`);
                          if (res.ok) {
                            const children = await res.json();
                            const childIds = children.map((c: any) => c.id);
                            if (childIds.length > 0) {
                              setShareOrderIds(childIds);
                              setIsShareModalOpen(true);
                            } else {
                              window.dispatchEvent(new CustomEvent('show-toast', { 
                                detail: { message: 'No split bills found', type: 'info' } 
                              }));
                            }
                          }
                        } catch (err) {
                          console.error('Fetch splits error:', err);
                        }
                      }}
                      className="mt-1 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all self-start flex items-center gap-1.5"
                    >
                      View Split Shares
                    </button>
                  </div>
                )}

                <div className="p-6 pb-2"><h3 className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">Order Items</h3></div>
                <div className="divide-y divide-slate-100">
                  {selectedOrder.items?.map((item: any, idx: number) => {
                    if (!item) return null;
                    return (
                      <div key={idx} className="px-6 py-4 flex items-center gap-4">
                        <div className="w-9 h-9 bg-slate-900 text-white rounded-lg flex items-center justify-center text-xs font-bold shrink-0">{item.quantity || 1}</div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[13px] font-bold text-slate-800 uppercase leading-tight truncate">{item.name || 'Item'}</h4>
                          <p className="text-[9px] font-bold text-slate-400 mt-1">{currency} {item.price?.toLocaleString() || '0'}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-6 border-t border-slate-50 space-y-1.5 bg-slate-50/30">
                  <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>Subtotal</span>
                    <span>{currency} {(selectedOrder.subtotal || selectedOrder.total_amount)?.toLocaleString()}</span>
                  </div>
                  
                  {selectedOrder.tax_amount > 0 && (
                    <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      <span>Tax</span>
                      <span>{currency} {selectedOrder.tax_amount?.toLocaleString()}</span>
                    </div>
                  )}

                  {(Number(selectedOrder.discount_amount) > 0 || Number(selectedOrder.promo_discount) > 0) && (
                    <div className="flex justify-between text-[9px] font-bold text-green-600 uppercase tracking-widest">
                      <span>Discounts {selectedOrder.promo_id ? `(${selectedOrder.promo_id})` : ''}</span>
                      <span>-{currency} {(Number(selectedOrder.discount_amount || 0) + Number(selectedOrder.promo_discount || 0)).toLocaleString()}</span>
                    </div>
                  )}

                  {Number(selectedOrder.tip_amount) > 0 && (
                    <div className="flex justify-between text-[9px] font-bold text-pink-500 uppercase tracking-widest">
                      <span>Tip</span>
                      <span>+{currency} {selectedOrder.tip_amount?.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-[13px] font-bold text-slate-900 uppercase tracking-tight pt-1.5 border-t border-slate-100 mt-1.5">
                    <span>Total Amount</span>
                    <span className="text-zamzam-teal">{currency} {selectedOrder.total_amount?.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button className="flex-1 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold text-[9px] uppercase tracking-widest hover:bg-slate-50 transition-all">Reject</button>
                <button className="flex-1 py-3 bg-zamzam-teal text-white rounded-xl font-bold text-[9px] uppercase tracking-widest shadow-lg shadow-teal-500/10 hover:bg-teal-600 transition-all">Accept</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Merge Modal */}
      <AnimatePresence>
        {isMergeModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMergeModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-8 border-b border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center">
                      <Merge size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Merge Bill</h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Combine Orders into One</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsMergeModalOpen(false)}
                    className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-100 hover:text-slate-600 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 mb-6">
                  <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-1">Source Order</p>
                  <p className="text-sm font-black text-slate-900">Order #{orderToMerge?.order_number || orderToMerge?.id}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">{orderToMerge?.customer_name} • {currency} {orderToMerge?.total_amount}</p>
                </div>

                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text"
                    placeholder="Search order to merge into..."
                    className="w-full h-12 bg-slate-50 border-none rounded-2xl pl-12 pr-4 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500/20 transition-all"
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                {orders
                  .filter(o => o.id !== orderToMerge?.id && ['Pending', 'Ordered', 'Preparing', 'Ready', 'Served'].includes(o.status))
                  .filter(o => !searchQuery || o.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) || o.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(o => (
                    <button
                      key={o.id}
                      onClick={() => setMergeTargetOrder(o)}
                      className={cn(
                        "w-full p-4 rounded-2xl flex items-center justify-between transition-all border text-left",
                        mergeTargetOrder?.id === o.id 
                          ? "bg-orange-50 border-orange-200 shadow-sm" 
                          : "bg-white border-slate-100 hover:border-slate-200"
                      )}
                    >
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-black text-slate-900">#{o.order_number || o.id}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{o.customer_name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-slate-900">{currency} {o.total_amount}</span>
                        <div className="flex items-center gap-1.5 justify-end mt-0.5">
                          <div className={cn("w-1.5 h-1.5 rounded-full", o.status === 'Pending' ? 'bg-orange-400' : 'bg-green-400')} />
                          <span className="text-[9px] font-bold text-slate-400 uppercase">{o.status}</span>
                        </div>
                      </div>
                    </button>
                  ))}
              </div>

              <div className="p-8 bg-slate-50/50 border-t border-slate-100">
                <button
                  disabled={!mergeTargetOrder}
                  onClick={confirmMerge}
                  className="w-full h-14 bg-orange-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-orange-600/20 hover:bg-orange-700 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-3"
                >
                  <Merge size={18} />
                  Confirm Merge
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Split Modal */}
      <AnimatePresence>
        {isSplitModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSplitModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-8 border-b border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
                      <Split size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Split Bill</h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Order #{orderToSplit?.order_number || orderToSplit?.id}</p>
                    </div>
                  </div>
                  <button onClick={() => setIsSplitModalOpen(false)} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-100"><X size={20} /></button>
                </div>

                {/* Stepper */}
                <div className="flex items-center gap-2 mb-2 px-2">
                  {[0, 1, 2].map((s) => (
                    <div key={s} className={cn("h-1.5 flex-1 rounded-full transition-all duration-500", splitStep >= s ? "bg-purple-600" : "bg-slate-100")} />
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
                {splitStep === 0 && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <h3 className="text-lg font-black text-slate-900 uppercase">How many splits?</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Select the number of bills to create</p>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      {[2, 3, 4, 5].map(n => {
                        const calculatedShare = orderToSplit?.total_amount 
                          ? (parseFloat(orderToSplit.total_amount) / n).toFixed(2) 
                          : '0.00';
                        return (
                          <button
                            key={n}
                            onClick={() => { setSplitCount(n); setSplitStep(1); }}
                            className={cn(
                              "h-20 rounded-2xl border-2 font-black flex flex-col items-center justify-center transition-all py-2",
                              splitCount === n ? "bg-purple-50 border-purple-600 text-purple-600 shadow-lg shadow-purple-600/10" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                            )}
                          >
                            <span className="text-lg font-black">{n}</span>
                            <span className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-wider">{currency} {calculatedShare}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {splitStep === 1 && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <h3 className="text-lg font-black text-slate-900 uppercase">Split Method</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Choose how to distribute items</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <button
                        onClick={() => setSplitMode('equal')}
                        className={cn(
                          "p-6 rounded-[2rem] border-2 transition-all text-left",
                          splitMode === 'equal' ? "border-purple-600 bg-purple-50 shadow-lg shadow-purple-600/5" : "border-slate-100 bg-white hover:border-slate-200"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-colors", splitMode === 'equal' ? "bg-white text-purple-600" : "bg-slate-50 text-slate-400")}>
                            <Banknote size={24} />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-900 uppercase">Equal Financial Split</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                              Divide total into {splitCount} equal amounts of {currency} {(parseFloat(orderToSplit?.total_amount || '0') / splitCount).toFixed(2)} each
                            </p>
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => setSplitMode('item')}
                        className={cn(
                          "p-6 rounded-[2rem] border-2 transition-all text-left",
                          splitMode === 'item' ? "border-purple-600 bg-purple-50 shadow-lg shadow-purple-600/5" : "border-slate-100 bg-white hover:border-slate-200"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-colors", splitMode === 'item' ? "bg-white text-purple-600" : "bg-slate-50 text-slate-400")}>
                            <ClipboardList size={24} />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-900 uppercase">Item-wise Split</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manually select items for each bill</p>
                          </div>
                        </div>
                      </button>
                    </div>
                    
                    <div className="pt-4">
                      <button
                        onClick={() => {
                          if (splitMode === 'equal') confirmEqualSplit();
                          else setSplitStep(2);
                        }}
                        className="w-full h-14 bg-purple-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-purple-600/20 hover:bg-purple-700 transition-all flex items-center justify-center gap-3 px-4 text-center"
                      >
                        <span>
                          {splitMode === 'equal' 
                            ? `Confirm Equal Split (${currency} ${(parseFloat(orderToSplit?.total_amount || '0') / splitCount).toFixed(2)} each)` 
                            : 'Continue to Items'}
                        </span>
                        <ChevronRight size={18} />
                      </button>
                      <button onClick={() => setSplitStep(0)} className="w-full text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] hover:text-slate-600 mt-4">Back to count</button>
                    </div>
                  </div>
                )}

                {splitStep === 2 && (
                  <div className="space-y-4">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-black text-slate-900 uppercase">Item Selection</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Move items to Bill #2</p>
                      
                      {/* Live Amounts Summary Badge */}
                      <div className="mt-3 flex items-center justify-center gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-100/80">
                        <div className="text-left flex-1 pl-2">
                          <span className="text-[8px] font-bold text-slate-400 block uppercase">Remaining Bill #1</span>
                          <span className="text-xs font-black text-slate-700">
                            {currency} {(parseFloat(orderToSplit?.total_amount || 0) - splitTotalAmount).toFixed(2)}
                          </span>
                        </div>
                        <div className="w-px h-6 bg-slate-200" />
                        <div className="text-right flex-1 pr-2">
                          <span className="text-[8px] font-bold text-purple-400 block uppercase">New Bill #2</span>
                          <span className="text-xs font-black text-purple-600">
                            {currency} {splitTotalAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {orderToSplit?.items?.map((item: any) => (
                      <div key={item.id} className="p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <div className="flex-1 min-w-0 pr-4 text-left">
                          <h4 className="text-[11px] font-black text-slate-900 uppercase truncate">{item.name}</h4>
                          <p className="text-[9px] font-bold text-slate-400">{item.quantity} Available • {currency} {item.price}</p>
                        </div>
                        <div className="flex items-center gap-3 bg-slate-50 p-1 rounded-xl border border-slate-100">
                          <button onClick={() => setSplitItems(prev => ({ ...prev, [item.id]: Math.max(0, (prev[item.id] || 0) - 1) }))} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-purple-600">-</button>
                          <span className="text-[10px] font-black text-slate-900">{splitItems[item.id] || 0}</span>
                          <button onClick={() => setSplitItems(prev => ({ ...prev, [item.id]: Math.min(item.quantity, (prev[item.id] || 0) + 1) }))} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-purple-600">+</button>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => setSplitStep(1)} className="w-full text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] hover:text-slate-600 mt-2">Back to method</button>
                  </div>
                )}
              </div>

              {splitStep === 2 && (
                <div className="p-8 bg-slate-50/50 border-t border-slate-100">
                  <button
                    onClick={confirmSplit}
                    disabled={Object.values(splitItems).every(v => v === 0)}
                    className="w-full h-14 bg-purple-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-purple-600/20 hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                  >
                    <Split size={18} /> Confirm Split (Bill #2: {currency} {splitTotalAmount.toFixed(2)})
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ShareSplitModal
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setShareOrderIds([]);
        }}
        splitOrderIds={shareOrderIds}
        currency={currency}
        apiBaseUrl={API_BASE_URL}
      />
    </div>
  );
}
