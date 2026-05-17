import { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Package, 
  LayoutGrid, 
  Image as ImageIcon,
  X,
  ChevronRight,
  Globe,
  Tag,
  Scale,
  UtensilsCrossed,
  Layers,
  Save,
  AlertCircle,
  FlaskConical,
  Maximize2,
  CheckCircle2,
  Zap,
  Calculator,
  Coins,
  TrendingUp,
  PieChart,
  ListPlus,
  Star,
  Eye,
  EyeOff,
  Activity,
  Box,
  Ban,
  CheckCircle,
  Sparkles,
  ShoppingBag,
  ArrowDownCircle,
  ChevronDown,
  ChevronUp,
  Filter,
  Receipt,
  FolderPlus,
  ArrowLeft,
  Settings,
  MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL, resolveImageUrl } from '../config';

const cn = (...inputs: (string | undefined | null | false)[]) => inputs.filter(Boolean).join(' ');

/**
 * Menu Designer v2.0 (Flutter Flow Synchronization)
 * Merged Management Suite for Categories & Items
 */
export default function MenuDesigner() {
  const [viewMode, setViewMode] = useState<'products' | 'categories'>('products');
  const [menu, setMenu] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  
  // Selection states
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  
  // UI / Search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecipeExpanded, setIsRecipeExpanded] = useState(false);
  const [isIngSearchOpen, setIsIngSearchOpen] = useState(false);
  const [ingSearchQuery, setIngSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Draft states
  const [recipeDraft, setRecipeDraft] = useState({ inventory_id: '', quantity: '', unit: '' });
  const [variantDraft, setVariantDraft] = useState({ name: '', price_offset: 0 });
  const [extraDraft, setExtraDraft] = useState({ name: '', price: 0 });

  useEffect(() => {
    fetchMenu();
    fetchInventory();
    fetchSettings();
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsIngSearchOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/settings?t=${Date.now()}`);
      const data = await res.json();
      setSettings(data);
    } catch (err) { console.error('Settings Error:', err); }
  };

  const fetchMenu = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/menu`);
      const data = await res.json();
      setMenu(data);
    } catch (err) { console.error('Menu Fetch Error:', err); }
  };

  const fetchInventory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/inventory`);
      const data = await res.json();
      setInventory(data.map((i: any) => ({ ...i, cost_price: i.cost_price || 15.00 })));
    } catch (err) { console.error('Inventory Error:', err); }
  };

  // --- HANDLERS ---

  const handleSelectItem = (item: any) => {
    const sanitizedItem = {
      ...item,
      variants: item.variants || [],
      extras: item.extras || [],
      in_stock: item.in_stock ?? true,
      prep_station: item.prep_station || 'General',
      description: item.description || '',
      recipe: (item.recipe || []).map((r: any) => {
        const inv = inventory.find(i => i.id === r.inventory_id);
        return { ...r, cost_price: inv?.cost_price || 0 };
      })
    };
    setSelectedItem(JSON.parse(JSON.stringify(sanitizedItem)));
    setSelectedItemOriginal(JSON.parse(JSON.stringify(sanitizedItem)));
    setIsRecipeExpanded(false);
  };

  const [selectedItemOriginal, setSelectedItemOriginal] = useState<any>(null);

  const handleSelectCategory = (cat: any) => {
    setSelectedCategory(JSON.parse(JSON.stringify(cat)));
  };

  const handleAddNewItem = () => {
    const newItem = {
      id: 'temp-' + Date.now(),
      name: 'New Product',
      price: 0,
      category_id: menu[0]?.id || '',
      description: '',
      image: '',
      recipe: [],
      variants: [],
      extras: [],
      in_stock: true,
      prep_station: 'General'
    };
    setSelectedItem(newItem);
    setSelectedItemOriginal(null);
  };

  const handleAddNewCategory = () => {
    const newCat = {
      id: 'temp-' + Date.now(),
      title: 'New Category',
      description: '',
      image: ''
    };
    setSelectedCategory(newCat);
  };

  const saveProduct = async () => {
    if (!selectedItem) return;
    setIsSubmitting(true);
    try {
      const isNew = typeof selectedItem.id === 'string' && selectedItem.id.startsWith('temp-');
      const method = isNew ? 'POST' : 'PUT';
      const url = isNew ? `${API_BASE_URL}/menu/items` : `${API_BASE_URL}/menu/items/${selectedItem.id}`;
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedItem)
      });
      if (res.ok) { fetchMenu(); alert('Product System Synced'); }
    } catch (err) { alert('Sync Failed'); } finally { setIsSubmitting(false); }
  };

  const saveCategory = async () => {
    if (!selectedCategory) return;
    setIsSubmitting(true);
    try {
      const isNew = typeof selectedCategory.id === 'string' && selectedCategory.id.startsWith('temp-');
      const method = isNew ? 'POST' : 'PUT';
      const url = isNew ? `${API_BASE_URL}/menu/categories` : `${API_BASE_URL}/menu/categories/${selectedCategory.id}`;
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...selectedCategory, name: selectedCategory.title })
      });
      if (res.ok) { fetchMenu(); alert('Category Map Updated'); }
    } catch (err) { alert('Sync Failed'); } finally { setIsSubmitting(false); }
  };

  // --- HELPERS ---

  const currency = settings?.tenant?.currency || 'USD';
  const prepStations = ['General', 'Grill', 'Bar', 'Fryer', 'Salad', 'Dessert'];

  const commitRecipeDraft = () => {
    if (!recipeDraft.inventory_id || !recipeDraft.quantity || !recipeDraft.unit) return;
    const ingredient = inventory.find(i => i.id === parseInt(recipeDraft.inventory_id));
    if (!ingredient) return;

    let baseQty = parseFloat(recipeDraft.quantity);
    if (ingredient.unit === 'kg' && recipeDraft.unit === 'gram') baseQty = baseQty / 1000;
    if (ingredient.unit === 'liter' && recipeDraft.unit === 'ml') baseQty = baseQty / 1000;

    setSelectedItem((prev: any) => ({
      ...prev,
      recipe: [...prev.recipe, { 
        inventory_id: ingredient.id, 
        ingredient_name: ingredient.name, 
        quantity: baseQty, 
        unit: ingredient.unit,
        display_qty: recipeDraft.quantity,
        display_unit: recipeDraft.unit,
        cost_price: ingredient.cost_price
      }]
    }));
    setRecipeDraft({ inventory_id: '', quantity: '', unit: '' });
    setIsIngSearchOpen(false);
  };

  const financials = calculateFinancials();
  function calculateFinancials() {
    if (!selectedItem) return { totalCost: 0, gp: 0, fcPercent: 0 };
    const totalCost = selectedItem.recipe.reduce((sum: number, r: any) => sum + (r.quantity * (r.cost_price || 0)), 0);
    return { 
      totalCost, 
      gp: (selectedItem.price || 0) - totalCost, 
      fcPercent: selectedItem.price > 0 ? (totalCost / selectedItem.price) * 100 : 0 
    };
  }

  const allItems = menu.flatMap(cat => (cat.items || []).map((i: any) => ({ ...i, categoryName: cat.title || cat.name })));
  const filteredProducts = allItems.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredCategories = menu.filter(c => (c.title || c.name).toLowerCase().includes(searchQuery.toLowerCase()));

  const filteredInventory = inventory.filter(i => i.name.toLowerCase().includes(ingSearchQuery.toLowerCase()));
  const selectedIngredient = inventory.find(i => i.id === parseInt(recipeDraft.inventory_id));

  return (
    <div className="h-full flex overflow-hidden bg-[#F8FAFC]">
      {/* COLUMN 1: NAVIGATION MODE */}
      <aside className="w-24 bg-white border-r border-slate-200 flex flex-col items-center py-8 gap-6 z-10 shadow-sm">
        <div className="w-14 h-14 bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-zamzam-yellow mb-6 shadow-2xl"><UtensilsCrossed size={28} strokeWidth={2.5} /></div>
        
        <button onClick={() => { setViewMode('products'); setSelectedItem(null); setSelectedCategory(null); }} className={cn("w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all", viewMode === 'products' ? "bg-zamzam-teal text-white shadow-xl shadow-teal-500/20 scale-110" : "text-slate-400 hover:bg-slate-50")}>
           <ShoppingBag size={22} />
           <span className="text-[8px] font-bold uppercase tracking-tighter">Products</span>
        </button>

        <button onClick={() => { setViewMode('categories'); setSelectedItem(null); setSelectedCategory(null); }} className={cn("w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all", viewMode === 'categories' ? "bg-zamzam-teal text-white shadow-xl shadow-teal-500/20 scale-110" : "text-slate-400 hover:bg-slate-50")}>
           <LayoutGrid size={22} />
           <span className="text-[8px] font-bold uppercase tracking-tighter">Categories</span>
        </button>

        <div className="mt-auto pt-6 border-t border-slate-100 w-full flex flex-col items-center gap-4">
           <button className="text-slate-300 hover:text-slate-500 transition-colors"><Settings size={20} /></button>
        </div>
      </aside>

      {/* COLUMN 2: THE LIST (Catalog or Categories) */}
      <aside className="w-[400px] bg-white border-r border-slate-200 flex flex-col overflow-hidden shadow-inner">
         <div className="p-8 pb-6">
            <div className="flex items-center justify-between mb-6">
               <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">{viewMode === 'products' ? 'Product' : 'Category'} <span className="text-zamzam-teal">Vault</span></h2>
               <button onClick={viewMode === 'products' ? handleAddNewItem : handleAddNewCategory} className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-slate-800 transition-all shadow-lg active:scale-95"><Plus size={20} strokeWidth={3} /></button>
            </div>
            <div className="relative group">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
               <input type="text" placeholder={`Search ${viewMode}...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-6 text-xs font-bold uppercase outline-none focus:border-zamzam-teal shadow-inner" />
            </div>
         </div>

         <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 no-scrollbar">
            {viewMode === 'products' ? (
              filteredProducts.map((item) => (
                <div key={item.id} onClick={() => handleSelectItem(item)} className={cn("p-5 rounded-[2rem] border transition-all cursor-pointer flex items-center gap-5 group", selectedItem?.id === item.id ? "bg-slate-900 border-slate-900 shadow-2xl scale-[1.02]" : "bg-white border-transparent hover:border-slate-100")}>
                   <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg shrink-0 border-2 border-white group-hover:scale-110 transition-transform"><img src={resolveImageUrl(item.image)} className="w-full h-full object-cover" /></div>
                   <div className="flex-1 min-w-0">
                      <p className={cn("text-[9px] font-bold uppercase tracking-widest mb-1", selectedItem?.id === item.id ? "text-zamzam-yellow" : "text-zamzam-teal")}>{item.categoryName}</p>
                      <h3 className={cn("text-xs font-bold uppercase truncate", selectedItem?.id === item.id ? "text-white" : "text-slate-900")}>{item.name}</h3>
                      <p className={cn("text-xs font-bold mt-1", selectedItem?.id === item.id ? "text-white/60" : "text-slate-400")}>{item.price} {currency}</p>
                   </div>
                   <ChevronRight size={18} className={cn("transition-transform", selectedItem?.id === item.id ? "text-zamzam-yellow translate-x-2" : "text-slate-200")} />
                </div>
              ))
            ) : (
              filteredCategories.map((cat) => (
                <div key={cat.id} onClick={() => handleSelectCategory(cat)} className={cn("p-6 rounded-[2.5rem] border transition-all cursor-pointer flex items-center justify-between group", selectedCategory?.id === cat.id ? "bg-slate-900 border-slate-900 shadow-2xl scale-[1.02]" : "bg-white border-transparent hover:border-slate-100")}>
                   <div className="flex items-center gap-5">
                      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shadow-lg", selectedCategory?.id === cat.id ? "bg-zamzam-teal text-white" : "bg-slate-50 text-slate-900")}>{(cat.title || cat.name).charAt(0)}</div>
                      <div>
                         <h3 className={cn("text-[11px] font-bold uppercase tracking-widest", selectedCategory?.id === cat.id ? "text-white" : "text-slate-900")}>{cat.title || cat.name}</h3>
                         <p className={cn("text-[9px] font-bold uppercase mt-1", selectedCategory?.id === cat.id ? "text-white/40" : "text-slate-400")}>{(cat.items || []).length} Products Linked</p>
                      </div>
                   </div>
                   <ChevronRight size={18} className={cn("transition-transform", selectedCategory?.id === cat.id ? "text-zamzam-teal translate-x-2" : "text-slate-200")} />
                </div>
              ))
            )}
         </div>
      </aside>

      {/* COLUMN 3: MISSION CONTROL (THE FORM) */}
      <main className="flex-1 overflow-y-auto no-scrollbar bg-slate-50/30 relative">
        <AnimatePresence mode="wait">
          {viewMode === 'products' && selectedItem ? (
            <motion.div key={selectedItem.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-12 max-w-[1400px] mx-auto space-y-10">
               {/* Header Header */}
               <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-4xl font-bold text-slate-900 uppercase tracking-tighter mb-2">{selectedItem.name}</h1>
                    <div className="flex items-center gap-3">
                       <span className="px-3 py-1 bg-slate-900 text-white text-[9px] font-bold uppercase rounded-lg tracking-widest">{selectedItem.categoryName || 'Uncategorized'}</span>
                       <span className="text-slate-300">/</span>
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Product Mission Control</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                     <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Selling Price</p>
                        <p className="text-4xl font-bold text-zamzam-teal">{selectedItem.price} <span className="text-sm font-bold">{currency}</span></p>
                     </div>
                     <button onClick={saveProduct} disabled={isSubmitting} className="bg-slate-900 text-white font-bold px-12 py-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-2 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"><Save size={24} /><span className="text-[10px] uppercase tracking-[0.2em]">{isSubmitting ? 'Saving...' : 'Deploy'}</span></button>
                  </div>
               </div>

               <div className="grid grid-cols-12 gap-10">
                  {/* Left Form: Details */}
                  <div className="col-span-12 lg:col-span-5 space-y-8">
                     <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-8">
                        <div className="flex items-center gap-4 text-slate-900"><div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center"><Edit2 size={20} /></div><h3 className="text-lg font-bold uppercase">Core Details</h3></div>
                        <div className="space-y-6">
                           <div className="space-y-2">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Product Name</p>
                              <input value={selectedItem.name} onChange={(e) => setSelectedItem((p: any) => ({ ...p, name: e.target.value }))} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold uppercase outline-none focus:border-zamzam-teal transition-all" />
                           </div>
                           <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-2">
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Price ({currency})</p>
                                 <input type="number" value={selectedItem.price} onChange={(e) => setSelectedItem((p: any) => ({ ...p, price: parseFloat(e.target.value) }))} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:border-zamzam-teal transition-all" />
                              </div>
                              <div className="space-y-2">
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Category</p>
                                 <select value={selectedItem.category_id} onChange={(e) => setSelectedItem((p: any) => ({ ...p, category_id: e.target.value }))} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-[11px] font-bold uppercase outline-none focus:border-zamzam-teal appearance-none cursor-pointer">
                                    {menu.map(c => <option key={c.id} value={c.id}>{c.title || c.name}</option>)}
                                 </select>
                              </div>
                           </div>
                           <div className="space-y-2">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Description</p>
                              <textarea value={selectedItem.description} onChange={(e) => setSelectedItem((p: any) => ({ ...p, description: e.target.value }))} rows={3} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-xs font-bold outline-none focus:border-zamzam-teal transition-all no-scrollbar" placeholder="Enter product description for POS & Web..." />
                           </div>
                           <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-2">
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Prep Station</p>
                                 <select value={selectedItem.prep_station} onChange={(e) => setSelectedItem((p: any) => ({ ...p, prep_station: e.target.value }))} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-[11px] font-bold uppercase outline-none focus:border-zamzam-teal appearance-none cursor-pointer">
                                    {prepStations.map(s => <option key={s} value={s}>{s}</option>)}
                                 </select>
                              </div>
                              <div className="flex items-center justify-between pt-6">
                                 <div className="flex items-center gap-3">
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors", selectedItem.in_stock ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>{selectedItem.in_stock ? <CheckCircle2 size={20} /> : <Ban size={20} />}</div>
                                    <span className="text-[10px] font-bold uppercase">{selectedItem.in_stock ? 'In Stock' : 'Out of Stock'}</span>
                                 </div>
                                 <button onClick={() => setSelectedItem((p: any) => ({ ...p, in_stock: !p.in_stock }))} className={cn("w-12 h-6 rounded-full relative transition-all", selectedItem.in_stock ? "bg-green-500" : "bg-slate-300")}><motion.div animate={{ x: selectedItem.in_stock ? 26 : 4 }} className="absolute top-1 w-4 h-4 bg-white rounded-full" /></button>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Right Form: Advanced Specs */}
                  <div className="col-span-12 lg:col-span-7 space-y-8">
                     <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-zamzam-teal/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                        <div className="flex items-center gap-4 mb-10"><div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-zamzam-yellow shadow-xl"><FlaskConical size={24} strokeWidth={2.5} /></div><div><h3 className="text-xl font-bold uppercase">Recipe Engine</h3><p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Inventory Linking & Costing</p></div></div>
                        
                        <div className="space-y-4 mb-10">
                           {selectedItem.recipe.map((r: any, i: number) => (
                             <div key={i} className="flex items-center justify-between bg-white/5 p-5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-all">
                                <div><p className="text-xs font-bold uppercase tracking-widest text-zamzam-yellow">{r.ingredient_name}</p><p className="text-[9px] font-bold text-white/40 uppercase mt-1">Cost contribution: {(r.quantity * (r.cost_price || 0)).toFixed(2)} {currency}</p></div>
                                <div className="flex items-center gap-6"><span className="text-xs font-bold">{r.display_qty || r.quantity} {r.display_unit || r.unit}</span><button onClick={() => setSelectedItem((p: any) => ({ ...p, recipe: p.recipe.filter((_: any, idx: number) => idx !== i) }))} className="text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button></div>
                             </div>
                           ))}
                        </div>

                        <div className="grid grid-cols-12 gap-4" ref={dropdownRef}>
                           <div className="col-span-12 relative">
                              <button onClick={() => setIsIngSearchOpen(!isIngSearchOpen)} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-6 py-5 text-left flex items-center justify-between hover:bg-slate-700 transition-all shadow-inner"><div className="flex items-center gap-4"><Search size={20} className="text-zamzam-yellow" /><p className="text-sm font-bold text-white/40 uppercase">{selectedIngredient ? selectedIngredient.name : 'Find Inventory Item...'}</p></div><ChevronDown className={cn("text-zamzam-yellow transition-transform", isIngSearchOpen ? "rotate-180" : "0")} /></button>
                              <AnimatePresence>{isIngSearchOpen && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute left-0 right-0 top-full mt-4 bg-white rounded-[2rem] shadow-[0_30px_90px_rgba(0,0,0,0.6)] z-[100] overflow-hidden"><div className="p-4 border-b border-slate-100 bg-slate-50"><input autoFocus placeholder="SEARCH..." value={ingSearchQuery} onChange={(e) => setIngSearchQuery(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold uppercase outline-none text-slate-900" /></div><div className="max-h-[250px] overflow-y-auto no-scrollbar p-2">{filteredInventory.map(i => (<button key={i.id} onClick={() => { setRecipeDraft(p => ({ ...p, inventory_id: i.id.toString(), unit: i.unit })); setIsIngSearchOpen(false); }} className="w-full text-left px-6 py-4 rounded-xl flex items-center justify-between hover:bg-slate-50 transition-all mb-1"><div><p className="text-xs font-bold uppercase text-slate-900">{i.name}</p><p className="text-[9px] font-bold text-slate-400 uppercase">Unit: {i.unit}</p></div><ChevronRight size={14} className="text-slate-200" /></button>))}</div></motion.div>
                              )}</AnimatePresence>
                           </div>
                           <div className="col-span-12 grid grid-cols-12 gap-4 mt-2">
                              <input type="number" placeholder="QTY" value={recipeDraft.quantity} onChange={(e) => setRecipeDraft(p => ({ ...p, quantity: e.target.value }))} className="col-span-5 bg-slate-800 border border-slate-700 rounded-2xl px-6 py-5 text-sm font-bold text-white outline-none focus:border-zamzam-yellow transition-all" />
                              <select value={recipeDraft.unit} onChange={(e) => setRecipeDraft(p => ({ ...p, unit: e.target.value }))} className="col-span-4 bg-slate-800 border border-slate-700 rounded-2xl px-5 py-5 text-[11px] font-bold text-zamzam-yellow uppercase outline-none cursor-pointer">
                                 <option value="">UNIT</option>
                                 {selectedIngredient?.unit === 'kg' && <><option value="kg">KG</option><option value="gram">G</option></>}
                                 {selectedIngredient?.unit === 'liter' && <><option value="liter">L</option><option value="ml">ML</option></>}
                                 {selectedIngredient?.unit === 'unit' && <option value="unit">UNIT</option>}
                              </select>
                              <button onClick={commitRecipeDraft} className="col-span-3 bg-zamzam-yellow text-slate-900 rounded-2xl font-bold text-sm shadow-xl shadow-yellow-500/20 active:scale-95 transition-all"><Plus size={24} strokeWidth={3} className="mx-auto" /></button>
                           </div>
                        </div>

                        <div className="grid grid-cols-3 gap-8 mt-12 pt-12 border-t border-white/10">
                           <div className="space-y-1"><p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Plate Cost</p><p className="text-2xl font-bold text-white">{financials.totalCost.toFixed(2)} <span className="text-[10px] text-white/40">{currency}</span></p></div>
                           <div className="space-y-1 text-center"><p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Food Cost %</p><p className={cn("text-2xl font-bold", financials.fcPercent > 35 ? "text-red-400" : "text-zamzam-teal")}>{financials.fcPercent.toFixed(1)}%</p></div>
                           <div className="space-y-1 text-right"><p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Gross Profit</p><p className="text-2xl font-bold text-zamzam-yellow">{financials.gp.toFixed(2)} {currency}</p></div>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-8">
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-lg space-y-6">
                           <div className="flex items-center gap-3 text-slate-900"><Maximize2 size={20} /><h4 className="text-xs font-bold uppercase">Variants</h4></div>
                           <div className="space-y-2 max-h-[150px] overflow-y-auto no-scrollbar">
                              {selectedItem.variants.map((v: any, i: number) => (
                                <div key={i} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 group"><span className="text-[10px] font-bold uppercase text-slate-900">{v.name}</span><div className="flex items-center gap-4"><span className="text-[10px] font-bold text-zamzam-teal">+{v.price_offset} {currency}</span><button onClick={() => setSelectedItem((p: any) => ({ ...p, variants: p.variants.filter((_: any, idx: number) => idx !== i) }))} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12} /></button></div></div>
                              ))}
                           </div>
                           <div className="flex gap-2">
                              <input placeholder="SIZE/TYPE..." value={variantDraft.name} onChange={(e) => setVariantDraft(p => ({ ...p, name: e.target.value }))} className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-bold uppercase outline-none focus:border-zamzam-teal transition-all" />
                              <button onClick={() => { if (variantDraft.name) { setSelectedItem((p: any) => ({ ...p, variants: [...p.variants, variantDraft] })); setVariantDraft({ name: '', price_offset: 0 }); } }} className="bg-slate-900 text-white p-3 rounded-xl"><Plus size={16} /></button>
                           </div>
                        </div>
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-lg space-y-6">
                           <div className="flex items-center gap-3 text-slate-900"><Zap size={20} /><h4 className="text-xs font-bold uppercase">Add-ons</h4></div>
                           <div className="space-y-2 max-h-[150px] overflow-y-auto no-scrollbar">
                              {selectedItem.extras.map((e: any, i: number) => (
                                <div key={i} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 group"><span className="text-[10px] font-bold uppercase text-slate-900">{e.name}</span><div className="flex items-center gap-4"><span className="text-[10px] font-bold text-zamzam-teal">{e.price} {currency}</span><button onClick={() => setSelectedItem((p: any) => ({ ...p, extras: p.extras.filter((_: any, idx: number) => idx !== i) }))} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12} /></button></div></div>
                              ))}
                           </div>
                           <div className="flex gap-2">
                              <input placeholder="EXTRA..." value={extraDraft.name} onChange={(e) => setExtraDraft(p => ({ ...p, name: e.target.value }))} className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-bold uppercase outline-none focus:border-zamzam-teal transition-all" />
                              <button onClick={() => { if (extraDraft.name) { setSelectedItem((p: any) => ({ ...p, extras: [...p.extras, extraDraft] })); setExtraDraft({ name: '', price: 0 }); } }} className="bg-slate-900 text-white p-3 rounded-xl"><Plus size={16} /></button>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </motion.div>
          ) : viewMode === 'categories' && selectedCategory ? (
            <motion.div key={selectedCategory.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-12 max-w-[1000px] mx-auto space-y-12">
               <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-5xl font-bold text-slate-900 uppercase tracking-tighter mb-2">{selectedCategory.title || selectedCategory.name}</h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Category Management Hub</p>
                  </div>
                  <button onClick={saveCategory} disabled={isSubmitting} className="bg-zamzam-teal text-white font-bold px-12 py-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-2 hover:bg-teal-400 transition-all active:scale-95 disabled:opacity-50"><Save size={24} /><span className="text-[10px] uppercase tracking-[0.2em]">{isSubmitting ? 'Syncing...' : 'Save Category'}</span></button>
               </div>

               <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-2xl space-y-10">
                  <div className="grid grid-cols-2 gap-10">
                     <div className="space-y-8">
                        <div className="space-y-3">
                           <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Display Title</p>
                           <input value={selectedCategory.title || selectedCategory.name} onChange={(e) => setSelectedCategory((p: any) => ({ ...p, title: e.target.value, name: e.target.value }))} className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] p-6 text-lg font-bold uppercase outline-none focus:border-zamzam-teal transition-all shadow-inner" />
                        </div>
                        <div className="space-y-3">
                           <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Description (Web & App)</p>
                           <textarea value={selectedCategory.description} onChange={(e) => setSelectedCategory((p: any) => ({ ...p, description: e.target.value }))} rows={4} className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] p-6 text-sm font-bold outline-none focus:border-zamzam-teal transition-all shadow-inner no-scrollbar" placeholder="Describe this category for customers..." />
                        </div>
                     </div>
                     <div className="space-y-8">
                        <div className="space-y-3">
                           <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Category Visual</p>
                           <div className="w-full aspect-video bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 text-slate-300 hover:text-zamzam-teal hover:border-zamzam-teal transition-all cursor-pointer overflow-hidden group">
                              {selectedCategory.image ? (
                                <img src={resolveImageUrl(selectedCategory.image)} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              ) : (
                                <><ImageIcon size={48} strokeWidth={1.5} /><span className="text-[10px] font-bold uppercase tracking-widest">Upload Cover Image</span></>
                              )}
                           </div>
                        </div>
                        <div className="p-8 bg-slate-900 rounded-[2rem] text-white">
                           <div className="flex items-center gap-4 mb-4"><div className="w-10 h-10 bg-zamzam-teal rounded-xl flex items-center justify-center text-white"><Package size={20} /></div><h4 className="text-xs font-bold uppercase tracking-widest">Inventory Load</h4></div>
                           <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">This category currently manages <span className="text-white">{(selectedCategory.items || []).length}</span> live products in the POS catalog.</p>
                        </div>
                     </div>
                  </div>
               </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-200">
               <motion.div animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: "linear" }}><PieChart size={160} strokeWidth={0.5} className="opacity-30" /></motion.div>
               <h2 className="text-2xl font-bold uppercase tracking-[0.6em] mt-12 text-slate-300">Design Hub</h2>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
