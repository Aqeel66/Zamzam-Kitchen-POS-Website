import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Plus, 
  ShoppingBag, 
  ChevronRight, 
  Utensils, 
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL, resolveImageUrl } from '../config';

export default function QRMenu() {
  const { tableId } = useParams();
  const [menuData, setMenuData] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [cart, setCart] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/menu`)
      .then(res => res.json())
      .then(data => {
        setMenuData(data);
        setIsLoading(false);
      })
      .catch(err => console.error('Error fetching menu:', err));
  }, []);

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const total = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);

  const placeOrder = async () => {
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
            quantity: item.quantity
          })),
          total: total * 1.1, // Including 10% tax for simplicity
          order_type: 'Dine-In',
          table_id: tableId,
          status: 'Ordered',
          origin: 'QR Menu'
        })
      });

      if (response.ok) {
        setOrderStatus('success');
        setCart([]);
      } else {
        setOrderStatus('error');
      }
    } catch (err) {
      setOrderStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderStatus === 'success') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-10 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={48} className="text-green-500" />
        </motion.div>
        <h2 className="text-3xl font-bold text-slate-900 uppercase tracking-tighter">Order Sent!</h2>
        <p className="text-slate-400 font-bold mt-2">Your delicious meal is being prepared. We'll bring it to Table {tableId} shortly.</p>
        <button 
          onClick={() => setOrderStatus('idle')}
          className="mt-10 bg-zamzam-teal text-white px-8 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs"
        >
          Order More
        </button>
      </div>
    );
  }

  const categories = ["All", ...menuData.map(cat => cat.name)];
  const displayedItems = menuData
    .filter(cat => activeCategory === 'All' || activeCategory === cat.name)
    .flatMap(cat => (cat.items || []).map((item: any) => ({ ...item, category: cat.name })));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none">
      {/* Header */}
      <header className="bg-zamzam-teal text-white p-6 pb-12 rounded-b-[2.5rem] shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-zamzam-yellow rounded-xl flex items-center justify-center shadow-lg">
                <Utensils size={20} className="text-zamzam-teal" />
             </div>
             <div>
                <h1 className="font-bold text-xl uppercase tracking-tighter">Zamzam Kitchen</h1>
                <p className="text-[10px] font-bold text-teal-300 uppercase tracking-widest">Table {tableId}</p>
             </div>
          </div>
        </div>

        {/* Category Scroll */}
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
                activeCategory === cat ? 'bg-zamzam-yellow text-zamzam-teal shadow-lg' : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {/* Menu Grid */}
      <main className="flex-1 -mt-6 p-4 pb-32">
        <div className="grid grid-cols-1 gap-4">
          {isLoading ? (
            <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-zamzam-teal rounded-full animate-spin" /></div>
          ) : (
            displayedItems.map(item => (
              <motion.div 
                layout
                key={item.id}
                className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 flex gap-4 items-center"
              >
                <img src={resolveImageUrl(item.image) || '/placeholder.png'} className="w-24 h-24 rounded-2xl object-cover" />
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 text-sm uppercase">{item.name}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{item.category}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="font-bold text-zamzam-teal text-lg">${parseFloat(item.price).toFixed(2)}</span>
                    <button 
                      onClick={() => addToCart(item)}
                      className="w-10 h-10 bg-slate-50 text-slate-400 hover:bg-zamzam-teal hover:text-white rounded-xl flex items-center justify-center transition-all active:scale-90"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </main>

      {/* Floating Cart Bar */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-6 left-6 right-6 z-50"
          >
            <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-2xl flex items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <ShoppingBag size={24} className="text-zamzam-yellow" />
                  <span className="absolute -top-2 -right-2 bg-white text-slate-900 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {cart.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Payable</p>
                  <p className="text-xl font-bold text-white">${total.toFixed(2)}</p>
                </div>
              </div>
              <button 
                onClick={placeOrder}
                disabled={isSubmitting}
                className="bg-zamzam-yellow text-zamzam-teal px-8 py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-yellow-500/20"
              >
                {isSubmitting ? 'Sending...' : 'Place Order'}
                <ChevronRight size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
