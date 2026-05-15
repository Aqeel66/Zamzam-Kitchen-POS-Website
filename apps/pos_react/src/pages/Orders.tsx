import { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Trash2, 
  Clock, 
  Utensils,
  Minus,
  Plus,
  CreditCard,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { API_BASE_URL, resolveImageUrl } from '../config';
import CheckoutModal from '../components/CheckoutModal';
import PrintSuccessModal from '../components/PrintSuccessModal';

const cn = (...inputs: (string | undefined | null | false)[]) => inputs.filter(Boolean).join(' ');

const categoryColors: Record<string, string> = {
  'Mandi': 'bg-orange-500',
  'Grill': 'bg-red-500',
  'Desserts': 'bg-pink-500',
  'Beverages': 'bg-blue-500',
  'Starters': 'bg-teal-500',
};

export default function Orders() {
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, subtotal, tax, total, editingOrder } = useCart();
  const [menuData, setMenuData] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [guestCount, setGuestCount] = useState(1);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<any>(null);
  const [branchInfo, setBranchInfo] = useState<any>({});

  // --- DATA SYNC ---
  const fetchMenu = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/menu?t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMenuData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('POS Menu Fetch Error:', err);
      setMenuData([]);
    } finally {
      setIsLoading(false);
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

  useEffect(() => {
    fetchMenu();
    fetchSettings();
    window.addEventListener('settings-updated', fetchSettings);
    return () => window.removeEventListener('settings-updated', fetchSettings);
  }, []);

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
      .filter(cat => cat && (activeCategory === 'All' || activeCategory === cat.name))
      .flatMap(cat => {
        const items = Array.isArray(cat.items) ? cat.items : [];
        return items
          .filter(item => item && typeof item.name === 'string')
          .map((item: any) => ({ ...item, category: cat.name }));
      })
      .filter(item => {
        const query = (searchQuery || '').toLowerCase();
        return item.name.toLowerCase().includes(query);
      });
  }, [menuData, activeCategory, searchQuery]);

  const handlePlaceOrder = async (checkoutData: any) => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    try {
      const method = editingOrder ? 'PUT' : 'POST';
      const url = editingOrder ? `${API_BASE_URL}/orders/${editingOrder.id}` : `${API_BASE_URL}/orders`;
      
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            notes: item.notes || ''
          })),
          total: checkoutData.total_amount,
          discount_amount: checkoutData.discount_amount,
          promo_id: checkoutData.promo_id,
          order_type: checkoutData.order_type,
          payment_method: checkoutData.payment_method,
          table_id: checkoutData.table_id,
          waiter_id: checkoutData.waiter_id,
          waiter_name: checkoutData.waiter_name,
          guest_count: checkoutData.guest_count,
          expected_duration: checkoutData.expected_duration,
          estimated_release_time: checkoutData.estimated_release_time,
          status: checkoutData.payment_method ? 'Paid' : 'Ordered',
          origin: 'In-Store'
        })
      });

      if (response.ok) {
        const result = await response.json();
        setLastPlacedOrder({
          id: result.orderId,
          orderNumber: result.orderNumber,
          order_time: new Date().toISOString(), // Fallback if backend doesn't return it yet
          items: cart,
          total_amount: checkoutData.total_amount,
          discount_amount: checkoutData.discount_amount,
          promo_discount: checkoutData.promo_discount,
          manual_discount: checkoutData.manual_discount,
          reservation_fee: checkoutData.reservation_fee,
          tip_amount: checkoutData.tip_amount,
          order_type: checkoutData.order_type,
          table_id: checkoutData.table_id,
          waiter_name: checkoutData.waiter_name,
          table_number: checkoutData.table_number
        });
        clearCart();
        setIsCheckoutOpen(false);
        setIsPrintModalOpen(true);
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (err) {
      console.error('Order failed:', err);
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
              <div className="h-7 px-3 bg-white border border-slate-200 rounded-lg flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
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
                  "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200",
                  activeCategory === cat
                    ? "bg-zamzam-teal text-white shadow-md shadow-teal-500/20 scale-105"
                    : "bg-white border border-slate-200 text-slate-600 hover:border-zamzam-teal/40 hover:text-zamzam-teal"
                )}
              >
                <Utensils size={11} />
                {cat}
                <span className={cn(
                  "text-[8px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none",
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
                    onClick={() => addToCart(item)}
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
                        <span className="bg-zamzam-teal text-white text-[8px] font-black px-1.5 py-0.5 rounded-bl-lg shadow flex items-center gap-0.5">
                          <span className="text-[7px] font-bold opacity-80">{branchInfo?.currency || 'USD'}</span>
                          {parseFloat(item.price).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="px-2 py-1.5 border-t border-slate-50">
                      <h3 className="text-[9px] font-black text-slate-900 leading-tight truncate group-hover:text-zamzam-teal transition-colors">
                        {item.name}
                      </h3>
                      <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest truncate mt-0.5">
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
      <aside className="w-[320px] bg-white border-l border-slate-200 flex flex-col z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase leading-none">Current Order</h2>
            <div className={cn(
              "px-2 py-0.5 rounded-full text-[8px] font-black tracking-widest uppercase flex items-center gap-1.5",
              editingOrder ? "bg-blue-50 text-blue-600" : "bg-zamzam-teal/10 text-zamzam-teal"
            )}>
              {editingOrder ? (
                <>
                  <span className="w-1 h-1 rounded-full bg-blue-600 animate-pulse" />
                  Editing #{editingOrder.order_number} 
                  {editingOrder.order_type === 'Dine-In' && (
                    <span className="mx-1 opacity-70">• Table {editingOrder.table_number || editingOrder.table_id} {editingOrder.waiter_name ? `• ${editingOrder.waiter_name}` : ''}</span>
                  )}
                  <span className="mx-1">• {editingOrder.status}</span>
                </>
              ) : 'New Session'}
            </div>
          </div>
          <button 
            onClick={clearCart}
            className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
          >
            <Trash2 size={14} />
          </button>
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
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Cart is empty</h4>
                <p className="text-[10px] font-bold text-slate-300 mt-1">Select items to start an order.</p>
              </motion.div>
            ) : (
              cart.map((item) => (
                <motion.div
                  layout
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  key={item.id}
                  className="flex items-center gap-2.5 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100"
                >
                  <img 
                    src={resolveImageUrl(item.image) || '/placeholder.png'} 
                    className="w-10 h-10 rounded-lg object-cover shadow-sm shrink-0" 
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[10px] font-black text-slate-900 truncate uppercase">{item.name}</h4>
                    <p className="text-[9px] font-bold text-zamzam-teal mt-0.5">{branchInfo?.currency || 'USD'} {(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-0.5 bg-white border border-slate-200 p-0.5 rounded-lg shadow-sm">
                    <button 
                      onClick={() => updateQuantity(item.id, -1)}
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
                    <span className="w-6 text-center text-[10px] font-black text-slate-900">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, 1)}
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
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <span>Subtotal</span>
              <span className="text-slate-900">{branchInfo?.currency || 'USD'} {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <span>Tax (10%)</span>
              <span className="text-slate-900">{branchInfo?.currency || 'USD'} {tax.toFixed(2)}</span>
            </div>
            <div className="h-px bg-slate-200 my-1" />
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Total</span>
              <span className="text-sm font-black text-zamzam-teal">{branchInfo?.currency || 'USD'} {total.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button className="flex flex-col items-center justify-center p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-zamzam-teal hover:border-zamzam-teal/30 transition-all">
              <Clock size={14} className="mb-0.5" />
              <span className="text-[8px] font-black uppercase tracking-widest">On Hold</span>
            </button>
            <button 
              onClick={() => clearCart()}
              className="flex flex-col items-center justify-center p-2.5 bg-red-50 border border-red-100 rounded-xl text-red-400 hover:bg-red-600 hover:text-white transition-all group"
            >
              <Trash2 size={14} className="mb-0.5 transition-transform group-hover:scale-110" />
              <span className="text-[8px] font-black uppercase tracking-widest">Clear Cart</span>
            </button>
          </div>

          <button 
            disabled={cart.length === 0 || isSubmitting}
            onClick={() => setIsCheckoutOpen(true)}
            className={cn(
              "w-full font-black py-2.5 rounded-xl shadow-lg flex items-center justify-center gap-2 group active:scale-95 transition-all",
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
        onClose={() => setIsCheckoutOpen(false)}
        onConfirm={handlePlaceOrder}
        subtotal={subtotal}
        tax={tax}
        total={total}
        isSubmitting={isSubmitting}
      />

      <PrintSuccessModal 
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        order={lastPlacedOrder}
        branch={branchInfo}
      />
    </div>
  );
}
