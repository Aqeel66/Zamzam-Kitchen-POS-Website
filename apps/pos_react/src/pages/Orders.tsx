import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Trash2,
  Clock,
  Utensils,
  Minus,
  Plus,
  CreditCard,
  ChevronRight,
  X,
  Check,
  Filter,
  ChevronDown,
  ChefHat,
  ShoppingBag,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL, resolveImageUrl } from '../config';
import CheckoutModal from '../components/CheckoutModal';
import PrintSuccessModal from '../components/PrintSuccessModal';

const cn = (...inputs: (string | undefined | null | false)[]) => inputs.filter(Boolean).join(' ');

// categoryColors removed to satisfy build constraints

export default function Orders() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, loadOrderIntoCart, subtotal, tax, total, editingOrder } = useCart();
  const [menuData, setMenuData] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [activePaymentOrder, setActivePaymentOrder] = useState<any>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [guestCount, setGuestCount] = useState(1);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<any>(null);
  const [branchInfo, setBranchInfo] = useState<any>({});
  const [tables, setTables] = useState<any[]>([]);
  const [waiters, setWaiters] = useState<any[]>([]);
  const [orderType, setOrderType] = useState<'Dine-In' | 'Takeaway' | 'Delivery'>('Dine-In');
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [selectedWaiter, setSelectedWaiter] = useState<any>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showCustomerResults, setShowCustomerResults] = useState(false);

  // Item Selection Modal State
  const [selectedMenuItem, setSelectedMenuItem] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [selectedExtras, setSelectedExtras] = useState<any[]>([]);

  const handleItemClick = (item: any) => {
    if ((item.variants && item.variants.length > 0) || (item.extras && item.extras.length > 0)) {
      setSelectedMenuItem(item);
      setSelectedVariant(null);
      setSelectedExtras([]);
    } else {
      addToCart(item);
    }
  };

  const handleConfirmSelection = () => {
    if (!selectedMenuItem) return;
    addToCart(selectedMenuItem, selectedVariant, selectedExtras);
    setSelectedMenuItem(null);
    setSelectedVariant(null);
    setSelectedExtras([]);
  };

  const handleToggleExtra = (extra: any) => {
    setSelectedExtras(prev => {
      const exists = prev.find(e => e.id === extra.id);
      if (exists) return prev.filter(e => e.id !== extra.id);
      return [...prev, extra];
    });
  };

  // --- DATA SYNC ---
  const [isMenuFetching, setIsMenuFetching] = useState(false);
  const fetchMenu = async () => {
    if (isMenuFetching) return;
    setIsMenuFetching(true);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(`${API_BASE_URL}/menu?t=${Date.now()}`, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMenuData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('POS Menu Fetch Error:', err);
      setMenuData([]);
    } finally {
      setIsLoading(false);
      setIsMenuFetching(false);
      clearTimeout(timeoutId);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/settings?t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBranchInfo({ ...(data?.tenant || {}), ...(data?.branch || {}) });
    } catch (err) {
      console.error('POS Settings Fetch Error:', err);
    }
  };

  const getLocalTodayAndTime = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localDateStr = new Date(now.getTime() - offset).toISOString().split('T')[0];
    const localTimeStr = new Date(now.getTime() - offset).toISOString().split('T')[1].substring(0, 8);
    return { localDate: localDateStr, localTime: localTimeStr };
  };

  const fetchTablesAndWaiters = async () => {
    try {
      const { localDate, localTime } = getLocalTodayAndTime();
      const [tablesRes, usersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/reservations/available-tables?date=${localDate}&time=${localTime}`),
        fetch(`${API_BASE_URL}/users`)
      ]);
      const tablesJson = await tablesRes.json();
      const usersData = await usersRes.json();
      
      const tablesData = tablesJson?.success && Array.isArray(tablesJson.tables) 
        ? tablesJson.tables 
        : (Array.isArray(tablesJson) ? tablesJson : []);

      setTables(tablesData);
      const waiterUsers = (usersData || []).filter((u: any) => {
        const userRoles = typeof u.roles === 'string' ? u.roles.split(',').map((r: any) => r.trim()) : [];
        return userRoles.includes('Waiter');
      });
      setWaiters(waiterUsers);
    } catch (err) {
      console.error('Error fetching tables/waiters:', err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/customers`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('POS Customers Fetch Error:', err);
    }
  };

  useEffect(() => {
    fetchMenu();
    fetchSettings();
    fetchTablesAndWaiters();
    fetchCustomers();
    // ... rest of useEffect
    window.addEventListener('settings-updated', fetchSettings);
    return () => window.removeEventListener('settings-updated', fetchSettings);
  }, []);

  // Update default order type based on settings
  useEffect(() => {
    if (branchInfo) {
      if (branchInfo.allow_dinein !== 0) setOrderType('Dine-In');
      else if (branchInfo.allow_pickup === 1) setOrderType('Takeaway');
      else if (branchInfo.allow_delivery === 1) setOrderType('Delivery');
    }
  }, [branchInfo]);

  // Refetch tables with dynamic seat capacities and availability when switching to Dine-In
  useEffect(() => {
    if (orderType === 'Dine-In') {
      fetchTablesAndWaiters();
    }
  }, [orderType]);

  // Handle navigation state (e.g. from Reservations or paying an existing order)
  useEffect(() => {
    if (!location.state) return;

    // 1. Auto-open checkout for payment
    if (location.state.autoCheckout && location.state.orderToPay) {
      setActivePaymentOrder(location.state.orderToPay);
      setIsCheckoutOpen(true);
    }

    // 2. Load metadata for a new order (e.g. from Seat Guest)
    if (location.state.customer_name) {
      setCustomerSearch(location.state.customer_name);
    }
    if (location.state.guest_count) {
      setGuestCount(Number(location.state.guest_count));
    }
    if (location.state.table_id && tables.length > 0) {
      const tbl = tables.find(t => Number(t.id) === Number(location.state.table_id));
      if (tbl) setSelectedTable(tbl);
    }

    // Clear state once consumed to prevent repeated logic on re-renders
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, navigate, location.pathname, tables]);

  // Sync metadata when editing an order
  useEffect(() => {
    if (editingOrder) {
      if (editingOrder.order_type) setOrderType(editingOrder.order_type);
      
      // Sync Table
      if (editingOrder.table_id && tables.length > 0) {
        const tbl = tables.find(t => Number(t.id) === Number(editingOrder.table_id));
        if (tbl) setSelectedTable(tbl);
      }
      
      // Sync Waiter
      if (editingOrder.waiter_id && waiters.length > 0) {
        const wtr = waiters.find(w => Number(w.id) === Number(editingOrder.waiter_id));
        if (wtr) setSelectedWaiter(wtr);
      }

      // Sync Customer
      if (editingOrder.customer_id && customers.length > 0) {
        const cust = customers.find(c => Number(c.id) === Number(editingOrder.customer_id));
        if (cust) {
          setSelectedCustomer(cust);
          setCustomerSearch(`${cust.first_name} ${cust.last_name}`);
        }
      } else if (editingOrder.customer_name) {
        setCustomerSearch(editingOrder.customer_name);
        if (editingOrder.customer_name === 'Guest') {
          setSelectedCustomer(null);
        }
      }
    }
  }, [editingOrder, tables, waiters, customers]);

  const categories = useMemo(() => {
    if (!Array.isArray(menuData)) return ["All"];
    const cats = menuData
      .filter(cat => cat && typeof cat.name === 'string')
      .map(cat => cat.name);
    return ["All", ...cats];
  }, [menuData]);

  const displayedItems = useMemo(() => {
    if (!Array.isArray(menuData)) return [];

    return menuData
      .filter(cat => {
        if (!cat) return false;
        // If there's a search query, ignore category filtering to search globally
        if (searchQuery.trim()) return true;
        return activeCategory === 'All' || activeCategory === cat.name;
      })
      .flatMap(cat => {
        const items = Array.isArray(cat.items) ? cat.items : [];
        return items
          .filter((item: any) => item && typeof item.name === 'string')
          .map((item: any) => ({ ...item, category: cat.name }));
      })
      .filter(item => {
        const query = (searchQuery || '').toLowerCase().trim();
        if (!query) return true;
        return item.name.toLowerCase().includes(query) || 
               (item.category && item.category.toLowerCase().includes(query));
      });
  }, [menuData, activeCategory, searchQuery]);

  const validateOrder = () => {
    if (!orderType) {
      alert('Please select an Order Type.');
      return false;
    }
    if (orderType === 'Dine-In') {
      if (!selectedTable) {
        alert('Table Selection Required: Please select a table for Dine-In.');
        return false;
      }
      if (!selectedWaiter) {
        alert('Waiter Assignment Required: Please assign a waiter for this Dine-In order.');
        return false;
      }
      if (!customerSearch.trim()) {
        alert('Customer Detail Required: Please search for a customer or select "Guest".');
        return false;
      }
    }
    return true;
  };

  const handlePlaceOrder = async (checkoutData: any) => {
    // If paying for an existing order outside the cart, or a new order in the cart
    if (!activePaymentOrder && cart.length === 0) return;
    
    setIsSubmitting(true);
    try {
      const targetOrder = activePaymentOrder || editingOrder;
      const method = targetOrder ? 'PATCH' : 'POST';
      const url = targetOrder ? `${API_BASE_URL}/orders/${targetOrder.id}` : `${API_BASE_URL}/orders`;

      // Build payload
      const orderPayload: any = {
        total: Number(checkoutData.total_amount),
        discount_amount: Number(checkoutData.discount_amount),
        promo_id: checkoutData.promo_id,
        payment_method: checkoutData.payment_method,
        guest_count: Number(guestCount || 1),
        status: checkoutData.payment_method ? 'Paid' : 'Ordered',
        user_id: user?.id || 1,
        branch_id: branchInfo?.branch_id || 1
      };

      if (activePaymentOrder) {
        // REQUIREMENT: Quick Pay for existing order
        orderPayload.order_type = activePaymentOrder.order_type;
        orderPayload.items = activePaymentOrder.items;
        orderPayload.table_id = selectedTable?.id || activePaymentOrder.table_id;
        orderPayload.waiter_id = selectedWaiter?.id || activePaymentOrder.waiter_id;
        orderPayload.customer_id = selectedCustomer?.id || activePaymentOrder.customer_id;
        
        const selectionName = selectedCustomer ? `${selectedCustomer.first_name || ''} ${selectedCustomer.last_name || ''}`.trim() : null;
        const searchName = customerSearch && !['', 'Walk-in Guest'].includes(customerSearch.trim()) ? customerSearch.trim() : null;
        orderPayload.customer_name = (selectionName || searchName || activePaymentOrder.customer_name || 'Guest').trim();
        orderPayload.customer_phone = selectedCustomer?.phone || activePaymentOrder.customer_phone || null;
      } else {
        // Standard checkout for new or editing order in cart
        orderPayload.items = cart.map(item => ({
          id: item.id,
          name: item.name,
          price: Number(item.price),
          quantity: Number(item.quantity),
          notes: item.notes || '',
          variant: item.variant,
          extras: item.extras
        }));
        orderPayload.order_type = orderType;
        orderPayload.table_id = selectedTable?.id || null;
        orderPayload.waiter_id = selectedWaiter?.id || null;
        orderPayload.waiter_name = selectedWaiter ? `${selectedWaiter.first_name} ${selectedWaiter.last_name}` : null;
        orderPayload.customer_id = selectedCustomer?.id || null;
        
        const selectionName = selectedCustomer ? `${selectedCustomer.first_name || ''} ${selectedCustomer.last_name || ''}`.trim() : null;
        const searchName = customerSearch && !['', 'Walk-in Guest'].includes(customerSearch.trim()) ? customerSearch.trim() : null;
        orderPayload.customer_name = (selectionName || searchName || 'Guest').trim();
        orderPayload.customer_phone = selectedCustomer?.phone || null;
        
        orderPayload.origin = 'In-Store';
      }

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      if (response.ok) {
        let result = {};
        try {
          result = await response.json();
        } catch (e) {
          console.warn('Response was OK but body could not be parsed as JSON');
        }

        const currentOrder = activePaymentOrder || editingOrder;
        setLastPlacedOrder({
          id: (result as any).orderId || currentOrder?.id,
          orderNumber: (result as any).orderNumber || currentOrder?.order_number || '---',
          order_time: new Date().toISOString(),
          items: activePaymentOrder ? activePaymentOrder.items : [...cart],
          total_amount: Number(checkoutData.total_amount),
          discount_amount: Number(checkoutData.discount_amount),
          promo_discount: Number(checkoutData.promo_discount || 0),
          manual_discount: Number(checkoutData.manual_discount || 0),
          reservation_fee: Number(checkoutData.reservation_fee || 0),
          tip_amount: Number(checkoutData.tip_amount || 0),
          order_type: activePaymentOrder ? activePaymentOrder.order_type : orderType,
          table_id: activePaymentOrder ? activePaymentOrder.table_id : selectedTable?.id,
          waiter_name: activePaymentOrder 
            ? activePaymentOrder.waiter_name 
            : (selectedWaiter ? `${selectedWaiter.first_name} ${selectedWaiter.last_name}` : null),
          table_number: activePaymentOrder ? activePaymentOrder.table_number : selectedTable?.table_number
        });
        
        setIsCheckoutOpen(false);
        setActivePaymentOrder(null);
        if (!activePaymentOrder) clearCart();
        
        // Reset local state for the next order
        setCustomerSearch('');
        setSelectedCustomer(null);
        setSelectedTable(null);
        setSelectedWaiter(null);
        setGuestCount(1);
        
        if (!activePaymentOrder) {
          setIsPrintModalOpen(true);
        }
      } else {
        const errorText = await response.text();
        console.error('Submission Error:', errorText);
        alert(`Submission Failed: ${errorText || 'Server Error'}`);
      }
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSendToKitchen = async () => {
    if (cart.length === 0) return;
    if (!validateOrder()) return;
    
    setIsSubmitting(true);
    try {
      const url = editingOrder 
        ? `${API_BASE_URL}/orders/${editingOrder.id}`
        : `${API_BASE_URL}/orders`;
      
      const method = editingOrder ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            notes: item.notes || '',
            variant: item.variant,
            extras: item.extras
          })),
          total: total,
          discount_amount: editingOrder?.discount_amount || 0,
          order_type: orderType,
          status: 'Ordered',
          origin: 'In-Store',
          user_id: user?.id || 1,
          branch_id: branchInfo?.branch_id || 1,
          table_id: selectedTable?.id || editingOrder?.table_id || null,
          waiter_id: selectedWaiter?.id || editingOrder?.waiter_id || null,
          waiter_name: selectedWaiter ? `${selectedWaiter.first_name} ${selectedWaiter.last_name}` : (editingOrder?.waiter_name || null),
          customer_id: selectedCustomer?.id || null,
          customer_name: customerSearch.trim() || 'Guest',
          customer_phone: selectedCustomer?.phone || null,
          guest_count: Number(guestCount || 1),
        })
      });

      if (response.ok) {
        const result = await response.json();
        setLastPlacedOrder({
          id: result.orderId || editingOrder?.id,
          orderNumber: result.orderNumber || editingOrder?.order_number,
          order_time: new Date().toISOString(),
          items: cart,
          total_amount: total,
          order_type: editingOrder?.order_type || 'Takeaway'
        });
        clearCart();
        setIsPrintModalOpen(true);
        // Dispatch event to refresh KDS count in layout
        window.dispatchEvent(new CustomEvent('settings-updated'));
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.message || 'Failed to send to kitchen'}`);
      }
    } catch (err) {
      console.error('Quick send failed:', err);
      alert('Failed to connect to server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryCounts = useMemo(() => {
    if (!Array.isArray(menuData)) return { All: 0 };
    const counts: Record<string, number> = { All: 0 };
    let total = 0;
    menuData.forEach(cat => {
      if (cat && typeof cat.name === 'string') {
        const count = Array.isArray(cat.items) ? cat.items.length : 0;
        counts[cat.name] = count;
        total += count;
      }
    });
    counts.All = total;
    return counts;
  }, [menuData]);

  return (
    <div className="h-full flex overflow-hidden bg-slate-50/50">
      {/* Center Area: Search & Grid */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="p-3 bg-white/50 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-xl group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-zamzam-teal transition-colors" size={14} />
              <input
                type="text"
                placeholder="Search food, drinks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-bold shadow-sm focus:ring-2 focus:ring-zamzam-teal/5 focus:border-zamzam-teal outline-none transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="relative hidden md:block">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                <select
                  value={activeCategory}
                  onChange={(e) => setActiveCategory(e.target.value)}
                  className="appearance-none bg-white border border-slate-200 rounded-xl pl-8 pr-8 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-600 outline-none focus:border-zamzam-teal transition-all shadow-sm cursor-pointer"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat} ({categoryCounts[cat] ?? 0})
                    </option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              <div className="h-7 px-3 bg-white border border-slate-200 rounded-lg flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <Clock size={12} className="text-zamzam-teal" />
                <span>12:45 PM</span>
              </div>
            </div>
          </div>
          {/* Horizontal Category Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-200",
                  activeCategory === cat
                    ? "bg-zamzam-teal text-white shadow-md shadow-teal-500/20 scale-105"
                    : "bg-white border border-slate-200 text-slate-600 hover:border-zamzam-teal/40 hover:text-zamzam-teal"
                )}
              >
                {cat}
                <span className={cn(
                  "text-[8px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none",
                  activeCategory === cat
                    ? "bg-white/25 text-white"
                    : "bg-slate-100 text-slate-500"
                )}>
                  {categoryCounts[cat] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-zamzam-teal rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
              <AnimatePresence mode="popLayout">
                {displayedItems.map((item) => (
                  <motion.div
                    layout
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => handleItemClick(item)}
                    className="group bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-zamzam-teal/30 transition-all cursor-pointer overflow-hidden"
                  >
                    <div className="relative aspect-square overflow-hidden bg-white">
                      <img
                        src={resolveImageUrl(item.image) || '/placeholder.png'}
                        alt={item.name}
                        className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform duration-300"
                        style={{ mixBlendMode: 'multiply' }}
                      />
                      <div className="absolute top-0 right-0 z-10">
                        <span className="bg-zamzam-teal text-white text-[8px] font-bold px-1.5 py-0.5 rounded-bl-lg shadow flex items-center gap-0.5">
                          <span className="text-[7px] font-bold opacity-80">{branchInfo?.currency || 'USD'}</span>
                          {item.sale_price && parseFloat(item.sale_price) > 0 ? (
                            <span className="flex items-center gap-1">
                              {parseFloat(item.sale_price).toFixed(2)}
                              <span className="line-through opacity-50 text-[6px]">{parseFloat(item.price).toFixed(2)}</span>
                            </span>
                          ) : (
                            parseFloat(item.price).toFixed(2)
                          )}
                        </span>
                      </div>
                      {((item.variants && item.variants.length > 0) || (item.extras && item.extras.length > 0)) && (
                        <div className="absolute bottom-0 right-0 z-10 bg-zamzam-yellow text-slate-900 text-[8px] font-bold px-2 py-0.5 rounded-tl-lg shadow-sm">
                          OPTIONS
                        </div>
                      )}
                    </div>
                    <div className="px-2 py-1.5 border-t border-slate-50">
                      <h3 className="text-[9px] font-bold text-slate-900 leading-tight truncate group-hover:text-zamzam-teal transition-colors">
                        {item.name}
                      </h3>
                      <p className="text-[7px] font-semibold text-slate-400 uppercase tracking-widest truncate mt-0.5">
                        {item.category}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>

      {/* Right Sidebar: Cart */}
      <aside className="w-[300px] bg-white border-l border-slate-200 flex flex-col z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
        <div className="p-3 border-b border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight uppercase leading-none">Current Order</h2>
            <div className={cn(
              "px-2 py-0.5 rounded-full text-[8px] font-bold tracking-widest uppercase flex items-center gap-1.5",
              editingOrder ? "bg-blue-50 text-blue-600" : "bg-zamzam-teal/10 text-zamzam-teal"
            )}>
              {editingOrder ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                  Editing #{editingOrder.order_number}
                  {editingOrder.order_type === 'Dine-In' && (
                    <span className="mx-1 opacity-70">• Table {editingOrder.table_number || editingOrder.table_id} {editingOrder.waiter_name ? `• ${editingOrder.waiter_name}` : ''}</span>
                  )}
                  <span className="mx-1">• {editingOrder.status}</span>
                </>
              ) : 'New Session'}
            </div>
            <button
              onClick={clearCart}
              className="p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-all"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* New Order Controls Section */}
        <div className="px-2.5 py-2.5 border-b border-slate-100 bg-slate-50/30 space-y-2">
          {/* Order Type Toggle */}
          <div className={cn(
            "grid gap-2",
            [1, branchInfo?.allow_pickup, branchInfo?.allow_delivery].filter(x => x === 1).length > 2 ? "grid-cols-3" : "grid-cols-2"
          )}>
            <button
              onClick={() => setOrderType('Dine-In')}
              className={cn(
                "flex items-center justify-center gap-1.5 py-3 rounded-xl border-2 transition-all",
                orderType === 'Dine-In'
                  ? "bg-zamzam-teal border-zamzam-teal text-white shadow-md shadow-teal-500/20"
                  : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
              )}
            >
              <Utensils size={14} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Dine-In</span>
            </button>
            
            {branchInfo?.allow_pickup === 1 && (
              <button
                onClick={() => setOrderType('Takeaway')}
                className={cn(
                  "flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all",
                  orderType === 'Takeaway'
                    ? "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/20"
                    : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                )}
              >
                <ShoppingBag size={14} className={cn(orderType === 'Takeaway' && "animate-bounce")} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Takeaway</span>
              </button>
            )}

            {branchInfo?.allow_delivery === 1 && (
              <button
                onClick={() => setOrderType('Delivery')}
                className={cn(
                  "flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all",
                  orderType === 'Delivery'
                    ? "bg-amber-600 border-amber-600 text-white shadow-md shadow-amber-600/20"
                    : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                )}
              >
                <ShoppingBag size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Delivery</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {selectedTable ? (
              <div className="group relative w-full h-[28px] flex items-center justify-between bg-zamzam-teal/5 border border-zamzam-teal/20 rounded-lg px-2.5 text-[9px] font-bold text-slate-700 shadow-sm transition-all hover:bg-zamzam-teal/10 cursor-pointer">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Utensils size={9} className="text-zamzam-teal flex-shrink-0 animate-pulse" />
                  <span className="truncate text-slate-800">
                    T-{selectedTable.table_number} ({guestCount} {guestCount === 1 ? 'Seat' : 'Seats'})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTable(null);
                    setGuestCount(1);
                  }}
                  className="text-slate-400 hover:text-rose-500 transition-colors flex-shrink-0 ml-1"
                  title="Change Table"
                >
                  <X size={8} className="stroke-[2.5]" />
                </button>

                {/* Popover / Hover details card */}
                <div className="absolute left-0 top-full mt-1.5 w-[200px] hidden group-hover:block z-50 p-2.5 bg-white border border-slate-200 rounded-xl shadow-xl space-y-1.5 pointer-events-auto">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Table Selection Details</span>
                    <span className="text-[9px] font-black text-zamzam-teal bg-zamzam-teal/5 px-1.5 py-0.5 rounded-full">
                      T-{selectedTable.table_number}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1 text-[8px] font-bold text-slate-700 uppercase tracking-tight">
                    <div className="bg-slate-50 border border-slate-100 p-1 rounded-md flex flex-col items-center text-center">
                      <span className="text-slate-400 text-[6px] uppercase tracking-wider mb-0.5">Capacity</span>
                      <span className="text-slate-900">{selectedTable.capacity} Guests</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-1 rounded-md flex flex-col items-center text-center">
                      <span className="text-slate-400 text-[6px] uppercase tracking-wider mb-0.5">Available</span>
                      <span className="text-zamzam-teal">{selectedTable.balance_seats !== undefined ? selectedTable.balance_seats : selectedTable.capacity} Seats</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Guests/Seats:</span>
                    <select
                      value={guestCount}
                      onChange={(e) => setGuestCount(Number(e.target.value))}
                      className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[8px] font-bold text-slate-800 outline-none focus:border-zamzam-teal cursor-pointer shadow-sm"
                    >
                      {Array.from(
                        { length: Math.max(1, selectedTable.balance_seats !== undefined ? selectedTable.balance_seats : selectedTable.capacity) }, 
                        (_, i) => i + 1
                      ).map(num => (
                        <option key={num} value={num}>
                          {num} {num === 1 ? 'Guest' : 'Guests'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedTable?.id || ''}
                  onChange={(e) => {
                    const table = tables.find(t => t.id === Number(e.target.value));
                    setSelectedTable(table || null);
                    setGuestCount(1); // Reset guest count selection when table changes
                  }}
                  className="w-full appearance-none bg-white border border-slate-200 rounded-lg pl-7 pr-2 py-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-600 outline-none focus:border-zamzam-teal transition-all shadow-sm cursor-pointer"
                >
                  <option value="">Table</option>
                  {tables.map(t => (
                    <option key={t.id} value={t.id}>
                      T {t.table_number} (Cap: {t.capacity} | Free: {t.balance_seats !== undefined ? t.balance_seats : t.capacity})
                    </option>
                  ))}
                </select>
                <Utensils size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            )}

            <div className="relative">
              <select
                value={selectedWaiter?.id || ''}
                onChange={(e) => {
                  const waiter = waiters.find(w => w.id === Number(e.target.value));
                  setSelectedWaiter(waiter || null);
                }}
                className="w-full appearance-none bg-white border border-slate-200 rounded-lg pl-7 pr-2 py-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-600 outline-none focus:border-zamzam-teal transition-all shadow-sm cursor-pointer"
              >
                <option value="">Waiter</option>
                {waiters.map(w => (
                  <option key={w.id} value={w.id}>{w.first_name}</option>
                ))}
              </select>
              <Users size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Customer Selection Box */}
          <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">Select Customer (Loyalty)</span>
              <button 
                onClick={() => {
                  setCustomerSearch('Walk-in Guest');
                  setSelectedCustomer(null);
                  setShowCustomerResults(false);
                }}
                className="text-[8px] font-bold text-zamzam-teal uppercase tracking-wider hover:underline"
              >
                Select Guest
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" size={12} />
              <input 
                type="text"
                placeholder="Search by Name or Phone..."
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setShowCustomerResults(true);
                  if (!e.target.value) setSelectedCustomer(null);
                }}
                onFocus={() => setShowCustomerResults(true)}
                className="w-full bg-slate-50 border-none rounded-lg py-2 pl-8 pr-3 text-[10px] font-semibold text-slate-600 placeholder:text-slate-300 focus:ring-1 focus:ring-zamzam-teal/20 outline-none"
              />
              
              {showCustomerResults && customerSearch.trim().length > 0 && !selectedCustomer && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl z-50 max-h-40 overflow-y-auto">
                  {customers
                    .filter(c => {
                      const q = customerSearch.toLowerCase();
                      return (c.first_name + ' ' + c.last_name).toLowerCase().includes(q) || 
                             (c.phone && c.phone.includes(q)) ||
                             (c.email && c.email.toLowerCase().includes(q));
                    })
                    .slice(0, 5)
                    .map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomer(c);
                          setCustomerSearch(`${c.first_name} ${c.last_name}`);
                          setShowCustomerResults(false);
                        }}
                        className="w-full text-left p-2 hover:bg-slate-50 border-b border-slate-50 last:border-none flex flex-col"
                      >
                        <span className="text-[10px] font-bold text-slate-700">{c.first_name} {c.last_name}</span>
                        <span className="text-[8px] text-slate-400">{c.phone || c.email || 'No contact info'}</span>
                      </button>
                    ))
                  }
                  {customers.filter(c => {
                      const q = customerSearch.toLowerCase();
                      return (c.first_name + ' ' + c.last_name).toLowerCase().includes(q) || 
                             (c.phone && c.phone.includes(q));
                    }).length === 0 && (
                    <div className="p-3 text-center">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">No customer found</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            {selectedCustomer && (
              <div className="mt-2 flex items-center justify-between bg-zamzam-teal/5 border border-zamzam-teal/20 rounded-lg p-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-zamzam-teal text-white flex items-center justify-center text-[8px] font-bold uppercase">
                    {(selectedCustomer.first_name || 'G')[0]}{(selectedCustomer.last_name || '')[0] || ''}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-700 leading-none">{selectedCustomer.first_name} {selectedCustomer.last_name}</span>
                    <span className="text-[7px] text-slate-400 font-medium">{selectedCustomer.phone || 'No phone'}</span>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerSearch('');
                  }}
                  className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          <AnimatePresence mode="popLayout">
            {cart.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center text-center p-6"
              >
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100">
                  <Utensils size={22} className="text-slate-200" />
                </div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cart is empty</h4>
                <p className="text-[10px] font-semibold text-slate-300 mt-1">Select items to start an order.</p>
              </motion.div>
            ) : (
              cart.map((item) => (
                <motion.div
                  layout
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  key={item.cartItemId}
                  className="flex items-start gap-2.5 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 relative group"
                >
                  <img
                    src={resolveImageUrl(item.image) || '/placeholder.png'}
                    className="w-10 h-10 rounded-lg object-cover shadow-sm shrink-0 mt-1"
                  />
                  <div className="flex-1 min-w-0 pr-6">
                    <h4 className="text-[10px] font-bold text-slate-900 truncate uppercase">{item.name}</h4>
                    {item.variant && (
                      <p className="text-[8px] font-semibold text-slate-500 uppercase mt-0.5">Var: {item.variant.name}</p>
                    )}
                    {item.extras && item.extras.length > 0 && (
                      <p className="text-[8px] font-medium text-slate-400 uppercase truncate mt-0.5">
                        + {item.extras.map((e: any) => e.name).join(', ')}
                      </p>
                    )}
                    <p className="text-[9px] font-bold text-zamzam-teal mt-0.5">{branchInfo?.currency || 'USD'} {(item.price * item.quantity).toFixed(2)}</p>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.cartItemId)}
                    className="absolute top-1.5 right-1.5 p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 rounded-md transition-all opacity-0 group-hover:opacity-100"
                  >
                    <X size={12} />
                  </button>

                  <div className="absolute bottom-2 right-2 flex items-center gap-0.5 bg-white border border-slate-200 p-0.5 rounded-lg shadow-sm">
                    <button
                      onClick={() => updateQuantity(item.cartItemId, -1)}
                      disabled={editingOrder?.status === 'Preparing' && editingOrder.items?.some((i: any) => i.id === item.id)}
                      className={cn(
                        "p-1 transition-colors",
                        editingOrder?.status === 'Preparing' && editingOrder.items?.some((i: any) => i.id === item.id)
                          ? "text-slate-200 cursor-not-allowed"
                          : "text-slate-400 hover:text-zamzam-teal"
                      )}
                    >
                      <Minus size={10} />
                    </button>
                    <span className="w-5 text-center text-[10px] font-bold text-slate-900">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.cartItemId, 1)}
                      className="p-1 text-slate-400 hover:text-zamzam-teal transition-colors"
                    >
                      <Plus size={10} />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        <div className="p-4 bg-slate-50/80 border-t border-slate-200 space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              <span>Subtotal</span>
              <span className="text-slate-900">{branchInfo?.currency || 'USD'} {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              <span>Tax (10%)</span>
              <span className="text-slate-900">{branchInfo?.currency || 'USD'} {tax.toFixed(2)}</span>
            </div>
            <div className="h-px bg-slate-200 my-1" />
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-widest">Total</span>
              <span className="text-sm font-bold text-zamzam-teal">{branchInfo?.currency || 'USD'} {total.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button className="flex flex-col items-center justify-center p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-zamzam-teal hover:border-zamzam-teal/30 transition-all">
              <Clock size={14} className="mb-0.5" />
              <span className="text-[8px] font-bold uppercase tracking-widest">On Hold</span>
            </button>
            <button
              onClick={() => clearCart()}
              className="flex flex-col items-center justify-center p-2.5 bg-red-50 border border-red-100 rounded-xl text-red-400 hover:bg-red-600 hover:text-white transition-all group"
            >
              <Trash2 size={14} className="mb-0.5 transition-transform group-hover:scale-110" />
              <span className="text-[8px] font-bold uppercase tracking-widest">Clear Cart</span>
            </button>
          </div>

          <button
            disabled={cart.length === 0 || isSubmitting}
            onClick={() => handleSendToKitchen()}
            className={cn(
              "w-full font-bold py-3 rounded-xl bg-zamzam-teal hover:bg-teal-700 text-white shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2 group active:scale-95",
              (cart.length === 0 || isSubmitting) && "opacity-50 grayscale pointer-events-none"
            )}
          >
            <ChefHat size={16} className="group-hover:rotate-12 transition-transform" />
            <span className="text-xs uppercase tracking-widest font-bold">Send to KDS</span>
          </button>

          <button
            disabled={cart.length === 0 || isSubmitting}
            onClick={() => {
              if (validateOrder()) setIsCheckoutOpen(true);
            }}
            className={cn(
              "w-full font-bold py-2.5 rounded-xl shadow-lg flex items-center justify-center gap-2 group active:scale-95 transition-all",
              editingOrder
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                : "bg-zamzam-yellow hover:bg-yellow-400 text-slate-900 shadow-yellow-500/20",
              (cart.length === 0 || isSubmitting) && "bg-slate-200 text-slate-400 shadow-none pointer-events-none"
            )}
          >
            <span className="text-xs uppercase tracking-tight">
              {editingOrder ? 'Update Order' : 'Checkout Order'}
            </span>
            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </aside>

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => {
          setIsCheckoutOpen(false);
          setActivePaymentOrder(null);
        }}
        onConfirm={handlePlaceOrder}
        subtotal={activePaymentOrder 
          ? (Number(activePaymentOrder.total_amount || 0) + Number(activePaymentOrder.discount_amount || 0) - Number(activePaymentOrder.tip_amount || 0)) 
          : (editingOrder ? (Number(editingOrder.total_amount || 0) + Number(editingOrder.discount_amount || 0) - Number(editingOrder.tip_amount || 0)) : subtotal)}
        tax={activePaymentOrder ? 0 : (editingOrder ? 0 : tax)}
        total={activePaymentOrder 
          ? (Number(activePaymentOrder.total_amount || 0) + Number(activePaymentOrder.discount_amount || 0)) 
          : (editingOrder ? (Number(editingOrder.total_amount || 0) + Number(editingOrder.discount_amount || 0)) : total)}
        isSubmitting={isSubmitting}
        initialDiscount={Number(activePaymentOrder?.discount_amount || editingOrder?.discount_amount || 0)}
        initialTip={Number(activePaymentOrder?.tip_amount || editingOrder?.tip_amount || 0)}
      />

      <PrintSuccessModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        order={lastPlacedOrder}
        branch={branchInfo}
      />

      {/* Item Options Modal */}
      <AnimatePresence>
        {selectedMenuItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setSelectedMenuItem(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-4">
                <img
                  src={resolveImageUrl(selectedMenuItem.image) || '/placeholder.png'}
                  className="w-16 h-16 rounded-xl object-cover shadow-sm"
                  alt={selectedMenuItem.name}
                />
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">{selectedMenuItem.name}</h2>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-zamzam-teal">
                      {branchInfo?.currency || 'USD'} {' '}
                      {selectedMenuItem.sale_price && parseFloat(selectedMenuItem.sale_price) > 0
                        ? parseFloat(selectedMenuItem.sale_price).toFixed(2)
                        : parseFloat(selectedMenuItem.price).toFixed(2)}
                      {' '} Base
                    </p>
                    {selectedMenuItem.sale_price && parseFloat(selectedMenuItem.sale_price) > 0 && (
                      <p className="text-[10px] font-bold text-slate-400 line-through">
                        {branchInfo?.currency || 'USD'} {parseFloat(selectedMenuItem.price).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMenuItem(null)}
                  className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Variants */}
                {selectedMenuItem.variants && selectedMenuItem.variants.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-zamzam-teal" /> Choose Variant
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedMenuItem.variants.map((v: any) => {
                        const sPrice = v.sale_price_offset !== undefined && v.sale_price_offset !== null ? v.sale_price_offset : v.sale_price_adjustment;
                        const hasSale = sPrice !== null && parseFloat(sPrice) > 0;
                        const displayPrice = hasSale ? parseFloat(sPrice) : parseFloat(v.price_offset || v.price_adjustment || 0);

                        return (
                          <button
                            key={v.id}
                            onClick={() => setSelectedVariant(selectedVariant?.id === v.id ? null : v)}
                            className={cn(
                              "p-4 rounded-2xl border text-left transition-all relative overflow-hidden group/btn",
                              selectedVariant?.id === v.id
                                ? "bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]"
                                : "bg-white border-slate-200 text-slate-600 hover:border-zamzam-teal hover:shadow-lg"
                            )}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-bold uppercase tracking-tight">{v.name}</span>
                              {selectedVariant?.id === v.id && <div className="bg-zamzam-teal p-1 rounded-full"><Check size={10} className="text-white" /></div>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={cn("text-sm font-bold", selectedVariant?.id === v.id ? "text-zamzam-teal" : "text-slate-900")}>
                                {branchInfo?.currency || 'USD'} {displayPrice.toFixed(2)}
                              </span>
                              {hasSale && (
                                <span className="text-[10px] font-bold text-slate-400 line-through opacity-50">
                                  {branchInfo?.currency || 'USD'} {parseFloat(v.price_offset || v.price_adjustment || 0).toFixed(2)}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Extras */}
                {selectedMenuItem.extras && selectedMenuItem.extras.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-zamzam-yellow" /> Add Extras
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedMenuItem.extras.map((e: any) => {
                        const isSelected = selectedExtras.some(extra => extra.id === e.id);
                        return (
                          <button
                            key={e.id}
                            onClick={() => handleToggleExtra(e)}
                            className={cn(
                              "p-4 rounded-2xl border text-left transition-all flex items-start gap-3",
                              isSelected
                                ? "bg-zamzam-teal/10 border-zamzam-teal text-slate-900 shadow-md scale-[1.02]"
                                : "bg-white border-slate-200 text-slate-600 hover:border-zamzam-teal hover:shadow-lg"
                            )}
                          >
                            <div className={cn(
                              "w-5 h-5 rounded-lg flex items-center justify-center border shrink-0 mt-0.5 transition-colors",
                              isSelected ? "bg-zamzam-teal border-zamzam-teal text-white" : "border-slate-300"
                            )}>
                              {isSelected && <Check size={12} />}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-bold uppercase leading-none mb-1 tracking-tight">{e.name}</div>
                              <div className="flex items-center gap-2">
                                <span className={cn("text-xs font-bold", isSelected ? "text-zamzam-teal" : "text-slate-900")}>
                                  +{branchInfo?.currency || 'USD'} {(e.sale_price !== null && parseFloat(e.sale_price) > 0 ? parseFloat(e.sale_price) : parseFloat(e.price || e.price_adjustment || 0)).toFixed(2)}
                                </span>
                                {(e.sale_price !== null && parseFloat(e.sale_price) > 0) && (
                                  <span className="text-[9px] font-bold text-slate-400 line-through opacity-50">
                                    {branchInfo?.currency || 'USD'} {parseFloat(e.price || e.price_adjustment || 0).toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 bg-white border-t border-slate-100 flex items-center justify-between gap-6">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Calculated Price</p>
                  <p className="text-xl font-bold text-slate-900">
                    {branchInfo?.currency || 'USD'} {(
                      (selectedVariant
                        ? (() => {
                          const sPrice = selectedVariant.sale_price_offset !== undefined && selectedVariant.sale_price_offset !== null ? selectedVariant.sale_price_offset : selectedVariant.sale_price_adjustment;
                          return (sPrice !== null && parseFloat(sPrice) > 0
                            ? parseFloat(sPrice)
                            : parseFloat(selectedVariant.price_offset || selectedVariant.price_adjustment || 0));
                        })()
                        : (selectedMenuItem.sale_price && parseFloat(selectedMenuItem.sale_price) > 0
                          ? parseFloat(selectedMenuItem.sale_price)
                          : parseFloat(selectedMenuItem.price))) +
                      selectedExtras.reduce((sum, e) => {
                        const sPrice = e.sale_price !== undefined && e.sale_price !== null ? e.sale_price : e.sale_price_adjustment;
                        return sum + (sPrice !== null && parseFloat(sPrice) > 0
                          ? parseFloat(sPrice)
                          : parseFloat(e.price || e.price_adjustment || 0));
                      }, 0)
                    ).toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={handleConfirmSelection}
                  className="flex-1 bg-zamzam-teal text-white py-4 rounded-2xl font-bold uppercase tracking-widest shadow-xl shadow-teal-500/20 hover:bg-teal-400 hover:shadow-teal-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add to Cart
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
