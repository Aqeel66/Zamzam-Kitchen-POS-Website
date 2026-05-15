import { useState, useEffect } from 'react';
import { 
  Plus,
  Calendar, 
  Search, 
  Users, 
  Phone, 
  Mail,
  CheckCircle2,
  XCircle,
  Clock3,
  X,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';

const cn = (...inputs: (string | undefined | null | false)[]) => inputs.filter(Boolean).join(' ');

export default function Reservations() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchReservations();
  }, [selectedDate]);

  const fetchReservations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/reservations?startDate=${selectedDate}&endDate=${selectedDate}`);
      const data = await res.json();
      setReservations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching reservations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await fetch(`${API_BASE_URL}/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      fetchReservations();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const filteredReservations = reservations.filter(r => 
    r.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.phone.includes(searchQuery)
  );

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-10">
      <header className="flex items-end justify-between">
        <div>
          <span className="text-[10px] font-black text-zamzam-teal uppercase tracking-[0.4em] mb-2 block">Booking Management</span>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Guest <span className="text-zamzam-teal">Reservations</span></h1>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center bg-white border border-slate-200 rounded-2xl px-5 py-3.5 gap-3 shadow-sm group focus-within:ring-4 focus-within:ring-zamzam-teal/5 transition-all">
            <Calendar size={18} className="text-zamzam-teal" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm font-black text-slate-900 outline-none bg-transparent"
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-zamzam-teal text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-teal-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
          >
            <Plus size={18} />
            New Booking
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Stats Summary */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-zamzam-teal/10 rounded-[1.5rem] flex items-center justify-center text-zamzam-teal mb-4">
              <Users size={28} />
            </div>
            <h3 className="text-3xl font-black text-slate-900">{reservations.length}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Total Bookings Today</p>
          </div>
          
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-green-50 rounded-[1.5rem] flex items-center justify-center text-green-600 mb-4">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="text-3xl font-black text-slate-900">
              {reservations.filter(r => r.status === 'Confirmed').length}
            </h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Confirmed</p>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-orange-50 rounded-[1.5rem] flex items-center justify-center text-orange-600 mb-4">
              <Clock3 size={28} />
            </div>
            <h3 className="text-3xl font-black text-slate-900">
              {reservations.filter(r => r.status === 'Pending').length}
            </h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Pending Approval</p>
          </div>
        </div>

        {/* List View */}
        <div className="lg:col-span-3 space-y-6">
          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-zamzam-teal transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Search by name or phone number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-100 rounded-3xl py-5 pl-16 pr-8 text-sm font-bold shadow-sm outline-none focus:ring-4 focus:ring-zamzam-teal/5 focus:border-zamzam-teal/30 transition-all"
            />
          </div>

          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Reservation Queue</h2>
              <div className="flex gap-2">
                <button className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                  <Filter size={20} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    <th className="px-8 py-5">Guest Information</th>
                    <th className="px-8 py-5">Date & Time</th>
                    <th className="px-8 py-5">Party Size</th>
                    <th className="px-8 py-5">Status</th>
                    <th className="px-8 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <div className="w-8 h-8 border-4 border-slate-200 border-t-zamzam-teal rounded-full animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : filteredReservations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center text-slate-300 font-bold">No reservations found for this date.</td>
                    </tr>
                  ) : filteredReservations.map((res) => (
                    <tr key={res.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{res.first_name} {res.last_name}</span>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                              <Phone size={10} /> {res.phone}
                            </span>
                            {res.email && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                <Mail size={10} /> {res.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-900">{res.reservation_time.substring(0, 5)}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{res.reservation_date}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <Users size={16} className="text-slate-300" />
                          <span className="text-sm font-black text-slate-900">{res.party_size}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                          res.status === 'Confirmed' ? "bg-green-50 text-green-600 border-green-100" :
                          res.status === 'Pending' ? "bg-orange-50 text-orange-600 border-orange-100" :
                          "bg-slate-50 text-slate-400 border-slate-100"
                        )}>
                          {res.status}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                           {res.status === 'Pending' && (
                             <button 
                               onClick={() => handleStatusChange(res.id, 'Confirmed')}
                               className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all"
                             >
                               <CheckCircle2 size={16} />
                             </button>
                           )}
                           <button 
                             onClick={() => handleStatusChange(res.id, 'Cancelled')}
                             className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                           >
                             <XCircle size={16} />
                           </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
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
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden p-10"
            >
              <div className="flex items-center justify-between mb-10">
                <div>
                  <span className="text-[10px] font-black text-zamzam-teal uppercase tracking-[0.4em] mb-2 block">New Booking</span>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                    Reserve a <span className="text-zamzam-teal">Table</span>
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
                  name: formData.get('name'),
                  phone: formData.get('phone'),
                  email: formData.get('email'),
                  date: formData.get('date'),
                  time: formData.get('time'),
                  guests: parseInt(formData.get('guests') as string),
                  notes: formData.get('notes'),
                  branchId: 1
                };

                try {
                  const res = await fetch(`${API_BASE_URL}/reservations`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                  });
                  if (res.ok) {
                    setIsModalOpen(false);
                    fetchReservations();
                  }
                } catch (err) {
                  alert('Operation failed');
                }
              }} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Guest Name</label>
                    <input name="name" type="text" placeholder="John Doe" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-black outline-none focus:ring-4 focus:ring-zamzam-teal/5 transition-all" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Phone Number</label>
                    <input name="phone" type="tel" placeholder="+971..." className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-black outline-none focus:ring-4 focus:ring-zamzam-teal/5 transition-all" required />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Date</label>
                    <input name="date" type="date" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-black outline-none focus:ring-4 focus:ring-zamzam-teal/5 transition-all" defaultValue={selectedDate} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Time</label>
                    <input name="time" type="time" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-black outline-none focus:ring-4 focus:ring-zamzam-teal/5 transition-all" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Guests</label>
                    <input name="guests" type="number" placeholder="2" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-black outline-none focus:ring-4 focus:ring-zamzam-teal/5 transition-all" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Notes</label>
                  <textarea name="notes" rows={2} placeholder="Any special requests?" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-black outline-none focus:ring-4 focus:ring-zamzam-teal/5 transition-all resize-none" />
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="submit" className="flex-1 bg-zamzam-teal text-white font-black py-5 rounded-2xl shadow-xl shadow-teal-900/20 uppercase tracking-widest text-xs">
                    Confirm Reservation
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
