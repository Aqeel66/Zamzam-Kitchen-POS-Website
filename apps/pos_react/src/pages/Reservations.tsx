import { useState, useEffect } from 'react';
import { 
  Plus,
  Calendar, 
  Search, 
  Users, 
  Phone, 
  Mail,
  Clock3,
  X,
  Globe,
  ClipboardList,
  ChevronRight,
  Pencil,
  ChevronDown,
  Utensils,
  CreditCard,
  Banknote
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';
import PrintSuccessModal from '../components/PrintSuccessModal';

const cn = (...inputs: (string | undefined | null | false)[]) => inputs.filter(Boolean).join(' ');

export default function Reservations() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [sidebarTableId, setSidebarTableId] = useState<any>('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormValues, setEditFormValues] = useState<any>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'UPCOMING' | 'PENDING' | 'CONFIRMED' | 'SEATED' | 'WEBSITE' | 'ALL'>('UPCOMING');
  const [selectedReservation, setSelectedReservation] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [savedReservation, setSavedReservation] = useState<any>(null);
  const [editingReservation, setEditingReservation] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [branchInfo, setBranchInfo] = useState<any>({});
  const [availableTables, setAvailableTables] = useState<any[]>([]);
  const [isLoadingAvailableTables, setIsLoadingAvailableTables] = useState(false);
  const [reservationGap, setReservationGap] = useState(30);

  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [formValues, setFormValues] = useState<any>({
    first_name: '',
    last_name: '',
    phone: '',
    date: getTodayStr(),
    time: '19:00',
    guests: 2,
    table_id: '',
    email: '',
    notes: '',
    notification_pref: 'whatsapp',
    payment_method: 'Cash',
    stay_duration: 60
  });

  const fetchAvailableTables = async () => {
    setIsLoadingAvailableTables(true);
    try {
      const res = await fetch(`${API_BASE_URL}/reservations/available-tables?date=${formValues.date}&time=${formValues.time}`);
      const data = await res.json();
      if (data.success) {
        setAvailableTables(data.tables);
      }
    } catch (error) {
      console.error('Error fetching available tables:', error);
    } finally {
      setIsLoadingAvailableTables(false);
    }
  };

  const [selectedDate, setSelectedDate] = useState(getTodayStr());

  useEffect(() => {
    if (formStep === 4 && formValues.date && formValues.time) {
      fetchAvailableTables();
    }
  }, [formStep, formValues.date, formValues.time]);

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/settings?t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const settings = { ...(data?.tenant || {}), ...(data?.branch || {}) };
      setBranchInfo(settings);
      if (settings.reservation_gap_minutes) {
        setReservationGap(settings.reservation_gap_minutes);
      }
    } catch (err) {
      console.error('POS Settings Fetch Error:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
    window.addEventListener('settings-updated', fetchSettings);
    return () => window.removeEventListener('settings-updated', fetchSettings);
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const resUrl = `${API_BASE_URL}/reservations?startDate=2024-01-01`; 

      const [resData, tablesData] = await Promise.all([
        fetch(resUrl).then(r => r.json()),
        fetch(`${API_BASE_URL}/tables`).then(r => r.json()).catch(() => [])
      ]);
      
      setReservations(Array.isArray(resData) ? resData : []);
      setTables(Array.isArray(tablesData) ? tablesData : []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredByTab = (resList: any[]) => {
    return (resList || []).filter(res => {
      const status = (res.status || '').toUpperCase();
      
      // UPCOMING shows all future and today's bookings that are confirmed/pending, ignoring selectedDate
      if (activeTab === 'UPCOMING') {
         return res.reservation_date >= getTodayStr() && (status === 'CONFIRMED' || status === 'PENDING');
      }

      // Step 1: Global Date Filter - Other tabs MUST respect the selected date
      if (selectedDate && res.reservation_date !== selectedDate) {
        return false;
      }
      
      // Step 2: Tab-specific filtering
      if (activeTab === 'ALL') return true;
      if (activeTab === 'PENDING') return status === 'PENDING';
      if (activeTab === 'CONFIRMED') return status === 'CONFIRMED';
      if (activeTab === 'SEATED') return status === 'SEATED';
      if (activeTab === 'WEBSITE') return res.origin?.toLowerCase() === 'website';
      
      return true;
    });
  };

  // Base list for date-specific stats
  const dateFilteredRes = selectedDate 
    ? (reservations || []).filter(r => r.reservation_date === selectedDate) 
    : (reservations || []);

  const filteredReservations = getFilteredByTab(reservations).filter(res => {
    const search = searchQuery.toLowerCase();
    const name = `${res.first_name || ''} ${res.last_name || ''}`.toLowerCase();
    const phone = (res.phone || '').toString().toLowerCase();
    return name.includes(search) || phone.includes(search);
  });

  const stats = {
    UPCOMING: (reservations || []).filter(r => r.reservation_date >= getTodayStr() && (r.status?.toUpperCase() === 'CONFIRMED' || r.status?.toUpperCase() === 'PENDING')).length,
    PENDING: dateFilteredRes.filter(r => r.status?.toUpperCase() === 'PENDING').length,
    CONFIRMED: dateFilteredRes.filter(r => r.status?.toUpperCase() === 'CONFIRMED').length,
    SEATED: dateFilteredRes.filter(r => r.status?.toUpperCase() === 'SEATED').length,
    WEBSITE: dateFilteredRes.filter(r => r.origin?.toLowerCase() === 'website').length,
    ALL: dateFilteredRes.length
  };

  const handleStatusChange = async (id: number, status: string, tableId?: number) => {
    try {
      await fetch(`${API_BASE_URL}/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (tableId) {
        let tableStatus = 'Available';
        if (status === 'Seated') tableStatus = 'Occupied';
        await fetch(`${API_BASE_URL}/tables/${tableId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: tableStatus })
        });
      }
      
      fetchData();
      if (selectedReservation?.id === id) {
        setSelectedReservation({ ...selectedReservation, status });
      }
    } catch (err) {
      console.error('Status update error:', err);
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    
    // Date Validation
    if (formValues.date < getTodayStr()) {
      alert(`Invalid Date: You cannot make a reservation for a past date (${formValues.date}). Please select today or a future date.`);
      setFormStep(2); // Jump back to date selection
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingReservation 
        ? `${API_BASE_URL}/reservations/${editingReservation.id}`
        : `${API_BASE_URL}/reservations`;
      
      const res = await fetch(url, {
        method: editingReservation ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${formValues.first_name} ${formValues.last_name}`.trim(),
          phone: formValues.phone,
          email: formValues.email,
          date: formValues.date,
          time: formValues.time,
          guests: parseInt(formValues.guests),
          tableId: formValues.table_id || null,
          notes: formValues.notes,
          notification_pref: formValues.notification_pref,
          bookingFee: 25,
          paymentMethod: formValues.payment_method,
          origin: 'In-Store'
        })
      });

      if (res.ok) {
        const saved = await res.json();
        setSavedReservation(saved);
        setIsModalOpen(false);
        setFormStep(1); // Reset step for next time
        if (!editingReservation) {
          setIsSuccessModalOpen(true);
        } else {
          setSelectedReservation(saved);
        }
        fetchData();
      } else {
        const errData = await res.json();
        alert(`Error: ${errData.message || 'Failed to create reservation'}`);
      }
    } catch (err) {
      console.error('Submit error:', err);
      alert('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col bg-[#F8F9FA]">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 shadow-sm">
        {/* Top Row: Title and Primary Actions */}
        <div className="p-4 flex items-center justify-between border-b border-slate-50">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                <Calendar size={18} />
             </div>
             <h1 className="text-xl font-black text-slate-900 tracking-tight">Live <span className="text-orange-500">Bookings</span></h1>
          </div>
          
          <button 
            onClick={() => {
              setEditingReservation(null);
              setFormValues({
                first_name: '',
                last_name: '',
                phone: '',
                date: getTodayStr(),
                time: '19:00',
                guests: 2,
                table_id: '',
                email: '',
                notes: '',
                notification_pref: 'whatsapp',
                stay_duration: 60
              });
              setFormStep(1);
              setIsModalOpen(true);
            }}
            className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <Plus size={16} strokeWidth={4} />
            Add New Booking
          </button>
        </div>

        {/* Bottom Row: Filters & Tabs */}
        <div className="p-3 flex items-center gap-6 bg-slate-50/30">
          <div className="relative group w-64 shrink-0">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" size={14} />
             <input 
               type="text" 
               placeholder="Search guest or phone..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full bg-white border border-slate-200 rounded-[1.2rem] py-2.5 pl-11 pr-4 text-xs font-bold outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500/30 transition-all shadow-sm"
             />
          </div>

          <div className="flex items-center gap-3 border-l border-slate-200 pl-6 h-8">
             <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                <input 
                  type="date"
                  value={selectedDate}
                  min={getTodayStr()}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val < getTodayStr()) {
                      alert(`Immediate Stop: You cannot select a past date (${val}). Resetting to today.`);
                      setSelectedDate(getTodayStr());
                    } else {
                      setSelectedDate(val);
                    }
                  }}
                  className="bg-white border border-slate-200 rounded-xl py-1.5 pl-9 pr-3 text-[10px] font-black uppercase outline-none focus:border-orange-500/30 transition-all shadow-sm"
                />
             </div>
             <button 
                onClick={() => setSelectedDate(getTodayStr())}
                className="text-[9px] font-black text-orange-500 uppercase tracking-widest hover:bg-orange-100/50 px-3 py-1.5 rounded-xl transition-all border border-orange-200/30 bg-orange-50/50"
             >
                Today
             </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1 border-l border-slate-200 pl-6">
            {[
              { id: 'ALL', label: 'ALL BOOKINGS' },
              { id: 'WEBSITE', label: 'WEBSITE' },
              { id: 'PENDING', label: 'PENDING' },
              { id: 'CONFIRMED', label: 'CONFIRMED' },
              { id: 'SEATED', label: 'SEATED' },
              { id: 'UPCOMING', label: 'UPCOMING' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 whitespace-nowrap shadow-sm",
                  activeTab === tab.id 
                    ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/30" 
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                )}
              >
                {tab.label}
                <span className={cn(
                  "w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black",
                  activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                )}>
                  {tab.id === 'UPCOMING' ? stats.UPCOMING : 
                   tab.id === 'PENDING' ? stats.PENDING :
                   tab.id === 'CONFIRMED' ? stats.CONFIRMED :
                   tab.id === 'SEATED' ? stats.SEATED : 
                   tab.id === 'WEBSITE' ? stats.WEBSITE : stats.ALL}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Reservation List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin" />
            </div>
          ) : filteredReservations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-300">
              <Calendar size={48} className="mb-4 opacity-20" />
              <p className="font-bold uppercase tracking-widest text-xs">No bookings found</p>
            </div>
          ) : filteredReservations.map((res) => (
            <motion.div
              layout
              key={res.id}
              onClick={() => setSelectedReservation(res)}
              className={cn(
                "bg-white border p-3 rounded-xl cursor-pointer transition-all hover:shadow-lg relative overflow-hidden group",
                selectedReservation?.id === res.id 
                  ? "border-orange-500 shadow-xl shadow-orange-500/10" 
                  : "border-slate-100 shadow-sm hover:border-slate-200"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 flex-1">
                  <div className="min-w-[120px]">
                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-tight mb-0.5 group-hover:text-orange-600 transition-colors">
                      {res.first_name} {res.last_name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Phone size={9} />
                      <span className="text-[9px] font-bold tracking-wider">{res.phone || 'No phone'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Schedule</span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded-lg border border-slate-100 shadow-sm whitespace-nowrap">
                          <Calendar size={8} className="text-orange-500" />
                          <span className="text-[9px] font-black uppercase tracking-widest">{res.reservation_date}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded-lg border border-slate-100 shadow-sm whitespace-nowrap">
                          <Clock3 size={8} className="text-orange-500" />
                          <span className="text-[9px] font-black uppercase tracking-widest">{res.reservation_time?.substring(0, 5)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Details</span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-lg border border-orange-100 shadow-sm whitespace-nowrap">
                          <Users size={8} />
                          <span className="text-[9px] font-black uppercase tracking-widest">{res.party_size} Guests</span>
                        </div>
                        <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-lg border border-blue-100 shadow-sm whitespace-nowrap">
                          <span className="text-[8px] font-black uppercase tracking-widest opacity-70">Table</span>
                          <span className="text-[9px] font-black uppercase tracking-widest">{res.table_number || res.table_id || 'TBD'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className={cn(
                    "px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm border min-w-[60px] text-center",
                    res.status?.toUpperCase() === 'CONFIRMED' ? "bg-green-50 border-green-200 text-green-700" :
                    res.status?.toUpperCase() === 'PENDING' ? "bg-amber-50 border-amber-200 text-amber-700" :
                    res.status?.toUpperCase() === 'SEATED' ? "bg-indigo-50 border-indigo-200 text-indigo-700" :
                    "bg-slate-50 border-slate-200 text-slate-600"
                  )}>
                    {res.status}
                  </div>
                  <ChevronRight size={14} className={cn(
                    "transition-transform",
                    selectedReservation?.id === res.id ? "text-orange-500 translate-x-1" : "text-slate-300"
                  )} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="w-[300px] bg-white border-l border-slate-100 overflow-y-auto no-scrollbar relative flex flex-col">
          <AnimatePresence mode="wait">
            {selectedReservation ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                key={selectedReservation.id}
                className="flex flex-col h-full"
              >
                {/* Panel Header */}
                <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-black text-slate-900 tracking-tight leading-tight">
                      {selectedReservation.first_name} {selectedReservation.last_name}
                    </h2>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      Booking ID: #{selectedReservation.id}
                    </p>
                    {/* Status + Origin badges */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest",
                        selectedReservation.status?.toUpperCase() === 'CONFIRMED' ? "bg-green-50 border-green-400 text-green-700" :
                        selectedReservation.status?.toUpperCase() === 'PENDING'   ? "bg-amber-50 border-amber-400 text-amber-700" :
                        selectedReservation.status?.toUpperCase() === 'SEATED'    ? "bg-indigo-50 border-indigo-400 text-indigo-700" :
                        "bg-slate-50 border-slate-300 text-slate-600"
                      )}>
                        {selectedReservation.status}
                      </span>
                      {(() => {
                        const origin = (selectedReservation.origin || 'Counter').toLowerCase();
                        if (origin === 'website') return (
                          <span className="px-2 py-0.5 rounded-full border border-indigo-400 bg-indigo-50 text-indigo-700 text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                            <Globe size={9} strokeWidth={3}/> Website
                          </span>
                        );
                        if (origin === 'qr menu' || origin === 'qr-menu') return (
                          <span className="px-2 py-0.5 rounded-full border border-purple-400 bg-purple-50 text-purple-700 text-[8px] font-black uppercase tracking-widest">QR Menu</span>
                        );
                        return (
                          <span className="px-2 py-0.5 rounded-full border border-zamzam-teal bg-teal-50 text-zamzam-teal text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                            <Users size={9} strokeWidth={3}/> Counter
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedReservation(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
                  >
                    <X size={14}/>
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">

                  {isEditMode ? (
                    /* ── EDIT FORM ── */
                    <>
                      {/* Contact Information */}
                      <div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">Contact Information</span>
                        <div className="space-y-2.5">
                          <div>
                            <label className="text-[9px] font-bold text-slate-500 mb-1 block">Full Name</label>
                            <input
                              type="text"
                              value={editFormValues.full_name || ''}
                              onChange={e => setEditFormValues({ ...editFormValues, full_name: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-orange-400 transition-all"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-500 mb-1 block">Phone Number</label>
                            <input
                              type="tel"
                              value={editFormValues.phone || ''}
                              onChange={e => setEditFormValues({ ...editFormValues, phone: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-orange-400 transition-all"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-500 mb-1 block">Email Address</label>
                            <input
                              type="email"
                              value={editFormValues.email || ''}
                              onChange={e => setEditFormValues({ ...editFormValues, email: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-orange-400 transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Booking Logistics */}
                      <div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">Booking Logistics</span>
                        <div className="space-y-2.5">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-bold text-slate-500 mb-1 block">Date</label>
                              <input
                                type="date"
                                value={editFormValues.date || ''}
                                onChange={e => setEditFormValues({ ...editFormValues, date: e.target.value })}
                                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-2 text-xs font-semibold text-slate-800 outline-none focus:border-orange-400 transition-all"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-500 mb-1 block">Time</label>
                              <input
                                type="time"
                                value={editFormValues.time || ''}
                                onChange={e => setEditFormValues({ ...editFormValues, time: e.target.value })}
                                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-2 text-xs font-semibold text-slate-800 outline-none focus:border-orange-400 transition-all"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-500 mb-1 block">Party Size</label>
                            <input
                              type="number"
                              min={1}
                              value={editFormValues.guests || 1}
                              onChange={e => setEditFormValues({ ...editFormValues, guests: parseInt(e.target.value) })}
                              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-orange-400 transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* ── READ-ONLY VIEW ── */
                    <>
                      {/* Contact Information */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Contact Information</span>
                          <button
                            onClick={() => {
                              setEditFormValues({
                                full_name: `${selectedReservation.first_name || ''} ${selectedReservation.last_name || ''}`.trim(),
                                phone: selectedReservation.phone || '',
                                email: selectedReservation.email || '',
                                date: selectedReservation.reservation_date || getTodayStr(),
                                time: selectedReservation.reservation_time?.substring(0,5) || '19:00',
                                guests: selectedReservation.party_size || 1,
                              });
                              setIsEditMode(true);
                            }}
                            className="flex items-center gap-1 text-orange-500 hover:text-orange-600 transition-colors"
                          >
                            <Pencil size={10} strokeWidth={3}/>
                            <span className="text-[8px] font-black uppercase tracking-widest">Edit</span>
                          </button>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2.5 text-slate-700">
                            <Phone size={12} className="text-slate-400 shrink-0" />
                            <span className="text-xs font-semibold">{selectedReservation.phone || '—'}</span>
                          </div>
                          <div className="flex items-center gap-2.5 text-slate-700">
                            <Mail size={12} className="text-slate-400 shrink-0" />
                            <span className="text-xs font-semibold">{selectedReservation.email || 'No email'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Booking Logistics */}
                      <div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">Booking Logistics</span>
                        <div className="space-y-2">
                          {[
                            { label: 'Reserved Date',  value: selectedReservation.reservation_date },
                            { label: 'Reserved Time',  value: selectedReservation.reservation_time?.substring(0,5) },
                            { label: 'Total Guests',   value: `${selectedReservation.party_size || 1} People`, bold: true },
                            { label: 'Assigned Table', value: selectedReservation.table_number || selectedReservation.table_id ? `Table ${selectedReservation.table_number || selectedReservation.table_id}` : 'TBD', orange: true },
                          ].map(({ label, value, bold, orange }) => (
                            <div key={label} className="flex items-center justify-between">
                              <span className="text-[10px] text-slate-500">{label}</span>
                              <span className={cn(
                                "text-[10px] font-bold",
                                orange ? "text-orange-500" : bold ? "text-slate-900" : "text-slate-700"
                              )}>{value || '—'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Table Assignment dropdown — always visible */}
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">Table Assignment</span>
                    <div className="relative">
                      <select
                        value={sidebarTableId !== '' ? sidebarTableId : (selectedReservation.table_id || '')}
                        onChange={async (e) => {
                          const newTableId = e.target.value;
                          setSidebarTableId(newTableId);
                          try {
                            await fetch(`${API_BASE_URL}/reservations/${selectedReservation.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ table_id: newTableId || null })
                            });
                            fetchData();
                            setSelectedReservation({ ...selectedReservation, table_id: newTableId });
                          } catch {}
                        }}
                        className="w-full appearance-none bg-white border border-slate-200 rounded-xl py-2.5 pl-3 pr-8 text-xs font-bold text-slate-700 outline-none focus:border-orange-400 transition-all"
                      >
                        <option value="">— Unassigned —</option>
                        {tables.map(t => (
                          <option key={t.id} value={t.id}>
                            Table {t.table_number} (Avail: {Math.max(0, t.capacity - 0)} / {t.capacity})
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-500 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-4 border-t border-slate-100 space-y-2">
                  {isEditMode ? (
                    /* Save / Cancel for edit mode */
                    <>
                      <button
                        onClick={async () => {
                          const nameParts = (editFormValues.full_name || '').trim().split(' ');
                          const first_name = nameParts[0] || selectedReservation.first_name;
                          const last_name = nameParts.slice(1).join(' ') || selectedReservation.last_name;
                          try {
                            const res = await fetch(`${API_BASE_URL}/reservations/${selectedReservation.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                first_name,
                                last_name,
                                phone: editFormValues.phone,
                                email: editFormValues.email,
                                reservation_date: editFormValues.date,
                                reservation_time: editFormValues.time,
                                party_size: editFormValues.guests,
                              })
                            });
                            if (res.ok) {
                              const updated = await res.json();
                              setSelectedReservation({ ...selectedReservation, ...updated });
                              fetchData();
                            }
                          } catch {}
                          setIsEditMode(false);
                        }}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/20 transition-all"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => setIsEditMode(false)}
                        className="w-full border border-slate-200 text-slate-500 hover:bg-slate-50 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    /* Normal action buttons */
                    <>
                      <button
                        onClick={() => handleStatusChange(selectedReservation.id, 'Seated', selectedReservation.table_id)}
                        className="w-full bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-green-500/20 transition-all"
                      >
                        Seat Guest Now
                      </button>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStatusChange(selectedReservation.id, 'No-Show', selectedReservation.table_id)}
                          className="flex-1 border border-amber-400 text-amber-500 hover:bg-amber-50 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all"
                        >
                          No-Show
                        </button>
                        <button
                          onClick={() => handleStatusChange(selectedReservation.id, 'Cancelled', selectedReservation.table_id)}
                          className="flex-1 text-red-500 hover:bg-red-50 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest border border-transparent hover:border-red-100 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center text-slate-300">
                <ClipboardList size={48} className="opacity-20 mb-4" />
                <h3 className="text-xs font-black uppercase tracking-widest">Select a Booking</h3>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Modals */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
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
              className="relative bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-orange-500 rounded-3xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                    {formStep === 1 ? <Clock3 size={32} className="text-white" /> : 
                     formStep === 2 ? <Users size={32} className="text-white" /> :
                     formStep === 3 ? <Utensils size={32} className="text-white" /> :
                     <ClipboardList size={32} className="text-white" />}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                      {formStep === 1 ? 'Select Slot' : 
                       formStep === 2 ? 'Customer Info' :
                       formStep === 3 ? 'Assign Table' : 
                       formStep === 4 ? 'Payment Method' :
                       'Review Booking'}
                    </h2>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Step {formStep} of 5</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-3 hover:bg-slate-50 rounded-2xl transition-colors text-slate-400"
                >
                  <X size={28} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-10">
                <AnimatePresence mode="wait">
                  {formStep === 1 && (
                    <motion.div 
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      <h3 className="text-lg font-black text-slate-800">When would you like to visit?</h3>
                      
                      <div className="space-y-4">
                        {/* Date Input */}
                        <div className="group">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block px-2">Date</label>
                          <div className="relative">
                            <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-orange-500" size={20} />
                            <input 
                              type="date" 
                              value={formValues.date} 
                              min={getTodayStr()}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val < getTodayStr()) {
                                  alert(`Immediate Stop: You cannot select a past date (${val}). Resetting to today.`);
                                  setFormValues({...formValues, date: getTodayStr()});
                                } else {
                                  setFormValues({...formValues, date: val});
                                }
                              }}
                              className="w-full bg-slate-50 border-2 border-slate-50 rounded-[2rem] py-5 pl-16 pr-8 text-base font-black text-slate-900 outline-none focus:border-orange-500/20 focus:bg-white transition-all shadow-sm"
                            />
                          </div>
                        </div>

                        {/* Time Input */}
                        <div className="group">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block px-2">Time</label>
                          <div className="relative">
                            <Clock3 className="absolute left-6 top-1/2 -translate-y-1/2 text-orange-500" size={20} />
                            <input 
                              type="time" 
                              value={formValues.time} 
                              onChange={(e) => setFormValues({...formValues, time: e.target.value})}
                              className="w-full bg-slate-50 border-2 border-slate-50 rounded-[2rem] py-5 pl-16 pr-8 text-base font-black text-slate-900 outline-none focus:border-orange-500/20 focus:bg-white transition-all shadow-sm"
                            />
                          </div>
                        </div>

                        {/* Guests Input */}
                        <div className="group">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block px-2">Guests</label>
                          <div className="relative">
                            <Users className="absolute left-6 top-1/2 -translate-y-1/2 text-orange-500" size={20} />
                            <input 
                              type="number" 
                              min="1"
                              value={formValues.guests} 
                              onChange={(e) => setFormValues({...formValues, guests: e.target.value})}
                              className="w-full bg-slate-50 border-2 border-slate-50 rounded-[2rem] py-5 pl-16 pr-8 text-base font-black text-slate-900 outline-none focus:border-orange-500/20 focus:bg-white transition-all shadow-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {formStep === 2 && (
                    <motion.div 
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <h3 className="text-lg font-black text-slate-800">Date & Time</h3>
                      <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Select Date</label>
                          <input 
                            required 
                            type="date" 
                            min={getTodayStr()}
                            value={formValues.date} 
                            onChange={(e) => {
                              const selectedDate = e.target.value;
                              if (selectedDate < getTodayStr()) {
                                alert(`Immediate Stop: You cannot select a past date (${selectedDate}). The date has been reset to today.`);
                                setFormValues({...formValues, date: getTodayStr()});
                              } else {
                                setFormValues({...formValues, date: selectedDate});
                              }
                            }} 
                            className="w-full bg-white border-2 border-slate-100 rounded-3xl py-5 px-8 text-lg font-black outline-none focus:border-orange-500 transition-all shadow-sm" 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Select Time (Clock)</label>
                          <div className="relative group">
                            <Clock3 className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={24} />
                            <input 
                              required 
                              type="time" 
                              value={formValues.time} 
                              onChange={(e) => setFormValues({...formValues, time: e.target.value})} 
                              className="w-full bg-white border-2 border-slate-100 rounded-[2.5rem] py-8 px-20 text-4xl font-black outline-none focus:border-orange-500 transition-all text-slate-900 shadow-lg shadow-orange-500/5" 
                            />
                          </div>
                        </div>

                        <div className="pt-4 space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Estimated Stay Duration</label>
                          <div className="grid grid-cols-4 gap-3">
                            {[30, 45, 60, 90, 120, 150, 180, 240].map(mins => (
                              <button
                                key={mins}
                                type="button"
                                onClick={() => setFormValues({...formValues, stay_duration: mins})}
                                className={cn(
                                  "py-4 rounded-2xl text-xs font-black border-2 transition-all flex flex-col items-center justify-center gap-1",
                                  formValues.stay_duration === mins 
                                    ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20" 
                                    : "bg-white border-slate-100 text-slate-400 hover:border-orange-200"
                                )}
                              >
                                <span>{mins}</span>
                                <span className="text-[8px] opacity-60">MINS</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {formStep === 3 && (
                    <motion.div 
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <h3 className="text-lg font-black text-slate-800">Who is visiting?</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">First Name</label>
                          <input required type="text" value={formValues.first_name} onChange={(e) => setFormValues({...formValues, first_name: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-orange-500 transition-all" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Last Name</label>
                          <input required type="text" value={formValues.last_name} onChange={(e) => setFormValues({...formValues, last_name: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-orange-500 transition-all" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Phone Number</label>
                        <input required type="tel" value={formValues.phone} onChange={(e) => setFormValues({...formValues, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-orange-500 transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Email Address</label>
                        <input type="email" value={formValues.email} onChange={(e) => setFormValues({...formValues, email: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-orange-500 transition-all" />
                      </div>
                    </motion.div>
                  )}

                  {formStep === 4 && (
                    <motion.div 
                      key="step4"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-slate-800">Assign a Table</h3>
                      </div>

                      <div className="grid grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                        <button
                          type="button"
                          onClick={() => setFormValues({...formValues, table_id: ''})}
                          className={cn(
                            "p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-2",
                            formValues.table_id === '' ? "bg-orange-50 border-orange-500" : "bg-white border-slate-100 hover:border-slate-200"
                          )}
                        >
                          <Users size={24} className={formValues.table_id === '' ? "text-orange-500" : "text-slate-300"} />
                          <span className="text-[10px] font-black uppercase">TBD</span>
                        </button>
                        {isLoadingAvailableTables ? (
                          <div className="col-span-2 py-10 text-center text-slate-400 text-xs font-bold animate-pulse uppercase tracking-widest">Scanning Available Tables...</div>
                        ) : availableTables.length === 0 ? (
                          <div className="col-span-2 py-10 text-center text-red-400 text-xs font-bold uppercase tracking-widest">No Tables Available for this Slot</div>
                        ) : (
                          availableTables.map(table => (
                            <button
                              key={table.id}
                              type="button"
                              onClick={() => setFormValues({...formValues, table_id: table.id})}
                              className={cn(
                                "p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-2",
                                formValues.table_id === table.id ? "bg-orange-50 border-orange-500" : "bg-white border-slate-100 hover:border-slate-200"
                              )}
                            >
                              <Utensils size={24} className={formValues.table_id === table.id ? "text-orange-500" : "text-slate-300"} />
                              <span className="text-[10px] font-black uppercase">Table {table.table_number}</span>
                              <span className="text-[8px] font-bold text-slate-400">Cap: {table.capacity}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}

                  {formStep === 5 && (
                    <motion.div 
                      key="step5"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      <div className="text-center space-y-2">
                        <h3 className="text-lg font-black text-slate-800">Booking Advance Fee</h3>
                        <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-600 px-4 py-2 rounded-2xl border border-orange-100">
                          <span className="text-2xl font-black">25.00</span>
                          <span className="text-[10px] font-black uppercase tracking-widest mt-1">AED</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select payment method to proceed</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { id: 'Cash', label: 'Cash Payment', icon: Banknote, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
                          { id: 'Card', label: 'Card Payment', icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' }
                        ].map((method) => (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() => setFormValues({...formValues, payment_method: method.id})}
                            className={cn(
                              "p-8 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-4 text-center group",
                              formValues.payment_method === method.id 
                                ? "bg-orange-50 border-orange-500 shadow-xl shadow-orange-500/10" 
                                : "bg-white border-slate-100 hover:border-slate-200"
                            )}
                          >
                            <div className={cn(
                              "w-14 h-14 rounded-2xl flex items-center justify-center transition-all",
                              formValues.payment_method === method.id ? "bg-orange-500 text-white" : `${method.bg} ${method.color}`
                            )}>
                              <method.icon size={28} strokeWidth={2.5} />
                            </div>
                            <div>
                              <span className={cn(
                                "text-xs font-black uppercase tracking-widest block mb-1",
                                formValues.payment_method === method.id ? "text-orange-600" : "text-slate-900"
                              )}>{method.id}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{method.label}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {formStep === 6 && (
                    <motion.div 
                      key="step5"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="bg-slate-50 rounded-[2.5rem] p-8 space-y-6 border border-slate-100">
                        <div className="flex items-center justify-between pb-6 border-b border-slate-200">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</p>
                            <h4 className="text-xl font-black text-slate-900">{formValues.first_name} {formValues.last_name}</h4>
                            <p className="text-xs font-bold text-slate-500">{formValues.phone}</p>
                          </div>
                          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-orange-500 shadow-sm border border-slate-100">
                            <Users size={24} strokeWidth={3} />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-8">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date & Time</p>
                            <div className="flex items-center gap-2 text-slate-900">
                              <Calendar size={14} className="text-orange-500" />
                              <span className="text-sm font-black">{formValues.date}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-900 mt-1">
                              <Clock3 size={14} className="text-orange-500" />
                              <span className="text-sm font-black">{formValues.time}</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Party Details</p>
                            <div className="flex items-center gap-2 text-slate-900">
                              <Users size={14} className="text-orange-500" />
                              <span className="text-sm font-black">{formValues.guests} Guests</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-900 mt-1">
                              <Utensils size={14} className="text-orange-500" />
                              <span className="text-sm font-black">
                                {formValues.table_id ? `Table ${tables.find(t => t.id === formValues.table_id)?.table_number}` : 'Unassigned'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Method</p>
                            <span className="text-sm font-black text-orange-600 uppercase">{formValues.payment_method}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount Due</p>
                            <span className="text-xl font-black text-slate-900">25.00 AED</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Navigation Buttons */}
                <div className="mt-10 flex gap-4">
                  {formStep > 1 && (
                    <button 
                      type="button" 
                      onClick={() => setFormStep(formStep - 1)}
                      className="px-8 py-5 border-2 border-slate-100 text-slate-400 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
                    >
                      Back
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      if (formStep < 6) setFormStep(formStep + 1);
                      else handleSubmit({ preventDefault: () => {} });
                    }}
                    className="flex-1 py-5 bg-orange-500 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-orange-500/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                    {formStep === 6 ? (isSubmitting ? 'Processing...' : 'Confirm Booking') : 'Next'}
                    {formStep < 6 && <ChevronRight size={20} strokeWidth={3} />}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PrintSuccessModal 
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        order={{
          order_number: savedReservation?.id || 'RES-NEW',
          order_type: 'Reservation Fee',
          items: [{ name: 'Advance Booking Fee', quantity: 1, price: 25 }],
          total: 25,
          guest_count: savedReservation?.party_size || 0
        }}
        branch={branchInfo}
      />

    </div>
  );
}
