import { useState, useEffect } from 'react';
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
  const { cart, addToCart, updateQuantity, clearCart, subtotal, total, tax } = useCart();
  const [menuData, setMenuData] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<any>(null);
  const [branchInfo, setBranchInfo] = useState<any>({});

  useEffect(() => {
    // Fetch Menu
    fetch(`${API_BASE_URL}/menu`)
      .then(res => res.json())
      .then(data => {
        setMenuData(data);
        setIsLoading(false);
      })
      .catch(err => console.error('Error fetching menu:', err));

    // Fetch Branch Settings for Printing
    fetch(`${API_BASE_URL}/settings`)
      .then(res => res.json())
      .then(data => setBranchInfo(data.tenant || {}))
      .catch(err => console.error('Error fetching settings:', err));
  }, []);

  const handlePlaceOrder = async (checkoutData: any) => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
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
          status: checkoutData.payment_method ? 'Paid' : 'Ordered',
          origin: 'In-Store'
        })
      });

      if (response.ok) {
        const result = await response.json();
        setLastPlacedOrder({
          id: result.orderNumber,
          items: cart,
          total_amount: checkoutData.total_amount,
          discount_amount: checkoutData.discount_amount,
          order_type: checkoutData.order_type,
          table_id: checkoutData.table_id
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

  const categories = ["All", ...menuData.map(cat => cat.name)];
  
  const displayedItems = menuData
    .filter(cat => activeCategory === 'All' || activeCategory === cat.name)
    .flatMap(cat => (cat.items || []).map((item: any) => ({ ...item, category: cat.name })))
    .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="h-full flex overflow-hidden bg-slate-50/50">
      {/* ... (rest of the UI remains unchanged) */}
      <aside className="w-24 bg-white border-r border-slate-200 flex flex-col items-center py-6 gap-4 z-10">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "w-16 h-16 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-300",
              activeCategory === cat 
                ? "bg-zamzam-teal text-white shadow-lg shadow-teal-900/20 scale-110" 
                : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            )}
          >
            <Utensils size={20} />
            <span className="text-[9px] font-black uppercase tracking-tighter truncate w-14 text-center">
              {cat}
            </span>
          </button>
        ))}
      </aside>

      {/* Center Area: Search & Grid */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="p-6 bg-white/50 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10">
          <div className="flex items-center justify-between gap-6">
            <div className="relative flex-1 max-w-xl group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-zamzam-teal transition-colors" size={20} />
              <input 
                type="text"
                placeholder="Search food, drinks, or desserts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-[1.25rem] py-3.5 pl-12 pr-4 text-sm font-bold shadow-sm focus:ring-4 focus:ring-zamzam-teal/5 focus:border-zamzam-teal outline-none transition-all"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 px-4 bg-white border border-slate-200 rounded-xl flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest">
                <Clock size={16} className="text-zamzam-teal" />
                <span>12:45 PM</span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-zamzam-teal rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              <AnimatePresence mode="popLayout">
                {displayedItems.map((item) => (
                  <motion.div
                    layout
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileHover={{ y: -8 }}
                    onClick={() => addToCart(item)}
                    className="group bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-pointer overflow-hidden"
                  >
                    <div className="relative aspect-square overflow-hidden bg-slate-50">
                      <img 
                        src={resolveImageUrl(item.image) || '/placeholder.png'} 
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute top-3 right-3">
                        <span className="bg-white/90 backdrop-blur-md text-zamzam-teal text-[10px] font-black px-3 py-1.5 rounded-full shadow-sm">
                          ${parseFloat(item.price).toFixed(2)}
                        </span>
                      </div>
                      <div className={cn(
                        "absolute bottom-0 left-0 w-full h-1",
                        categoryColors[item.category] || 'bg-slate-200'
                      )} />
                    </div>
                    <div className="p-5">
                      <h3 className="text-sm font-black text-slate-900 leading-tight mb-1 group-hover:text-zamzam-teal transition-colors">
                        {item.name}
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
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
      <aside className="w-[420px] bg-white border-l border-slate-200 flex flex-col z-20 shadow-[-20px_0_50px_rgba(0,0,0,0.02)]">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Current Order</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Order #ZK-1204</p>
          </div>
          <button 
            onClick={clearCart}
            className="p-3 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all"
          >
            <Trash2 size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <AnimatePresence mode="popLayout">
            {cart.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center text-center p-8"
              >
                <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6 border border-slate-100">
                  <Utensils size={32} className="text-slate-200" />
                </div>
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Your cart is empty</h4>
                <p className="text-xs font-bold text-slate-300 mt-2">Select items from the menu to start an order.</p>
              </motion.div>
            ) : (
              cart.map((item) => (
                <motion.div
                  layout
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  key={item.id}
                  className="flex items-center gap-4 bg-slate-50/50 p-4 rounded-[1.5rem] border border-slate-100"
                >
                  <img 
                    src={resolveImageUrl(item.image) || '/placeholder.png'} 
                    className="w-16 h-16 rounded-2xl object-cover shadow-sm" 
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-black text-slate-900 truncate uppercase">{item.name}</h4>
                    <p className="text-xs font-bold text-zamzam-teal mt-1">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
                    <button 
                      onClick={() => updateQuantity(item.id, -1)}
                      className="p-1.5 text-slate-400 hover:text-zamzam-teal transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center text-xs font-black text-slate-900">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, 1)}
                      className="p-1.5 text-slate-400 hover:text-zamzam-teal transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        <div className="p-8 bg-slate-50/80 border-t border-slate-200 space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Subtotal</span>
              <span className="text-slate-900">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Tax (10%)</span>
              <span className="text-slate-900">${tax.toFixed(2)}</span>
            </div>
            <div className="h-px bg-slate-200 my-2" />
            <div className="flex justify-between items-center">
              <span className="text-sm font-black text-slate-900 uppercase tracking-widest">Total</span>
              <span className="text-2xl font-black text-zamzam-teal">${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-zamzam-teal hover:border-zamzam-teal/30 transition-all">
              <Clock size={20} className="mb-1" />
              <span className="text-[9px] font-black uppercase tracking-widest">On Hold</span>
            </button>
            <button className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-zamzam-teal hover:border-zamzam-teal/30 transition-all">
              <CreditCard size={20} className="mb-1" />
              <span className="text-[9px] font-black uppercase tracking-widest">Split Bill</span>
            </button>
          </div>

          <button 
            disabled={cart.length === 0 || isSubmitting}
            onClick={() => setIsCheckoutOpen(true)}
            className="w-full bg-zamzam-yellow hover:bg-yellow-400 disabled:bg-slate-200 disabled:text-slate-400 text-zamzam-teal font-black py-5 rounded-[1.5rem] shadow-xl shadow-yellow-500/20 flex items-center justify-center gap-3 group active:scale-95 transition-all"
          >
            <span className="text-sm uppercase tracking-tight">
              Checkout Order
            </span>
            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </aside>

      <CheckoutModal 
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onConfirm={handlePlaceOrder}
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
