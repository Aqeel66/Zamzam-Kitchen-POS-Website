import { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Printer, 
  Minus,
  QrCode,
  Smartphone,
  Download,
  Copy,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReactToPrint } from 'react-to-print';
import { API_BASE_URL } from '../config';

const cn = (...inputs: (string | undefined | null | false)[]) => inputs.filter(Boolean).join(' ');

export default function Tables() {
  const [tables, setTables] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedQRTable, setSelectedQRTable] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isSyncing, setIsSyncing] = useState(false);

  const qrPrintRef = useRef<any>(null);
  const handlePrint = useReactToPrint({
    contentRef: qrPrintRef,
  });

  const getStatusConfig = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    switch(s) {
      case 'available':
        return { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', icon: CheckCircle2, label: 'Available' };
      case 'occupied':
        return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', icon: AlertCircle, label: 'Occupied', pulse: true };
      case 'maintenance':
        return { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', icon: X, label: 'Maintenance' };
      case 'reserved':
        return { color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', icon: Users, label: 'Reserved' };
      default:
        return { color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-100', icon: AlertCircle, label: status };
    }
  };

  useEffect(() => {
    fetchTables();
    fetchActiveOrders();
    const interval = setInterval(() => {
      setIsSyncing(true);
      Promise.all([fetchTables(), fetchActiveOrders()]).finally(() => {
        setIsSyncing(false);
        setLastUpdated(new Date());
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchTables = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/tables`);
      const data = await res.json();
      setTables(data);
    } catch (err) {
      console.error('Error fetching tables:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActiveOrders = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setActiveOrders(data.filter((o: any) => 
          (o.table_id || o.table_number) && 
          !['cancelled', 'rejected', 'served'].includes((o.status || '').toLowerCase().trim())
        ));
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  const handleDeleteTable = async (id: number) => {
    if (!confirm('Are you sure you want to delete this table?')) return;
    try {
      await fetch(`${API_BASE_URL}/tables/${id}`, { method: 'DELETE' });
      fetchTables();
    } catch (err) {
      alert('Failed to delete table');
    }
  };

  const filteredTables = tables.filter(t => 
    t.table_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] font-bold text-zamzam-teal uppercase tracking-[0.4em] block">Floor Management</span>
            <div className="flex items-center gap-2 bg-slate-100/50 px-2 py-0.5 rounded-full border border-slate-200/50">
               <div className={cn("w-1.5 h-1.5 rounded-full bg-green-500", isSyncing ? "animate-ping" : "animate-pulse")} />
               <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Live Sync: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Tables <span className="text-zamzam-teal">&</span> QR Codes</h1>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => { setEditingTable(null); setIsModalOpen(true); }}
            className="bg-zamzam-teal text-white px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-teal-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <Plus size={14} />
            Add Table
          </button>
        </div>
      </header>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-3 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
          <div className="relative group max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-zamzam-teal transition-colors" size={14} />
            <input 
              type="text" 
              placeholder="Search table number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-bold shadow-sm outline-none focus:ring-2 focus:ring-zamzam-teal/5 focus:border-zamzam-teal/30 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Status:</span>
             <div className="flex gap-1.5">
                <span className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 rounded-lg text-[9px] font-bold uppercase tracking-widest border border-green-100">Available</span>
                <span className="flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 rounded-lg text-[9px] font-bold uppercase tracking-widest border border-red-100">Occupied</span>
             </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {isLoading ? (
            <div className="py-12 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-zamzam-teal rounded-full animate-spin" />
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="px-8 py-5">Table Info</th>
                    <th className="px-8 py-5 text-center">Occupancy</th>
                    <th className="px-8 py-5">Status</th>
                    <th className="px-8 py-5">Digital Menu</th>
                    <th className="px-8 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredTables.map((table) => {
                    const tableOrders = activeOrders.filter(o => {
                       const orderTableId = o.table_id ? String(o.table_id) : null;
                       const orderTableNum = o.table_number ? String(o.table_number).toLowerCase().trim() : null;
                       const targetTableId = table.id ? String(table.id) : null;
                       const targetTableNum = table.table_number ? String(table.table_number).toLowerCase().trim() : null;

                       return (orderTableId && orderTableId === targetTableId) || 
                              (orderTableNum && orderTableNum === targetTableNum);
                    });
                    const currentGuests = tableOrders.reduce((sum, o) => sum + (Number(o.guest_count) || 1), 0);
                    const occupancyPercent = Math.min(100, (currentGuests / (table.capacity || 1)) * 100);
                    
                    const releaseTimes = tableOrders.map(o => o.estimated_release_time).filter(t => t && !isNaN(new Date(t).getTime()));
                    const latestRelease = releaseTimes.length > 0 ? new Date(Math.max(...releaseTimes.map(t => new Date(t).getTime()))) : null;
                    const isValidRelease = latestRelease && !isNaN(latestRelease.getTime());

                    let activeConfig = getStatusConfig(table.status);
                    if (currentGuests >= table.capacity) {
                      activeConfig = { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', icon: AlertCircle, label: 'Full', pulse: true };
                    } else if (currentGuests > 0) {
                      activeConfig = { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', icon: Users, label: 'Busy' };
                    } else if (activeConfig.label === 'Occupied') {
                      activeConfig = getStatusConfig('Available');
                    }

                    const StatusIcon = activeConfig.icon;

                    return (
                      <tr key={table.id} className="hover:bg-slate-50/30 transition-colors group">
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold transition-all border shadow-inner shrink-0",
                              activeConfig.bg, activeConfig.color, activeConfig.border
                            )}>
                              <span className="text-sm tracking-tighter leading-none">{table.table_number}</span>
                              <span className="text-[7px] uppercase tracking-widest mt-0.5 opacity-50">Table</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 mb-1">
                                <Users size={12} className="text-slate-300" />
                                <span className="text-xs font-bold text-slate-900">Capacity: {table.capacity} Guests</span>
                              </div>
                              {isValidRelease && (
                                <div className="flex items-center gap-1.5 text-zamzam-teal font-bold uppercase tracking-widest text-[9px]">
                                  <Clock size={10} />
                                  Available ~ {latestRelease!.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-4 text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-700">
                              {currentGuests} Seated
                            </span>
                            <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${occupancyPercent}%` }}
                                className={cn(
                                  "h-full transition-all duration-1000",
                                  occupancyPercent >= 100 ? "bg-red-500" : occupancyPercent > 50 ? "bg-orange-500" : "bg-zamzam-teal"
                                )}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          <div className={cn(
                            "flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-bold uppercase tracking-widest inline-flex",
                            activeConfig.bg, activeConfig.color, activeConfig.border
                          )}>
                            <StatusIcon size={10} className={activeConfig.pulse ? "animate-pulse" : ""} />
                            {activeConfig.label}
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          <button 
                            onClick={() => { setSelectedQRTable(table); setQrModalOpen(true); }}
                            className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-100 rounded-xl hover:bg-white hover:border-zamzam-teal/30 transition-all group/qr shadow-sm"
                          >
                            <QrCode size={14} className="text-slate-400 group-hover/qr:text-zamzam-teal transition-colors" />
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">QR Code</span>
                          </button>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {(currentGuests > 0) && (
                              <button 
                                onClick={async () => {
                                  if (confirm('Manually clear this table?')) {
                                    await fetch(`${API_BASE_URL}/tables/${table.id}`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ status: 'Available' })
                                    });
                                    fetchTables();
                                  }
                                }}
                                className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100"
                                title="Clear Table"
                              >
                                <CheckCircle2 size={16} />
                              </button>
                            )}
                            <button 
                              onClick={() => { setEditingTable(table); setIsModalOpen(true); }}
                              className="p-2.5 bg-slate-50 text-slate-400 hover:text-zamzam-teal hover:bg-zamzam-teal/10 rounded-xl transition-all border border-slate-100"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteTable(table.id)}
                              className="p-2.5 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-100"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Configuration Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden p-10"
            >
              <div className="flex items-center justify-between mb-10">
                <div>
                  <span className="text-[10px] font-bold text-zamzam-teal uppercase tracking-[0.4em] mb-2 block">Configuration</span>
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                    {editingTable ? 'Edit' : 'Add New'} <span className="text-zamzam-teal">Table</span>
                  </h2>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const payload = {
                  table_number: formData.get('table_number'),
                  capacity: parseInt(formData.get('capacity') as string),
                  status: formData.get('status')
                };

                try {
                  const url = editingTable ? `${API_BASE_URL}/tables/${editingTable.id}` : `${API_BASE_URL}/tables`;
                  const method = editingTable ? 'PATCH' : 'POST';
                  const res = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                  });
                  if (res.ok) {
                    setIsModalOpen(false);
                    fetchTables();
                  }
                } catch (err) {
                  alert('Operation failed');
                }
              }} className="space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Table Number</label>
                    <input name="table_number" type="text" placeholder="e.g. T-12" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:ring-4 focus:ring-zamzam-teal/5 transition-all" defaultValue={editingTable?.table_number} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Capacity</label>
                    <input name="capacity" type="number" placeholder="4" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:ring-4 focus:ring-zamzam-teal/5 transition-all" defaultValue={editingTable?.capacity} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Default Status</label>
                  <select name="status" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:ring-4 focus:ring-zamzam-teal/5 transition-all appearance-none" defaultValue={editingTable?.status || 'Available'}>
                    <option value="Available">Available</option>
                    <option value="Occupied">Occupied</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="submit" className="flex-1 bg-zamzam-teal text-white font-bold py-5 rounded-2xl shadow-xl shadow-teal-900/20 uppercase tracking-widest text-xs">
                    {editingTable ? 'Update' : 'Save'} Table
                  </button>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-10 bg-slate-100 text-slate-400 font-bold py-5 rounded-2xl uppercase tracking-widest text-xs hover:bg-slate-200 transition-all">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QR Modal */}
      <AnimatePresence>
        {qrModalOpen && selectedQRTable && (
          <QRModal 
            isOpen={qrModalOpen}
            onClose={() => setQrModalOpen(false)}
            table={selectedQRTable}
            printRef={qrPrintRef}
            onPrint={handlePrint}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function QRModal({ isOpen, onClose, table, printRef, onPrint }: any) {
  if (!isOpen || !table) return null;

  const menuUrl = `${window.location.origin}/menu?table=${table.table_number}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(menuUrl)}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
      />
      
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight uppercase leading-none">Digital Menu QR</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Table {table.table_number} • {table.capacity} Guests</p>
          </div>
          <button onClick={onClose} className="p-3 text-slate-400 hover:bg-white hover:text-slate-900 rounded-2xl transition-all border border-transparent hover:border-slate-100">
            <X size={24} />
          </button>
        </div>

        <div className="p-10 flex flex-col items-center">
           {/* Printable Area */}
           <div ref={printRef} className="p-8 bg-white text-center">
              <div className="mb-6">
                 <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tighter mb-1">Zamzam Kitchen</h1>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Scan to View Menu</p>
              </div>
              
              <div className="relative p-6 bg-slate-50 rounded-[2rem] border border-slate-100 mb-6 inline-block">
                 <img src={qrImageUrl} alt="QR Code" className="w-48 h-48 mix-blend-multiply" />
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-sm">
                    <QrCode size={20} className="text-zamzam-teal" />
                 </div>
              </div>

              <div className="space-y-1">
                 <p className="text-lg font-bold text-slate-900 uppercase">Table {table.table_number}</p>
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Powered by Zamzam POS</p>
              </div>
           </div>

           <div className="w-full grid grid-cols-2 gap-4 mt-8">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(menuUrl);
                  alert('URL copied to clipboard!');
                }}
                className="flex items-center justify-center gap-3 py-4 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
              >
                <Copy size={16} />
                Copy Link
              </button>
              <button 
                onClick={onPrint}
                className="flex items-center justify-center gap-3 py-4 bg-zamzam-teal text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-teal-500/20 hover:bg-teal-600 transition-all active:scale-95"
              >
                <Printer size={16} />
                Print QR
              </button>
           </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-6">
           <div className="flex items-center gap-2 text-slate-400">
              <Smartphone size={16} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Customer Scans QR</span>
           </div>
           <div className="h-1 w-1 rounded-full bg-slate-300" />
           <div className="flex items-center gap-2 text-slate-400">
              <Download size={16} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Menu Loads instantly</span>
           </div>
        </div>
      </motion.div>
    </div>
  );
}
