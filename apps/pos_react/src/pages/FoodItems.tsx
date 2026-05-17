import { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Folder, 
  Image as ImageIcon,
  Search,
  CheckCircle2,
  AlertCircle,
  UtensilsCrossed,
  ChefHat,
  LayoutGrid,
  ChevronRight,
  Save,
  FlaskConical,
  Zap,
  Maximize2,
  X,
  Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL, resolveImageUrl } from '../config';

const cn = (...inputs: (string | undefined | null | false)[]) => inputs.filter(Boolean).join(' ');

export default function FoodItems() {
  const [menu, setMenu] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({
    id: null,
    name: '',
    price: 0,
    category_id: '',
    prep_station: 'General',
    description: '',
    image: '',
    sale_price: 0,
    is_available: true,
    is_featured: false,
    badge: '',
    variants: [],
    extras: [],
    recipe: []
  });

  // Draft states for additions
  const [variantDraft, setVariantDraft] = useState({ name: '', price_offset: '' as any, sale_price_offset: null as number | null, inventory_id: '', quantity: '' });
  const [extraDraft, setExtraDraft] = useState({ name: '', price: '' as any, sale_price: null as number | null, inventory_id: '', quantity: '' });
  const [recipeDraft, setRecipeDraft] = useState({ inventory_id: '', quantity: '' });

  const prepStations = ['General', 'Grill', 'Bar', 'Fryer', 'Salad', 'Dessert'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [menuRes, invRes] = await Promise.all([
        fetch(`${API_BASE_URL}/menu`),
        fetch(`${API_BASE_URL}/inventory`)
      ]);
      const menuData = await menuRes.json();
      const invData = await invRes.json();
      
      setMenu(menuData);
      setInventory(invData);
    } catch (err) {
      console.error('Fetch Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (item: any) => {
    setSelectedItem(item);
    setFormData({
      ...item,
      id: parseInt(item.id),
      price: parseFloat(item.price),
      category_id: item.category_id?.toString() || '',
      is_available: Boolean(item.is_available),
      is_featured: Boolean(item.is_featured),
      sale_price: item.sale_price ? parseFloat(item.sale_price) : 0,
      variants: (item.variants || []).map((v: any) => ({
        ...v,
        inventory_id: v.inventory_item_id || '',
        quantity: v.quantity_required || ''
      })),
      extras: (item.extras || []).map((e: any) => ({
        ...e,
        inventory_id: e.inventory_item_id || '',
        quantity: e.quantity_required || ''
      })),
      recipe: item.recipe || []
    });
  };

  const handleAddNew = () => {
    setSelectedItem({ id: 'new' });
    setFormData({
      id: null,
      name: '',
      price: 0,
      category_id: menu[0]?.id || '',
      prep_station: 'General',
      description: '',
      image: '',
      is_available: true,
      is_featured: false,
      sale_price: 0,
      badge: '',
      variants: [],
      extras: [],
      recipe: []
    });
  };

  const handleDelete = async (id: any) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/menu/items/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchData();
        if (formData.id === parseInt(id)) {
            setSelectedItem(null);
            resetForm();
        }
      }
    } catch (err) {
      console.error('Delete Error:', err);
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!formData.name || !formData.category_id) return;
    setIsSubmitting(true);

    try {
      // Merge current drafts if they have names but weren't "added" via the (+) button
      let finalVariants = [...formData.variants];
      if (variantDraft.name) {
        finalVariants = finalVariants.filter(v => v.name !== variantDraft.name);
        finalVariants.push(variantDraft);
      }

      let finalExtras = [...formData.extras];
      if (extraDraft.name) {
        finalExtras = finalExtras.filter(e => e.name !== extraDraft.name);
        finalExtras.push(extraDraft);
      }

      const finalData = {
        ...formData,
        variants: finalVariants,
        extras: finalExtras
      };

      const isEdit = formData.id !== null;
      const url = isEdit 
        ? `${API_BASE_URL}/menu/items/${formData.id}` 
        : `${API_BASE_URL}/menu/items`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData)
      });

      if (res.ok) {
        fetchData();
        const data = await res.json();
        if (!isEdit && data.itemId) {
            handleEdit({ ...formData, id: data.itemId });
        }
        alert('Product Synchronized Successfully');
      } else {
        alert('Failed to sync product');
      }
    } catch (err) {
      console.error('Submit Error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedItem(null);
    setFormData({
        id: null,
        name: '',
        price: 0,
        category_id: '',
        prep_station: 'General',
        description: '',
        image: '',
        is_available: true,
        is_featured: false,
        sale_price: 0,
        badge: '',
        variants: [],
        extras: [],
        recipe: []
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append('image', file);

    try {
      setIsSubmitting(true);
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formDataUpload
      });
      const data = await res.json();
      if (data.success) {
        setFormData((prev: any) => ({ ...prev, image: data.path }));
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const allItems = menu.flatMap(cat => 
    (cat.items || []).map((i: any) => ({ ...i, categoryName: cat.name || cat.title }))
  );
  
  const filteredItems = allItems.filter(i => 
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full bg-[#F8FAFC] p-8 overflow-hidden flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-slate-900/10">
            <ChefHat size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight uppercase">Food Item <span className="text-zamzam-teal">Management</span></h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">Configure your digital culinary catalog</p>
          </div>
        </div>
        <button 
          onClick={handleAddNew}
          className="bg-zamzam-teal text-white px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-teal-500/20 flex items-center gap-3 hover:bg-teal-600 transition-all active:scale-95 group"
        >
          <Plus size={20} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
          Add New Product
        </button>
      </div>

      <div className="flex-1 flex gap-10 min-h-0">
        {/* Left Section: Item List */}
        <div className="flex-[1] bg-white rounded-[3rem] p-8 shadow-sm border border-slate-100 flex flex-col gap-6 min-w-0">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-zamzam-teal transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="SEARCH PRODUCTS..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-14 pr-8 text-[10px] font-bold uppercase outline-none focus:border-zamzam-teal focus:bg-white transition-all shadow-inner"
            />
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-2">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-60 text-slate-200">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                  <ChefHat size={48} strokeWidth={1} />
                </motion.div>
                <p className="text-[10px] font-bold uppercase tracking-widest mt-6">Syncing Inventory...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-60 text-slate-200 gap-4">
                <UtensilsCrossed size={48} strokeWidth={1} className="opacity-50" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">No items detected</p>
              </div>
            ) : (
              <div className="bg-slate-50/50 rounded-[2rem] border border-slate-100 overflow-hidden shadow-inner flex-1 flex flex-col min-h-0">
                <div className="overflow-y-auto no-scrollbar flex-1">
                  <table className="w-full text-left">
                    <thead className="bg-white border-b border-slate-100 sticky top-0 z-10">
                      <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <th className="pl-6 py-4">Item</th>
                        <th className="px-4 py-4">Category</th>
                        <th className="px-4 py-4 text-center">Price</th>
                        <th className="pr-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/50">
                      {filteredItems.map((item) => (
                        <tr 
                          key={item.id} 
                          onClick={() => handleEdit(item)}
                          className={cn(
                            "group cursor-pointer transition-colors",
                            formData.id === parseInt(item.id) ? "bg-slate-900 text-white" : "bg-white hover:bg-slate-50"
                          )}
                        >
                          <td className="pl-6 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md shrink-0 border border-white/20">
                                <img src={resolveImageUrl(item.image) || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'} className="w-full h-full object-cover" alt={item.name} />
                              </div>
                              <p className={cn("text-[11px] font-bold uppercase truncate max-w-[120px]", formData.id === parseInt(item.id) ? "text-white" : "text-slate-900")}>{item.name}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase tracking-widest border",
                              formData.id === parseInt(item.id) ? "bg-white/10 border-white/20 text-white" : "bg-teal-50 border-teal-100 text-teal-600"
                            )}>
                              {item.categoryName}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <p className={cn("text-[11px] font-bold", formData.id === parseInt(item.id) ? "text-zamzam-yellow" : "text-slate-900")}>{item.price} <span className="text-[8px] opacity-60">GBP</span></p>
                          </td>
                          <td className="pr-6 py-3">
                            <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); handleEdit(item); }} className={cn("w-7 h-7 rounded-lg flex items-center justify-center transition-all", formData.id === parseInt(item.id) ? "bg-white/10 text-white" : "bg-slate-50 text-slate-400 hover:text-teal-500 hover:bg-teal-50")}><Edit2 size={12} /></button>
                              <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className={cn("w-7 h-7 rounded-lg flex items-center justify-center transition-all", formData.id === parseInt(item.id) ? "bg-red-500/20 text-red-400" : "bg-red-50 text-red-500 hover:bg-red-500 hover:text-white")}><Trash2 size={12} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Form */}
        <div className="flex-[2.2] bg-white rounded-[3.5rem] p-12 shadow-2xl border border-slate-100 flex flex-col gap-10 min-w-0 overflow-y-auto no-scrollbar relative">
          {!selectedItem ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-200">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: "linear" }}>
                  <FlaskConical size={120} strokeWidth={0.5} className="opacity-30" />
                </motion.div>
                <h2 className="text-xl font-bold uppercase tracking-[0.6em] mt-12 text-slate-300">Catalog Design Hub</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">Select a product to begin optimization</p>
             </div>
          ) : (
            <motion.form 
              key={selectedItem.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleSubmit} 
              className="space-y-10"
            >
              {/* Form Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-slate-900 text-zamzam-yellow rounded-[1.8rem] flex items-center justify-center shadow-2xl overflow-hidden border-2 border-slate-800">
                    {formData.image ? (
                      <img 
                        src={resolveImageUrl(formData.image)} 
                        className="w-full h-full object-cover" 
                        alt="Preview"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500';
                        }}
                      />
                    ) : (
                      formData.id ? <Edit2 size={32} /> : <Plus size={32} strokeWidth={3} />
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tighter">
                      {formData.id ? 'Edit Food Item' : 'Create Food Item'}
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                      {formData.id ? 'Refine product data details' : 'Initialize culinary node'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="bg-zamzam-teal text-white px-10 py-6 rounded-[2rem] font-bold uppercase tracking-widest shadow-2xl shadow-teal-500/20 flex items-center gap-3 hover:bg-teal-600 transition-all active:scale-95 disabled:opacity-50"
                    >
                        <Save size={20} />
                        {isSubmitting ? 'Syncing...' : 'Save Changes'}
                    </button>
                    <button type="button" onClick={resetForm} className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-200 transition-all"><X size={24} /></button>
                </div>
              </div>

              {/* CORE DATA GRID */}
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Item Name</label>
                        <input value={formData.name} onChange={(e) => setFormData((p: any) => ({ ...p, name: e.target.value }))} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold uppercase outline-none focus:border-zamzam-teal transition-all shadow-inner" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Price (£)</label>
                            <input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData((p: any) => ({ ...p, price: parseFloat(e.target.value) }))} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:border-zamzam-teal transition-all shadow-inner" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Sale Price (£)</label>
                            <input type="number" step="0.01" value={formData.sale_price} onChange={(e) => setFormData((p: any) => ({ ...p, sale_price: parseFloat(e.target.value) }))} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:border-zamzam-teal transition-all shadow-inner" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Category</label>
                            <select value={formData.category_id} onChange={(e) => setFormData((p: any) => ({ ...p, category_id: e.target.value }))} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-[11px] font-bold uppercase outline-none focus:border-zamzam-teal appearance-none cursor-pointer">
                                {menu.map(c => <option key={c.id} value={c.id}>{c.name || c.title}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Description</label>
                        <textarea value={formData.description} onChange={(e) => setFormData((p: any) => ({ ...p, description: e.target.value }))} rows={3} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-xs font-bold outline-none focus:border-zamzam-teal transition-all shadow-inner no-scrollbar" placeholder="Public product details..." />
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Prep Station</label>
                        <select value={formData.prep_station} onChange={(e) => setFormData((p: any) => ({ ...p, prep_station: e.target.value }))} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-[11px] font-bold uppercase outline-none focus:border-zamzam-teal appearance-none cursor-pointer">
                            {prepStations.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Image Path</label>
                        <div className="flex gap-4">
                            <input 
                              type="file" 
                              ref={fileInputRef} 
                              onChange={handleFileUpload} 
                              className="hidden" 
                              accept="image/*" 
                            />
                            <input value={formData.image} onChange={(e) => setFormData((p: any) => ({ ...p, image: e.target.value }))} className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-5 text-xs font-bold outline-none focus:border-zamzam-teal transition-all shadow-inner" />
                            <button 
                              type="button" 
                              onClick={() => fileInputRef.current?.click()}
                              className="w-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-200 transition-all"
                            >
                              <Folder size={20} />
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6 pt-2">
                        <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                           <span className="text-[10px] font-bold uppercase">Available</span>
                           <button type="button" onClick={() => setFormData((p: any) => ({ ...p, is_available: !p.is_available }))} className={cn("w-10 h-5 rounded-full relative transition-all", formData.is_available ? "bg-green-500" : "bg-slate-300")}><motion.div animate={{ x: formData.is_available ? 22 : 4 }} className="absolute top-1 w-3 h-3 bg-white rounded-full" /></button>
                        </div>
                        <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                           <span className="text-[10px] font-bold uppercase">Featured</span>
                           <button type="button" onClick={() => setFormData((p: any) => ({ ...p, is_featured: !p.is_featured }))} className={cn("w-10 h-5 rounded-full relative transition-all", formData.is_featured ? "bg-indigo-500" : "bg-slate-300")}><motion.div animate={{ x: formData.is_featured ? 22 : 4 }} className="absolute top-1 w-3 h-3 bg-white rounded-full" /></button>
                        </div>
                    </div>
                </div>
              </div>

              {/* DYNAMIC SECTIONS */}
              <div className="space-y-8">
                {/* VARIANTS */}
                <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3 text-slate-900"><Maximize2 size={20} className="text-zamzam-teal" /><h3 className="text-sm font-bold uppercase">Variants (e.g. Size, Type)</h3></div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{formData.variants.length} Variants Configured</span>
                    </div>
                    <div className="space-y-3">
                        {formData.variants.map((v: any, i: number) => (
                            <div key={i} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 group shadow-sm">
                                <div 
                                    className="flex-1 cursor-pointer"
                                    onClick={() => setVariantDraft({
                                        name: v.name,
                                        price_offset: v.price_offset || v.price_adjustment || '',
                                        sale_price_offset: v.sale_price_offset !== undefined ? v.sale_price_offset : (v.sale_price_adjustment || null),
                                        inventory_id: v.inventory_id || v.inventory_item_id || '',
                                        quantity: v.quantity || v.quantity_required || ''
                                    })}
                                >
                                    <p className="text-[10px] font-bold uppercase text-slate-900 group-hover:text-zamzam-teal transition-colors">{v.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <p className="text-[9px] font-bold text-zamzam-teal uppercase">Price: {v.price_offset || v.price_adjustment} GBP</p>
                                        {(v.sale_price_offset !== null && v.sale_price_offset !== undefined) && (
                                            <p className="text-[9px] font-bold text-indigo-500 uppercase">Sale: {v.sale_price_offset || v.sale_price_adjustment} GBP</p>
                                        )}
                                        {v.cost > 0 && (
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Purchase Cost: {v.cost.toFixed(2)} GBP</p>
                                        )}
                                    </div>
                                </div>
                                <button type="button" onClick={() => setFormData((p: any) => ({ ...p, variants: p.variants.filter((_: any, idx: number) => idx !== i) }))} className="text-slate-300 hover:text-red-500 transition-colors ml-4"><Trash2 size={16} /></button>
                            </div>
                        ))}
                        <div className="grid grid-cols-12 gap-3 pt-2">
                            <input placeholder="VARIANT NAME..." value={variantDraft.name} onChange={(e) => setVariantDraft(p => ({ ...p, name: e.target.value }))} className="col-span-3 bg-white border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-bold uppercase outline-none focus:border-zamzam-teal shadow-inner" />
                            <input type="number" placeholder="PRICE (£)" value={variantDraft.price_offset} onChange={(e) => setVariantDraft(p => ({ ...p, price_offset: e.target.value }))} className="col-span-2 bg-white border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-bold outline-none focus:border-zamzam-teal shadow-inner" />
                            <input type="number" placeholder="SALE (£)" value={variantDraft.sale_price_offset || ''} onChange={(e) => setVariantDraft(p => ({ ...p, sale_price_offset: e.target.value ? parseFloat(e.target.value) : null }))} className="col-span-2 bg-white border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-bold outline-none focus:border-zamzam-teal shadow-inner" />
                            <select value={variantDraft.inventory_id} onChange={(e) => setVariantDraft(p => ({ ...p, inventory_id: e.target.value }))} className="col-span-3 bg-white border border-slate-100 rounded-xl px-2 py-3 text-[10px] font-bold uppercase outline-none focus:border-zamzam-teal shadow-inner">
                                <option value="">SELECT INVENTORY...</option>
                                {inventory.map(inv => <option key={inv.id} value={inv.id}>{inv.name}</option>)}
                            </select>
                            <input type="number" placeholder="QTY" value={variantDraft.quantity} onChange={(e) => setVariantDraft(p => ({ ...p, quantity: e.target.value }))} className="col-span-1 bg-white border border-slate-100 rounded-xl px-2 py-3 text-[10px] font-bold outline-none focus:border-zamzam-teal shadow-inner" />
                             <button 
                                type="button" 
                                onClick={() => { 
                                    if (variantDraft.name) { 
                                        // Remove existing one if same name (for edit simulation)
                                        const filtered = formData.variants.filter((v: any) => v.name !== variantDraft.name);
                                        setFormData((p: any) => ({ ...p, variants: [...filtered, variantDraft] })); 
                                        setVariantDraft({ name: '', price_offset: '', sale_price_offset: null, inventory_id: '', quantity: '' }); 
                                    } 
                                }} 
                                className="col-span-1 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-slate-800 transition-all shadow-lg"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* EXTRAS */}
                <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3 text-slate-900"><Zap size={20} className="text-zamzam-teal" /><h3 className="text-sm font-bold uppercase">Extras (e.g. Extra Cheese)</h3></div>
                    </div>
                    <div className="space-y-3">
                        {formData.extras.map((e: any, i: number) => (
                             <div key={i} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 group shadow-sm">
                                <div 
                                    className="flex-1 cursor-pointer"
                                    onClick={() => setExtraDraft({
                                        name: e.name,
                                        price: e.price || e.price_adjustment || '',
                                        sale_price: e.sale_price !== undefined ? e.sale_price : (e.sale_price_adjustment || null),
                                        inventory_id: e.inventory_id || e.inventory_item_id || '',
                                        quantity: e.quantity || e.quantity_required || ''
                                    })}
                                >
                                    <p className="text-[10px] font-bold uppercase text-slate-900 group-hover:text-zamzam-teal transition-colors">{e.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <p className="text-[9px] font-bold text-zamzam-teal uppercase">Price: {e.price || e.price_adjustment} GBP</p>
                                        {(e.sale_price !== null && e.sale_price !== undefined) && (
                                            <p className="text-[9px] font-bold text-indigo-500 uppercase">Sale: {e.sale_price || e.sale_price_adjustment} GBP</p>
                                        )}
                                        {e.cost > 0 && (
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Purchase Cost: {e.cost.toFixed(2)} GBP</p>
                                        )}
                                    </div>
                                </div>
                                <button type="button" onClick={() => setFormData((p: any) => ({ ...p, extras: p.extras.filter((_: any, idx: number) => idx !== i) }))} className="text-slate-300 hover:text-red-500 transition-colors ml-4"><Trash2 size={16} /></button>
                            </div>
                        ))}
                        <div className="grid grid-cols-12 gap-3 pt-2">
                            <input placeholder="EXTRA NAME..." value={extraDraft.name} onChange={(e) => setExtraDraft(p => ({ ...p, name: e.target.value }))} className="col-span-3 bg-white border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-bold uppercase outline-none focus:border-zamzam-teal shadow-inner" />
                            <input type="number" placeholder="PRICE (£)" value={extraDraft.price} onChange={(e) => setExtraDraft(p => ({ ...p, price: e.target.value }))} className="col-span-2 bg-white border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-bold outline-none focus:border-zamzam-teal shadow-inner" />
                            <input type="number" placeholder="SALE (£)" value={extraDraft.sale_price || ''} onChange={(e) => setExtraDraft(p => ({ ...p, sale_price: e.target.value ? parseFloat(e.target.value) : null }))} className="col-span-2 bg-white border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-bold outline-none focus:border-zamzam-teal shadow-inner" />
                            <select value={extraDraft.inventory_id} onChange={(e) => setExtraDraft(p => ({ ...p, inventory_id: e.target.value }))} className="col-span-3 bg-white border border-slate-100 rounded-xl px-2 py-3 text-[10px] font-bold uppercase outline-none focus:border-zamzam-teal shadow-inner">
                                <option value="">SELECT INVENTORY...</option>
                                {inventory.map(inv => <option key={inv.id} value={inv.id}>{inv.name}</option>)}
                            </select>
                            <input type="number" placeholder="QTY" value={extraDraft.quantity} onChange={(e) => setExtraDraft(p => ({ ...p, quantity: e.target.value }))} className="col-span-1 bg-white border border-slate-100 rounded-xl px-2 py-3 text-[10px] font-bold outline-none focus:border-zamzam-teal shadow-inner" />
                             <button 
                                type="button" 
                                onClick={() => { 
                                    if (extraDraft.name) { 
                                        // Remove existing one if same name (for edit simulation)
                                        const filtered = formData.extras.filter((e: any) => e.name !== extraDraft.name);
                                        setFormData((p: any) => ({ ...p, extras: [...filtered, extraDraft] })); 
                                        setExtraDraft({ name: '', price: '', sale_price: null, inventory_id: '', quantity: '' }); 
                                    } 
                                }} 
                                className="col-span-1 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-slate-800 transition-all shadow-lg"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* RECIPE */}
                <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-zamzam-teal/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-zamzam-yellow shadow-xl">
                            <FlaskConical size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold uppercase tracking-tight">Recipe Engine</h3>
                            <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.3em]">Auto-Deduct Inventory Optimization</p>
                        </div>
                    </div>
                    
                    <div className="space-y-3 mb-8">
                        {formData.recipe.map((r: any, i: number) => (
                            <div key={i} className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5 group hover:bg-white/10 transition-all">
                                <div>
                                    <p className="text-[11px] font-bold uppercase text-zamzam-yellow">{r.ingredient_name || inventory.find(inv => inv.id === parseInt(r.inventory_id))?.name}</p>
                                    <p className="text-[9px] font-bold text-white/30 uppercase mt-0.5">Linking: {r.quantity} {r.unit || inventory.find(inv => inv.id === parseInt(r.inventory_id))?.unit}</p>
                                </div>
                                <button type="button" onClick={() => setFormData((p: any) => ({ ...p, recipe: p.recipe.filter((_: any, idx: number) => idx !== i) }))} className="text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-12 gap-4">
                        <select value={recipeDraft.inventory_id} onChange={(e) => setRecipeDraft(p => ({ ...p, inventory_id: e.target.value }))} className="col-span-7 bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-[10px] font-bold uppercase text-white outline-none focus:border-zamzam-yellow appearance-none cursor-pointer">
                            <option value="">Select Inventory Node...</option>
                            {inventory.map(i => <option key={i.id} value={i.id} className="text-slate-900">{i.name} ({i.unit})</option>)}
                        </select>
                        <input type="number" placeholder="QTY" value={recipeDraft.quantity} onChange={(e) => setRecipeDraft(p => ({ ...p, quantity: e.target.value }))} className="col-span-3 bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-[10px] font-bold text-white outline-none focus:border-zamzam-yellow" />
                        <button type="button" onClick={() => { 
                            if (recipeDraft.inventory_id && recipeDraft.quantity) {
                                const inv = inventory.find(i => i.id === parseInt(recipeDraft.inventory_id));
                                setFormData((p: any) => ({ ...p, recipe: [...p.recipe, { ...recipeDraft, ingredient_name: inv.name, unit: inv.unit }] }));
                                setRecipeDraft({ inventory_id: '', quantity: '' });
                            }
                        }} className="col-span-2 bg-zamzam-yellow text-slate-900 rounded-xl flex items-center justify-center font-bold shadow-lg shadow-yellow-500/20 active:scale-95 transition-all"><Plus size={20} strokeWidth={3} /></button>
                    </div>
                </div>

                {/* DELETE ACTION */}
                {formData.id && (
                    <div className="pt-8 border-t border-slate-100 flex justify-center">
                        <button 
                            type="button" 
                            onClick={() => handleDelete(formData.id)}
                            className="text-[10px] font-bold text-red-400 uppercase tracking-widest hover:text-red-600 transition-colors flex items-center gap-2 group"
                        >
                            <Trash2 size={14} className="group-hover:scale-110 transition-transform" />
                            Decommission Product from Database
                        </button>
                    </div>
                )}
              </div>
            </motion.form>
          )}
        </div>
      </div>
    </div>
  );
}
