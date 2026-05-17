import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  AlertTriangle, 
  ArrowUpRight, 
  History as HistoryIcon, 
  Truck,
  MoreVertical,
  Package,
  X,
  Save,
  Trash2,
  ChevronRight,
  TrendingUp,
  ArrowDown,
  ArrowUp,
  Edit3,
  Settings2,
  RefreshCw,
  Building2,
  Mail,
  Phone,
  Layers,
  ArrowRightLeft,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

// --- TYPES & INTERFACES ---
interface InventoryItem {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  low_stock_threshold: number;
  cost_per_unit: number;
  supplier_id?: number;
  supplier_name?: string;
}

interface Supplier {
  id: number;
  name: string;
  contact_email: string;
  contact_phone: string;
  reliability_score: number;
}

interface Transaction {
  id: number;
  item_name: string;
  unit: string;
  type: 'Purchase' | 'Adjustment' | 'Sale' | 'Wastage' | 'Correction';
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  reason: string;
  created_at: string;
}

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<any>(null);
  
  const [activeTab, setActiveTab] = useState<'stock' | 'suppliers' | 'history'>('stock');
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
    fetchSettings();
  }, [activeTab]);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/settings?t=${Date.now()}`);
      const data = await res.json();
      setSettings(data);
    } catch (err) { console.error('Settings Error:', err); }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'stock' || activeTab === 'suppliers') {
        const [invRes, supRes] = await Promise.all([
          fetch(`${API_BASE_URL}/inventory?t=${Date.now()}`),
          fetch(`${API_BASE_URL}/purchases/suppliers?t=${Date.now()}`)
        ]);
        const invData = await invRes.json();
        const supData = await supRes.json();
        setItems(Array.isArray(invData) ? invData : []);
        setSuppliers(Array.isArray(supData) ? supData : []);
      } else if (activeTab === 'history') {
        const res = await fetch(`${API_BASE_URL}/inventory/transactions?t=${Date.now()}`);
        const data = await res.json();
        setTransactions(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveItem = async (formData: any) => {
    setIsSaving(true);
    try {
      const method = selectedItem ? 'PUT' : 'POST';
      const url = selectedItem 
        ? `${API_BASE_URL}/inventory/${selectedItem.id}` 
        : `${API_BASE_URL}/inventory`;
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setIsItemModalOpen(false);
        fetchData();
        window.dispatchEvent(new CustomEvent('show-toast', { 
          detail: { message: `Item ${selectedItem ? 'Updated' : 'Created'} Successfully`, type: 'success' } 
        }));
      }
    } catch (err) {
      console.error('Error saving item:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdjustStock = async (id: number, amount: number, reason: string) => {
    setIsSaving(true);
    try {
      const item = items.find(i => i.id === id);
      if (!item) return;

      const res = await fetch(`${API_BASE_URL}/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          quantity: item.quantity + amount,
          reason: reason
        })
      });
      
      if (res.ok) {
        setIsAdjustModalOpen(false);
        fetchData();
        window.dispatchEvent(new CustomEvent('show-toast', { 
          detail: { message: 'Stock Adjusted Successfully', type: 'success' } 
        }));
      }
    } catch (err) {
      console.error('Error adjusting stock:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/inventory/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
        window.dispatchEvent(new CustomEvent('show-toast', { 
          detail: { message: 'Item Removed from Vault', type: 'success' } 
        }));
      }
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  const handleSaveSupplier = async (formData: any) => {
    setIsSaving(true);
    try {
      const method = selectedSupplier ? 'PUT' : 'POST';
      const url = selectedSupplier 
        ? `${API_BASE_URL}/purchases/suppliers/${selectedSupplier.id}` 
        : `${API_BASE_URL}/purchases/suppliers`;
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setIsSupplierModalOpen(false);
        fetchData();
        window.dispatchEvent(new CustomEvent('show-toast', { 
          detail: { message: `Supplier ${selectedSupplier ? 'Updated' : 'Added'} Successfully`, type: 'success' } 
        }));
      }
    } catch (err) {
      console.error('Error saving supplier:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSupplier = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/purchases/suppliers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
        window.dispatchEvent(new CustomEvent('show-toast', { 
          detail: { message: 'Supplier Removed', type: 'success' } 
        }));
      }
    } catch (err) {
      console.error('Error deleting supplier:', err);
    }
  };

  const currency = settings?.tenant?.currency || 'USD';

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (quantity: number, threshold: number) => {
    if (quantity <= 0) return 'text-red-500 bg-red-50 border-red-100';
    if (quantity <= threshold) return 'text-orange-500 bg-orange-50 border-orange-100';
    return 'text-teal-500 bg-teal-50 border-teal-100';
  };

  return (
    <div className="bg-slate-50/30 min-h-screen">
      <div className="p-10 max-w-[1600px] mx-auto space-y-10">
        
        {/* --- HEADER --- */}
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
               <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
                  <Package size={16} />
               </div>
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">Vault & Supply Chain</span>
            </div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Inventory <span className="text-teal-500">Management</span></h1>
          </div>
          
          <div className="flex gap-3">
            <div className="bg-white border border-slate-200 p-1.5 rounded-2xl flex shadow-sm">
              {[
                { id: 'stock', label: 'Stock Levels', icon: Package },
                { id: 'suppliers', label: 'Suppliers', icon: Building2 },
                { id: 'history', label: 'History', icon: HistoryIcon }
              ].map((tab) => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                    activeTab === tab.id ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>
            
            {activeTab === 'stock' ? (
              <button 
                onClick={() => { setSelectedItem(null); setIsItemModalOpen(true); }}
                className="bg-teal-500 px-6 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-white shadow-xl shadow-teal-500/20 hover:scale-105 transition-transform flex items-center gap-2"
              >
                <Plus size={18} />
                Add Stock Item
              </button>
            ) : activeTab === 'suppliers' ? (
              <button 
                onClick={() => { setSelectedSupplier(null); setIsSupplierModalOpen(true); }}
                className="bg-indigo-500 px-6 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-white shadow-xl shadow-indigo-500/20 hover:scale-105 transition-transform flex items-center gap-2"
              >
                <Plus size={18} />
                Add Supplier
              </button>
            ) : null}
          </div>
        </div>

        {/* --- QUICK STATS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           <StatCard title="Total Valuation" value={`${items.reduce((acc, i) => acc + (i.quantity * i.cost_per_unit), 0).toLocaleString()} ${currency}`} icon={TrendingUp} color="teal" />
           <StatCard title="Low Stock Alerts" value={items.filter(i => i.quantity <= i.low_stock_threshold).length} icon={AlertTriangle} color="orange" />
           <StatCard title="Active Suppliers" value={suppliers.length} icon={Truck} color="indigo" />
           <StatCard title="Total SKU Count" value={items.length} icon={Layers} color="slate" />
        </div>

        {/* --- SEARCH BAR --- */}
        <div className="relative group max-w-2xl">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-500 transition-colors" size={20} />
          <input 
            type="text"
            placeholder="Search ingredients, packaging, or equipment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-100 rounded-[1.5rem] py-5 pl-14 pr-6 text-sm font-bold shadow-sm outline-none focus:ring-4 focus:ring-teal-500/5 transition-all"
          />
        </div>

        {/* --- CONTENT AREA --- */}
        <div className="min-h-[500px]">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div key="loader" className="flex items-center justify-center h-64"><RefreshCw className="animate-spin text-teal-500" /></motion.div>
            ) : activeTab === 'stock' ? (
              <motion.div key="stock" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <th className="px-10 py-6">Item Name</th>
                      <th className="px-10 py-6 text-center">Status</th>
                      <th className="px-10 py-6 text-center">Quantity</th>
                      <th className="px-10 py-6 text-center">Cost/Unit</th>
                      <th className="px-10 py-6 text-center">Total Value</th>
                      <th className="px-10 py-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-10 py-6">
                          <p className="text-sm font-bold text-slate-900 uppercase">{item.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-tight">{item.supplier_name || 'No Supplier'}</p>
                        </td>
                        <td className="px-10 py-6 text-center">
                          <span className={cn(
                            "px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border",
                            getStatusColor(item.quantity, item.low_stock_threshold)
                          )}>
                            {item.quantity <= 0 ? 'Out of Stock' : item.quantity <= item.low_stock_threshold ? 'Low Stock' : 'Optimal'}
                          </span>
                        </td>
                        <td className="px-10 py-6 text-center">
                          <p className="text-sm font-bold text-slate-900">{item.quantity} <span className="text-[10px] text-slate-400 uppercase">{item.unit}</span></p>
                        </td>
                        <td className="px-10 py-6 text-center font-bold text-slate-600 text-sm">
                          {item.cost_per_unit} <span className="text-[10px] uppercase opacity-60">GBP</span>
                        </td>
                        <td className="px-10 py-6 text-center font-bold text-teal-600 text-sm">
                          {(item.quantity * item.cost_per_unit).toFixed(2)} <span className="text-[10px] uppercase opacity-60">GBP</span>
                        </td>
                        <td className="px-10 py-6">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => { setSelectedItem(item); setIsAdjustModalOpen(true); }} className="p-2.5 bg-slate-50 text-slate-400 hover:text-teal-500 hover:bg-teal-50 rounded-xl transition-all"><RefreshCw size={14} /></button>
                            <button onClick={() => { setSelectedItem(item); setIsItemModalOpen(true); }} className="p-2.5 bg-slate-50 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all"><Edit3 size={14} /></button>
                            <button onClick={() => handleDeleteItem(item.id)} className="p-2.5 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            ) : activeTab === 'suppliers' ? (
              <motion.div key="suppliers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <th className="px-10 py-6">Company Name</th>
                      <th className="px-10 py-6">Contact Details</th>
                      <th className="px-10 py-6 text-center">Reliability</th>
                      <th className="px-10 py-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {suppliers.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-10 py-6">
                          <p className="text-sm font-bold text-slate-900 uppercase">{s.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                            <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">Active Partner</span>
                          </div>
                        </td>
                        <td className="px-10 py-6">
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-600 flex items-center gap-2"><Mail size={12} className="text-slate-300" /> {s.contact_email}</p>
                            <p className="text-xs font-bold text-slate-600 flex items-center gap-2"><Phone size={12} className="text-slate-300" /> {s.contact_phone}</p>
                          </div>
                        </td>
                        <td className="px-10 py-6 text-center">
                          <div className="flex flex-col items-center gap-2">
                             <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${s.reliability_score}%` }} className="h-full bg-zamzam-teal" />
                             </div>
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{s.reliability_score}% Reliable</span>
                          </div>
                        </td>
                        <td className="px-10 py-6">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => { setSelectedSupplier(s); setIsSupplierModalOpen(true); }} className="p-2.5 bg-slate-50 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all"><Edit3 size={14} /></button>
                            <button onClick={() => handleDeleteSupplier(s.id)} className="p-2.5 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            ) : (
              <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <th className="px-10 py-6">Event Time</th>
                      <th className="px-10 py-6">Item</th>
                      <th className="px-10 py-6">Type</th>
                      <th className="px-10 py-6">Movement</th>
                      <th className="px-10 py-6">Balance</th>
                      <th className="px-10 py-6">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {Array.isArray(transactions) ? transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-10 py-6">
                           <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                             <Clock size={14} /> {new Date(t.created_at).toLocaleString()}
                           </div>
                        </td>
                        <td className="px-10 py-6">
                          <p className="text-sm font-bold text-slate-900 uppercase">{t.item_name}</p>
                        </td>
                        <td className="px-10 py-6">
                          <span className={cn(
                            "px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border",
                            t.type === 'Purchase' ? "bg-teal-50 text-teal-600 border-teal-100" :
                            t.type === 'Wastage' ? "bg-red-50 text-red-600 border-red-100" :
                            "bg-slate-50 text-slate-600 border-slate-100"
                          )}>
                            {t.type}
                          </span>
                        </td>
                        <td className="px-10 py-6">
                          <div className={cn("flex items-center gap-2 font-bold text-sm", t.quantity_change > 0 ? "text-teal-500" : "text-red-500")}>
                             {t.quantity_change > 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                             {Math.abs(t.quantity_change)} <span className="text-[10px] text-slate-300 uppercase">{t.unit}</span>
                          </div>
                        </td>
                        <td className="px-10 py-6 font-bold text-slate-900 text-sm">
                           {t.new_quantity} <span className="text-[10px] text-slate-300 uppercase">{t.unit}</span>
                        </td>
                        <td className="px-10 py-6">
                           <p className="text-xs font-bold text-slate-400 italic">{t.reason}</p>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="px-10 py-6 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                          No transaction history found or error loading data
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* --- MODALS --- */}
      <AnimatePresence>
        {isItemModalOpen && (
          <ItemModal 
            item={selectedItem} 
            suppliers={suppliers}
            onClose={() => setIsItemModalOpen(false)} 
            onSave={handleSaveItem} 
            isSaving={isSaving}
          />
        )}
        {isAdjustModalOpen && selectedItem && (
          <AdjustModal 
            item={selectedItem} 
            onClose={() => setIsAdjustModalOpen(false)} 
            onSave={handleAdjustStock} 
            isSaving={isSaving}
          />
        )}
        {isSupplierModalOpen && (
          <SupplierModal
            supplier={selectedSupplier}
            onClose={() => setIsSupplierModalOpen(false)}
            onSave={handleSaveSupplier}
            isSaving={isSaving}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- SUB-COMPONENTS ---

const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner", 
      color === 'teal' ? "bg-teal-50 text-teal-600 border-teal-100" :
      color === 'orange' ? "bg-orange-50 text-orange-600 border-orange-100" :
      color === 'indigo' ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
      "bg-slate-50 text-slate-600 border-slate-100"
    )}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">{title}</p>
      <p className="text-2xl font-bold text-slate-900 tracking-tight leading-none">{value}</p>
    </div>
  </div>
);

const InventoryCard = ({ item, onEdit, onAdjust, onDelete, statusColor }: any) => (
  <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all group relative overflow-hidden">
    <div className="flex items-start justify-between mb-8">
      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-teal-500 group-hover:text-white transition-all duration-500 shadow-inner">
        <Package size={28} />
      </div>
      <div className="flex items-center gap-1">
         <button onClick={onEdit} className="p-2.5 text-slate-300 hover:text-teal-500 hover:bg-teal-50 rounded-xl transition-all"><Edit3 size={18} /></button>
         <button onClick={onDelete} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
      </div>
    </div>
    
    <div className="mb-8">
      <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight truncate">{item.name}</h3>
      <div className="flex items-center gap-2 mt-2">
         <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.supplier_name || 'No Supplier Linked'}</p>
      </div>
    </div>

    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Available Stock</p>
          <p className="text-3xl font-bold text-slate-900 tabular-nums">{item.quantity} <span className="text-xs font-bold text-slate-300 uppercase tracking-normal">{item.unit}</span></p>
        </div>
        <div className={cn("px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest border shadow-sm", statusColor)}>
          {item.quantity <= 0 ? 'Out of Stock' : item.quantity <= item.low_stock_threshold ? 'Low Stock' : 'Optimal'}
        </div>
      </div>
      
      <div className="w-full bg-slate-50 h-2.5 rounded-full overflow-hidden border border-slate-100 shadow-inner">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, (item.quantity / (item.low_stock_threshold * 5 || 100)) * 100)}%` }}
          className={cn("h-full rounded-full transition-all duration-700", item.quantity <= item.low_stock_threshold ? "bg-orange-500" : "bg-teal-500")}
        />
      </div>
    </div>

    <button 
      onClick={onAdjust}
      className="mt-8 w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all active:scale-95 shadow-lg shadow-slate-200"
    >
       <Settings2 size={14} className="text-teal-400" />
       Stock Adjustment
    </button>
  </div>
);

const SupplierCard = ({ supplier, onEdit, onDelete }: { supplier: Supplier, onEdit: () => void, onDelete: () => void }) => (
  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
     <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-5">
           <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 shadow-inner group-hover:bg-indigo-500 group-hover:text-white transition-colors">
              <Building2 size={24} />
           </div>
           <div>
              <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">{supplier.name}</h3>
              <div className="flex items-center gap-2 mt-1">
              <div className={cn("w-2 h-2 rounded-full", (supplier.reliability_score || 0) > 80 ? "bg-teal-500" : "bg-orange-500")} />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{supplier.reliability_score || 100}% Reliability</span>
           </div>
           </div>
        </div>
        <div className="flex items-center gap-1">
           <button onClick={onEdit} className="p-2.5 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all"><Edit3 size={18} /></button>
           <button onClick={onDelete} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
        </div>
     </div>

     <div className="space-y-4 pt-6 border-t border-slate-50">
        <div className="flex items-center gap-4 text-slate-500">
           <Mail size={16} />
           <span className="text-xs font-bold tracking-tight">{supplier.contact_email || 'No email registered'}</span>
        </div>
        <div className="flex items-center gap-4 text-slate-500">
           <Phone size={16} />
           <span className="text-xs font-bold tracking-tight">{supplier.contact_phone || 'No phone registered'}</span>
        </div>
     </div>

     <button className="mt-8 w-full py-4 bg-slate-50 text-slate-900 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100 transition-all">
        View Order History
     </button>
  </div>
);

// --- MODAL COMPONENTS ---

const ItemModal = ({ item, suppliers, onClose, onSave, isSaving }: any) => {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    unit: item?.unit || 'Kg',
    quantity: item?.quantity || 0,
    low_stock_threshold: item?.low_stock_threshold || 10,
    cost_per_unit: item?.cost_per_unit || 0,
    supplier_id: item?.supplier_id || ''
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden overflow-y-auto max-h-[90vh]">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
           <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">{item ? 'Edit' : 'Add New'} Stock Item</h2>
           <button onClick={onClose} className="p-3 text-slate-300 hover:text-slate-900 transition-colors"><X size={24} /></button>
        </div>
        <div className="p-8 space-y-6">
           <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Item Name</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm font-bold outline-none focus:ring-4 focus:ring-teal-500/10 transition-all"
                placeholder="e.g. Tomato Sauce"
              />
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stock Unit</label>
                 <select 
                    value={formData.unit}
                    onChange={e => setFormData({...formData, unit: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm font-bold outline-none appearance-none"
                 >
                    {['Kg', 'Ltr', 'Pcs', 'Box', 'Bag'].map(u => <option key={u} value={u}>{u}</option>)}
                 </select>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Initial Stock</label>
                 <input 
                    type="number" 
                    value={formData.quantity}
                    onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value)})}
                    className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm font-bold outline-none"
                 />
              </div>
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Low Stock Alert Level</label>
                 <input 
                    type="number" 
                    value={formData.low_stock_threshold}
                    onChange={e => setFormData({...formData, low_stock_threshold: parseFloat(e.target.value)})}
                    className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm font-bold outline-none"
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cost per Unit</label>
                 <input 
                    type="number" 
                    value={formData.cost_per_unit}
                    onChange={e => setFormData({...formData, cost_per_unit: parseFloat(e.target.value)})}
                    className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm font-bold outline-none"
                 />
              </div>
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Preferred Supplier</label>
              <select 
                value={formData.supplier_id}
                onChange={e => setFormData({...formData, supplier_id: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm font-bold outline-none appearance-none"
              >
                 <option value="">Select Supplier</option>
                 {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
           </div>
        </div>
        <div className="p-8 bg-slate-50 flex gap-4">
           <button onClick={onClose} className="flex-1 py-5 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all">Cancel</button>
           <button 
            disabled={isSaving}
            onClick={() => onSave(formData)} 
            className="flex-1 py-5 bg-teal-500 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-teal-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
           >
              {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />} 
              {isSaving ? 'Saving...' : 'Save Changes'}
           </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const AdjustModal = ({ item, onClose, onSave, isSaving }: any) => {
  const [adjustment, setAdjustment] = useState(0);
  const [reason, setReason] = useState('Stock Correction');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden p-10">
        <div className="text-center mb-8">
           <div className="w-20 h-20 bg-teal-50 text-teal-600 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-teal-100 shadow-inner">
              <RefreshCw size={32} />
           </div>
           <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Stock Adjustment</h2>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{item.name} ({item.quantity} {item.unit})</p>
        </div>

        <div className="space-y-6">
           <div className="flex items-center justify-center gap-8">
              <button onClick={() => setAdjustment(prev => prev - 1)} className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-100 transition-all"><ArrowDown size={24} /></button>
              <div className="text-center min-w-[80px]">
                 <p className={cn("text-4xl font-bold tabular-nums", adjustment > 0 ? "text-teal-500" : adjustment < 0 ? "text-red-500" : "text-slate-900")}>
                    {adjustment > 0 ? `+${adjustment}` : adjustment}
                 </p>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Adjustment Amount</span>
              </div>
              <button onClick={() => setAdjustment(prev => prev + 1)} className="w-14 h-14 bg-teal-50 text-teal-500 rounded-2xl flex items-center justify-center hover:bg-teal-100 transition-all"><ArrowUp size={24} /></button>
           </div>

           <div className="grid grid-cols-2 gap-2">
              {['Wastage', 'Correction', 'Received', 'Inventory Count'].map(r => (
                 <button 
                  key={r} 
                  onClick={() => setReason(r)}
                  className={cn(
                    "py-3 rounded-xl text-[9px] font-bold uppercase tracking-widest border transition-all",
                    reason === r ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
                  )}
                 >
                    {r}
                 </button>
              ))}
           </div>
        </div>

        <div className="mt-10 space-y-3">
           <button 
              disabled={isSaving || adjustment === 0}
              onClick={() => onSave(item.id, adjustment, reason)} 
              className="w-full py-5 bg-teal-500 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-teal-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
           >
              {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
              {isSaving ? 'Processing...' : 'Update Stock Level'}
           </button>
           <button onClick={onClose} className="w-full py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cancel</button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const SupplierModal = ({ supplier, onClose, onSave, isSaving }: any) => {
  const [formData, setFormData] = useState({
    name: supplier?.name || '',
    contact_email: supplier?.contact_email || '',
    contact_phone: supplier?.contact_phone || '',
    reliability_score: supplier?.reliability_score || 100
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
           <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">{supplier ? 'Edit' : 'Add New'} Supplier</h2>
           <button onClick={onClose} className="p-3 text-slate-300 hover:text-slate-900 transition-colors"><X size={24} /></button>
        </div>
        <div className="p-8 space-y-6">
           <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Supplier Name</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                placeholder="e.g. City Traders"
              />
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact Email</label>
                 <input 
                    type="email" 
                    value={formData.contact_email}
                    onChange={e => setFormData({...formData, contact_email: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm font-bold outline-none"
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact Phone</label>
                 <input 
                    type="text" 
                    value={formData.contact_phone}
                    onChange={e => setFormData({...formData, contact_phone: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm font-bold outline-none"
                 />
              </div>
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reliability Score (0-100)</label>
              <input 
                 type="number" 
                 min="0" max="100"
                 value={formData.reliability_score}
                 onChange={e => setFormData({...formData, reliability_score: parseInt(e.target.value) || 0})}
                 className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm font-bold outline-none"
              />
           </div>
        </div>
        <div className="p-8 bg-slate-50 flex gap-4">
           <button onClick={onClose} className="flex-1 py-5 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all">Cancel</button>
           <button 
            disabled={isSaving || !formData.name}
            onClick={() => onSave(formData)} 
            className="flex-1 py-5 bg-indigo-500 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
           >
              {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />} 
              {isSaving ? 'Saving...' : 'Save Supplier'}
           </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
