import { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  Search, 
  Plus, 
  Minus, 
  CheckCircle2,
  Utensils,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { menuService, tableService, orderService } from '../services/orderService';
import { useAuth } from '../context/AuthContext';
import { resolveImageUrl } from '../services/api';

interface NewOrderProps {
  onClose: () => void;
}

const NewOrder = ({ onClose }: NewOrderProps) => {
  const [step, setStep] = useState<'table' | 'menu' | 'cart'>('table');
  const [tables, setTables] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  const { cart, tableId, setTableId, addItem, removeItem, clearCart, total } = useCart();
  const { user } = useAuth();

  const currency = settings?.tenant?.currency_symbol || '$';

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [tablesData, menuData, settingsData] = await Promise.allSettled([
          tableService.fetchTables(),
          menuService.fetchAllItems(),
          orderService.fetchSettings()
        ]);

        if (tablesData.status === 'fulfilled') setTables(Array.isArray(tablesData.value) ? tablesData.value : []);
        if (menuData.status === 'fulfilled') {
          const mData = Array.isArray(menuData.value) ? menuData.value : [];
          setCategories(mData);
          if (mData.length > 0) setActiveCategory(mData[0]);
        }
        if (settingsData.status === 'fulfilled') setSettings(settingsData.value);

      } catch (err) {
        console.error('Failed to load order data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handlePlaceOrder = async () => {
    if (!tableId || cart.length === 0) return;
    
    setIsSubmitting(true);
    try {
      const orderData = {
        table_id: tableId,
        items: cart.map(item => ({
          menu_item_id: item.id,
          quantity: item.quantity,
          price: item.price,
          variant_id: item.variantId,
          extras: item.extras?.map(e => e.id) || []
        })),
        total: total,
        status: 'Pending',
        order_type: 'Dine-In',
        user_id: user?.id,
        origin: 'Waiter App'
      };
      
      await orderService.placeOrder(orderData);
      clearCart();
      onClose();
    } catch (err) {
      alert('Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-teal-900 animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-xl font-black text-teal-900">
            {step === 'table' ? 'Select Table' : step === 'menu' ? 'Add Items' : 'Confirm Order'}
          </h2>
        </div>
        <div className="flex items-center gap-4">
          {step !== 'table' && (
            <div className="bg-teal-50 px-4 py-2 rounded-xl">
              <span className="text-xs font-bold text-teal-900 uppercase">Table {tables.find(t => t.id === tableId)?.table_number}</span>
            </div>
          )}
          <div className="bg-yellow-100 px-4 py-2 rounded-xl">
            <span className="text-xs font-black text-yellow-700">{currency}{total.toFixed(2)}</span>
          </div>
        </div>
      </header>

      {/* Step Content */}
      <div className="flex-1 overflow-hidden">
        {step === 'table' && (
          <div className="p-6 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 overflow-y-auto h-full">
            {tables.map((table) => (
              <button
                key={table.id}
                onClick={() => {
                  setTableId(table.id);
                  setStep('menu');
                }}
                className={`aspect-square rounded-3xl flex flex-col items-center justify-center gap-2 transition-all border-2 ${
                  tableId === table.id 
                    ? 'bg-teal-900 border-teal-900 text-white shadow-xl shadow-teal-900/20' 
                    : table.status === 'Occupied'
                    ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                    : 'bg-white border-slate-100 text-slate-700 hover:border-teal-900 hover:text-teal-900'
                }`}
                disabled={table.status === 'Occupied'}
              >
                <Utensils size={24} />
                <span className="text-lg font-black">{table.table_number}</span>
                <span className="text-[10px] font-bold uppercase opacity-60">{table.status}</span>
              </button>
            ))}
          </div>
        )}

        {step === 'menu' && (
          <div className="flex flex-col lg:flex-row h-full relative">
            {/* Categories Sidebar/TopBar */}
            <aside className="w-full lg:w-24 border-b lg:border-b-0 lg:border-r border-slate-100 flex flex-row lg:flex-col gap-3 p-4 bg-slate-50 overflow-x-auto lg:overflow-y-auto whitespace-nowrap lg:whitespace-normal no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-6 lg:px-2 py-3 lg:aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all flex-shrink-0 ${
                    activeCategory?.id === cat.id
                      ? 'bg-teal-900 text-white shadow-lg'
                      : 'bg-white text-slate-400 border border-slate-200'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase leading-tight">{cat.name}</span>
                </button>
              ))}
            </aside>

            {/* Items Grid */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-white">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search menu items..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeCategory?.items
                  .filter((item: any) => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((item: any) => (
                    <div key={item.id} className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden flex flex-col hover:shadow-xl hover:shadow-teal-900/5 transition-all group">
                      <div className="relative h-40 overflow-hidden">
                        <img 
                          src={resolveImageUrl(item.image_url)} 
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                          <p className="text-white text-[10px] font-medium leading-tight">{item.description}</p>
                        </div>
                      </div>
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="font-black text-slate-800 group-hover:text-teal-900 transition-colors text-lg uppercase tracking-tight">{item.name}</h4>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Available Now</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-6">
                          <span className="font-black text-teal-900 text-xl tracking-tighter">{currency}{item.price.toFixed(2)}</span>
                          <button
                            onClick={() => addItem({ id: parseInt(item.id), name: item.name, price: item.price, quantity: 1 })}
                            className="bg-zamzam-yellow text-slate-900 p-3 rounded-2xl shadow-lg shadow-yellow-500/20 hover:scale-110 active:scale-95 transition-all"
                          >
                            <Plus size={24} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Desktop Cart Sidebar (Hidden on Mobile) */}
            <aside className="hidden lg:flex w-80 border-l border-slate-100 flex-col bg-white">
              <div className="p-6 border-b border-slate-100">
                <h3 className="font-black text-slate-800">Review Selection</h3>
                <p className="text-xs text-slate-400 font-medium">{cart.length} items added</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {cart.map((item) => (
                  <div key={item.id} className="bg-slate-50 rounded-2xl p-3 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-bold truncate">{item.name}</p>
                      <p className="text-xs text-teal-900 font-black">{currency}{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-slate-200">
                      <button onClick={() => removeItem(item.id)} className="p-1 text-slate-400 hover:text-red-500"><Minus size={14} /></button>
                      <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                      <button onClick={() => addItem(item)} className="p-1 text-slate-400 hover:text-teal-900"><Plus size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-slate-400 font-bold text-sm uppercase">Total</span>
                  <span className="text-2xl font-black text-teal-900">{currency}{total.toFixed(2)}</span>
                </div>
                <button
                  disabled={cart.length === 0}
                  onClick={() => setStep('cart')}
                  className="w-full bg-teal-900 hover:bg-teal-950 text-white font-black py-4 rounded-2xl shadow-lg shadow-teal-900/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  NEXT STEP
                  <ArrowRight size={18} />
                </button>
              </div>
            </aside>

            {/* Mobile Floating Cart Summary */}
            {cart.length > 0 && (
              <div className="lg:hidden fixed bottom-6 left-6 right-6 z-50">
                <button
                  onClick={() => setStep('cart')}
                  className="w-full bg-teal-900 text-white p-4 rounded-3xl shadow-2xl shadow-teal-900/40 flex items-center justify-between animate-in slide-in-from-bottom-10"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center font-black">
                      {cart.reduce((acc, item) => acc + item.quantity, 0)}
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-bold uppercase opacity-70">Review Order</p>
                      <p className="text-sm font-black">{currency}{total.toFixed(2)}</p>
                    </div>
                  </div>
                  <ArrowRight size={20} />
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'cart' && (
          <div className="max-w-2xl mx-auto p-8">
            <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 p-8">
              <h3 className="text-3xl font-black text-teal-900 mb-8 flex items-center gap-3">
                <CheckCircle2 size={32} />
                Finalize Order
              </h3>
              <div className="space-y-6 mb-10">
                <div className="flex justify-between p-6 bg-slate-50 rounded-3xl">
                  <span className="text-slate-500 font-bold uppercase text-xs">Assigned Table</span>
                  <span className="font-black text-teal-900">Table {tables.find(t => t.id === tableId)?.table_number}</span>
                </div>
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between items-center px-2">
                      <div className="flex items-center gap-4">
                        <span className="w-8 h-8 rounded-lg bg-teal-900/10 text-teal-900 flex items-center justify-center font-black text-xs">
                          {item.quantity}
                        </span>
                        <span className="font-bold text-slate-800">{item.name}</span>
                      </div>
                      <span className="font-black text-slate-600 text-sm">{currency}{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="h-px bg-slate-100 my-8" />
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-black text-sm uppercase tracking-widest">Total Amount</span>
                  <span className="text-4xl font-black text-teal-900">{currency}{total.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep('menu')}
                  className="flex-1 border-2 border-slate-100 text-slate-500 font-black py-4 rounded-2xl hover:bg-slate-50 transition-all"
                >
                  EDIT ORDER
                </button>
                <button
                  onClick={handlePlaceOrder}
                  disabled={isSubmitting}
                  className="flex-[2] bg-[#FFB300] hover:bg-[#FFA000] text-slate-900 font-black py-4 rounded-2xl shadow-xl shadow-yellow-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" /> : 'CONFIRM & SUBMIT'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewOrder;
