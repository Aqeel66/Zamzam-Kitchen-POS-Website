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
  QrCode,
  Smartphone,
  Download,
  Copy,
  Clock,
  Calendar,
  ChevronRight,
  Minus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReactToPrint } from 'react-to-print';
import { API_BASE_URL } from '../config';

const cn = (...inputs: (string | undefined | null | false)[]) => inputs.filter(Boolean).join(' ');

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getNowTimeStr = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const formatTableNumber = (num: string | number) => {
  if (!num) return '';
  const str = num.toString().trim();
  const clean = str.replace(/^[t\s\-_–—]+/i, '');
  return 'T-' + clean;
};

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

  // Date/Time filter state — default to today + now
  const [filterDate, setFilterDate] = useState(getTodayStr());
  const [filterTime, setFilterTime] = useState(getNowTimeStr());

  // All reservations for the selected filterDate
  const [filteredReservations, setFilteredReservations] = useState<any[]>([]);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);

  // Table detail modal
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [isTableDetailOpen, setIsTableDetailOpen] = useState(false);

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

  // Refetch reservations whenever the date filter changes
  useEffect(() => {
    fetchFilteredReservations();
  }, [filterDate]);

  const fetchTables = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/tables`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setTables(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching tables:', err);
      setTables([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActiveOrders = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setActiveOrders(data.filter((o: any) =>
          (o.table_id || o.table_number) &&
          !['cancelled', 'rejected', 'paid', 'completed'].includes((o.status || '').toLowerCase().trim())
        ));
      } else {
        setActiveOrders([]);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setActiveOrders([]);
    }
  };

  const fetchFilteredReservations = async () => {
    setIsLoadingReservations(true);
    try {
      const res = await fetch(`${API_BASE_URL}/reservations?startDate=${filterDate}&endDate=${filterDate}`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setFilteredReservations(data.filter((r: any) =>
          !['cancelled', 'no-show', 'vacated', 'completed'].includes((r.status || '').toLowerCase())
        ));
      }
    } catch (err) {
      console.error('Error fetching reservations:', err);
    } finally {
      setIsLoadingReservations(false);
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

  const isToday = filterDate === getTodayStr();

  // Parse filterTime into minutes for comparison
  const filterTimeMins = (() => {
    const [h, m] = filterTime.split(':').map(Number);
    return h * 60 + m;
  })();

  // Is a reservation active during the selected time window (±90 min)
  const isReservationActiveAtTime = (r: any) => {
    const rTime = (r.reservation_time || '00:00').substring(0, 5);
    const [rh, rm] = rTime.split(':').map(Number);
    const rMins = rh * 60 + rm;
    const stayMins = Number(r.stay_duration) || 90;
    return filterTimeMins >= rMins && filterTimeMins < rMins + stayMins;
  };

  const filteredTables = tables.filter(t =>
    t.table_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Summary Stats ──
  const totalTables = tables.length;
  const totalSeats = tables.reduce((sum, t) => sum + (Number(t.capacity) || 0), 0);

  // For summary, count how many tables have any reservation on filterDate at filterTime
  const reservedTableIds = new Set<string>();
  filteredReservations.forEach(r => {
    if (isReservationActiveAtTime(r)) {
      if (r.assigned_table_ids) {
        r.assigned_table_ids.split(',').forEach((id: string) => reservedTableIds.add(id.trim()));
      } else if (r.table_id) {
        reservedTableIds.add(String(r.table_id));
      }
    }
  });

  const occupiedTableIds = new Set<string>();
  if (isToday) {
    activeOrders.forEach(o => {
      if (o.table_id) occupiedTableIds.add(String(o.table_id));
    });
  }

  const busyCount = new Set([...reservedTableIds, ...occupiedTableIds]).size;
  const availableCount = totalTables - busyCount;

  const summaryStats = [
    { label: 'Total Tables', value: totalTables, color: 'text-zamzam-teal', bg: 'bg-teal-50', border: 'border-teal-100', icon: '🪑' },
    { label: 'Total Seats', value: totalSeats, color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200', icon: '👤' },
    { label: 'Available', value: availableCount, color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-100', icon: '✅' },
    { label: 'Reserved / Busy', value: busyCount, color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-100', icon: '📌' },
  ];

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

      {/* ── Summary Bar ── */}
      <div className="grid grid-cols-4 gap-3">
        {summaryStats.map((stat) => (
          <div key={stat.label} className={cn("flex items-center gap-3 px-4 py-3 rounded-2xl border", stat.bg, stat.border)}>
            <span className="text-xl">{stat.icon}</span>
            <div>
              <p className={cn("text-2xl font-black leading-none", stat.color)}>{stat.value}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        {/* ── Toolbar with Search + Date/Time Filter ── */}
        <div className="p-3 border-b border-slate-50 flex items-center justify-between gap-4 bg-slate-50/30 flex-wrap">
          <div className="relative group max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-zamzam-teal transition-colors" size={14} />
            <input 
              type="text" 
              placeholder="Search table number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-bold shadow-sm outline-none focus:ring-2 focus:ring-zamzam-teal/5 focus:border-zamzam-teal/30 transition-all"
            />
          </div>

          {/* Date+Time Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block">View Occupancy At:</span>
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2 py-1.5 shadow-sm">
              <Calendar size={12} className="text-zamzam-teal shrink-0" />
              <input
                type="date"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="text-[11px] font-bold text-slate-700 outline-none bg-transparent cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2 py-1.5 shadow-sm">
              <Clock size={12} className="text-zamzam-teal shrink-0" />
              <input
                type="time"
                value={filterTime}
                onChange={e => setFilterTime(e.target.value)}
                className="text-[11px] font-bold text-slate-700 outline-none bg-transparent cursor-pointer"
              />
            </div>
            {isLoadingReservations && (
              <div className="w-3 h-3 border-2 border-zamzam-teal/30 border-t-zamzam-teal rounded-full animate-spin" />
            )}
          </div>

          {/* Status Legend */}
          <div className="flex items-center gap-2">
             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Status:</span>
             <div className="flex gap-1.5">
                <span className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 rounded-lg text-[9px] font-bold uppercase tracking-widest border border-green-100">Available</span>
                <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-600 rounded-lg text-[9px] font-bold uppercase tracking-widest border border-purple-100">Reserved</span>
                <span className="flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 rounded-lg text-[9px] font-bold uppercase tracking-widest border border-red-100">Occupied</span>
             </div>
          </div>
        </div>

        {/* Date Banner — only shown when NOT viewing today */}
        {!isToday && (
          <div className="px-5 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
            <Calendar size={12} className="text-amber-500" />
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
              Viewing occupancy for {new Date(filterDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} @ {filterTime}
            </span>
          </div>
        )}

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
                    <th className="px-8 py-5 text-center">Occupancy at Selected Time</th>
                    <th className="px-8 py-5">Status</th>
                    <th className="px-8 py-5">Digital Menu</th>
                    <th className="px-8 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredTables.map((table) => {
                    // --- Live order guests (only relevant for today) ---
                    const tableOrders = isToday ? activeOrders.filter(o => {
                      const orderTableId = o.table_id ? String(o.table_id) : null;
                      const targetTableId = table.id ? String(table.id) : null;
                      return orderTableId && orderTableId === targetTableId;
                    }) : [];
                    const orderGuests = tableOrders.reduce((sum, o) => sum + (Number(o.party_size) || Number(o.guest_count) || 1), 0);

                    // --- Reservations for this table at selected date+time ---
                    const tableReservations = filteredReservations.filter(r => {
                      const directMatch = r.table_id && String(r.table_id) === String(table.id);
                      const junctionMatch = r.assigned_table_ids
                        ? r.assigned_table_ids.split(',').map((x: string) => x.trim()).includes(String(table.id))
                        : false;
                      return directMatch || junctionMatch;
                    });

                    // Active reservations at the selected time window
                    const activeReservations = tableReservations.filter(isReservationActiveAtTime);
                    const reservedGuests = activeReservations.reduce((sum, r) => sum + (Number(r.party_size) || 1), 0);

                    // Upcoming (future slots on selected date)
                    const upcomingReservations = tableReservations.filter(r => {
                      const rTime = (r.reservation_time || '00:00').substring(0, 5);
                      const [rh, rm] = rTime.split(':').map(Number);
                      return rh * 60 + rm > filterTimeMins;
                    }).sort((a, b) => (a.reservation_time || '').localeCompare(b.reservation_time || ''));

                    const nextReservation = upcomingReservations[0];

                    const currentGuests = orderGuests > 0 ? orderGuests : reservedGuests;
                    const occupancyPercent = Math.min(100, (currentGuests / (table.capacity || 1)) * 100);

                    let activeConfig = getStatusConfig(table.status);
                    if (orderGuests >= table.capacity) {
                      activeConfig = { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', icon: AlertCircle, label: 'Full', pulse: true };
                    } else if (orderGuests > 0) {
                      activeConfig = { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', icon: Users, label: 'Busy' };
                    } else if (activeReservations.some(r => (r.status || '').toLowerCase() === 'seated')) {
                      activeConfig = { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', icon: AlertCircle, label: 'Occupied', pulse: true };
                    } else if (reservedGuests > 0) {
                      activeConfig = { color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', icon: Users, label: 'Reserved' };
                    } else if (activeConfig.label === 'Occupied') {
                      activeConfig = getStatusConfig('Available');
                    } else if (!isToday && currentGuests === 0) {
                      activeConfig = getStatusConfig('Available');
                    }

                    const StatusIcon = activeConfig.icon;

                    return (
                      <tr 
                        key={table.id} 
                        className="hover:bg-teal-50/20 transition-colors group cursor-pointer"
                        onClick={() => { setSelectedTable({ table, tableReservations, activeReservations, orderGuests }); setIsTableDetailOpen(true); }}
                      >
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold transition-all border shadow-inner shrink-0",
                              activeConfig.bg, activeConfig.color, activeConfig.border
                            )}>
                              <span className="text-sm tracking-tighter leading-none">{formatTableNumber(table.table_number)}</span>
                              <span className="text-[7px] uppercase tracking-widest mt-0.5 opacity-50">Table</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 mb-1">
                                <Users size={12} className="text-slate-300" />
                                <span className="text-xs font-bold text-slate-900">Capacity: {table.capacity} Guests</span>
                              </div>
                              {nextReservation && (
                                <div className="flex items-center gap-1.5 text-purple-500 font-bold uppercase tracking-widest text-[9px]">
                                  <Clock size={10} />
                                  Next Booking @ {(nextReservation.reservation_time || '').substring(0, 5)}
                                </div>
                              )}
                              {!nextReservation && tableReservations.length > 0 && currentGuests === 0 && (
                                <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase tracking-widest text-[9px]">
                                  <Clock size={10} />
                                  {tableReservations.length} booking{tableReservations.length !== 1 ? 's' : ''} on this date
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-4 text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            <span className={cn(
                              "text-xs font-bold",
                              orderGuests > 0 ? "text-red-600" : reservedGuests > 0 ? "text-purple-600" : "text-slate-400"
                            )}>
                              {currentGuests > 0
                                ? `${currentGuests} ${orderGuests > 0 ? 'Seated' : 'Booked'}`
                                : '—'}
                            </span>
                            <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${occupancyPercent}%` }}
                                className={cn(
                                  "h-full transition-all duration-1000",
                                  occupancyPercent >= 100 ? "bg-red-500" : orderGuests > 0 ? "bg-orange-500" : reservedGuests > 0 ? "bg-purple-400" : "bg-zamzam-teal"
                                )}
                              />
                            </div>
                            {currentGuests > 0 && (
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                {currentGuests}/{table.capacity} seats
                              </span>
                            )}
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
                        <td className="px-8 py-4" onClick={e => e.stopPropagation()}>
                          <button 
                            onClick={() => { setSelectedQRTable(table); setQrModalOpen(true); }}
                            className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-100 rounded-xl hover:bg-white hover:border-zamzam-teal/30 transition-all group/qr shadow-sm"
                          >
                            <QrCode size={14} className="text-slate-400 group-hover/qr:text-zamzam-teal transition-colors" />
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">QR Code</span>
                          </button>
                        </td>
                        <td className="px-8 py-4 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {(currentGuests > 0 && isToday) && (
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
                          {/* Click hint */}
                          <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 justify-end mt-1">
                            View Details <ChevronRight size={8} />
                          </span>
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

      {/* Table Detail Modal */}
      <AnimatePresence>
        {isTableDetailOpen && selectedTable && (
          <TableDetailModal
            data={selectedTable}
            filterDate={filterDate}
            filterTime={filterTime}
            isToday={isToday}
            onClose={() => setIsTableDetailOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Table Detail Modal ──────────────────────────────────────────────────────

function TableDetailModal({ data, filterDate, filterTime, isToday, onClose }: any) {
  const { table, tableReservations, activeReservations, orderGuests } = data;

  const getStatusChip = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'confirmed') return 'bg-blue-50 text-blue-700 border-blue-100';
    if (s === 'pending') return 'bg-amber-50 text-amber-700 border-amber-100';
    if (s === 'seated') return 'bg-red-50 text-red-700 border-red-100';
    if (s === 'reserved') return 'bg-purple-50 text-purple-700 border-purple-100';
    return 'bg-slate-50 text-slate-600 border-slate-200';
  };

  const sortedReservations = [...tableReservations].sort((a, b) =>
    (a.reservation_time || '').localeCompare(b.reservation_time || '')
  );

  const displayDate = new Date(filterDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="px-3 py-1 bg-zamzam-teal/10 text-zamzam-teal rounded-xl text-sm font-black tracking-tight">
                  {formatTableNumber(table.table_number)}
                </div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  {table.capacity} Seats Total
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Table Occupancy</h2>
            </div>
            <button onClick={onClose} className="p-2.5 text-slate-400 hover:bg-white hover:text-slate-900 rounded-2xl transition-all border border-transparent hover:border-slate-100">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Date + Time Context */}
        <div className="px-8 py-3 bg-amber-50/70 border-b border-amber-100 flex items-center gap-2 shrink-0">
          <Calendar size={12} className="text-amber-500 shrink-0" />
          <span className="text-[10px] font-bold text-amber-700">
            {isToday ? '📍 Today — ' : ''}{displayDate} @ {filterTime}
          </span>
          {activeReservations.length > 0 && (
            <span className="ml-auto px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[9px] font-bold uppercase tracking-widest">
              ● Active Now
            </span>
          )}
          {orderGuests > 0 && (
            <span className="ml-auto px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[9px] font-bold uppercase tracking-widest">
              ● Seated / Live Order
            </span>
          )}
        </div>

        {/* Bookings Timeline */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-8 py-5 space-y-3">
          {sortedReservations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mb-3 border border-green-100">
                <CheckCircle2 size={24} className="text-green-500" />
              </div>
              <p className="text-sm font-bold text-slate-700">No Bookings on This Date</p>
              <p className="text-[10px] text-slate-400 font-medium mt-1">Table {formatTableNumber(table.table_number)} is free all day</p>
            </div>
          ) : (
            <>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                {sortedReservations.length} Booking{sortedReservations.length !== 1 ? 's' : ''} on this date
              </p>
              {sortedReservations.map((r: any, idx: number) => {
                const rTime = (r.reservation_time || '00:00').substring(0, 5);
                const stayMins = Number(r.stay_duration) || 90;
                const [rh, rm] = rTime.split(':').map(Number);
                const endMins = rh * 60 + rm + stayMins;
                const endH = String(Math.floor(endMins / 60) % 24).padStart(2, '0');
                const endM = String(endMins % 60).padStart(2, '0');
                const endTimeStr = `${endH}:${endM}`;

                const filterTimeMins = (() => {
                  const [fh, fm] = filterTime.split(':').map(Number);
                  return fh * 60 + fm;
                })();
                const rMins = rh * 60 + rm;
                const isActive = filterTimeMins >= rMins && filterTimeMins < rMins + stayMins;

                const name = [r.first_name, r.last_name].filter(Boolean).join(' ') || r.name || 'Guest';
                const seats = r.party_size || '—';

                return (
                  <div
                    key={r.id || idx}
                    className={cn(
                      "rounded-2xl border p-4 transition-all",
                      isActive
                        ? "bg-purple-50 border-purple-200 shadow-sm shadow-purple-100"
                        : "bg-white border-slate-100"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "px-2 py-1 rounded-lg text-[10px] font-black tracking-tight",
                          isActive ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-700"
                        )}>
                          {rTime} – {endTimeStr}
                        </div>
                        {isActive && (
                          <span className="text-[8px] font-bold text-purple-600 uppercase tracking-widest animate-pulse">● Now</span>
                        )}
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest border",
                        getStatusChip(r.status)
                      )}>
                        {r.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                            <Users size={9} /> {seats} {Number(seats) === 1 ? 'guest' : 'guests'}
                          </span>
                          {r.phone && (
                            <span className="text-[9px] font-bold text-slate-400">{r.phone}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Seat breakdown */}
                    {r.assigned_tables_json && (() => {
                      try {
                        const parsed = JSON.parse(r.assigned_tables_json);
                        const thisTable = parsed.find((t: any) => String(t.table_id) === String(table.id));
                        if (thisTable?.selected_seats) {
                          const seats = thisTable.selected_seats.split(',').map((s: string) => s.trim()).filter(Boolean);
                          return (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {seats.map((s: string) => (
                                <span key={s} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[8px] font-bold">Seat {s}</span>
                              ))}
                            </div>
                          );
                        }
                      } catch {}
                      return null;
                    })()}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Capacity</p>
            <p className="text-sm font-black text-slate-900">{table.capacity} Seats</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Booked at Selected Time</p>
            <p className="text-sm font-black text-slate-900">
              {activeReservations.reduce((s: number, r: any) => s + (Number(r.party_size) || 0), 0)} / {table.capacity} Seats
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── QR Modal ──────────────────────────────────────────────────────────────────

function QRModal({ isOpen, onClose, table, printRef, onPrint }: any) {
  if (!isOpen || !table) return null;

  const menuUrl = `${window.location.origin}/menu?table=${table.table_number}&tid=${table.id}`;
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
        className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
      >
        <div className="py-5 px-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight uppercase leading-none">Digital Menu QR</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Table {table.table_number} • {table.capacity} Guests</p>
          </div>
          <button onClick={onClose} className="p-2.5 text-slate-400 hover:bg-white hover:text-slate-900 rounded-2xl transition-all border border-transparent hover:border-slate-100">
            <X size={20} />
          </button>
        </div>

        <div className="px-8 py-5 flex flex-col items-center overflow-y-auto no-scrollbar flex-1">
           {/* Printable Area */}
           <div ref={printRef} className="p-4 bg-white text-center">
              <div className="mb-4">
                 <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tighter mb-0.5">Zamzam Kitchen</h1>
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em]">Scan to View Menu</p>
              </div>
              
              <div className="relative p-4 bg-slate-50 rounded-[2rem] border border-slate-100 mb-4 inline-block">
                 <img src={qrImageUrl} alt="QR Code" className="w-40 h-40 mix-blend-multiply" />
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-sm">
                    <QrCode size={18} className="text-zamzam-teal" />
                 </div>
              </div>

              <div className="space-y-0.5">
                 <p className="text-base font-bold text-slate-900 uppercase">Table {table.table_number}</p>
                 <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Powered by Zamzam POS</p>
              </div>
           </div>

           <div className="w-full grid grid-cols-2 gap-4 mt-5">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(menuUrl);
                  alert('URL copied to clipboard!');
                }}
                className="flex items-center justify-center gap-3 py-3 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
              >
                <Copy size={16} />
                Copy Link
              </button>
              <button 
                onClick={onPrint}
                className="flex items-center justify-center gap-3 py-3 bg-zamzam-teal text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-teal-500/20 hover:bg-teal-600 transition-all active:scale-95"
              >
                <Printer size={16} />
                Print QR
              </button>
           </div>
        </div>

        <div className="py-4 px-8 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-6 shrink-0">
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
