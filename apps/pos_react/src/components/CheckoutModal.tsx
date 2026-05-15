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
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: any) => void;
  total: number;
  isSubmitting: boolean;
}

export default function CheckoutModal({ isOpen, onClose, onConfirm, total, isSubmitting }: CheckoutModalProps) {
  const [orderType, setOrderType] = useState('Dine-In');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState(false);

  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [manualDiscount, setManualDiscount] = useState(0);
  const [manualDiscountType, setManualDiscountType] = useState<'fixed' | 'percentage'>('fixed');

  useEffect(() => {
    if (isOpen && orderType === 'Dine-In') {
      setIsLoadingTables(true);
      fetch(`${API_BASE_URL}/tables`)
        .then(res => res.json())
        .then(data => {
          setTables(data);
          setIsLoadingTables(false);
        })
        .catch(err => {
          console.error('Error fetching tables:', err);
          setIsLoadingTables(false);
        });
    }
  }, [isOpen, orderType]);

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
    appliedPromo.discount_type === 'percentage' 
      ? (total * (appliedPromo.discount_value / 100))
      : appliedPromo.discount_value
  ) : 0;

  const manualDiscountValue = manualDiscountType === 'percentage'
    ? (total * (manualDiscount / 100))
    : manualDiscount;

  const totalDiscount = promoDiscount + manualDiscountValue;
  const finalTotal = Math.max(0, total - totalDiscount);

  const handleConfirm = () => {
    if (orderType === 'Dine-In' && !selectedTable) {
      alert('Please select a table for Dine-In');
      return;
    }
    onConfirm({
      order_type: orderType,
      payment_method: paymentMethod,
      table_id: selectedTable?.id || null,
      promo_id: appliedPromo?.id || null,
      discount_amount: totalDiscount,
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
              {['Dine-In', 'Takeaway', 'Delivery'].map((type) => (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  className={cn(
                    "flex flex-col items-center justify-center p-5 rounded-3xl border-2 transition-all group",
                    orderType === type 
                      ? "bg-zamzam-teal/5 border-zamzam-teal text-zamzam-teal" 
                      : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                  )}
                >
                  <span className="text-xs font-black uppercase tracking-widest">{type}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Table Selection (Only for Dine-In) */}
          <AnimatePresence>
            {orderType === 'Dine-In' && (
              <motion.section
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
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
                    tables.map((table) => (
                      <button
                        key={table.id}
                        onClick={() => setSelectedTable(table)}
                        className={cn(
                          "aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all",
                          selectedTable?.id === table.id 
                            ? "bg-zamzam-teal text-white border-zamzam-teal shadow-lg shadow-teal-900/20" 
                            : "bg-white border-slate-100 text-slate-600 hover:border-slate-200"
                        )}
                      >
                        <span className="text-xs font-black">{table.table_number}</span>
                        <span className="text-[8px] font-bold opacity-60 uppercase">{table.capacity}p</span>
                      </button>
                    ))
                  )}
                </div>
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
                Success! {appliedPromo.discount_type === 'percentage' ? `${appliedPromo.discount_value}%` : `${appliedPromo.discount_value} AED`} discount applied.
              </p>
            )}
          </section>

          {/* Manual Discount */}
          <section>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <ShieldAlert size={14} className="text-zamzam-teal" />
              Manual Adjustment
            </h3>
            <div className="flex gap-4">
               <div className="flex-1 flex bg-slate-50 rounded-2xl overflow-hidden">
                  <input 
                    type="number"
                    placeholder="Adjustment Value"
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setManualDiscount(val);
                    }}
                    className="flex-1 bg-transparent border-none py-4 px-6 text-sm font-black focus:ring-0 outline-none"
                  />
                  <select 
                    onChange={(e) => setManualDiscountType(e.target.value as any)}
                    className="bg-slate-100 border-none px-4 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer"
                  >
                    <option value="fixed">AED</option>
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
          <div className="space-y-1">
        {totalDiscount > 0 && (
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            Discount: <span className="text-green-600">-${totalDiscount.toFixed(2)}</span>
          </div>
        )}
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Payable Amount</span>
            <div className="text-3xl font-black text-slate-900 tracking-tighter">${finalTotal.toFixed(2)}</div>
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

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');
