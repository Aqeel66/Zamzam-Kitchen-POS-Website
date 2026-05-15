import { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Users, 
  Ticket, 
  DollarSign, 
  CreditCard, 
  ChevronRight, 
  Check,
  ChevronDown,
  ChevronLeft,
  Utensils
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

export default function CheckoutModal({ 
  isOpen, 
  onClose, 
  cart = [], 
  onOrderSuccess, 
  settings 
}: any) {
  const [step, setStep] = useState(1);
  const [orderType, setOrderType] = useState('Dine-In');
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card'>('Cash');
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [manualDiscount, setManualDiscount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tables, setTables] = useState<any[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState(false);

  useEffect(() => {
    if (isOpen && orderType === 'Dine-In') {
      fetchTables();
    }
  }, [isOpen, orderType]);

  const fetchTables = async () => {
    setIsLoadingTables(true);
    try {
      const res = await fetch(`${API_BASE_URL}/tables`);
      const data = await res.json();
      setTables(Array.isArray(data) ? data.filter((t: any) => t.status === 'Available') : []);
    } catch (err) {
      console.error('Failed to fetch tables:', err);
    } finally {
      setIsLoadingTables(false);
    }
  };

  if (!isOpen) return null;

  const subtotal = cart.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.10;
  
  let promoDiscount = 0;
  if (appliedPromo) {
    promoDiscount = appliedPromo.discount_type === 'percentage' 
      ? (subtotal * appliedPromo.discount_value / 100) 
      : appliedPromo.discount_value;
  }

  const totalDiscount = promoDiscount + manualDiscount;
  const finalTotal = Math.max(0, subtotal + tax - totalDiscount);
  const currency = settings?.tenant?.currency || 'USD';

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const orderData = {
        table_id: selectedTable?.table_number,
        order_type: orderType,
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        payment_method: paymentMethod,
        subtotal,
        tax,
        discount_amount: totalDiscount,
        total: finalTotal,
        status: 'Paid',
        origin: 'Counter'
      };

      const res = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (res.ok) {
        const data = await res.json();
        onOrderSuccess({ ...orderData, id: data.orderNumber });
      } else {
        const err = await res.json();
        alert(`Error: ${err.message}`);
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            {step === 2 && (
              <button 
                onClick={() => setStep(1)}
                className="p-2 text-slate-400 hover:text-slate-900 transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
            )}
            <div>
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Checkout</h2>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Finalize your order details</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-10 space-y-12 no-scrollbar">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                className="space-y-12"
              >
                {/* Order Type Section */}
                <section className="space-y-6">
                  <div className="flex items-center gap-3 text-zamzam-teal">
                    <div className="p-2 bg-teal-50 rounded-lg">
                      <MapPin size={18} />
                    </div>
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Order Type</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-6">
                    {['Dine-In', 'Takeaway', 'Delivery'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setOrderType(type)}
                        className={cn(
                          "py-6 rounded-[1.8rem] border-2 font-black text-[13px] uppercase tracking-widest transition-all",
                          orderType === type 
                            ? "bg-teal-50 border-zamzam-teal text-zamzam-teal shadow-lg shadow-teal-900/5" 
                            : "border-slate-100 text-slate-300 hover:border-slate-200"
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Table Selection Section */}
                {orderType === 'Dine-In' && (
                  <section className="space-y-6">
                    <div className="flex items-center gap-3 text-zamzam-teal">
                      <div className="p-2 bg-teal-50 rounded-lg">
                        <Users size={18} />
                      </div>
                      <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Select Table</h3>
                    </div>
                    <div className="grid grid-cols-6 gap-4">
                      {isLoadingTables ? (
                        <div className="col-span-full py-12 text-center text-slate-300 animate-pulse font-bold uppercase text-[10px] tracking-widest">
                          Scanning available tables...
                        </div>
                      ) : tables.map((table) => (
                        <button
                          key={table.id}
                          onClick={() => setSelectedTable(table)}
                          className={cn(
                            "aspect-square rounded-[1.5rem] border-2 flex flex-col items-center justify-center transition-all group",
                            selectedTable?.id === table.id
                              ? "bg-zamzam-teal border-zamzam-teal text-white shadow-xl shadow-teal-900/20"
                              : "border-slate-100 text-slate-400 hover:border-slate-200 bg-white"
                          )}
                        >
                          <span className="text-[15px] font-black">{table.table_number}</span>
                          <span className={cn(
                            "text-[8px] font-bold uppercase tracking-widest mt-1",
                            selectedTable?.id === table.id ? "text-white/60" : "text-slate-300"
                          )}>
                            {table.capacity}P
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-12"
              >
                {/* Promotion Code Section */}
                <section className="space-y-6">
                  <div className="flex items-center gap-3 text-zamzam-teal">
                    <div className="p-2 bg-teal-50 rounded-lg">
                      <Ticket size={18} />
                    </div>
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Promotion Code</h3>
                  </div>
                  <div className="flex gap-4">
                    <input 
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Enter code (e.g. ZAMZAM10)"
                      className="flex-1 bg-slate-50 border-none rounded-[1.5rem] px-8 py-5 text-sm font-black text-slate-900 focus:ring-2 focus:ring-zamzam-teal/10 outline-none"
                    />
                    <button 
                      className="px-10 bg-teal-100/50 text-zamzam-teal font-black text-[11px] uppercase tracking-[0.2em] rounded-[1.5rem] hover:bg-zamzam-teal hover:text-white transition-all"
                    >
                      Apply
                    </button>
                  </div>
                </section>

                {/* Manual Adjustment Section */}
                <section className="space-y-6">
                  <div className="flex items-center gap-3 text-zamzam-teal">
                    <div className="p-2 bg-teal-50 rounded-lg">
                      <DollarSign size={18} />
                    </div>
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Manual Adjustment</h3>
                  </div>
                  <div className="relative">
                    <input 
                      type="number"
                      value={manualDiscount || ''}
                      onChange={(e) => setManualDiscount(parseFloat(e.target.value) || 0)}
                      placeholder="Adjustment Value"
                      className="w-full bg-slate-50 border-none rounded-[1.5rem] px-8 py-5 text-sm font-black text-slate-900 focus:ring-2 focus:ring-zamzam-teal/10 outline-none"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">USD</span>
                      <ChevronDown size={14} className="text-slate-400" />
                    </div>
                  </div>
                </section>

                {/* Payment Method Section */}
                <section className="space-y-6">
                  <div className="flex items-center gap-3 text-zamzam-teal">
                    <div className="p-2 bg-teal-50 rounded-lg">
                      <CreditCard size={18} />
                    </div>
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Payment Method</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    {[
                      { id: 'Cash', icon: DollarSign, label: 'CASH' },
                      { id: 'Card', icon: CreditCard, label: 'CARD' }
                    ].map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id as any)}
                        className={cn(
                          "p-8 rounded-[2rem] border-2 flex items-center justify-between transition-all group",
                          paymentMethod === method.id 
                            ? "bg-teal-50 border-zamzam-teal text-zamzam-teal shadow-lg shadow-teal-900/5" 
                            : "border-slate-100 text-slate-300 hover:border-slate-200"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                            paymentMethod === method.id ? "bg-zamzam-teal text-white" : "bg-slate-50 text-slate-300 group-hover:bg-slate-100"
                          )}>
                            <method.icon size={24} />
                          </div>
                          <span className="font-black text-[15px] tracking-widest">{method.label}</span>
                        </div>
                        {paymentMethod === method.id && <Check size={20} />}
                      </button>
                    ))}
                  </div>
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-10 py-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between sticky bottom-0 z-10 bg-white">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Payable Amount</span>
            <div className="text-3xl font-black text-slate-900 tracking-tighter mt-1">${finalTotal.toFixed(2)}</div>
          </div>
          
          <button 
            disabled={isSubmitting || (step === 1 && orderType === 'Dine-In' && !selectedTable)}
            onClick={() => {
              if (step === 1) setStep(2);
              else handleConfirm();
            }}
            className="bg-zamzam-teal hover:bg-teal-700 disabled:bg-slate-300 text-white font-black px-12 py-5 rounded-[1.5rem] shadow-xl shadow-teal-900/20 flex items-center gap-3 transition-all active:scale-[0.98] group"
          >
            <span className="uppercase tracking-[0.2em] text-[13px] font-black">
              {isSubmitting ? 'Processing...' : step === 1 ? 'Next Step' : 'Complete Order'}
            </span>
            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
