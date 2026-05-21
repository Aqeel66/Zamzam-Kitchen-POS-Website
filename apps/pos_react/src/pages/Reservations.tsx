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

const formatTableNumber = (num: string | number) => {
  if (!num) return '';
  const str = num.toString().trim();
  const clean = str.replace(/^[t\s\-_–—]+/i, '');
  return 'T-' + clean;
};

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

  // Card details state
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardError, setCardError] = useState('');

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    let formattedValue = '';
    for (let i = 0; i < value.length && i < 16; i++) {
      if (i > 0 && i % 4 === 0) {
        formattedValue += ' ';
      }
      formattedValue += value[i];
    }
    setCardNumber(formattedValue);
    setCardError('');
  };

  const handleCardExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    let formattedValue = '';
    if (value.length > 0) {
      formattedValue += value.substring(0, 2);
      if (value.length > 2) {
        formattedValue += '/' + value.substring(2, 4);
      }
    }
    setCardExpiry(formattedValue);
    setCardError('');
  };

  const handleCardCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (value.length <= 4) {
      setCardCvv(value);
      setCardError('');
    }
  };

  // Custom Calendar state
  const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());

  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [formValues, setFormValues] = useState<any>({
    first_name: '',
    last_name: '',
    phone: '',
    date: getTodayStr(),
    time: '',
    guests: 2,
    table_id: '',
    table_ids: [],
    seatingSelection: [],
    email: '',
    notes: '',
    notification_pref: 'whatsapp',
    payment_method: 'Cash',
    stay_duration: 60
  });

  useEffect(() => {
    if (formValues.date) {
      const parts = formValues.date.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        if (!isNaN(year) && !isNaN(month)) {
          setCalendarYear(year);
          setCalendarMonth(month);
        }
      }
    }
  }, [formValues.date]);

  const getMonthOptions = () => {
    const options = [];
    const currentDate = new Date();
    for (let i = 0; i < 24; i++) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      options.push({
        value: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      });
    }
    return options;
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const getTimeSlots = () => {
    let startHour = 11;
    let startMin = 30;
    let endHour = 22;
    let endMin = 30;

    if (branchInfo?.first_order_time) {
      const parts = branchInfo.first_order_time.split(':');
      if (parts.length >= 2) {
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(h)) {
          startHour = h;
          startMin = isNaN(m) ? 0 : m;
        }
      }
    }

    if (branchInfo?.last_order_time) {
      const parts = branchInfo.last_order_time.split(':');
      if (parts.length >= 2) {
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(h)) {
          endHour = h;
          endMin = isNaN(m) ? 0 : m;
        }
      }
    }

    const slots = [];
    const current = new Date(2000, 0, 1, startHour, startMin, 0);
    const end = new Date(2000, 0, 1, endHour, endMin, 0);

    if (end < current) {
      end.setDate(end.getDate() + 1);
    }

    while (current <= end) {
      const hStr = String(current.getHours()).padStart(2, '0');
      const mStr = String(current.getMinutes()).padStart(2, '0');
      slots.push(`${hStr}:${mStr}`);
      current.setMinutes(current.getMinutes() + 30);
    }
    return slots;
  };

  const handleToggleTable = (table: any) => {
    const seatingSelection = formValues.seatingSelection || [];
    const exists = seatingSelection.find((t: any) => t.id === table.id);
    let newSelection;
    if (exists) {
      newSelection = seatingSelection.filter((t: any) => t.id !== table.id);
    } else {
      newSelection = [...seatingSelection, { id: table.id, selectedSeats: [] }];
    }
    setFormValues({
      ...formValues,
      seatingSelection: newSelection,
      table_ids: newSelection.map((x: any) => x.id)
    });
  };

  const handleToggleSeat = (tableId: number, seatNum: number) => {
    const seatingSelection = formValues.seatingSelection || [];
    const newSelection = seatingSelection.map((t: any) => {
      if (t.id === tableId) {
        const selectedSeats = t.selectedSeats.includes(seatNum)
          ? t.selectedSeats.filter((s: number) => s !== seatNum)
          : [...t.selectedSeats, seatNum];
        return { ...t, selectedSeats };
      }
      return t;
    }).filter((t: any) => t.selectedSeats.length > 0);
    
    setFormValues({
      ...formValues,
      seatingSelection: newSelection,
      table_ids: newSelection.map((x: any) => x.id)
    });
  };

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
    if (formStep === 3 && formValues.date && formValues.time) {
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
      setFormStep(1); // Jump back to date selection
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
          guests: (formValues.seatingSelection && formValues.seatingSelection.length > 0)
            ? (formValues.seatingSelection.reduce((acc: number, t: any) => acc + (t.selectedSeats || []).length, 0))
            : parseInt(formValues.guests || 1),
          tableId: formValues.table_ids && formValues.table_ids.length > 0 ? formValues.table_ids[0] : null,
          table_ids: formValues.table_ids || [],
          tables: (formValues.seatingSelection || []).map((t: any) => ({
            id: t.id,
            allocated_seats: t.selectedSeats.length,
            selected_seats: t.selectedSeats.join(',')
          })),
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
             <h1 className="text-xl font-bold text-slate-900 tracking-tight">Live <span className="text-orange-500">Bookings</span></h1>
          </div>
          
          <button 
            onClick={() => {
              setEditingReservation(null);
              setFormValues({
                first_name: '',
                last_name: '',
                phone: '',
                date: getTodayStr(),
                time: '',
                guests: 2,
                table_id: '',
                table_ids: [],
                email: '',
                notes: '',
                notification_pref: 'whatsapp',
                stay_duration: 60
              });
              setCardHolder('');
              setCardNumber('');
              setCardExpiry('');
              setCardCvv('');
              setCardError('');
              setFormStep(1);
              setIsModalOpen(true);
            }}
            className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] shadow-xl shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
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
                  className="bg-white border border-slate-200 rounded-xl py-1.5 pl-9 pr-3 text-[10px] font-bold uppercase outline-none focus:border-orange-500/30 transition-all shadow-sm"
                />
             </div>
             <button 
                onClick={() => setSelectedDate(getTodayStr())}
                className="text-[9px] font-bold text-orange-500 uppercase tracking-widest hover:bg-orange-100/50 px-3 py-1.5 rounded-xl transition-all border border-orange-200/30 bg-orange-50/50"
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
                  "px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest border transition-all flex items-center gap-2 whitespace-nowrap shadow-sm",
                  activeTab === tab.id 
                    ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/30" 
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                )}
              >
                {tab.label}
                <span className={cn(
                  "w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold",
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
        <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin" />
            </div>
          ) : filteredReservations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-300">
              <Calendar size={48} className="mb-4 opacity-20" />
              <p className="font-bold uppercase tracking-widest text-xs">No bookings found</p>
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-5">Guest</th>
                    <th className="px-6 py-5">Schedule</th>
                    <th className="px-6 py-5 text-center">Party</th>
                    <th className="px-6 py-5">Table</th>
                    <th className="px-6 py-5">Status</th>
                    <th className="px-6 py-5 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredReservations.map((res) => (
                    <tr 
                      key={res.id} 
                      onClick={() => setSelectedReservation(res)}
                      className={cn(
                        "hover:bg-slate-50/30 transition-colors group cursor-pointer",
                        selectedReservation?.id === res.id ? "bg-orange-50/30" : ""
                      )}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-xs font-bold text-slate-900 uppercase tracking-tight group-hover:text-orange-600 transition-colors">
                            {res.first_name} {res.last_name}
                          </p>
                          <div className="flex items-center gap-1.5 text-slate-400 mt-0.5">
                            <Phone size={10} />
                            <span className="text-[9px] font-bold tracking-wider">{res.phone || 'No phone'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Calendar size={10} className="text-orange-500" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">{res.reservation_date}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Clock3 size={10} className="text-orange-500" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">{res.reservation_time?.substring(0, 5)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 bg-orange-50 text-orange-600 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-orange-100">
                          {res.party_size} Guests
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border",
                          res.table_number || res.table_id 
                            ? "bg-blue-50 border-blue-100 text-blue-600" 
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        )}>
                          {res.table_number || res.table_id ? `Table ${res.table_number || res.table_id}` : 'Unassigned'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border shadow-sm",
                          res.status?.toUpperCase() === 'CONFIRMED' ? "bg-green-50 border-green-200 text-green-700" :
                          res.status?.toUpperCase() === 'PENDING' ? "bg-amber-50 border-amber-200 text-amber-700" :
                          res.status?.toUpperCase() === 'SEATED' ? "bg-indigo-50 border-indigo-200 text-indigo-700" :
                          "bg-slate-50 border-slate-200 text-slate-600"
                        )}>
                          {res.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <ChevronRight 
                          size={16} 
                          className={cn(
                            "ml-auto transition-transform",
                            selectedReservation?.id === res.id ? "text-orange-500 translate-x-1" : "text-slate-300"
                          )} 
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
                    <h2 className="text-sm font-bold text-slate-900 tracking-tight leading-tight">
                      {selectedReservation.first_name} {selectedReservation.last_name}
                    </h2>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      Booking ID: #{selectedReservation.id}
                    </p>
                    {/* Status + Origin badges */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full border text-[8px] font-bold uppercase tracking-widest",
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
                          <span className="px-2 py-0.5 rounded-full border border-indigo-400 bg-indigo-50 text-indigo-700 text-[8px] font-bold uppercase tracking-widest flex items-center gap-1">
                            <Globe size={9} strokeWidth={3}/> Website
                          </span>
                        );
                        if (origin === 'qr menu' || origin === 'qr-menu') return (
                          <span className="px-2 py-0.5 rounded-full border border-purple-400 bg-purple-50 text-purple-700 text-[8px] font-bold uppercase tracking-widest">QR Menu</span>
                        );
                        return (
                          <span className="px-2 py-0.5 rounded-full border border-zamzam-teal bg-teal-50 text-zamzam-teal text-[8px] font-bold uppercase tracking-widest flex items-center gap-1">
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
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Contact Information</span>
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
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Booking Logistics</span>
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
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Contact Information</span>
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
                            <span className="text-[8px] font-bold uppercase tracking-widest">Edit</span>
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
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Booking Logistics</span>
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

                  {/* Table Assignment Section */}
                  <div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Table Assignment</span>
                    {(() => {
                      const currentIds: number[] = Array.from(new Set(
                        selectedReservation.assigned_table_ids
                          ? selectedReservation.assigned_table_ids.split(',').map((x: string) => parseInt(x)).filter(Boolean)
                          : (selectedReservation.table_id ? [parseInt(selectedReservation.table_id)] : [])
                      ));

                      // Parse per-table seat data from API
                      let tablesWithSeats: {table_id: number; table_number: string; selected_seats: string}[] = [];
                      if (selectedReservation.assigned_tables_json) {
                        try { tablesWithSeats = JSON.parse(selectedReservation.assigned_tables_json); } catch {}
                      }

                      return (
                        <>
                          {/* Structured per-table display */}
                          <div className="space-y-1.5 mb-2.5">
                            {currentIds.length === 0 ? (
                              <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unassigned (TBD)</span>
                              </div>
                            ) : currentIds.map((tid: number) => {
                              const matchWithSeats = tablesWithSeats.find(x => Number(x.table_id) === tid);
                              const matchTable = tables.find((x: any) => x.id === tid);
                              const tableNum = matchWithSeats?.table_number || matchTable?.table_number || String(tid);
                              const seatsStr = matchWithSeats?.selected_seats || '';
                              const seats = seatsStr
                                ? [...new Set(seatsStr.split(',').map((s: string) => s.trim()).filter(Boolean))].sort((a, b) => Number(a) - Number(b))
                                : [];
                              return (
                                <div key={tid} className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
                                  <span className="text-[11px] font-extrabold text-orange-700 uppercase tracking-wider whitespace-nowrap">
                                    {formatTableNumber(tableNum)}
                                  </span>
                                  <span className="text-[10px] font-semibold text-slate-500">
                                    {seats.length > 0 ? `Seats ${seats.join(', ')}` : 'No specific seats'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Collapsible reassignment picker */}
                          <details className="group">
                            <summary className="cursor-pointer select-none list-none text-[8px] font-bold text-orange-500 uppercase tracking-widest hover:text-orange-600 transition-colors flex items-center gap-1 mb-2">
                              <span className="group-open:hidden">▶ Change Tables</span>
                              <span className="hidden group-open:inline">▼ Hide</span>
                            </summary>
                            <div className="flex flex-wrap gap-1.5 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await fetch(`${API_BASE_URL}/reservations/${selectedReservation.id}`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ table_ids: [] })
                                    });
                                    fetchData();
                                    setSelectedReservation({ ...selectedReservation, table_id: null, assigned_table_ids: '', assigned_table_number: '', assigned_tables_json: null });
                                  } catch {}
                                }}
                                className={cn(
                                  "px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-all",
                                  currentIds.length === 0
                                    ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10"
                                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                                )}
                              >
                                TBD
                              </button>
                              {tables.map((t: any) => {
                                const isAssigned = currentIds.includes(t.id);
                                return (
                                  <button
                                    key={t.id}
                                    type="button"
                                    onClick={async () => {
                                      const newIds = isAssigned
                                        ? currentIds.filter((id: number) => id !== t.id)
                                        : [...currentIds, t.id];
                                      try {
                                        await fetch(`${API_BASE_URL}/reservations/${selectedReservation.id}`, {
                                          method: 'PATCH',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ table_ids: newIds })
                                        });
                                        fetchData();
                                        setSelectedReservation({
                                          ...selectedReservation,
                                          table_id: newIds[0] || null,
                                          assigned_table_ids: newIds.join(','),
                                          assigned_table_number: tables.filter((x: any) => newIds.includes(x.id)).map((x: any) => x.table_number).join(', '),
                                          assigned_tables_json: null
                                        });
                                      } catch {}
                                    }}
                                    className={cn(
                                      "px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-all",
                                      isAssigned
                                        ? "bg-orange-50 border-orange-500 text-orange-600 shadow-sm font-extrabold"
                                        : "bg-white border-slate-200 text-slate-400 hover:border-orange-200"
                                    )}
                                  >
                                    {formatTableNumber(t.table_number)}
                                  </button>
                                );
                              })}
                            </div>
                          </details>
                        </>
                      );
                    })()}
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
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/20 transition-all"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => setIsEditMode(false)}
                        className="w-full border border-slate-200 text-slate-500 hover:bg-slate-50 py-2 rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    /* Normal action buttons */
                    <>
                      <button
                        onClick={() => handleStatusChange(selectedReservation.id, 'Seated', selectedReservation.table_id)}
                        className="w-full bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-green-500/20 transition-all"
                      >
                        Seat Guest Now
                      </button>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStatusChange(selectedReservation.id, 'No-Show', selectedReservation.table_id)}
                          className="flex-1 border border-amber-400 text-amber-500 hover:bg-amber-50 py-2 rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all"
                        >
                          No-Show
                        </button>
                        <button
                          onClick={() => handleStatusChange(selectedReservation.id, 'Cancelled', selectedReservation.table_id)}
                          className="flex-1 text-red-500 hover:bg-red-50 py-2 rounded-xl font-bold text-[9px] uppercase tracking-widest border border-transparent hover:border-red-100 transition-all"
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
                <h3 className="text-xs font-bold uppercase tracking-widest">Select a Booking</h3>
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
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="py-3 px-5 border-b border-slate-50 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center shadow-md shadow-orange-500/25">
                    {formStep === 1 ? <Clock3 size={18} className="text-white" /> : 
                     formStep === 2 ? <Users size={18} className="text-white" /> :
                     formStep === 3 ? <Utensils size={18} className="text-white" /> :
                     <ClipboardList size={18} className="text-white" />}
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900 tracking-tight leading-none">
                      {formStep === 1 ? '1. Pick Slot' : 
                       formStep === 2 ? 'Customer Info' :
                       formStep === 3 ? 'Assign Table' : 
                       formStep === 4 ? 'Payment Method' :
                       'Review Booking'}
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 leading-none">
                      {formStep === 1 ? 'STEP 1 OF 5' : `STEP ${formStep} OF 5`}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 hover:bg-slate-50 rounded-lg transition-colors text-slate-400"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="py-4 px-5">
                <AnimatePresence mode="wait">
                  {formStep === 1 && (
                    <motion.div 
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                        {/* Select Date Column */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest block">Select Date</label>
                          <div className="bg-slate-50/60 border border-slate-100 rounded-2xl p-3 space-y-3">
                            {/* Month Select Dropdown */}
                            <div className="relative inline-block">
                              <select
                                value={`${calendarYear}-${calendarMonth}`}
                                onChange={(e) => {
                                  const [year, month] = e.target.value.split('-').map(Number);
                                  setCalendarYear(year);
                                  setCalendarMonth(month);
                                }}
                                className="appearance-none bg-white border border-slate-200 rounded-lg py-1 px-2.5 pr-8 text-[11px] font-black text-slate-700 focus:outline-none focus:border-orange-500 shadow-sm"
                              >
                                {getMonthOptions().map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                                <ChevronDown size={12} />
                              </div>
                            </div>

                            {/* Calendar Days Header */}
                            <div className="grid grid-cols-7 gap-0.5 text-center font-black">
                              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                                <div key={day} className="text-[8px] font-black text-slate-400 uppercase tracking-widest py-0.5">{day}</div>
                              ))}
                            </div>

                            {/* Calendar Days Grid */}
                            <div className="grid grid-cols-7 gap-0.5 text-center">
                              {(() => {
                                const todayStr = getTodayStr();
                                const firstDayIndex = getFirstDayOfMonth(calendarYear, calendarMonth);
                                const totalDays = getDaysInMonth(calendarYear, calendarMonth);
                                const blanks = Array(firstDayIndex).fill(null);
                                const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);
                                const allDays = [...blanks, ...daysArray];

                                return allDays.map((d, index) => {
                                  if (d === null) {
                                    return <div key={`blank-${index}`} className="w-7 h-7" />;
                                  }
                                  const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                  const isPast = dateStr < todayStr;
                                  const isSelected = formValues.date === dateStr;

                                  return (
                                    <button
                                      key={d}
                                      type="button"
                                      disabled={isPast}
                                      onClick={() => {
                                        setFormValues({ ...formValues, date: dateStr });
                                      }}
                                      className={cn(
                                        "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all mx-auto select-none",
                                        isPast
                                          ? "text-slate-200 cursor-not-allowed"
                                          : isSelected
                                            ? "bg-[#f25c05] text-white shadow-md shadow-orange-500/20 font-black"
                                            : "text-slate-700 hover:bg-orange-50 hover:text-orange-500"
                                      )}
                                    >
                                      {d}
                                    </button>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Select Time Column */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest block">Select Time</label>
                          <div className="grid grid-cols-4 gap-2 max-h-[190px] overflow-y-auto pr-1 no-scrollbar">
                            {getTimeSlots().map(slot => {
                              const isSelected = formValues.time === slot;
                              return (
                                <button
                                  key={slot}
                                  type="button"
                                  onClick={() => setFormValues({ ...formValues, time: slot })}
                                  className={cn(
                                    "py-2 rounded-lg border text-[10px] font-bold text-center transition-all select-none",
                                    isSelected
                                      ? "bg-[#f25c05] text-white shadow-md shadow-orange-500/20 border-transparent font-black"
                                      : "bg-white border-slate-200 text-slate-700 hover:border-orange-500"
                                  )}
                                >
                                  {slot}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Stay Duration */}
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Estimated Stay Duration</label>
                        <div className="grid grid-cols-8 gap-2">
                          {[30, 45, 60, 90, 120, 150, 180, 240].map(mins => (
                            <button
                              key={mins}
                              type="button"
                              onClick={() => setFormValues({...formValues, stay_duration: mins})}
                              className={cn(
                                "py-2.5 rounded-xl text-[10px] font-bold border transition-all flex flex-col items-center justify-center leading-none select-none",
                                formValues.stay_duration === mins 
                                  ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/20 font-black" 
                                  : "bg-white border-slate-200 text-slate-500 hover:border-orange-200"
                              )}
                            >
                              <span>{mins}m</span>
                            </button>
                          ))}
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
                      <h3 className="text-lg font-bold text-slate-800">Who is visiting?</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">First Name</label>
                          <input required type="text" value={formValues.first_name} onChange={(e) => setFormValues({...formValues, first_name: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-orange-500 transition-all" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Last Name</label>
                          <input required type="text" value={formValues.last_name} onChange={(e) => setFormValues({...formValues, last_name: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-orange-500 transition-all" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Phone Number</label>
                        <input required type="tel" value={formValues.phone} onChange={(e) => setFormValues({...formValues, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-orange-500 transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Email Address</label>
                        <input type="email" value={formValues.email} onChange={(e) => setFormValues({...formValues, email: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-orange-500 transition-all" />
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
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">Assign Tables & Seats</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Check a table, then customize seat assignments. Inactive seats are already reserved or occupied.</p>
                      </div>

                      <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 no-scrollbar">
                        {isLoadingAvailableTables ? (
                          <div className="py-12 text-center text-slate-400 text-xs font-bold animate-pulse uppercase tracking-widest">Scanning Table Map...</div>
                        ) : availableTables.length === 0 ? (
                          <div className="py-12 text-center text-red-400 text-xs font-bold uppercase tracking-widest">No Tables Available for this Slot</div>
                        ) : (
                          availableTables.map(table => {
                            const seatingSelection = formValues.seatingSelection || [];
                            const tempTable = seatingSelection.find((t: any) => t.id === table.id);
                            const isChecked = !!tempTable;
                            const selectedCount = tempTable ? tempTable.selectedSeats.length : 0;
                            const isTableFullyOccupied = table.balance_seats !== undefined && table.balance_seats <= 0;
                            
                            return (
                              <div key={table.id} className="flex items-center gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100/60 shadow-sm transition-all hover:shadow-md select-none">
                                {/* 1. Checkbox */}
                                <button
                                  type="button"
                                  disabled={isTableFullyOccupied}
                                  onClick={() => handleToggleTable(table)}
                                  className={cn(
                                    "w-6 h-6 rounded-md border flex items-center justify-center font-bold text-xs transition-all shrink-0",
                                    isTableFullyOccupied
                                      ? "bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed"
                                      : isChecked
                                        ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/20"
                                        : "border-slate-300 bg-white hover:border-orange-500 text-transparent"
                                  )}
                                >
                                  {isTableFullyOccupied ? "✕" : "✓"}
                                </button>

                                {/* 2. Table Box */}
                                <div
                                  className={cn(
                                    "w-28 py-3 px-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 shrink-0",
                                    isTableFullyOccupied
                                      ? "bg-rose-50 border-rose-100 opacity-75 cursor-not-allowed"
                                      : isChecked
                                        ? "bg-orange-500/5 border-orange-500 shadow-inner"
                                        : "bg-white border-slate-200"
                                  )}
                                >
                                  <span className={cn(
                                    "text-xs font-bold uppercase tracking-wider",
                                    isTableFullyOccupied ? "text-rose-600" : "text-slate-800"
                                  )}>{formatTableNumber(table.table_number)}</span>
                                  <span className="text-[9px] font-bold text-slate-400">
                                    {isTableFullyOccupied ? "Fully Occupied" : `${selectedCount}/${table.capacity} Seats`}
                                  </span>
                                </div>

                                {/* 3. Seats List */}
                                <div className="flex-1 flex flex-wrap items-center gap-2">
                                  {isChecked ? (
                                    Array.from({ length: table.capacity }, (_, idx) => idx + 1).map(seatNum => {
                                      const isOccupied = table.occupied_seats ? table.occupied_seats.includes(seatNum) : (seatNum <= (table.capacity - (table.balance_seats !== undefined ? table.balance_seats : table.capacity)));
                                      const isSeatChecked = tempTable.selectedSeats.includes(seatNum);
                                      
                                      return (
                                        <button
                                          key={seatNum}
                                          type="button"
                                          disabled={isOccupied}
                                          onClick={() => handleToggleSeat(table.id, seatNum)}
                                          className={cn(
                                            "py-1.5 px-3 rounded-lg border flex items-center gap-2 shadow-sm transition-all select-none",
                                            isOccupied
                                              ? "bg-rose-50/50 border-rose-100 text-rose-400 cursor-not-allowed opacity-75"
                                              : isSeatChecked
                                                ? "border-orange-500 text-orange-500 bg-orange-500/5 hover:scale-[1.03]"
                                                : "bg-white border-slate-200 hover:border-slate-300 text-slate-600 hover:scale-[1.03]"
                                          )}
                                        >
                                          <div
                                            className={cn(
                                              "w-3.5 h-3.5 rounded border flex items-center justify-center font-bold text-[8px] transition-all",
                                              isOccupied
                                                ? "bg-rose-200 border-rose-300 text-rose-600"
                                                : isSeatChecked
                                                  ? "bg-orange-500 border-orange-500 text-white"
                                                  : "border-slate-300"
                                            )}
                                          >
                                            {isOccupied ? "✕" : isSeatChecked && "✓"}
                                          </div>
                                          <div className="flex flex-col items-start leading-none py-0.5">
                                            <span className="text-[10px] font-bold">Seat {seatNum}</span>
                                            {isOccupied && (
                                              <span className="text-[8px] font-bold text-rose-500 mt-0.5 uppercase tracking-wider">Occupied</span>
                                            )}
                                          </div>
                                        </button>
                                      );
                                    })
                                  ) : (
                                    <span className="text-[10px] font-bold text-slate-300 italic tracking-widest uppercase">Table Unselected</span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}

                  {formStep === 4 && (
                    <motion.div 
                      key="step4"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <div className="text-center space-y-1">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Booking Advance Fee</h3>
                        <div className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-600 px-3 py-1 rounded-xl border border-orange-100">
                          <span className="text-lg font-black">25.00</span>
                          <span className="text-[9px] font-bold uppercase tracking-widest">{branchInfo.currency || 'AED'}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { id: 'Cash', label: 'Cash Payment', icon: Banknote, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
                          { id: 'Card', label: 'Card Payment', icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' }
                        ].map((method) => (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() => setFormValues({...formValues, payment_method: method.id})}
                            className={cn(
                              "py-2 px-4 rounded-xl border-2 transition-all flex items-center justify-center gap-3 text-left group",
                              formValues.payment_method === method.id 
                                ? "bg-orange-50 border-orange-500 shadow-lg shadow-orange-500/5" 
                                : "bg-white border-slate-100 hover:border-slate-200"
                            )}
                          >
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0",
                              formValues.payment_method === method.id ? "bg-orange-500 text-white" : `${method.bg} ${method.color}`
                            )}>
                              <method.icon size={16} strokeWidth={2.5} />
                            </div>
                            <div className="leading-tight">
                              <span className={cn(
                                "text-[10px] font-bold uppercase tracking-wider block",
                                formValues.payment_method === method.id ? "text-orange-600" : "text-slate-900"
                              )}>{method.id}</span>
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter block">{method.label}</span>
                            </div>
                          </button>
                        ))}
                      </div>

                      {formValues.payment_method === 'Card' && (
                        <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 space-y-2 shadow-inner">
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Card Details</span>
                            <div className="flex gap-1.5 items-center">
                              <img 
                                src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png" 
                                alt="Visa" 
                                className="h-3 opacity-60 object-contain" 
                              />
                              <img 
                                src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png" 
                                alt="MasterCard" 
                                className="h-3 opacity-60 object-contain" 
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block px-1">Cardholder Name</label>
                            <input
                              type="text"
                              required
                              placeholder="John Doe"
                              value={cardHolder}
                              onChange={(e) => {
                                setCardHolder(e.target.value);
                                setCardError('');
                              }}
                              className="w-full bg-white border border-slate-100 rounded-lg py-1.5 px-3 text-[11px] font-bold focus:border-orange-500 outline-none transition-all"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block px-1">Card Number</label>
                            <input
                              type="text"
                              required
                              placeholder="0000 0000 0000 0000"
                              value={cardNumber}
                              onChange={handleCardNumberChange}
                              className="w-full bg-white border border-slate-100 rounded-lg py-1.5 px-3 text-[11px] font-bold focus:border-orange-500 outline-none transition-all"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block px-1">Expiry Date</label>
                              <input
                                type="text"
                                required
                                placeholder="MM/YY"
                                value={cardExpiry}
                                onChange={handleCardExpiryChange}
                                className="w-full bg-white border border-slate-100 rounded-lg py-1.5 px-3 text-[11px] font-bold focus:border-orange-500 outline-none transition-all"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block px-1">CVV</label>
                              <input
                                type="text"
                                required
                                placeholder="123"
                                value={cardCvv}
                                onChange={handleCardCvvChange}
                                className="w-full bg-white border border-slate-100 rounded-lg py-1.5 px-3 text-[11px] font-bold focus:border-orange-500 outline-none transition-all"
                              />
                            </div>
                          </div>

                          {cardError && (
                            <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest px-1 mt-1">{cardError}</p>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {formStep === 5 && (
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
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer</p>
                            <h4 className="text-xl font-bold text-slate-900">{formValues.first_name} {formValues.last_name}</h4>
                            <p className="text-xs font-bold text-slate-500">{formValues.phone}</p>
                          </div>
                          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-orange-500 shadow-sm border border-slate-100">
                            <Users size={24} strokeWidth={3} />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-8">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Date & Time</p>
                            <div className="flex items-center gap-2 text-slate-900">
                              <Calendar size={14} className="text-orange-500" />
                              <span className="text-sm font-bold">{formValues.date}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-900 mt-1">
                              <Clock3 size={14} className="text-orange-500" />
                              <span className="text-sm font-bold">{formValues.time}</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Party Details</p>
                            <div className="flex items-center gap-2 text-slate-900">
                              <Users size={14} className="text-orange-500" />
                              <span className="text-sm font-bold">
                                {(() => {
                                  const calculatedGuests = (formValues.seatingSelection || []).reduce((acc: number, t: any) => acc + (t.selectedSeats || []).length, 0);
                                  const count = calculatedGuests || 1;
                                  return `${count} ${count === 1 ? 'Guest' : 'Guests'}`;
                                })()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-900 mt-1">
                               <Utensils size={14} className="text-orange-500" />
                               <span className="text-sm font-bold">
                                 {formValues.seatingSelection && formValues.seatingSelection.length > 0 
                                   ? formValues.seatingSelection.map((t: any) => {
                                       const tableNum = tables.find(x => x.id === t.id)?.table_number || t.id;
                                       return `${formatTableNumber(tableNum)} (Seat ${t.selectedSeats.join(', ')})`;
                                     }).join(', ')
                                   : 'Unassigned'}
                               </span>
                             </div>
                          </div>
                        </div>

                        <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment Method</p>
                            <span className="text-sm font-bold text-orange-600 uppercase">{formValues.payment_method}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</p>
                            <span className="text-xl font-bold text-slate-900">25.00 {branchInfo.currency || 'AED'}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Navigation Buttons */}
                <div className="mt-4 flex gap-4">
                  {formStep > 1 && (
                    <button 
                      type="button" 
                      onClick={() => setFormStep(formStep - 1)}
                      className="px-6 py-3 border border-slate-200 text-slate-500 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
                    >
                      Back
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      if (formStep === 1) {
                        if (!formValues.date) {
                          alert("Please select a date on the calendar.");
                          return;
                        }
                        if (!formValues.time) {
                          alert("Please select a time slot.");
                          return;
                        }
                        if (!formValues.stay_duration) {
                          alert("Please select an estimated stay duration.");
                          return;
                        }
                      }
                      if (formStep === 2) {
                        if (!formValues.first_name?.trim()) {
                          alert("Please enter the customer's first name.");
                          return;
                        }
                        if (!formValues.last_name?.trim()) {
                          alert("Please enter the customer's last name.");
                          return;
                        }
                        if (!formValues.phone?.trim()) {
                          alert("Please enter the customer's phone number.");
                          return;
                        }
                        if (!formValues.email?.trim()) {
                          alert("Please enter the customer's email address.");
                          return;
                        }
                        // Validate email format
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(formValues.email.trim())) {
                          alert("Please enter a valid email address.");
                          return;
                        }
                      }
                      if (formStep === 3) {
                        const selections = formValues.seatingSelection || [];
                        if (selections.length === 0) {
                          alert("Please select at least one table to proceed.");
                          return;
                        }
                        const hasEmptyTable = selections.some((t: any) => t.selectedSeats.length === 0);
                        if (hasEmptyTable) {
                          alert("Please select at least one seat for each of your selected tables.");
                          return;
                        }
                      }
                      if (formStep === 4) {
                        if (!formValues.payment_method) {
                          alert("Please select a payment method.");
                          return;
                        }
                        if (formValues.payment_method === 'Card') {
                          if (!cardHolder.trim()) {
                            setCardError('Cardholder name is required');
                            alert('Cardholder name is required');
                            return;
                          }
                          const digitsOnly = cardNumber.replace(/\s+/g, '');
                          if (digitsOnly.length < 15 || digitsOnly.length > 16) {
                            setCardError('Please enter a valid card number');
                            alert('Please enter a valid card number');
                            return;
                          }
                          if (cardExpiry.length < 5) {
                            setCardError('Please enter a valid expiry date (MM/YY)');
                            alert('Please enter a valid expiry date (MM/YY)');
                            return;
                          }
                          const [mm, yy] = cardExpiry.split('/');
                          const month = parseInt(mm, 10);
                          if (isNaN(month) || month < 1 || month > 12) {
                            setCardError('Please enter a valid month (01-12)');
                            alert('Please enter a valid month (01-12)');
                            return;
                          }
                          if (cardCvv.length < 3) {
                            setCardError('Please enter a valid CVV');
                            alert('Please enter a valid CVV');
                            return;
                          }
                        }
                      }
                      if (formStep < 5) setFormStep(formStep + 1);
                      else handleSubmit({ preventDefault: () => {} });
                    }}
                    className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold text-xs uppercase tracking-[0.2em] shadow-lg shadow-orange-500/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {formStep === 5 ? (isSubmitting ? 'Processing...' : 'Confirm Booking') : formStep === 1 ? 'Next Step' : 'Next'}
                    {formStep < 5 && <ChevronRight size={16} strokeWidth={3} />}
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
