import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  AlertTriangle, 
  ArrowUpRight, 
  History, 
  Truck,
  MoreVertical,
  Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

export default function Inventory() {
  const [items, setItems] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'stock' | 'history'>('stock');
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'stock') {
        const res = await fetch(`${API_BASE_URL}/inventory`);
        const data = await res.json();
        setItems(data);
      } else {
        const res = await fetch(`${API_BASE_URL}/purchases`);
        const data = await res.json();
        setPurchases(data);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (quantity: number, threshold: number) => {
    if (quantity <= 0) return 'text-red-500 bg-red-50 border-red-100';
    if (quantity <= threshold) return 'text-orange-500 bg-orange-50 border-orange-100';
    return 'text-green-500 bg-green-50 border-green-100';
  };

  return (
    <div className="p-10 max-w-[1600px] mx-auto space-y-10 min-h-full">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <span className="text-[10px] font-black text-zamzam-teal uppercase tracking-[0.4em] mb-2 block">Stock Management</span>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Inventory <span className="text-zamzam-teal">Vault</span></h1>
        </div>
        <div className="flex gap-3">
          <div className="bg-white border border-slate-200 p-1.5 rounded-2xl flex">
            <button 
              onClick={() => setActiveTab('stock')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                activeTab === 'stock' ? "bg-zamzam-teal text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Stock Levels
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                activeTab === 'history' ? "bg-zamzam-teal text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Purchase History
            </button>
          </div>
          <button className="bg-zamzam-yellow px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-zamzam-teal shadow-lg shadow-yellow-500/20 hover:scale-105 transition-transform flex items-center gap-2">
            <Plus size={18} />
            Add New Item
          </button>
        </div>
      </div>

      {/* Search & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-2 relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-zamzam-teal transition-colors" size={20} />
          <input 
            type="text"
            placeholder="Search ingredients, supplies, or packaging..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-100 rounded-[1.5rem] py-4 pl-14 pr-6 text-sm font-bold shadow-sm shadow-slate-200/50 outline-none focus:ring-4 focus:ring-zamzam-teal/5 transition-all"
          />
        </div>
        <div className="bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Low Stock Items</p>
            <p className="text-xl font-black text-slate-900">{items.filter(i => i.quantity <= i.low_stock_threshold).length}</p>
          </div>
        </div>
        <div className="bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
            <Truck size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Suppliers</p>
            <p className="text-xl font-black text-slate-900">8</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="min-h-[500px] relative">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div 
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-12 h-12 border-4 border-slate-100 border-t-zamzam-teal rounded-full animate-spin" />
            </motion.div>
          ) : activeTab === 'stock' ? (
            <motion.div 
              key="stock-grid"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6"
            >
              {filteredItems.map((item) => (
                <div 
                  key={item.id}
                  className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all group"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-zamzam-teal/10 group-hover:text-zamzam-teal transition-colors">
                      <Package size={24} />
                    </div>
                    <button className="p-2 text-slate-300 hover:text-slate-900 rounded-lg transition-colors">
                      <MoreVertical size={20} />
                    </button>
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-tight truncate">{item.name}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Supplier: {item.supplier_name || 'Generic'}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Stock</p>
                        <p className="text-2xl font-black text-slate-900">{item.quantity} <span className="text-xs font-bold text-slate-400 uppercase tracking-normal">{item.unit}</span></p>
                      </div>
                      <div className={cn(
                        "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                        getStatusColor(item.quantity, item.low_stock_threshold)
                      )}>
                        {item.quantity <= 0 ? 'Out of Stock' : item.quantity <= item.low_stock_threshold ? 'Low Stock' : 'In Stock'}
                      </div>
                    </div>
                    
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (item.quantity / (item.low_stock_threshold * 4 || 100)) * 100)}%` }}
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          item.quantity <= item.low_stock_threshold ? "bg-orange-500" : "bg-zamzam-teal"
                        )}
                      />
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Min: {item.low_stock_threshold} {item.unit}</span>
                    </div>
                    <button className="text-zamzam-teal font-black text-[10px] uppercase tracking-widest hover:underline flex items-center gap-1">
                      Restock <ArrowUpRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              key="history-list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden"
            >
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    <th className="px-10 py-5">Purchase Date</th>
                    <th className="px-10 py-5">Invoice #</th>
                    <th className="px-10 py-5">Supplier</th>
                    <th className="px-10 py-5">Items</th>
                    <th className="px-10 py-5">Total Amount</th>
                    <th className="px-10 py-5">Status</th>
                    <th className="px-10 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {purchases.map((order) => (
                    <tr key={order.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-10 py-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-900">{new Date(order.order_date).toLocaleDateString()}</span>
                          <span className="text-[10px] font-bold text-slate-400">{new Date(order.order_date).toLocaleTimeString()}</span>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-sm font-black text-slate-500 uppercase tracking-widest">#{order.invoice_number || order.id}</td>
                      <td className="px-10 py-6 text-sm font-black text-slate-900">{order.supplier_name || 'Direct Purchase'}</td>
                      <td className="px-10 py-6">
                        <div className="flex -space-x-2">
                          {(order.items || []).slice(0, 3).map((_: any, i: number) => (
                            <div key={i} className="w-8 h-8 rounded-full bg-white border-2 border-slate-50 flex items-center justify-center">
                              <Package size={14} className="text-slate-400" />
                            </div>
                          ))}
                          {order.items?.length > 3 && (
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border-2 border-white">
                              +{order.items.length - 3}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-10 py-6 text-base font-black text-zamzam-teal">${parseFloat(order.total_amount).toFixed(2)}</td>
                      <td className="px-10 py-6">
                        <span className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest",
                          order.status === 'Received' ? "bg-green-50 text-green-600" : 
                          order.status === 'Pending' ? "bg-yellow-50 text-yellow-600" : "bg-slate-100 text-slate-600"
                        )}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <button className="p-2 text-slate-300 hover:text-zamzam-teal transition-colors">
                          <History size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
