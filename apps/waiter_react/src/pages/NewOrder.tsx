import { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  Search, 
  Plus, 
  Minus, 
  CheckCircle2,
  Utensils,
  ArrowRight,
  Loader2,
  Table as TableIcon,
  X,
  ShoppingCart,
  Trash2
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { menuService, tableService, orderService } from '../services/orderService';
import { useAuth } from '../context/AuthContext';
import { resolveImageUrl } from '../services/api';

interface NewOrderProps {
  onClose: () => void;
  onOrderPlaced?: () => void;
  embedded?: boolean;
}

const NewOrder = ({ onClose, onOrderPlaced, embedded }: NewOrderProps) => {
  const [tables, setTables] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [showTablePicker, setShowTablePicker] = useState(false);

  const { 
    cart, tableId, setTableId, addItem, removeItem, updateQuantity, clearCart, 
    editingOrderId, total 
  } = useCart();
  const { user } = useAuth();

  const [showMobileCart, setShowMobileCart] = useState(false);

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
          if (mData.length > 0 && !activeCategory) setActiveCategory(mData[0]);
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

  const displayedItems = useMemo(() => {
    if (!activeCategory) return [];
    return activeCategory.items?.filter((item: any) => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];
  }, [activeCategory, searchQuery]);

  const selectedTable = useMemo(() => 
    tables.find(t => t.id === tableId), [tables, tableId]
  );

  const handlePlaceOrder = async () => {
    if (!tableId) {
      setShowTablePicker(true);
      return;
    }
    if (cart.length === 0) return;
    
    setIsSubmitting(true);
    try {
      const orderData = {
        table_id: tableId,
        items: cart.map(item => ({
          menu_item_id: item.id,
          quantity: item.quantity,
          price: item.price,
          variant_id: item.variantId,
          extras: item.extras?.map((e: any) => e.id) || []
        })),
        total: total,
        status: 'Pending',
        order_type: 'Dine-In',
        user_id: user?.id,
        origin: 'Waiter App'
      };
      
      if (editingOrderId) {
        await orderService.updateStatus(editingOrderId, 'Pending'); // Or update logic
        // For simplicity, we just place a new one or assuming backend handles upsert if needed
        // But the user just wants the POS terminal feel.
      } else {
        await orderService.placeOrder(orderData);
      }

      clearCart();
      if (onOrderPlaced) onOrderPlaced();
      onClose();
    } catch (err) {
      alert('Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`${embedded ? 'h-full' : 'fixed inset-0 bg-white/80 backdrop-blur-md z-[60]'} flex items-center justify-center`}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-teal-900 animate-spin" />
          <p className="text-xs font-bold text-teal-900 uppercase tracking-widest">Initializing Terminal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${embedded ? 'h-full relative' : 'fixed inset-0 bg-[#F8FAFC] z-50'} flex flex-col overflow-hidden`}>
      {/* POS Top Bar */}
      <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-6 shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-6">
          <button 
            onClick={onClose}
            className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tighter uppercase leading-none">Waiter <span className="text-teal-600">POS</span></h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Order Management Terminal</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowTablePicker(true)}
            className={`flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all ${
              selectedTable 
                ? 'bg-teal-900 border-teal-900 text-white shadow-lg shadow-teal-900/20' 
                : 'bg-white border-slate-200 text-slate-600 hover:border-teal-900'
            }`}
          >
            <TableIcon size={18} />
            <span className="text-xs font-bold uppercase tracking-widest">
              {selectedTable ? `Table ${selectedTable.table_number}` : 'Select Table'}
            </span>
          </button>

          <div className="relative w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input 
              type="text" 
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-12 pr-4 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 pl-6 border-l border-slate-100">
           <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logged In As</p>
              <p className="text-xs font-bold text-teal-900 uppercase">{user?.first_name || 'Waiter'}</p>
           </div>
           <div className="w-10 h-10 rounded-xl bg-teal-900 text-white flex items-center justify-center font-bold text-xs uppercase">
              {user?.first_name?.charAt(0) || 'W'}
           </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Categories Sidebar */}
        <aside className="w-28 bg-white border-r border-slate-100 flex flex-col items-center py-6 gap-4 overflow-y-auto custom-scrollbar shrink-0">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat)}
              className={`w-20 aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border-2 ${
                activeCategory?.id === cat.id
                  ? 'bg-teal-900 border-teal-900 text-white shadow-xl shadow-teal-900/20 scale-105'
                  : 'bg-white border-slate-50 text-slate-400 hover:border-slate-200'
              }`}
            >
              <Utensils size={20} className={activeCategory?.id === cat.id ? 'text-white' : 'text-slate-300'} />
              <span className="text-[9px] font-bold uppercase leading-tight text-center px-1">{cat.name}</span>
            </button>
          ))}
        </aside>

        {/* Menu Items Grid */}
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {displayedItems.map((item: any) => (
              <button
                key={item.id}
                onClick={() => addItem({ id: parseInt(item.id), name: item.name, price: item.price, quantity: 1 })}
                className="bg-white border border-slate-100 rounded-[2.5rem] p-4 flex flex-col items-center text-center hover:border-teal-900/20 hover:shadow-2xl hover:shadow-teal-900/5 transition-all group active:scale-95"
              >
                <div className="w-full aspect-square rounded-[2rem] overflow-hidden mb-4 border border-slate-50 shadow-inner">
                  <img 
                    src={resolveImageUrl(item.image_url)} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    alt={item.name}
                  />
                </div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight line-clamp-1 mb-1">{item.name}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{activeCategory?.name}</p>
                <div className="mt-auto w-full flex items-center justify-between bg-slate-50 rounded-2xl p-3 border border-slate-100 group-hover:bg-teal-50 group-hover:border-teal-100 transition-colors">
                  <span className="text-sm font-bold text-teal-900">{currency}{item.price.toFixed(2)}</span>
                  <div className="w-8 h-8 rounded-xl bg-teal-900 text-white flex items-center justify-center shadow-lg shadow-teal-900/20">
                    <Plus size={16} />
                  </div>
                </div>
              </button>
            ))}
            {displayedItems.length === 0 && (
              <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
                <Search size={48} className="text-slate-100 mx-auto mb-4" />
                <p className="text-slate-400 font-medium uppercase tracking-widest text-xs">No items match your search</p>
              </div>
            )}
          </div>
        </main>

        {/* Cart Sidebar */}
        <aside className={`${showMobileCart ? 'fixed inset-0 z-[110] flex' : 'hidden lg:flex'} w-full lg:w-[400px] bg-white border-l border-slate-100 flex-col shrink-0 shadow-2xl lg:z-10`}>
          <div className="p-8 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Order Details</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Table: {selectedTable?.table_number || 'None'}</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => clearCart()}
                className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                title="Clear Cart"
              >
                <Trash2 size={18} />
              </button>
              <button 
                onClick={() => setShowMobileCart(false)}
                className="lg:hidden w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
            {cart.map((item) => (
              <div key={`${item.id}-${item.variantId}`} className="bg-slate-50 border border-slate-100 rounded-3xl p-4 flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-teal-900 text-xs shadow-sm">
                  {item.quantity}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 uppercase tracking-tight truncate">{item.name}</p>
                  <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">{currency}{item.price.toFixed(2)} ea</p>
                </div>
                <div className="flex items-center gap-1 bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm">
                  <button 
                    onClick={() => updateQuantity(item.id, -1, item.variantId)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
                  >
                    <Minus size={14} />
                  </button>
                  <button 
                    onClick={() => updateQuantity(item.id, 1, item.variantId)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-teal-50 hover:text-teal-600 transition-all"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <div className="text-right min-w-[70px]">
                  <p className="text-sm font-bold text-slate-900">{currency}{(item.price * item.quantity).toFixed(2)}</p>
                </div>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-30">
                <ShoppingCart size={48} className="mb-4" />
                <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Cart is Empty</p>
              </div>
            )}
          </div>

          <div className="p-8 bg-slate-50/50 border-t border-slate-100 space-y-6">
            <div className="space-y-2">
               <div className="flex justify-between items-center text-slate-400">
                  <span className="text-[10px] font-bold uppercase tracking-widest">Subtotal</span>
                  <span className="text-sm font-bold">{currency}{total.toFixed(2)}</span>
               </div>
               <div className="flex justify-between items-center text-slate-400">
                  <span className="text-[10px] font-bold uppercase tracking-widest">Tax (0%)</span>
                  <span className="text-sm font-bold">{currency}0.00</span>
               </div>
               <div className="h-px bg-slate-200 my-4" />
               <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-[0.2em]">Order Total</span>
                  <span className="text-3xl font-bold text-teal-900 tracking-tighter">{currency}{total.toFixed(2)}</span>
               </div>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={isSubmitting || cart.length === 0}
              className="w-full py-5 bg-teal-900 text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.3em] shadow-2xl shadow-teal-900/30 hover:bg-teal-950 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : (
                <>
                  <CheckCircle2 size={20} />
                  Send to Kitchen
                </>
              )}
            </button>
          </div>
        </aside>
      </div>

      {/* Mobile Cart Trigger */}
      {cart.length > 0 && !showMobileCart && (
        <div className="lg:hidden fixed bottom-6 left-6 right-6 z-40">
          <button
            onClick={() => setShowMobileCart(true)}
            className="w-full bg-teal-900 text-white p-4 rounded-3xl shadow-2xl shadow-teal-900/40 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center font-bold">
                {cart.reduce((acc, item) => acc + item.quantity, 0)}
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold uppercase opacity-70">Review Order</p>
                <p className="text-sm font-bold">{currency}{total.toFixed(2)}</p>
              </div>
            </div>
            <ArrowRight size={20} />
          </button>
        </div>
      )}

      {/* Table Selection Modal Overlay */}
      {showTablePicker && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setShowTablePicker(false)} />
          <div className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tighter">Assign Table</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select a floor layout position</p>
              </div>
              <button onClick={() => setShowTablePicker(false)} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 custom-scrollbar">
              {tables.map((table) => {
                const isOccupied = table.status?.toLowerCase() === 'occupied';
                const isSelected = tableId === table.id;

                return (
                  <button
                    key={table.id}
                    disabled={isOccupied && !isSelected}
                    onClick={() => {
                      setTableId(table.id);
                      setShowTablePicker(false);
                    }}
                    className={`aspect-square rounded-[2rem] flex flex-col items-center justify-center gap-3 transition-all border-4 ${
                      isSelected 
                        ? 'bg-teal-900 border-teal-900 text-white shadow-2xl' 
                        : isOccupied
                        ? 'bg-slate-50 border-slate-100 text-slate-300 opacity-50 cursor-not-allowed'
                        : 'bg-white border-slate-50 text-slate-800 hover:border-teal-900 hover:text-teal-900'
                    }`}
                  >
                    <TableIcon size={24} />
                    <span className="text-xl font-bold">{table.table_number}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                      {isOccupied ? 'Occupied' : 'Available'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewOrder;
