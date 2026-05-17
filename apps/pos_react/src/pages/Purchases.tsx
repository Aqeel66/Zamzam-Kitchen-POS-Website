import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Truck,
  Package,
  X,
  Save,
  Trash2,
  CheckCircle2,
  Clock,
  Ban,
  FileText,
  DollarSign,
  Building2,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

// --- TYPES ---
interface PurchaseOrder {
  id: number;
  supplier_id: number;
  supplier_name: string;
  invoice_number: string;
  order_date: string;
  total_amount: string;
  status: 'Pending' | 'Approved' | 'Received' | 'Cancelled';
  items?: PurchaseOrderItem[];
}

interface PurchaseOrderItem {
  id: number;
  inventory_item_id: number;
  item_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  subtotal: number;
}

interface InventoryItem {
  id: number;
  name: string;
  unit: string;
  cost_per_unit: number;
}

interface Supplier {
  id: number;
  name: string;
}

export default function Purchases() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

  useEffect(() => {
    fetchData();
    fetchSettings();
  }, []);

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
      const [ordRes, invRes, supRes] = await Promise.all([
        fetch(`${API_BASE_URL}/purchases?t=${Date.now()}`),
        fetch(`${API_BASE_URL}/inventory?t=${Date.now()}`),
        fetch(`${API_BASE_URL}/purchases/suppliers?t=${Date.now()}`)
      ]);
      const ordData = await ordRes.json();
      const invData = await invRes.json();
      const supData = await supRes.json();
      setOrders(Array.isArray(ordData) ? ordData : []);
      setInventory(Array.isArray(invData) ? invData : []);
      setSuppliers(Array.isArray(supData) ? supData : []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/purchases/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchData();
        window.dispatchEvent(new CustomEvent('show-toast', { 
          detail: { message: `Order #${id} Marked as ${status}`, type: 'success' } 
        }));
      }
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOrder = async (id: number) => {
    if (!confirm('Are you sure you want to delete this purchase order record?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/purchases/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
        window.dispatchEvent(new CustomEvent('show-toast', { 
          detail: { message: 'Order Deleted Permanently', type: 'success' } 
        }));
      }
    } catch (err) { console.error('Delete Error:', err); }
  };

  const currency = settings?.tenant?.currency || 'USD';

  const filteredOrders = orders.filter(o => 
    o.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.id.toString().includes(searchQuery)
  );

  return (
    <div className="bg-slate-50/30 min-h-screen">
      <div className="p-10 max-w-[1600px] mx-auto space-y-10">
        
        {/* --- HEADER --- */}
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
               <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                  <Truck size={16} />
               </div>
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Procurement Pipeline</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Purchase <span className="text-indigo-500 font-medium">Orders</span></h1>
          </div>
          
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-indigo-500 px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white shadow-lg shadow-indigo-500/20 hover:scale-105 transition-transform flex items-center gap-3"
          >
            <Plus size={16} />
            Create Purchase Order
          </button>
        </div>

        {/* --- KPI CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <KPICard title="Pending Orders" value={orders.filter(o => o.status === 'Pending').length} icon={Clock} color="orange" />
           <KPICard title="Orders Received" value={orders.filter(o => o.status === 'Received').length} icon={CheckCircle2} color="teal" />
           <KPICard title="Total Spending" value={`${orders.reduce((acc, o) => acc + parseFloat(o.total_amount), 0).toLocaleString()} ${currency}`} icon={DollarSign} color="indigo" />
           <KPICard title="Active Suppliers" value={suppliers.length} icon={Building2} color="slate" />
        </div>

        {/* --- SEARCH & FILTERS --- */}
        <div className="flex items-center gap-4">
          <div className="relative group flex-1 max-w-xl">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={20} />
            <input 
              type="text"
              placeholder="Search by Invoice #, Supplier, or Order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-100 rounded-[1.5rem] py-5 pl-14 pr-6 text-sm font-bold shadow-sm outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
            />
          </div>
          <button onClick={fetchData} className="p-5 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-indigo-500 transition-all shadow-sm">
             <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* --- ORDERS TABLE --- */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
           <table className="w-full text-left border-collapse">
              <thead>
                 <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] border-b border-slate-50">
                    <th className="px-8 py-5">Order ID & Date</th>
                    <th className="px-8 py-5">Invoice #</th>
                    <th className="px-8 py-5">Supplier</th>
                    <th className="px-8 py-5">Items</th>
                    <th className="px-8 py-5">Total Amount</th>
                    <th className="px-8 py-5">Status</th>
                    <th className="px-8 py-5 text-right">Actions</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                 {filteredOrders.map((order) => (
                    <tr key={order.id} className="group hover:bg-slate-50/30 transition-colors">
                       <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                                <FileText size={20} />
                             </div>
                             <div>
                                <p className="text-xs font-bold text-slate-900 tracking-tight">#{order.id}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(order.order_date).toLocaleDateString()}</p>
                             </div>
                          </div>
                       </td>
                       <td className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">{order.invoice_number || '---'}</td>
                       <td className="px-8 py-5">
                          <p className="text-xs font-bold text-slate-900">{order.supplier_name}</p>
                       </td>
                       <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                             <div className="flex -space-x-2">
                                {(order.items || []).slice(0, 2).map((item, i) => (
                                   <div key={i} className="w-8 h-8 rounded-full bg-white border-2 border-slate-50 flex items-center justify-center shadow-sm ring-2 ring-indigo-50/50" title={`${item.quantity} ${item.unit} ${item.item_name}`}>
                                      <Package size={14} className="text-indigo-400" />
                                   </div>
                                ))}
                                {(order.items?.length || 0) > 2 && (
                                   <div className="w-8 h-8 rounded-full bg-indigo-50 border-2 border-white flex items-center justify-center text-[10px] font-bold text-indigo-500 shadow-sm">
                                      +{(order.items?.length || 0) - 2}
                                   </div>
                                )}
                             </div>
                             <div className="flex flex-col max-w-[180px]">
                                <span className="text-xs font-bold text-slate-900 truncate" title={(order.items || []).map(i => i.item_name).join(', ')}>
                                   {order.items && order.items.length > 0 
                                      ? (order.items.length === 1 
                                         ? order.items[0].item_name 
                                         : `${order.items[0].item_name} +${order.items.length - 1} more`)
                                      : 'No Products'}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                   {order.items?.reduce((sum, item) => sum + Number(item.quantity), 0)} Total Units
                                </span>
                             </div>
                          </div>
                       </td>
                       <td className="px-8 py-5">
                          <p className="text-base font-bold text-slate-900 tabular-nums">{parseFloat(order.total_amount).toLocaleString()} <span className="text-[10px] text-slate-300 font-bold uppercase">{currency}</span></p>
                       </td>
                       <td className="px-8 py-5">
                          <StatusBadge status={order.status} />
                       </td>
                       <td className="px-8 py-5 text-right flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setSelectedOrder(order)}
                            className="px-4 py-2 bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-400 rounded-lg hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                          >
                             Manage Order
                          </button>
                          <button 
                            onClick={() => handleDeleteOrder(order.id)}
                            className="p-3 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          >
                             <Trash2 size={16} />
                          </button>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
           {filteredOrders.length === 0 && (
              <div className="p-20 text-center">
                 <Truck size={48} className="mx-auto text-slate-100 mb-4" />
                 <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">No matching purchase orders found</p>
              </div>
           )}
        </div>
      </div>

      {/* --- MODALS --- */}
      <AnimatePresence>
         {isCreateModalOpen && (
            <CreateOrderModal 
               onClose={() => setIsCreateModalOpen(false)} 
               suppliers={suppliers}
               inventory={inventory}
               currency={currency}
               onSave={() => { 
                 setIsCreateModalOpen(false); 
                 fetchData(); 
                 window.dispatchEvent(new CustomEvent('show-toast', { 
                   detail: { message: 'Purchase Order Created Successfully', type: 'success' } 
                 }));
               }}
            />
         )}
         {selectedOrder && (
            <OrderDetailModal 
               order={selectedOrder} 
               currency={currency}
               isSaving={isSaving}
               onClose={() => setSelectedOrder(null)} 
               onUpdateStatus={handleUpdateStatus}
            />
         )}
      </AnimatePresence>
    </div>
  );
}

// --- SUB-COMPONENTS ---

const KPICard = ({ title, value, icon: Icon, color }: any) => (
  <div className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex items-center gap-4">
    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner", 
      color === 'teal' ? "bg-teal-50 text-teal-600 border-teal-100" :
      color === 'orange' ? "bg-orange-50 text-orange-600 border-orange-100" :
      color === 'indigo' ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
      "bg-slate-50 text-slate-600 border-slate-100"
    )}>
      <Icon size={20} />
    </div>
    <div>
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 leading-none">{title}</p>
      <p className="text-xl font-bold text-slate-900 tracking-tight leading-none">{value}</p>
    </div>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
   const styles = {
      Pending: "bg-orange-50 text-orange-600 border-orange-100",
      Approved: "bg-blue-50 text-blue-600 border-blue-100",
      Received: "bg-teal-50 text-teal-600 border-teal-100",
      Cancelled: "bg-red-50 text-red-600 border-red-100"
   };
   return (
      <span className={cn("px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border shadow-sm", styles[status as keyof typeof styles])}>
         {status}
      </span>
   );
};

const CreateOrderModal = ({ onClose, suppliers, inventory, currency, onSave }: any) => {
   const [supplierId, setSupplierId] = useState("");
   const [invoiceNum, setInvoiceNum] = useState("");
   const [orderItems, setOrderItems] = useState<any[]>([]);
   const [searchTerm, setSearchTerm] = useState("");
   const [isSaving, setIsSaving] = useState(false);

   const addItem = (item: any) => {
      if (orderItems.find(oi => oi.inventory_item_id === item.id)) return;
      setOrderItems([...orderItems, {
         inventory_item_id: item.id,
         item_name: item.name,
         unit: item.unit,
         quantity: 1,
         unit_price: parseFloat(item.cost_per_unit) || 0,
         subtotal: parseFloat(item.cost_per_unit) || 0
      }]);
   };

   const updateItem = (index: number, field: string, value: any) => {
      const newItems = [...orderItems];
      newItems[index][field] = value;
      newItems[index].subtotal = newItems[index].quantity * newItems[index].unit_price;
      setOrderItems(newItems);
   };

   const total = orderItems.reduce((acc, item) => acc + item.subtotal, 0);

   const handleSave = async () => {
      if (!supplierId || orderItems.length === 0) return;
      setIsSaving(true);
      try {
         const res = await fetch(`${API_BASE_URL}/purchases`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               supplier_id: supplierId,
               invoice_number: invoiceNum,
               items: orderItems,
               total_amount: total,
               status: 'Pending'
            })
         });
         if (res.ok) onSave();
      } catch (err) {
         console.error('Error creating order:', err);
      } finally {
         setIsSaving(false);
      }
   };

   return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
         <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-5xl h-[85vh] rounded-[3rem] shadow-2xl flex overflow-hidden">
            {/* Left: Form */}
            <div className="flex-1 flex flex-col p-12 border-r border-slate-50">
               <div className="flex items-center justify-between mb-10">
                  <div>
                     <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Create New <span className="text-indigo-500">PO</span></h2>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Drafting a new supplier request</p>
                  </div>
                  <button onClick={onClose} className="p-3 text-slate-300 hover:text-slate-900"><X size={28} /></button>
               </div>

               <div className="space-y-8 flex-1 overflow-y-auto no-scrollbar pr-4">
                  <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Supplier</label>
                        <select 
                           value={supplierId}
                           onChange={e => setSupplierId(e.target.value)}
                           className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm font-bold outline-none appearance-none"
                        >
                           <option value="">Select a Supplier</option>
                           {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                     </div>
                     <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Invoice / Reference #</label>
                        <input 
                           type="text" 
                           value={invoiceNum}
                           onChange={e => setInvoiceNum(e.target.value)}
                           placeholder="INV-XXXXX"
                           className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm font-bold outline-none"
                        />
                     </div>
                  </div>

                  <div className="space-y-4">
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Order Items</label>
                     <div className="space-y-3">
                        {orderItems.map((item, idx) => (
                           <div key={idx} className="bg-slate-50/50 rounded-2xl p-4 flex items-center gap-4 group">
                              <div className="flex-1">
                                 <p className="text-xs font-bold text-slate-900 uppercase">{item.item_name}</p>
                                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{item.unit}</p>
                              </div>
                              <div className="w-24">
                                 <input 
                                    type="number" 
                                    value={item.quantity}
                                    onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                    className="w-full bg-white border-none rounded-xl p-2.5 text-center text-xs font-bold outline-none shadow-sm"
                                 />
                              </div>
                              <div className="w-24 relative">
                                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300">
                                   {currency === 'AED' ? 'د.إ' : '$'}
                                 </span>
                                 <input 
                                    type="number" 
                                    value={item.unit_price}
                                    onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                                    className="w-full bg-white border-none rounded-xl p-2.5 pl-6 text-xs font-bold outline-none shadow-sm"
                                 />
                              </div>
                              <div className="w-24 text-right">
                                 <p className="text-xs font-bold text-slate-900">{item.subtotal.toFixed(2)}</p>
                              </div>
                              <button onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                 <Trash2 size={16} />
                              </button>
                           </div>
                        ))}
                        {orderItems.length === 0 && (
                           <div className="py-12 border-2 border-dashed border-slate-100 rounded-3xl text-center">
                              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Select items from the right to add to order</p>
                           </div>
                        )}
                     </div>
                  </div>
               </div>

               <div className="mt-10 pt-8 border-t border-slate-50 flex items-center justify-between">
                  <div>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Grand Total ({currency})</p>
                     <p className="text-3xl font-bold text-slate-900 tracking-tighter tabular-nums">{total.toFixed(2)}</p>
                  </div>
                  <button 
                     onClick={handleSave}
                     disabled={isSaving || !supplierId || orderItems.length === 0}
                     className="px-12 py-5 bg-indigo-500 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center gap-3"
                  >
                     {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                     {isSaving ? 'Processing...' : 'Confirm Order'}
                  </button>
               </div>
            </div>

            {/* Right: Item Selection */}
            <div className="w-96 bg-slate-50 p-10 flex flex-col gap-6">
               <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                     type="text" 
                     placeholder="Quick find item..."
                     value={searchTerm}
                     onChange={e => setSearchTerm(e.target.value)}
                     className="w-full bg-white border-none rounded-xl py-3.5 pl-12 pr-4 text-xs font-bold outline-none shadow-sm shadow-slate-200/50"
                  />
               </div>

               <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-2">Inventory Stock</p>
                  {inventory
                     .filter((i: InventoryItem) => (i.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()))
                     .map((item: InventoryItem) => (
                        <button 
                           key={item.id}
                           onClick={() => addItem(item)}
                           className="w-full bg-white p-4 rounded-2xl border border-white hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 transition-all text-left flex items-center justify-between group"
                        >
                           <div>
                              <p className="text-xs font-bold text-slate-900 uppercase group-hover:text-indigo-600 transition-colors">{item.name}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{item.unit}</p>
                           </div>
                           <Plus size={16} className="text-slate-200 group-hover:text-indigo-500 group-hover:rotate-90 transition-all" />
                        </button>
                     ))
                  }
               </div>
            </div>
         </motion.div>
      </motion.div>
   );
};

const OrderDetailModal = ({ order, currency, isSaving, onClose, onUpdateStatus }: any) => (
   <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden p-12">
         <div className="flex items-start justify-between mb-10">
            <div>
               <div className="flex items-center gap-3 mb-2">
                  <StatusBadge status={order.status} />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Order ID: #{order.id}</span>
               </div>
               <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">{order.supplier_name}</h2>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Issued on {new Date(order.order_date).toLocaleDateString()} at {new Date(order.order_date).toLocaleTimeString()}
               </p>
            </div>
            <button onClick={onClose} className="p-3 text-slate-300 hover:text-slate-900"><X size={28} /></button>
         </div>

         <div className="space-y-6 max-h-[40vh] overflow-y-auto no-scrollbar pr-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Line Items</p>
            {order.items?.map((item: any, idx: number) => (
               <div key={idx} className="flex items-center justify-between py-4 border-b border-slate-50 last:border-0">
                  <div>
                     <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">{item.item_name}</p>
                     <p className="text-[10px] font-medium text-slate-400 mt-0.5">{item.quantity} {item.unit} @ {parseFloat(item.unit_price).toFixed(2)} {currency}</p>
                  </div>
                  <p className="text-base font-bold text-slate-900 tabular-nums">{parseFloat(item.subtotal).toFixed(2)} {currency}</p>
               </div>
            ))}
         </div>

         <div className="mt-10 pt-10 border-t border-slate-100 flex items-center justify-between">
            <div>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Grand Total</p>
               <p className="text-2xl font-bold text-slate-900 tabular-nums">{parseFloat(order.total_amount).toFixed(2)} <span className="text-xs text-slate-300 font-bold uppercase">{currency}</span></p>
            </div>
            
            <div className="flex gap-2">
               {order.status === 'Pending' && (
                  <>
                     <button 
                        disabled={isSaving}
                        onClick={() => { onUpdateStatus(order.id, 'Cancelled'); onClose(); }}
                        className="px-6 py-4 bg-red-50 text-red-500 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"
                     >
                        <Ban size={14} /> Cancel
                     </button>
                     <button 
                        disabled={isSaving}
                        onClick={() => { onUpdateStatus(order.id, 'Approved'); onClose(); }}
                        className="px-8 py-4 bg-indigo-500 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-indigo-500/20 flex items-center gap-2"
                     >
                        {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <CheckCircle2 size={14} />} 
                        {isSaving ? 'Processing...' : 'Approve Order'}
                     </button>
                  </>
               )}
               {order.status === 'Approved' && (
                  <button 
                     disabled={isSaving}
                     onClick={() => { onUpdateStatus(order.id, 'Received'); onClose(); }}
                     className="px-10 py-5 bg-teal-500 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-teal-500/20 flex items-center justify-center gap-2"
                  >
                     {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Package size={18} />} 
                     {isSaving ? 'Receiving...' : 'Mark as Received'}
                  </button>
               )}
            </div>
         </div>
      </motion.div>
   </motion.div>
);
