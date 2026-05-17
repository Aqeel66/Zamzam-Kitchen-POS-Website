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
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL, resolveImageUrl } from '../config';

const cn = (...inputs: (string | undefined | null | false)[]) => inputs.filter(Boolean).join(' ');

export default function Categories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    id: null as number | null,
    name: '',
    description: '',
    image: ''
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/menu`);
      const data = await res.json();
      // Backend returns array of categories with items
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch Categories Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (category: any) => {
    setFormData({
      id: parseInt(category.id),
      name: category.name || category.title,
      description: category.description || '',
      image: category.image || ''
    });
  };

  const handleDelete = async (id: any) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/menu/categories/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchCategories();
        if (formData.id === parseInt(id)) resetForm();
      }
    } catch (err) {
      console.error('Delete Error:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    setIsSubmitting(true);
    try {
      const isEdit = formData.id !== null;
      const url = isEdit 
        ? `${API_BASE_URL}/menu/categories/${formData.id}` 
        : `${API_BASE_URL}/menu/categories`;
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          image: formData.image
        })
      });

      if (res.ok) {
        fetchCategories();
        resetForm();
      } else {
        const errorData = await res.json();
        alert(`Error: ${errorData.message || 'Failed to save category'}`);
      }
    } catch (err) {
      console.error('Submit Error:', err);
      alert('System Error: Could not connect to backend');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ id: null, name: '', description: '', image: '' });
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

  const filteredCategories = categories.filter(c => 
    (c.name || c.title || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full bg-[#F8FAFC] p-8 overflow-hidden flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-slate-900/10">
            <LayoutGrid size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight uppercase">Category <span className="text-zamzam-teal">Management</span></h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">Organize your food menu hierarchy</p>
          </div>
        </div>
        <button 
          onClick={resetForm}
          className="bg-zamzam-teal text-white px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-teal-500/20 flex items-center gap-3 hover:bg-teal-600 transition-all active:scale-95 group"
        >
          <Plus size={20} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
          Add New Category
        </button>
      </div>

      <div className="flex-1 flex gap-10 min-h-0">
        {/* Left Section: Category List */}
        <div className="flex-[1.6] bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100 flex flex-col gap-8 min-w-0">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-zamzam-teal transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="SEARCH CATEGORIES..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 pl-14 pr-8 text-[11px] font-bold uppercase outline-none focus:border-zamzam-teal focus:bg-white transition-all shadow-inner"
            />
          </div>

          <div className="bg-slate-50/50 rounded-[2rem] border border-slate-100 overflow-hidden shadow-inner flex-1 flex flex-col min-h-0">
            <div className="overflow-y-auto no-scrollbar flex-1">
              <table className="w-full text-left">
                <thead className="bg-white border-b border-slate-100 sticky top-0 z-10">
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="pl-8 py-4">Category</th>
                    <th className="px-4 py-4 text-center">Count</th>
                    <th className="pr-8 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50">
                  {isLoading ? (
                    <tr>
                      <td colSpan={3} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-4 text-slate-300">
                          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                            <LayoutGrid size={32} />
                          </motion.div>
                          <p className="text-[10px] font-bold uppercase tracking-widest">Accessing Vault...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-4 text-slate-300">
                          <Folder size={40} className="opacity-50" />
                          <p className="text-[10px] font-bold uppercase tracking-widest">Empty Sector</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredCategories.map((cat) => (
                      <tr 
                        key={cat.id} 
                        onClick={() => handleEdit(cat)}
                        className={cn(
                          "group cursor-pointer transition-colors",
                          formData.id === parseInt(cat.id) ? "bg-slate-900 text-white" : "bg-white hover:bg-slate-50"
                        )}
                      >
                        <td className="pl-8 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-md shrink-0 border-2 border-white/20">
                              <img src={resolveImageUrl(cat.image) || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'} className="w-full h-full object-cover" alt={cat.name} />
                            </div>
                            <div>
                              <p className={cn("text-xs font-bold uppercase tracking-tight", formData.id === parseInt(cat.id) ? "text-white" : "text-slate-900")}>{cat.name || cat.title}</p>
                              <p className={cn("text-[9px] font-bold uppercase opacity-60", formData.id === parseInt(cat.id) ? "text-zamzam-yellow" : "text-slate-400")}>{cat.description?.slice(0, 30)}{cat.description?.length > 30 ? '...' : ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={cn(
                            "px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border",
                            formData.id === parseInt(cat.id) ? "bg-white/10 border-white/20 text-white" : "bg-teal-50 border-teal-100 text-teal-600"
                          )}>
                            {cat.items?.length || 0} Items
                          </span>
                        </td>
                        <td className="pr-8 py-4">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); handleEdit(cat); }} className={cn("w-9 h-9 rounded-xl flex items-center justify-center transition-all", formData.id === parseInt(cat.id) ? "bg-white/10 text-white" : "bg-slate-50 text-slate-400 hover:text-teal-500 hover:bg-teal-50")}><Edit2 size={14} /></button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(cat.id); }} className={cn("w-9 h-9 rounded-xl flex items-center justify-center transition-all", formData.id === parseInt(cat.id) ? "bg-red-500/20 text-red-400" : "bg-red-50 text-red-500 hover:bg-red-500 hover:text-white")}><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Section: Form Card */}
        <div className="flex-1 bg-white rounded-[3rem] p-8 shadow-2xl border border-slate-100 flex flex-col gap-6 min-w-[450px] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-zamzam-teal/5 rounded-full -mr-32 -mt-32 blur-3xl" />
          
          <div className="flex items-center gap-6 relative z-10 shrink-0">
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
                {formData.id ? 'Refine Category' : 'New Entry'}
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                {formData.id ? 'Updating system parameters' : 'Initializing catalog node'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col relative z-10 overflow-hidden">
            <div className="flex-1 overflow-y-auto no-scrollbar pr-2 space-y-5 pb-4">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em] px-1 flex items-center gap-2">
                  <span className="w-1 h-1 bg-zamzam-teal rounded-full" />
                  Category Name
                </label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder="E.G. TRADITIONAL MANDI"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold uppercase outline-none focus:border-zamzam-teal focus:bg-white transition-all shadow-inner"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em] px-1 flex items-center gap-2">
                  <span className="w-1 h-1 bg-zamzam-teal rounded-full" />
                  Description (Optional)
                </label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                  placeholder="PUBLIC FACING DESCRIPTION..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-xs font-bold outline-none focus:border-zamzam-teal focus:bg-white transition-all shadow-inner no-scrollbar resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em] px-1 flex items-center gap-2">
                  <span className="w-1 h-1 bg-zamzam-teal rounded-full" />
                  Visual Identity (Image Path)
                </label>
                <div className="flex gap-4">
                  <div className="flex-1 relative group">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      className="hidden" 
                      accept="image/*" 
                    />
                    <input 
                      type="text" 
                      value={formData.image}
                      onChange={(e) => setFormData(p => ({ ...p, image: e.target.value }))}
                      placeholder="assets/categories/mandi.webp"
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 pr-14 text-xs font-bold outline-none focus:border-zamzam-teal focus:bg-white transition-all shadow-inner"
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-zamzam-teal transition-colors">
                      <ImageIcon size={20} />
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-[3.25rem] bg-slate-900 text-zamzam-yellow rounded-2xl flex items-center justify-center hover:bg-slate-800 transition-all shadow-lg active:scale-95 border border-slate-800 shrink-0"
                  >
                    <Folder size={20} />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 shrink-0">
              <button 
                type="submit" 
                disabled={isSubmitting || !formData.name}
                className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-bold uppercase tracking-[0.3em] shadow-2xl shadow-slate-900/30 flex items-center justify-center gap-4 hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 group"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-zamzam-yellow" />
                ) : (
                  <>
                    <CheckCircle2 size={24} className="text-zamzam-yellow" />
                    <span className="text-sm">{formData.id ? 'DEPLOY UPDATE' : 'INITIALIZE CATEGORY'}</span>
                  </>
                )}
              </button>
              
              <AnimatePresence>
                {formData.id && (
                  <motion.button 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    type="button"
                    onClick={resetForm}
                    className="w-full mt-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors flex items-center justify-center gap-2"
                  >
                    <AlertCircle size={14} />
                    Abort Editing
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
