import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  QrCode,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';

const cn = (...inputs: (string | undefined | null | false)[]) => inputs.filter(Boolean).join(' ');

export default function Tables() {
  const [tables, setTables] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTables();
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
    <div className="p-10 max-w-7xl mx-auto space-y-10">
      <header className="flex items-end justify-between">
        <div>
          <span className="text-[10px] font-black text-zamzam-teal uppercase tracking-[0.4em] mb-2 block">Floor Management</span>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Tables <span className="text-zamzam-teal">&</span> QR Codes</h1>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => { setEditingTable(null); setIsModalOpen(true); }}
            className="bg-zamzam-teal text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-teal-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
          >
            <Plus size={18} />
            Add Table
          </button>
        </div>
      </header>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
          <div className="relative group max-w-md w-full">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-zamzam-teal transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search table number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-14 pr-6 text-sm font-bold shadow-sm outline-none focus:ring-4 focus:ring-zamzam-teal/5 focus:border-zamzam-teal/30 transition-all"
            />
          </div>
          <div className="flex items-center gap-3">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status:</span>
             <div className="flex gap-2">
                <span className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-green-100">Available</span>
                <span className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-red-100">Occupied</span>
             </div>
          </div>
        </div>

        <div className="p-8">
          {isLoading ? (
            <div className="py-20 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-zamzam-teal rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredTables.map((table) => (
                <motion.div
                  layout
                  key={table.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white border border-slate-100 rounded-[2rem] p-6 relative group hover:border-zamzam-teal/30 transition-all shadow-sm hover:shadow-xl hover:shadow-slate-200/50 overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button 
                      onClick={() => { setEditingTable(table); setIsModalOpen(true); }}
                      className="w-8 h-8 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-slate-400 hover:text-zamzam-teal hover:border-zamzam-teal/30 transition-all shadow-sm"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDeleteTable(table.id)}
                      className="w-8 h-8 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-100 transition-all shadow-sm"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-5 mb-6">
                    <div className={cn(
                      "w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-black transition-all",
                      table.status === 'Available' ? "bg-green-50 text-green-600 border-2 border-green-100" : "bg-red-50 text-red-600 border-2 border-red-100"
                    )}>
                      <span className="text-xl leading-none">{table.table_number}</span>
                      <span className="text-[8px] uppercase tracking-widest mt-1 opacity-60">Table</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Users size={14} className="text-slate-300" />
                        <span className="text-sm font-black text-slate-900">{table.capacity} <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1">Guests</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        {table.status === 'Available' ? <CheckCircle2 size={12} className="text-green-500" /> : <AlertCircle size={12} className="text-red-500" />}
                        <span className={cn("text-[10px] font-black uppercase tracking-widest", table.status === 'Available' ? "text-green-600" : "text-red-600")}>
                          {table.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                     <button className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-zamzam-teal/5 group/btn transition-all border border-transparent hover:border-zamzam-teal/20">
                        <div className="flex items-center gap-3">
                           <QrCode size={18} className="text-slate-400 group-hover/btn:text-zamzam-teal transition-colors" />
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover/btn:text-zamzam-teal transition-colors">Digital Menu QR</span>
                        </div>
                        <Printer size={16} className="text-slate-300 group-hover/btn:text-zamzam-teal transition-colors" />
                     </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
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
                  <span className="text-[10px] font-black text-zamzam-teal uppercase tracking-[0.4em] mb-2 block">Configuration</span>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">
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
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Table Number</label>
                    <input name="table_number" type="text" placeholder="e.g. T-12" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-black outline-none focus:ring-4 focus:ring-zamzam-teal/5 transition-all" defaultValue={editingTable?.table_number} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Capacity</label>
                    <input name="capacity" type="number" placeholder="4" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-black outline-none focus:ring-4 focus:ring-zamzam-teal/5 transition-all" defaultValue={editingTable?.capacity} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Default Status</label>
                  <select name="status" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-black outline-none focus:ring-4 focus:ring-zamzam-teal/5 transition-all appearance-none" defaultValue={editingTable?.status || 'Available'}>
                    <option value="Available">Available</option>
                    <option value="Occupied">Occupied</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="submit" className="flex-1 bg-zamzam-teal text-white font-black py-5 rounded-2xl shadow-xl shadow-teal-900/20 uppercase tracking-widest text-xs">
                    {editingTable ? 'Update' : 'Save'} Table
                  </button>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-10 bg-slate-100 text-slate-400 font-black py-5 rounded-2xl uppercase tracking-widest text-xs hover:bg-slate-200 transition-all">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
