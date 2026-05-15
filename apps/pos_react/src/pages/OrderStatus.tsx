import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, 
  Filter, 
  Printer, 
  FileText, 
  Eye, 
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Circle,
  Banknote,
  ClipboardList,
  ExternalLink,
  ChevronRight,
  LayoutGrid,
  X,
  Download,
  Share2,
  Mail,
  MessageCircle,
  Split,
  Merge,
  Pencil,
  Utensils,
  Navigation,
  Users,
  Globe,
  QrCode,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, resolveImageUrl } from '../config';
import { useCart } from '../context/CartContext';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

const STATUS_FILTERS = [
  { id: 'ALL', label: 'ALL ORDERS' },
  { id: 'Website', label: 'WEBSITE' },
  { id: 'Pending', label: 'PENDING' },
  { id: 'Preparing', label: 'PREPARING' },
  { id: 'Ready', label: 'READY' },
  { id: 'Served', label: 'SERVED' },
  { id: 'Rejected', label: 'REJECTED' },
  { id: 'Cancelled', label: 'CANCELLED' },
];

export default function OrderStatus() {
  const navigate = useNavigate();
  const { loadOrderIntoCart } = useCart();
  const [orders, setOrders] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currency, setCurrency] = useState('AED');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [menuData, setMenuData] = useState<any[]>([]);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/settings?t=${Date.now()}`);
      const data = await res.json();
      setSettings(data);
      if (data?.tenant?.currency) {
        setCurrency(data.tenant.currency);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchOrders();

    window.addEventListener('settings-updated', fetchSettings);

    // Fetch Menu for Editing
    fetch(`${API_BASE_URL}/menu`)
      .then(res => res.json())
      .then(data => setMenuData(data))
      .catch(err => console.error('Error fetching menu:', err));

    const interval = setInterval(fetchOrders, 30000); // API Refresh
    return () => {
      clearInterval(interval);
      window.removeEventListener('settings-updated', fetchSettings);
    };
  }, []);


  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    
    return orders.filter(order => {
      if (!order) return false;
      const status = (order.status || '').toLowerCase().trim();
      const filter = activeFilter.toLowerCase().trim();
      const search = (searchQuery || '').toLowerCase();
      
      const matchesSearch = (order.order_number || '').toString().includes(search) || 
                           (order.customer_name || '').toLowerCase().includes(search);

      if (filter === 'all') return matchesSearch;

      let matchesFilter = status === filter;
      if (filter === 'website') {
        matchesFilter = (order.origin || '').toLowerCase() === 'website' || (order.origin || '').toLowerCase() === 'web';
      }
      if (filter === 'pending') {
        matchesFilter = ['pending', 'ordered', 'paid'].includes(status);
      }

      return matchesFilter && matchesSearch;
    });
  }, [orders, activeFilter, searchQuery]);

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
        // Optimistic update or wait for event
        window.dispatchEvent(new CustomEvent('settings-updated'));
        window.dispatchEvent(new CustomEvent('show-toast', { 
          detail: { message: 'Sort Preference Updated Successfully', type: 'success' } 
        }));
      }
    } catch (err) {
      console.error('Failed to toggle sort:', err);
    }
  };

  const getStatusColor = (statusRaw: string) => {
    const status = (statusRaw || '').toLowerCase();
    switch (status) {
      case 'paid': return 'text-zamzam-teal bg-teal-50 border-teal-100';
      case 'served': return 'text-indigo-600 bg-indigo-50 border-indigo-100';
      case 'preparing': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'ready': return 'text-green-600 bg-green-50 border-green-100';
      case 'rejected':
      case 'cancelled': return 'text-red-600 bg-red-50 border-red-100';
      case 'pending':
      case 'ordered': return 'text-amber-600 bg-amber-50 border-amber-100';
      default: return 'text-slate-400 bg-slate-50 border-slate-100';
    }
  };

  const getStatusIcon = (statusRaw: string) => {
    const status = (statusRaw || '').toLowerCase();
    switch (status) {
      case 'pending':
      case 'ordered': return <Clock size={12} className="animate-pulse" />;
      case 'preparing': return <Utensils size={12} className="animate-bounce" />;
      case 'ready': return <CheckCircle2 size={12} />;
      case 'served': return <ExternalLink size={12} />;
      case 'rejected':
      case 'cancelled': return <AlertCircle size={12} />;
      case 'paid': return <Banknote size={12} />;
      default: return <Circle size={8} />;
    }
  };

  // Error Guardian to catch and display any hidden crashes
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      alert('POS CRASH DETECTED: ' + e.message + ' at ' + e.lineno + ':' + e.colno);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  return (
    <div className="min-h-full bg-transparent p-6 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase mb-1 text-slate-900">Orders</h1>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.3em]">Operational History & Audit</p>
          </div>
            <button 
              onClick={() => {
                setIsLoading(true);
                fetchOrders();
              }}
              className="p-2 bg-slate-50 text-slate-400 hover:text-zamzam-teal hover:bg-white rounded-xl transition-all border border-slate-100 hover:shadow-lg"
              title="Refresh Orders"
            >
              <Clock size={16} className={isLoading ? "animate-spin" : ""} />
            </button>

            <button 
              onClick={toggleSortDirection}
              className={cn(
                "p-2 rounded-xl transition-all border flex items-center gap-2 px-3",
                (settings?.branch?.order_sort_direction || 'Descending') === 'Descending'
                  ? "bg-zamzam-teal/5 border-zamzam-teal/20 text-zamzam-teal hover:bg-zamzam-teal hover:text-white"
                  : "bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-500 hover:text-white"
              )}
              title={settings?.branch?.order_sort_direction === 'Descending' ? "Newest First (Descending)" : "Oldest First (Ascending)"}
            >
              {(settings?.branch?.order_sort_direction || 'Descending') === 'Descending' ? (
                <>
                  <ArrowDown size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Newest</span>
                </>
              ) : (
                <>
                  <ArrowUp size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Oldest</span>
                </>
              )}
            </button>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
          {STATUS_FILTERS.map((filter) => {
            const statusColor = getStatusColor(filter.id);
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
                    const origin = (o.origin || '').toLowerCase().trim();
                    if (f === 'website') return origin === 'website' || origin === 'web';
                    if (f === 'pending') return ['pending', 'ordered', 'paid'].includes(s);
                    return s === f;
                  }).length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-zamzam-teal rounded-full animate-spin mx-auto" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scanning live feed...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200 shadow-sm">
            <ClipboardList size={48} className="text-slate-200 mx-auto mb-4" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No orders found for this criteria</p>
          </div>
        ) : (
          (sortedOrders || []).map((order) => {
            if (!order) return null;
            const statusLower = (order.status || '').toLowerCase();
            return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={order.id}
              className="group bg-white hover:border-zamzam-teal/30 border border-slate-100 rounded-xl p-3 flex items-center transition-all shadow-sm hover:shadow-lg hover:shadow-slate-200/50"
            >
              {/* Quick Actions */}
              <div className="flex items-center gap-1.5 mr-4">
                {/* Settle Payment */}
                <button 
                  className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all border border-green-100 shadow-sm"
                  title="Settle Payment (Finalize Bill)"
                  onClick={() => {
                    setSelectedOrder(order);
                    setIsPaymentModalOpen(true);
                  }}
                >
                  <Banknote size={13} />
                </button>

                {/* Edit Order */}
                <button 
                  className="p-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-600 hover:text-white transition-all border border-blue-200 shadow-sm"
                  title="Edit Order (Modify Items)"
                  onClick={() => {
                    loadOrderIntoCart(order);
                    navigate('/orders');
                  }}
                >
                  <Pencil size={13} strokeWidth={2.5} />
                </button>

                {/* Print Receipt */}
                <button 
                  className="p-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-800 hover:text-white transition-all border border-slate-200 shadow-sm"
                  title="Print Invoice"
                  onClick={() => {
                    const filename = `ZK_Invoice_${order.order_number}`;
                    const printUrl = `${API_BASE_URL}/orders/${order.id}/pdf?filename=${filename}&mode=inline`;
                    window.open(printUrl, '_blank');
                  }}
                >
                  <Printer size={13} />
                </button>

                {/* Download PDF */}
                <button 
                  className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all border border-red-100 shadow-sm"
                  title="Download PDF Invoice"
                  onClick={() => {
                    const filename = `ZK_Invoice_${order.order_number}`;
                    const downloadUrl = `${API_BASE_URL}/orders/${order.id}/pdf?filename=${filename}`;
                    window.open(downloadUrl, '_blank');
                  }}
                >
                  <Download size={13} />
                </button>

                {/* Split Bill */}
                <button 
                  className="p-1.5 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-600 hover:text-white transition-all border border-orange-100 shadow-sm"
                  title="Split Bill"
                  onClick={() => {
                    setSelectedOrder(order);
                    setIsSplitModalOpen(true);
                  }}
                >
                  <Split size={13} />
                </button>

                {/* Merge Bill */}
                <button 
                  className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100 shadow-sm"
                  title="Merge Bill"
                  onClick={() => {
                    setSelectedOrder(order);
                    setIsMergeModalOpen(true);
                  }}
                >
                  <Merge size={13} />
                </button>

                {/* View Details */}
                <button 
                  className="p-1.5 bg-teal-50 text-zamzam-teal rounded-lg hover:bg-zamzam-teal hover:text-white transition-all border border-teal-100 shadow-sm"
                  title="View"
                  onClick={() => {
                    setSelectedOrder(order);
                    setIsModalOpen(true);
                  }}
                >
                  <Eye size={13} />
                </button>
              </div>

              {/* Order Identity - Minimal */}
              <div className="w-[120px]">
                <div className="text-sm font-black tracking-tight text-slate-900 mb-0.5">
                  #{(order.order_number || '').toString()}
                </div>
                <div className="flex flex-col gap-0.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  <div className="flex items-center gap-1">
                    <Clock size={10} className="text-zamzam-teal" />
                    {(() => {
                      const date = order.order_time || order.created_at;
                      if (!date) return 'N/A';
                      const d = new Date(date);
                      return isNaN(d.getTime()) ? 'N/A' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    })()}
                  </div>
                  <div className="flex items-center gap-1">
                    <LayoutGrid size={10} className="text-zamzam-teal" />
                    {order.items?.length || 0} Items
                  </div>
                </div>
              </div>

              {/* Badges - Strictly Aligned Columns */}
              <div className="flex-1 flex items-center gap-3 px-4 ml-4">
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
                  {(order.table_number || order.table_id) ? (
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
                      "flex items-center gap-1.5 px-2 py-1 border rounded-full w-full justify-center",
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
                    "flex items-center gap-1.5 px-2 py-1 border rounded-full w-full justify-center",
                    order.order_type === 'Dine-In' ? "bg-amber-50 border-amber-100 text-amber-600" : 
                    order.order_type === 'Delivery' ? "bg-purple-50 border-purple-100 text-purple-600" :
                    "bg-orange-50 border-orange-100 text-orange-600"
                  )}>
                    <Utensils size={10} className={cn(
                      order.order_type === 'Dine-In' ? "text-amber-500" : 
                      order.order_type === 'Delivery' ? "text-purple-500" :
                      "text-orange-500"
                    )} />
                    <span className="text-[9px] font-black uppercase tracking-widest leading-none">{order.order_type || 'Takeaway'}</span>
                  </div>
                </div>

                {/* 5. Staff Column */}
                <div className="w-[120px] shrink-0 flex justify-center">
                  {order.waiter_name ? (
                     <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-600 border border-indigo-700 text-white rounded-full w-full justify-center shadow-sm">
                       <Users size={10} strokeWidth={3} />
                       <span className="text-[9px] font-black uppercase tracking-widest leading-none truncate max-w-[80px]">{order.waiter_name}</span>
                     </div>
                  ) : <div className="w-full" />}
                </div>

                {/* 6. Payment Column */}
                <div className="w-[95px] shrink-0 flex justify-center">
                  <div className={cn(
                    "flex items-center gap-1.5 px-2 py-1 border rounded-full w-full justify-center shadow-sm transition-all",
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

              {/* Total Amount */}
              <div className="text-right ml-auto min-w-[100px]">
                <p className="text-sm font-black text-slate-900 tracking-tighter">
                  {currency} {parseFloat(order.total_amount || order.total || 0).toFixed(2)}
                </p>
              </div>
            </motion.div>
          );
        })
        )}
      </div>


      {/* Hidden Invoice for Printing */}
      <div id="invoice-print-area-wrapper" className="fixed top-[-9999px] left-0 print:static print:block">
        {selectedOrder && (
          <InvoiceDocument order={selectedOrder} currency={currency} />
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

      {isSplitModalOpen && selectedOrder && (
        <SplitBillModal 
          isOpen={true}
          onClose={() => setIsSplitModalOpen(false)}
          order={selectedOrder}
          currency={currency}
        />
      )}

      {isMergeModalOpen && selectedOrder && (
        <MergeBillModal 
          isOpen={true}
          onClose={() => setIsMergeModalOpen(false)}
          order={selectedOrder}
          otherOrders={orders.filter(o => o?.id !== selectedOrder?.id && o?.status !== 'Paid' && o?.status !== 'Cancelled')}
          currency={currency}
        />
      )}

      {isPaymentModalOpen && selectedOrder && (
        <PaymentModal 
          isOpen={true}
          onClose={() => setIsPaymentModalOpen(false)}
          order={selectedOrder}
          currency={currency}
          refreshOrders={fetchOrders}
        />
      )}
    </div>
  );
}

function PaymentModal({ isOpen, onClose, order, currency, refreshOrders }: any) {
  const [method, setMethod] = useState('Cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [reservationFee, setReservationFee] = useState(0);
  const [activeReservation, setActiveReservation] = useState<any>(null);

  useEffect(() => {
    if (isOpen && order && order.order_type === 'Dine-In') {
      const orderTableId = order.table_id?.toString();
      if (orderTableId) {
        const today = new Date().toISOString().split('T')[0];
        fetch(`${API_BASE_URL}/reservations?startDate=${today}&endDate=${today}`)
          .then(res => res.json())
          .then(data => {
            const tableRes = data.find((r: any) => 
              r.table_id?.toString() === orderTableId && 
              r.status === 'Seated'
            );
            if (tableRes && tableRes.booking_fee > 0) {
              setReservationFee(tableRes.booking_fee);
              setActiveReservation(tableRes);
            }
          });
      }
    }
  }, [isOpen, order]);


  if (!isOpen || !order) return null;

  const handleSettle = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'Paid',
          payment_method: method
        })
      });
      if (res.ok) {
        refreshOrders();
        onClose();
      }
    } catch (err) {
      console.error('Payment failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const methods = [
    { id: 'Cash', icon: Banknote, color: 'text-green-600', bg: 'bg-green-50' },
    { id: 'Card', icon: Circle, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'Digital', icon: ExternalLink, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 overflow-hidden" style={{ zIndex: 99999 }}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-zamzam-teal uppercase tracking-tight mb-3">Settle Payment</h3>
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Order #{order.order_number}</h2>
          </div>
          <button onClick={onClose} className="p-4 text-slate-400 hover:bg-slate-50 hover:text-slate-900 rounded-3xl transition-all border border-slate-100">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-8">
          <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 text-center space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Bill Amount</p>
            <p className="text-3xl font-black text-slate-900">{currency} {parseFloat(order.total_amount || 0).toFixed(2)}</p>
            
            {reservationFee > 0 && (
              <div className="flex flex-col items-center gap-1 pt-2 mt-2 border-t border-slate-200/50">
                <div className="flex items-center gap-2 text-zamzam-teal font-black text-[10px] uppercase tracking-widest bg-teal-50 px-3 py-1 rounded-full">
                  <ShieldCheck size={12} />
                  Reservation Credit: -{currency} {reservationFee.toFixed(2)}
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase italic">Paid by {activeReservation?.first_name || 'Guest'}</p>
                <div className="text-xl font-black text-slate-900 mt-2">
                  Balance Due: {currency} {(Math.max(0, parseFloat(order.total_amount || 0) - reservationFee)).toFixed(2)}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {methods.map((m) => (
              <button 
                key={m.id} onClick={() => setMethod(m.id)}
                className={cn(
                  "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all gap-2",
                  method === m.id ? "border-zamzam-teal bg-teal-50/50 shadow-sm" : "border-slate-100 hover:bg-slate-50"
                )}
              >
                <m.icon className={method === m.id ? 'text-zamzam-teal' : m.color} size={24} />
                <span className={cn("text-[10px] font-black uppercase tracking-widest", method === m.id ? "text-zamzam-teal" : "text-slate-500")}>{m.id}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-8 bg-slate-50/50 border-t border-slate-100">
          <button 
            onClick={handleSettle} disabled={isProcessing}
            className="w-full py-5 bg-zamzam-teal text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-teal-900/20 hover:bg-teal-600 transition-all flex items-center justify-center gap-3"
          >
            {isProcessing ? 'Processing...' : `Confirm ${method} Payment`}
            {reservationFee > 0 && isProcessing === false && (
              <span className="opacity-60 text-[8px] font-black italic">
                (Credit Applied)
              </span>
            )}
          </button>
        </div>
      </motion.div>
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
            <h3 className="text-lg font-black text-zamzam-teal uppercase tracking-tight mb-3">Order Review</h3>
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">#{order.order_number || order.id}</h2>
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
                    <span className="px-2.5 py-1 bg-zamzam-yellow text-zamzam-yellow-dark bg-opacity-10 text-[10px] font-black rounded-lg uppercase">x{item.quantity || 1}</span>
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

          <div className="space-y-3 mt-8">
            {parseFloat(order.discount_amount || 0) > 0 && (
              <div className="flex items-center justify-between px-6">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Applied Discounts</span>
                <span className="text-sm font-bold text-red-500">-{currency} {parseFloat(order.discount_amount || 0).toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between p-6 bg-slate-900 rounded-[2rem]">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Final Amount Paid</span>
              <span className="text-3xl font-black text-white tracking-tighter">
                {currency} {parseFloat(order.total_amount || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function SplitBillModal({ isOpen, onClose, order, currency }: any) {
  const [splitCount, setSplitCount] = useState(2);
  if (!isOpen || !order) return null;

  const total = parseFloat(order.total_amount || order.total || 0);
  const perPerson = total / (splitCount || 1);

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
        className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-zamzam-teal uppercase tracking-tight mb-3">Split Bill</h3>
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Order #{order.order_number}</h2>
          </div>
          <button onClick={onClose} className="p-3 text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-10">
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Total Bill Amount</span>
            <div className="text-2xl font-black text-slate-900">{currency} {total.toFixed(2)}</div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Split Between (Persons)</label>
            <div className="grid grid-cols-4 gap-3">
              {[2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  onClick={() => setSplitCount(num)}
                  className={cn(
                    "py-4 rounded-2xl font-black transition-all border-2",
                    splitCount === num ? "bg-zamzam-teal border-zamzam-teal text-white shadow-lg shadow-teal-900/20" : "bg-white border-slate-100 text-slate-400"
                  )}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-zamzam-teal/5 p-8 rounded-[2rem] border-2 border-dashed border-zamzam-teal/20 text-center relative overflow-hidden">
            <span className="text-[10px] font-black text-zamzam-teal uppercase tracking-[0.2em] mb-2 block">Each Person Pays</span>
            <div className="text-3xl font-black text-zamzam-teal tracking-tighter">
              {currency} {perPerson.toFixed(2)}
            </div>
          </div>

          <button onClick={onClose} className="w-full bg-zamzam-teal text-white font-black py-5 rounded-[1.5rem] shadow-xl shadow-teal-900/20 transition-all uppercase tracking-widest text-xs">
            Confirm Split & Print
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function MergeBillModal({ isOpen, onClose, order, otherOrders, currency }: any) {
  const [selectedToMerge, setSelectedToMerge] = useState<string[]>([]);
  if (!isOpen || !order) return null;

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
        className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-blue-600 uppercase tracking-tight mb-3">Merge Orders</h3>
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Primary #{order.order_number}</h2>
          </div>
          <button onClick={onClose} className="p-3 text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Select orders to merge with this one:</p>
          <div className="space-y-3">
            {(otherOrders || []).map((other: any) => (
              <button
                key={other.id}
                onClick={() => {
                  setSelectedToMerge(prev => 
                    prev.includes(other.id) ? prev.filter(id => id !== other.id) : [...prev, other.id]
                  );
                }}
                className={cn(
                  "w-full p-5 rounded-3xl border-2 transition-all flex items-center justify-between group",
                  selectedToMerge.includes(other.id) ? "bg-blue-50 border-blue-600 shadow-md" : "bg-white border-slate-100 hover:border-slate-200"
                )}
              >
                <div className="text-left">
                  <div className="text-sm font-black text-slate-900">Order #{other.order_number}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{other.customer_name || 'Counter'}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-blue-600">{currency} {parseFloat(other.total_amount || other.total || 0).toFixed(2)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-8 border-t border-slate-100">
          <button className="w-full bg-blue-600 text-white font-black py-5 rounded-[1.5rem] shadow-xl shadow-blue-900/20 transition-all uppercase tracking-[0.2em] text-xs">
            Combine & Merge Bills
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function InvoiceDocument({ order, currency }: any) {
  if (!order) return null;
  const totalAmount = parseFloat(order.total_amount || order.total || 0);

  return (
    <div className="bg-white p-16 font-sans text-slate-800 max-w-[800px] mx-auto" style={{ minHeight: '1000px' }}>
      <div className="flex justify-between items-start mb-12">
        <div className="space-y-4">
          <div className="w-32 h-32 bg-slate-900 rounded-3xl flex items-center justify-center p-4">
            <Utensils className="text-white w-full h-full" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase">Zamzam Kitchen</h1>
            <p className="text-[10px] text-slate-500 max-w-[250px]">
              329 Racecourse Rd, Kensington VIC 3031<br />
              Tel: 0399392479
            </p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-6xl font-black text-slate-800 tracking-tighter mb-4">INVOICE</h2>
          <p className="text-sm font-black">Order No: {order.order_number}</p>
        </div>
      </div>
      <table className="w-full border-collapse mb-12">
        <thead>
          <tr className="bg-blue-900 text-white text-left">
            <th className="p-4">Description</th>
            <th className="p-4 text-center">Qty</th>
            <th className="p-4 text-right">Price</th>
          </tr>
        </thead>
        <tbody>
          {(order.items || []).map((item: any, idx: number) => (
            <tr key={idx} className="border-b border-slate-100">
              <td className="p-4 text-sm font-bold">{item.name}</td>
              <td className="p-4 text-sm font-bold text-center">{item.quantity}</td>
              <td className="p-4 text-sm font-bold text-right">{currency} {(parseFloat(item.price || 0)).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-col items-end">
        <div className="text-3xl font-black text-blue-900">Total: {currency} {totalAmount.toFixed(2)}</div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden !important; }
          #invoice-print-area-wrapper, #invoice-print-area-wrapper * { visibility: visible !important; }
          #invoice-print-area-wrapper { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; display: block !important; }
        }
      `}} />
    </div>
  );
}
