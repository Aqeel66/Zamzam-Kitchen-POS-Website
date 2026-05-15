import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Banknote, 
  MapPin, 
  Users, 
  ChevronRight, 
  X,
  CheckCircle2,
  AlertCircle,
  Ticket,
  ShieldAlert,
  Clock,
  Percent,
  Heart,
  ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL, resolveImageUrl } from '../config';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: any) => void;
  subtotal: number;
  tax: number;
  total: number;
  isSubmitting: boolean;
}

export default function CheckoutModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  subtotal,
  tax,
  total, 
  isSubmitting
}: CheckoutModalProps) {
  const [orderType, setOrderType] = useState('Dine-In');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [guestCount, setGuestCount] = useState(1);
  const [expectedDuration, setExpectedDuration] = useState(60); // Default 60 mins
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [activeReservations, setActiveReservations] = useState<any[]>([]);

  const [tables, setTables] = useState<any[]>([]);
  const [waiters, setWaiters] = useState<any[]>([]);
  const [selectedWaiter, setSelectedWaiter] = useState<any>(null);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [currency, setCurrency] = useState('USD');

  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [manualDiscount, setManualDiscount] = useState(0);
  const [manualDiscountType, setManualDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [reservationFee, setReservationFee] = useState(0);
  const [activeReservation, setActiveReservation] = useState<any>(null);
  const [tipAmount, setTipAmount] = useState(0);
  const [tipType, setTipType] = useState<'percentage' | 'fixed'>('percentage');
  const [customTip, setCustomTip] = useState('');
  const [settings, setSettings] = useState<any>(null);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/settings?t=${Date.now()}`);
      const data = await res.json();
      setSettings(data);
      if (data?.tenant?.currency) setCurrency(data.tenant.currency);
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setIsLoadingTables(true);
      fetchSettings();
      
      // Fetch tables, active orders, and today's reservations for occupancy check
      const todayStr = new Date().toISOString().split('T')[0];
      Promise.all([
        fetch(`${API_BASE_URL}/tables`).then(res => res.json()),
        fetch(`${API_BASE_URL}/orders`).then(res => res.json()),
        fetch(`${API_BASE_URL}/reservations?startDate=${todayStr}`).then(res => res.json()),
        fetch(`${API_BASE_URL}/users`).then(res => res.json())
      ]).then(([tablesData, ordersData, reservationsData, usersData]) => {
        setTables(tablesData);
        const filteredOrders = (ordersData || []).filter((o: any) => 
          (o.table_id || o.table_number) && 
          !['cancelled', 'rejected', 'paid'].includes((o.status || '').toLowerCase().trim())
        );
        setActiveOrders(filteredOrders);
        setActiveReservations(Array.isArray(reservationsData) ? reservationsData : []);
        
        const waiterUsers = (usersData || []).filter((u: any) => {
          const userRoles = typeof u.roles === 'string' ? u.roles.split(',').map((r: any) => r.trim()) : [];
          return userRoles.includes('Waiter');
        });
        setWaiters(waiterUsers);
        setIsLoadingTables(false);
      }).catch(err => {
        console.error('Error fetching data:', err);
        setIsLoadingTables(false);
      });
    }

    window.addEventListener('settings-updated', fetchSettings);
    return () => window.removeEventListener('settings-updated', fetchSettings);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && selectedTable) {
      // Fetch active seated reservation for this table to apply booking fee credit
      fetch(`${API_BASE_URL}/reservations?startDate=${new Date().toISOString().split('T')[0]}&endDate=${new Date().toISOString().split('T')[0]}`)
        .then(res => res.json())
        .then(data => {
          const res = (data || []).find((r: any) => 
            r.table_id === selectedTable.id && 
            r.status === 'Seated' && 
            r.booking_fee > 0
          );
          if (res) {
            setReservationFee(parseFloat(res.booking_fee));
            setActiveReservation(res);
          } else {
            setReservationFee(0);
            setActiveReservation(null);
          }
        })
        .catch(err => console.error('Error fetching reservation fee:', err));
    }
  }, [isOpen, selectedTable]);

  const getTableInfo = (tableId: number, capacity: number, tableNum: string) => {
    const tableOrders = activeOrders.filter(o => {
      const orderTableId = o.table_id ? String(o.table_id) : null;
      const orderTableNum = o.table_number ? String(o.table_number).toLowerCase().trim() : null;
      const targetTableId = tableId ? String(tableId) : null;
      const targetTableNum = tableNum ? String(tableNum).toLowerCase().trim() : null;

      return (
        !['cancelled', 'rejected', 'served'].includes((o.status || '').toLowerCase().trim()) &&
        ((orderTableId && orderTableId === targetTableId) || 
         (orderTableNum && orderTableNum === targetTableNum))
      );
    });

    const totalGuests = tableOrders.reduce((sum, o) => sum + (Number(o.guest_count) || 1), 0);
    const latestRelease = tableOrders.length > 0 
      ? new Date(Math.max(...tableOrders.map(o => o.estimated_release_time ? new Date(o.estimated_release_time).getTime() : 0)))
      : null;

    // Check for upcoming reservations (within next 2 hours)
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    const isReservedSoon = activeReservations.some(r => {
      if (String(r.table_id) !== String(tableId)) return false;
      if (r.status === 'Cancelled' || r.status === 'No-Show' || r.status === 'Completed' || r.status === 'Seated') return false;
      
      const resTime = new Date(`${r.reservation_date}T${r.reservation_time}`);
      return resTime >= now && resTime <= twoHoursFromNow;
    });

    return {
      isOccupied: tableOrders.length > 0,
      isFull: totalGuests >= capacity,
      currentGuests: totalGuests,
      releaseTime: latestRelease,
      isReserved: isReservedSoon
    };
  };

  const validatePromo = async () => {
    if (!promoCode) return;
    setIsValidating(true);
    setPromoError('');
    try {
      const response = await fetch(`${API_BASE_URL}/promotions/validate/${promoCode}`);
      const data = await response.json();
      
      if (data.success) {
        if (total < data.promo.min_spend) {
          setPromoError(`Minimum spend of ${data.promo.min_spend} required`);
          return;
        }
        setAppliedPromo(data.promo);
      } else {
        setPromoError(data.message);
      }
    } catch (err) {
      setPromoError('Validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  const promoDiscount = appliedPromo ? (
    appliedPromo.discount_type?.toString().toLowerCase() === 'percentage' 
      ? (subtotal * (parseFloat(appliedPromo.discount_value) / 100))
      : parseFloat(appliedPromo.discount_value)
  ) : 0;

  const manualDiscountValue = manualDiscountType === 'percentage'
    ? (subtotal * (manualDiscount / 100))
    : manualDiscount;

  const totalDiscount = promoDiscount + manualDiscountValue + reservationFee;
  
  // Re-calculate tax based on discounted subtotal for parity with other platforms
  const currentTaxRate = subtotal > 0 ? (tax / subtotal) : 0;
  const discountedSubtotal = Math.max(0, subtotal - totalDiscount);
  const newTaxAmount = discountedSubtotal * currentTaxRate;

  const tipValue = tipType === 'percentage'
    ? ((discountedSubtotal + newTaxAmount) * (tipAmount / 100))
    : tipAmount;
  const finalTotal = Math.max(0, discountedSubtotal + newTaxAmount + tipValue);

  const handleConfirm = () => {
    if (orderType === 'Dine-In') {
      if (!selectedTable) {
        alert('Please select a table for Dine-In');
        return;
      }
      if (!selectedWaiter) {
        alert('Please assign a waiter for Dine-In');
        return;
      }
    }

    const releaseTime = new Date();
    releaseTime.setMinutes(releaseTime.getMinutes() + expectedDuration);

    onConfirm({
      order_type: orderType,
      payment_method: paymentMethod,
      table_id: selectedTable?.id || null,
      table_number: selectedTable?.table_number || null,
      waiter_id: selectedWaiter?.id || null,
      waiter_name: selectedWaiter ? `${selectedWaiter.first_name} ${selectedWaiter.last_name}` : null,
      guest_count: guestCount,
      expected_duration: expectedDuration,
      estimated_release_time: releaseTime.toISOString(),
      promo_id: appliedPromo?.id || null,
      promo_discount: promoDiscount,
      manual_discount: manualDiscountValue,
      reservation_fee: reservationFee,
      discount_amount: totalDiscount,
      tax_amount: newTaxAmount,
      tip_amount: tipValue,
      total_amount: finalTotal
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">Checkout</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Finalize your order details</p>
          </div>
          <button onClick={onClose} className="p-3 text-slate-400 hover:bg-white hover:text-slate-900 rounded-2xl transition-all border border-transparent hover:border-slate-100">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10">
          {/* Order Type */}
          <section>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <MapPin size={14} className="text-zamzam-teal" />
              Order Type
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { id: 'Dine-In', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
                { id: 'Takeaway', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
                { id: 'Delivery', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' }
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setOrderType(type.id)}
                  className={cn(
                    "flex flex-col items-center justify-center p-5 rounded-3xl border-2 transition-all group",
                    orderType === type.id 
                      ? `${type.bg} ${type.border} ${type.color} shadow-lg shadow-current/5` 
                      : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                  )}
                >
                  <span className="text-xs font-black uppercase tracking-widest">{type.id}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Waiter Selection (Only for Dine-In) */}
          <AnimatePresence>
            {orderType === 'Dine-In' && (
              <motion.section
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-4"
              >
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Users size={14} className="text-zamzam-teal" />
                  Assign Waiter
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {waiters.map((waiter) => {
                    const isSelected = selectedWaiter?.id === waiter.id;
                    return (
                      <button
                        key={waiter.id}
                        onClick={() => setSelectedWaiter(waiter)}
                        className={cn(
                          "p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all relative overflow-hidden",
                          isSelected
                            ? "bg-indigo-50 border-indigo-600 text-indigo-700 shadow-lg shadow-indigo-900/10"
                            : "bg-white border-slate-100 text-slate-600 hover:border-slate-200"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-sm font-black",
                          isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"
                        )}>
                          {waiter.first_name?.[0]}{waiter.last_name?.[0]}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-tight text-center leading-tight">
                          {waiter.first_name}<br/>{waiter.last_name}
                        </span>
                        {isSelected && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle2 size={12} className="text-indigo-600" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {waiters.length === 0 && (
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest italic px-2">No waiters found in staff list. Please add waiters in Settings.</p>
                )}
              </motion.section>
            )}
          </AnimatePresence>

          {/* Table Selection (Only for Dine-In) */}
          <AnimatePresence>
            {orderType === 'Dine-In' && (
              <motion.section
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-8"
              >
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Users size={14} className="text-zamzam-teal" />
                    Select Table
                  </h3>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                    {isLoadingTables ? (
                      <div className="col-span-full py-8 text-center text-slate-400 text-xs font-bold animate-pulse">Loading Tables...</div>
                    ) : tables.length === 0 ? (
                      <div className="col-span-full py-8 text-center text-slate-400 text-xs font-bold">No tables available</div>
                    ) : (
                      tables.map((table) => {
                        const info = getTableInfo(table.id, table.capacity || 0, table.table_number);
                        const { isOccupied, isFull, releaseTime, currentGuests } = info;
                        const isCurrentlySelected = selectedTable?.id === table.id;

                        return (
                          <button
                            key={table.id}
                            disabled={isFull && !isCurrentlySelected}
                            onClick={() => {
                              setSelectedTable(table);
                              if (table.capacity) setGuestCount(Math.min(guestCount, table.capacity));
                            }}
                            className={cn(
                              "aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all relative overflow-hidden",
                              isCurrentlySelected
                                ? "bg-zamzam-teal text-white border-zamzam-teal shadow-lg shadow-teal-900/20" 
                                : isFull
                                ? "bg-red-950 border-red-900 text-red-200 cursor-not-allowed opacity-90"
                                : info.isReserved
                                ? "bg-indigo-50 border-indigo-100 text-indigo-600"
                                : isOccupied
                                ? "bg-orange-50 border-orange-100 text-orange-600"
                                : "bg-white border-slate-100 text-slate-600 hover:border-slate-200"
                            )}
                          >
                            <span className="text-xs font-black">{table.table_number}</span>
                            <span className="text-[7px] font-bold opacity-60 uppercase">{currentGuests}/{table.capacity}p</span>
                            
                            {isFull && !isCurrentlySelected && (
                               <div className="mt-1 bg-red-500/20 px-1.5 py-0.5 rounded-sm">
                                  <span className="text-[6px] font-black uppercase text-red-200">FULL</span>
                               </div>
                            )}

                            {info.isReserved && !isCurrentlySelected && (
                              <div className="mt-1 bg-indigo-500/20 px-1.5 py-0.5 rounded-sm flex items-center gap-1">
                                 <Clock size={8} className="text-indigo-600" />
                                 <span className="text-[6px] font-black uppercase text-indigo-600">Reserved</span>
                              </div>
                            )}

                            {isOccupied && !isCurrentlySelected && releaseTime && (
                              <span className={cn(
                                "text-[6px] font-black uppercase mt-1 px-1 rounded-sm",
                                isFull ? "bg-red-500/30 text-red-100" : "bg-orange-100 text-orange-600"
                              )}>
                                Free {releaseTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {selectedTable && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-8"
                  >
                    {/* Guest Count */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Number of Guests</h4>
                        <p className="text-xs font-bold text-slate-600 mt-1">Table {selectedTable.table_number} capacity: {selectedTable.capacity} guests</p>
                      </div>
                      <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                        <button onClick={() => setGuestCount(Math.max(1, guestCount - 1))} className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-all font-black text-xl">−</button>
                        <span className="text-xl font-black text-slate-900 w-8 text-center">{guestCount}</span>
                        <button onClick={() => setGuestCount(Math.min(selectedTable.capacity || 20, guestCount + 1))} className="w-10 h-10 rounded-xl flex items-center justify-center text-zamzam-teal hover:bg-slate-50 transition-all font-black text-xl">+</button>
                      </div>
                    </div>

                    {/* Expected Duration */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expected Stay Duration</h4>
                      <div className="grid grid-cols-4 gap-3">
                        {[30, 60, 90, 120].map((mins) => (
                          <button
                            key={mins}
                            onClick={() => setExpectedDuration(mins)}
                            className={cn(
                              "py-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all",
                              expectedDuration === mins
                                ? "bg-zamzam-teal border-zamzam-teal text-white shadow-md shadow-teal-900/10"
                                : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                            )}
                          >
                            {mins}m
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 px-4 py-3 bg-white/50 rounded-xl border border-slate-100">
                        <Clock size={12} className="text-slate-400" />
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Estimated release: <span className="text-slate-900">{new Date(Date.now() + expectedDuration * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.section>
            )}
          </AnimatePresence>

          {/* Promo Code */}
          <section>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Ticket size={14} className="text-zamzam-teal" />
              Promotion Code
            </h3>
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <input 
                  type="text"
                  placeholder="Enter code (e.g. ZAMZAM10)"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  disabled={!!appliedPromo}
                  className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-black focus:ring-4 focus:ring-zamzam-teal/10 outline-none disabled:opacity-50"
                />
                {appliedPromo && (
                  <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" size={20} />
                )}
                {promoError && (
                   <AlertCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500" size={20} />
                )}
              </div>
              {appliedPromo ? (
                <button 
                  onClick={() => { setAppliedPromo(null); setPromoCode(''); }}
                  className="px-6 py-4 bg-red-50 text-red-500 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                >
                  Remove
                </button>
              ) : (
                <button 
                  onClick={validatePromo}
                  disabled={!promoCode || isValidating}
                  className="px-8 py-4 bg-zamzam-teal text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-teal-500/10 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isValidating ? '...' : 'Apply'}
                </button>
              )}
            </div>
            {promoError && <p className="text-[10px] font-bold text-red-500 mt-2 ml-1 uppercase tracking-widest">{promoError}</p>}
            {appliedPromo && (
              <p className="text-[10px] font-bold text-green-600 mt-2 ml-1 uppercase tracking-widest">
                Success! {appliedPromo.discount_type === 'percentage' ? `${appliedPromo.discount_value}%` : `${currency} ${appliedPromo.discount_value}`} discount applied.
              </p>
            )}
          </section>

          {/* Discount */}
          <section>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <ShieldAlert size={14} className="text-green-500" />
              Discount
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-5 gap-2">
                {[5, 10, 15, 20].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => { setManualDiscount(pct); setManualDiscountType('percentage'); }}
                    className={cn(
                      "py-3 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all",
                      manualDiscountType === 'percentage' && manualDiscount === pct
                        ? "bg-green-500 border-green-500 text-white shadow-md shadow-green-500/20"
                        : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                    )}
                  >
                    {pct}%
                  </button>
                ))}
                <button
                  onClick={() => { setManualDiscount(0); setManualDiscountType('fixed'); }}
                  className={cn(
                    "py-3 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all",
                    manualDiscount === 0
                      ? "bg-slate-100 border-slate-200 text-slate-600"
                      : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                  )}
                >
                  None
                </button>
              </div>
              <div className="flex bg-slate-50 rounded-2xl overflow-hidden">
                <input
                  type="number"
                  min="0"
                  placeholder="Custom discount"
                  onChange={(e) => {
                    setManualDiscount(parseFloat(e.target.value) || 0);
                    setManualDiscountType('fixed');
                  }}
                  className="flex-1 bg-transparent border-none py-4 px-6 text-sm font-black focus:ring-0 outline-none"
                />
                <select
                  value={manualDiscountType}
                  onChange={(e) => setManualDiscountType(e.target.value as any)}
                  className="bg-slate-100 border-none px-4 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer"
                >
                  <option value="fixed">{currency}</option>
                  <option value="percentage">%</option>
                </select>
              </div>
            </div>
          </section>

          {/* Tip */}
          <section>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Heart size={14} className="text-pink-400" />
              Add a Tip
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-5 gap-2">
                {[5, 10, 15, 20].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => { setTipAmount(pct); setTipType('percentage'); setCustomTip(''); }}
                    className={cn(
                      "py-3 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all",
                      tipType === 'percentage' && tipAmount === pct
                        ? "bg-pink-500 border-pink-500 text-white shadow-md shadow-pink-500/20"
                        : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                    )}
                  >
                    {pct}%
                  </button>
                ))}
                <button
                  onClick={() => { setTipAmount(0); setTipType('fixed'); setCustomTip(''); }}
                  className={cn(
                    "py-3 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all",
                    tipAmount === 0
                      ? "bg-slate-100 border-slate-200 text-slate-600"
                      : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                  )}
                >
                  None
                </button>
              </div>
              <div className="flex bg-slate-50 rounded-2xl overflow-hidden">
                <input
                  type="number"
                  min="0"
                  placeholder="Custom tip amount"
                  value={customTip}
                  onChange={(e) => {
                    setCustomTip(e.target.value);
                    setTipAmount(parseFloat(e.target.value) || 0);
                    setTipType('fixed');
                  }}
                  className="flex-1 bg-transparent border-none py-4 px-6 text-sm font-black focus:ring-0 outline-none"
                />
                <select
                  value={tipType}
                  onChange={(e) => setTipType(e.target.value as any)}
                  className="bg-slate-100 border-none px-4 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer"
                >
                  <option value="fixed">{currency}</option>
                  <option value="percentage">%</option>
                </select>
              </div>
            </div>
          </section>

          {/* Payment Method */}
          <section>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <CreditCard size={14} className="text-zamzam-teal" />
              Payment Method
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { id: 'Cash', icon: Banknote },
                { id: 'Card', icon: CreditCard },
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={cn(
                    "flex items-center gap-4 p-5 rounded-3xl border-2 transition-all",
                    paymentMethod === method.id 
                      ? "bg-zamzam-teal/5 border-zamzam-teal text-zamzam-teal" 
                      : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                    paymentMethod === method.id ? "bg-zamzam-teal text-white" : "bg-slate-50 text-slate-400"
                  )}>
                    <method.icon size={20} />
                  </div>
                  <span className="text-sm font-black uppercase tracking-widest">{method.id}</span>
                  {paymentMethod === method.id && <CheckCircle2 className="ml-auto" size={20} />}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex-1 mr-12">
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-4">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Subtotal</span>
                <span>{currency} {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Tax (10%)</span>
                <span>{currency} {newTaxAmount.toFixed(2)}</span>
              </div>
              {promoDiscount > 0 && (
                <div className="flex justify-between text-[10px] font-bold text-green-600 uppercase tracking-widest">
                  <span>Promo</span>
                  <span>-{currency} {promoDiscount.toFixed(2)}</span>
                </div>
              )}
              {manualDiscountValue > 0 && (
                <div className="flex justify-between text-[10px] font-bold text-green-600 uppercase tracking-widest">
                  <span>Discount</span>
                  <span>-{currency} {manualDiscountValue.toFixed(2)}</span>
                </div>
              )}
              {reservationFee > 0 && (
                <div className="flex justify-between text-[10px] font-bold text-orange-600 uppercase tracking-widest">
                  <span>Res. Fee Credit</span>
                  <span>-{currency} {reservationFee.toFixed(2)}</span>
                </div>
              )}
              {tipValue > 0 && (
                <div className="flex justify-between text-[10px] font-bold text-pink-500 uppercase tracking-widest">
                  <span>Tip</span>
                  <span>+{currency} {tipValue.toFixed(2)}</span>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Payable Amount</span>
              <div className="text-3xl font-black text-slate-900 tracking-tighter">{currency} {finalTotal.toFixed(2)}</div>
            </div>
          </div>
          <button 
            disabled={isSubmitting}
            onClick={handleConfirm}
            className="bg-zamzam-teal hover:bg-teal-700 disabled:bg-slate-300 text-white font-black px-10 py-5 rounded-[1.5rem] shadow-xl shadow-teal-900/20 flex items-center gap-3 transition-all active:scale-95"
          >
            <span className="uppercase tracking-widest text-sm">
              {isSubmitting ? 'Processing...' : 'Complete Order'}
            </span>
            <ChevronRight size={20} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
