import { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  ChevronRight, 
  UtensilsCrossed as Utensils, 
  Clock, 
  CreditCard,
  Filter,
  LayoutGrid,
  ChefHat,
  Coffee,
  Soup,
  Pizza,
  UtensilsCrossed,
  Sandwich
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CheckoutModal from '../components/CheckoutModal';
import PrintSuccessModal from '../components/PrintSuccessModal';
import { API_BASE_URL } from '../config';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

const categories = [
  { id: 'all', name: 'All', icon: LayoutGrid },
  { id: 'mandi', name: 'Mandi', icon: UtensilsCrossed },
  { id: 'pasta', name: 'Pasta', icon: Soup },
  { id: 'individuals', name: 'Individuals', icon: ChefHat },
  { id: 'sides', name: 'Sides', icon: Pizza },
  { id: 'breads', name: 'Breads', icon: Sandwich },
  { id: 'drinks', name: 'Drinks/Tea', icon: Coffee },
  { id: 'desserts', name: 'Desserts', icon: Coffee },
];

export default function Orders() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<any>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [menuData, setMenuData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [branchInfo, setBranchInfo] = useState<any>(null);

  useEffect(() => {
    fetchMenu();
    fetchBranchInfo();
  }, []);

  const fetchMenu = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/menu`);
      const data = await res.json();
      setMenuData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch menu:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBranchInfo = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/settings`);
      const data = await res.json();
      setBranchInfo(data.tenant);
    } catch (err) {
      console.error('Failed to fetch branch info:', err);
    }
  };

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const clearCart = () => setCart([]);

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.10;
  const total = subtotal + tax;

  const handlePlaceOrder = (orderResult: any) => {
    setLastPlacedOrder(orderResult);
    setCart([]);
    setIsCheckoutOpen(false);
    setIsPrintModalOpen(true);
  };

  const resolveImageUrl = (url: string) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}${url}`;
  };

  const filteredItems = menuData
    .filter(cat => !activeCategory || activeCategory === 'all' || activeCategory === (cat.name || cat.title))
    .flatMap(cat => (cat.items || []).map((item: any) => ({ ...item, category: (cat.name || cat.title) })))
    .filter(item => (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="h-full flex overflow-hidden bg-slate-50/50">
      {/* Left Sidebar: Categories */}
      <aside className="w-28 bg-white border-r border-slate-100 flex flex-col items-center py-6 gap-2 z-10">
        {categories.map((cat) => (
          <button 
            key={cat.id}
            onClick={() => setActiveCategory(cat.id === 'all' ? null : cat.name)}
            className={cn(
              "w-20 h-20 rounded-[1.8rem] flex flex-col items-center justify-center transition-all gap-1.5 group",
              (activeCategory === cat.name || (cat.id === 'all' && activeCategory === null))
                ? "bg-zamzam-teal text-white shadow-lg shadow-teal-900/20" 
                : "bg-transparent text-slate-400 hover:bg-slate-50"
            )}
          >
            <cat.icon size={22} className={cn(
              "transition-transform",
              (activeCategory === cat.name || (cat.id === 'all' && activeCategory === null)) ? "scale-110" : "group-hover:scale-110"
            )} />
            <span className="text-[9px] font-black uppercase tracking-widest text-center px-1 leading-tight">
              {cat.name}
            </span>
          </button>
        ))}
      </aside>

      {/* Center Area: Search & Grid */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="p-6 bg-white/50 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10">
          <div className="flex items-center justify-between gap-6">
            <div className="flex-1 relative max-w-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="Search menu items..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-[1.25rem] py-3.5 pl-12 pr-4 text-sm font-bold shadow-sm focus:ring-4 focus:ring-zamzam-teal/5 focus:border-zamzam-teal outline-none transition-all"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="h-10 px-4 bg-white border border-slate-200 rounded-xl flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Live Menu
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-zamzam-teal rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              <AnimatePresence mode="popLayout">
                {filteredItems.map((item) => (
                  <motion.div
                    key={item.id}
                    whileHover={{ y: -5 }}
                    onClick={() => addToCart(item)}
                    className="group bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-pointer overflow-hidden flex flex-col h-full"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden p-4 bg-slate-50/50">
                      <img 
                        src={resolveImageUrl(item.image) || '/placeholder.png'} 
                        alt={item.name}
                        className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500 rounded-2xl"
                      />
                      <div className="absolute top-4 right-4">
                        <span className="bg-white/95 backdrop-blur-md text-zamzam-teal text-[11px] font-black px-3 py-1.5 rounded-full shadow-sm border border-slate-100">
                          ${parseFloat(item.price).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="p-6 pt-2 flex-1 flex flex-col">
                      <div className="h-1 w-12 bg-orange-500 rounded-full mb-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <h3 className="text-sm font-black text-slate-900 leading-tight mb-1 uppercase tracking-tight">
                        {item.name}
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-auto">
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
            title="Clear All"
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
                    <p className="text-xs font-bold text-zamzam-teal mt-1">{(item.price * item.quantity).toFixed(2)} {branchInfo?.currency || 'USD'}</p>
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
              <span className="text-slate-900">{subtotal.toFixed(2)} {branchInfo?.currency || 'USD'}</span>
            </div>
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Tax (10%)</span>
              <span className="text-slate-900">{tax.toFixed(2)} {branchInfo?.currency || 'USD'}</span>
            </div>
            <div className="h-px bg-slate-200 my-2" />
            <div className="flex justify-between items-center">
              <span className="text-sm font-black text-slate-900 uppercase tracking-widest">Total</span>
              <span className="text-2xl font-black text-zamzam-teal">{total.toFixed(2)} <span className="text-xs">{branchInfo?.currency || 'USD'}</span></span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button className="flex flex-col items-center justify-center p-4 bg-white border border-slate-100 rounded-[1.5rem] text-slate-400 hover:text-zamzam-teal hover:border-zamzam-teal/30 transition-all shadow-sm">
              <Clock size={20} className="mb-2" />
              <span className="text-[10px] font-black uppercase tracking-widest">On Hold</span>
            </button>
            <button className="flex flex-col items-center justify-center p-4 bg-white border border-slate-100 rounded-[1.5rem] text-slate-400 hover:text-zamzam-teal hover:border-zamzam-teal/30 transition-all shadow-sm">
              <CreditCard size={20} className="mb-2" />
              <span className="text-[10px] font-black uppercase tracking-widest">Split Bill</span>
            </button>
          </div>

          <button 
            disabled={cart.length === 0 || isSubmitting}
            onClick={() => setIsCheckoutOpen(true)}
            className="w-full bg-[#FFB300] hover:bg-[#FFA000] disabled:bg-slate-200 disabled:text-slate-400 text-teal-950 font-black py-5 rounded-[1.5rem] shadow-xl shadow-yellow-500/20 flex items-center justify-center gap-3 group active:scale-[0.98] transition-all"
          >
            <span className="text-[13px] uppercase tracking-widest font-black">
              Checkout Order
            </span>
            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </aside>

      <CheckoutModal 
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderSuccess={handlePlaceOrder}
        cart={cart}
        settings={{ tenant: branchInfo }}
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
