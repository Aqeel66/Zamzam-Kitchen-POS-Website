import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Package, 
  LayoutGrid, 
  Image as ImageIcon,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';

const cn = (...inputs: (string | undefined | null | false)[]) => inputs.filter(Boolean).join(' ');

export default function MenuDesigner() {
  const [menu, setMenu] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'item' | 'category'>('item');
  const [editingItem, setEditingItem] = useState<any>(null);

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/menu`);
      const data = await res.json();
      setMenu(data);
      if (data.length > 0 && !selectedCategory) {
        setSelectedCategory(data[0]);
      } else if (selectedCategory) {
        const updated = data.find((c: any) => c.id === selectedCategory.id);
        if (updated) setSelectedCategory(updated);
      }
    } catch (err) {
      console.error('Error fetching menu:', err);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await fetch(`${API_BASE_URL}/menu/items/${id}`, { method: 'DELETE' });
      fetchMenu();
    } catch (err) {
      alert('Failed to delete item');
    }
  };

  const filteredItems = selectedCategory?.items.filter((item: any) => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="h-full flex bg-slate-50/50">
      {/* Categories Sidebar */}
      <aside className="w-80 bg-white border-r border-slate-100 flex flex-col p-8 gap-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Categories</h2>
          <button 
            onClick={() => { setModalType('category'); setEditingItem(null); setIsModalOpen(true); }}
            className="w-10 h-10 bg-zamzam-teal/10 text-zamzam-teal rounded-xl flex items-center justify-center hover:bg-zamzam-teal hover:text-white transition-all shadow-sm"
          >
            <Plus size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-auto pr-2">
          {menu.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                "w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all group border",
                selectedCategory?.id === category.id 
                  ? "bg-zamzam-teal text-white border-zamzam-teal shadow-xl shadow-teal-900/20" 
                  : "bg-white text-slate-400 border-slate-100 hover:border-zamzam-teal/30 hover:bg-teal-50/30"
              )}
            >
              <div className="flex items-center gap-4">
                <LayoutGrid size={18} className={selectedCategory?.id === category.id ? "text-white" : "text-slate-300"} />
                <span className="text-xs font-black uppercase tracking-widest">{category.name}</span>
              </div>
              <span className={cn(
                "text-[10px] font-black px-2 py-1 rounded-lg",
                selectedCategory?.id === category.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"
              )}>
                {category.items.length}
              </span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Items Main Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="p-8 flex items-center justify-between gap-10">
          <div className="flex-1 relative group max-w-xl">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-zamzam-teal transition-colors" size={20} />
            <input 
              type="text" 
              placeholder={`Search in ${selectedCategory?.name}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-100 rounded-3xl py-5 pl-16 pr-8 text-sm font-bold shadow-sm outline-none focus:ring-4 focus:ring-zamzam-teal/5 focus:border-zamzam-teal/30 transition-all"
            />
          </div>

          <button 
            onClick={() => { setModalType('item'); setEditingItem(null); setIsModalOpen(true); }}
            className="bg-zamzam-teal hover:bg-teal-400 text-white font-black px-10 py-5 rounded-3xl shadow-xl shadow-teal-900/20 active:scale-95 transition-all flex items-center gap-4 text-xs uppercase tracking-widest"
          >
            <Plus size={20} />
            Add New Item
          </button>
        </header>

        <div className="flex-1 p-8 pt-0 overflow-auto">
          <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item: any) => (
                <motion.div
                  layout
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white border border-slate-100 rounded-[2.5rem] p-6 flex gap-6 group hover:border-zamzam-teal/30 transition-all shadow-sm hover:shadow-xl hover:shadow-slate-200/50"
                >
                  <div className="w-28 h-28 bg-slate-50 rounded-[2rem] overflow-hidden flex-shrink-0 border border-slate-100 relative group-hover:scale-105 transition-transform duration-500">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-200">
                        <ImageIcon size={32} />
                      </div>
                    )}
                    {!item.is_available && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center">
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Unavailable</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-black text-slate-900 text-sm uppercase tracking-tight">{item.name}</h3>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => { setEditingItem(item); setModalType('item'); setIsModalOpen(true); }}
                            className="p-2 text-slate-300 hover:text-zamzam-teal transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-2 text-slate-300 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] font-bold text-slate-400 line-clamp-2 mb-3 leading-relaxed">{item.description || 'No description provided.'}</p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black text-zamzam-teal tracking-tighter">
                        {item.price.toLocaleString()} <span className="text-[10px] text-slate-300 font-bold ml-1">AED</span>
                      </span>
                      <div className="flex gap-2">
                        {item.is_featured && <span className="w-2 h-2 bg-zamzam-yellow rounded-full shadow-[0_0_10px_#FFB300]" title="Featured Item" />}
                        <span className={cn(
                          "w-2 h-2 rounded-full",
                          item.is_available ? "bg-green-400 shadow-[0_0_10px_#4ADE80]" : "bg-slate-300"
                        )} title={item.is_available ? "Active" : "Disabled"} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filteredItems.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-6 opacity-50">
              <Package size={80} strokeWidth={1} />
              <div className="text-center">
                <p className="text-sm font-black uppercase tracking-[0.2em]">No items found</p>
                <p className="text-[10px] font-bold mt-2">Try a different search or add a new dish.</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Item/Category Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-10">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden p-10"
            >
              <div className="flex items-center justify-between mb-10">
                <div>
                  <span className="text-[10px] font-black text-zamzam-teal uppercase tracking-[0.4em] mb-2 block">Menu Designer</span>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                    {editingItem ? 'Edit' : 'Add New'} <span className="text-zamzam-teal">{modalType === 'item' ? 'Food Item' : 'Category'}</span>
                  </h2>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all">
                  <X size={24} />
                </button>
              </div>

              {/* Note: In a full production app, we would use a form library. For now, we use a controlled form approach. */}
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Item Name</label>
                    <input type="text" placeholder="e.g. Chicken BBQ Mandi" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-black outline-none focus:ring-4 focus:ring-zamzam-teal/5 transition-all" defaultValue={editingItem?.name} />
                  </div>
                  {modalType === 'item' && (
                    <div className="space-y-2 col-span-2 sm:col-span-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Price (AED)</label>
                      <input type="number" placeholder="0.00" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-black outline-none focus:ring-4 focus:ring-zamzam-teal/5 transition-all" defaultValue={editingItem?.price} />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Description</label>
                  <textarea rows={3} placeholder="Brief details about the dish..." className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-black outline-none focus:ring-4 focus:ring-zamzam-teal/5 transition-all resize-none" defaultValue={editingItem?.description} />
                </div>

                <div className="flex gap-4">
                  <button className="flex-1 bg-zamzam-teal text-white font-black py-5 rounded-2xl shadow-xl shadow-teal-900/20 uppercase tracking-widest text-xs">
                    {editingItem ? 'Update' : 'Save'} {modalType === 'item' ? 'Dish' : 'Category'}
                  </button>
                  <button onClick={() => setIsModalOpen(false)} className="px-10 bg-slate-100 text-slate-400 font-black py-5 rounded-2xl uppercase tracking-widest text-xs hover:bg-slate-200 transition-all">
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
