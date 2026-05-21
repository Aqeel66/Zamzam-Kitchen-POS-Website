import { useState, useEffect, useRef } from 'react';
import { 
  CreditCard, 
  Banknote, 
  ChevronRight, 
  X,
  CheckCircle2,
  AlertCircle,
  Ticket,
  ShieldAlert,
  Heart,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '../config';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: any) => void;
  subtotal: number;
  tax: number;
  total: number;
  isSubmitting: boolean;
  initialDiscount?: number;
  initialTip?: number;
}

export default function CheckoutModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  subtotal,
  tax,
  total, 
  isSubmitting,
  initialDiscount = 0,
  initialTip = 0
}: CheckoutModalProps) {
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [currency, setCurrency] = useState('USD');
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [manualDiscount, setManualDiscount] = useState(initialDiscount);
  const [manualDiscountType, setManualDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [tipAmount, setTipAmount] = useState(initialTip);
  const [tipType, setTipType] = useState<'percentage' | 'fixed'>('fixed');
  const [customTip, setCustomTip] = useState('');
  const [settings, setSettings] = useState<any>(null);

  // Card input states
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

  // Update states if props change (e.g. when opening a new order)
  const prevIsOpen = useRef(isOpen);
  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      setManualDiscount(initialDiscount);
      setTipAmount(initialTip);
      
      // Determine initial payment method based on settings
      const isCashAllowed = settings?.branch?.allow_cash_pos !== 0;
      const isCardAllowed = settings?.branch?.allow_card_pos !== 0;
      if (!isCashAllowed && isCardAllowed) {
        setPaymentMethod('Card');
      } else if (isCashAllowed) {
        setPaymentMethod('Cash');
      } else {
        setPaymentMethod('');
      }
      
      setPromoCode('');
      setPromoError('');
      setAppliedPromo(null);
      setCustomTip('');
      setTipType('fixed');

      // Clear card details on reopen
      setCardHolder('');
      setCardNumber('');
      setCardExpiry('');
      setCardCvv('');
      setCardError('');
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, initialDiscount, initialTip, settings]);

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
    if (settings?.branch) {
      const isCashAllowed = settings.branch.allow_cash_pos !== 0;
      const isCardAllowed = settings.branch.allow_card_pos !== 0;
      if (!isCashAllowed && paymentMethod === 'Cash' && isCardAllowed) {
        setPaymentMethod('Card');
      } else if (!isCardAllowed && paymentMethod === 'Card' && isCashAllowed) {
        setPaymentMethod('Cash');
      } else if (!isCashAllowed && !isCardAllowed && paymentMethod !== '') {
        setPaymentMethod('');
      }
    }
  }, [settings, paymentMethod]);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
    window.addEventListener('settings-updated', fetchSettings);
    return () => window.removeEventListener('settings-updated', fetchSettings);
  }, [isOpen]);

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

  const totalDiscount = promoDiscount + manualDiscountValue;
  
  // Re-calculate tax based on discounted subtotal for parity with other platforms
  const currentTaxRate = subtotal > 0 ? (tax / subtotal) : 0;
  const discountedSubtotal = Math.max(0, subtotal - totalDiscount);
  const newTaxAmount = discountedSubtotal * currentTaxRate;

  const tipValue = tipType === 'percentage'
    ? ((discountedSubtotal + newTaxAmount) * (tipAmount / 100))
    : tipAmount;
  const finalTotal = Math.max(0, discountedSubtotal + newTaxAmount + tipValue);

  const handleConfirm = () => {
    if (paymentMethod === 'Card') {
      if (!cardHolder.trim()) {
        setCardError('Cardholder name is required');
        return;
      }
      const digitsOnly = cardNumber.replace(/\s+/g, '');
      if (digitsOnly.length < 15 || digitsOnly.length > 16) {
        setCardError('Please enter a valid card number');
        return;
      }
      if (cardExpiry.length < 5) {
        setCardError('Please enter a valid expiry date (MM/YY)');
        return;
      }
      const [mm, yy] = cardExpiry.split('/');
      const month = parseInt(mm, 10);
      if (isNaN(month) || month < 1 || month > 12) {
        setCardError('Please enter a valid month (01-12)');
        return;
      }
      if (cardCvv.length < 3) {
        setCardError('Please enter a valid CVV');
        return;
      }
    }

    onConfirm({
      payment_method: paymentMethod,
      promo_id: appliedPromo?.id || null,
      promo_discount: promoDiscount,
      manual_discount: manualDiscountValue,
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
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[98vh]"
      >
        {/* Header */}
        <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight uppercase leading-none">Checkout</h2>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Finalize your order details</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-white hover:text-slate-900 rounded-lg transition-all border border-transparent hover:border-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {/* Removed Order Type, Waiter and Table selection as they are now handled in the sidebar */}

          {/* Promo Code */}
          <section className="p-2.5 bg-slate-50/50 rounded-lg border border-slate-100">
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-1.5 flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-zamzam-teal/10 flex items-center justify-center">
                <Ticket size={10} className="text-zamzam-teal" />
              </div>
              Promotion Code
            </h3>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input 
                  type="text"
                  placeholder="Enter code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  disabled={!!appliedPromo}
                  className="w-full bg-slate-50 border-none rounded-lg py-2 px-3 text-[11px] font-bold focus:ring-4 focus:ring-zamzam-teal/10 outline-none disabled:opacity-50"
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
                  className="px-3 py-2 bg-red-50 text-red-500 rounded-lg font-bold text-[9px] uppercase tracking-widest transition-all"
                >
                  Remove
                </button>
              ) : (
                <button 
                  onClick={validatePromo}
                  disabled={!promoCode || isValidating}
                  className="px-5 py-2 bg-zamzam-teal text-white rounded-lg font-bold text-[9px] uppercase tracking-widest shadow-lg shadow-teal-500/10 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
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
          <section className="p-2.5 bg-slate-50/50 rounded-lg border border-slate-100">
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-1.5 flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-green-500/10 flex items-center justify-center">
                <ShieldAlert size={10} className="text-green-500" />
              </div>
              Discount
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-5 gap-1.5">
                {[5, 10, 15, 20].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => { setManualDiscount(pct); setManualDiscountType('percentage'); }}
                    className={cn(
                      "py-2 rounded-lg border-2 text-[9px] font-bold uppercase tracking-widest transition-all",
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
                    "py-2 rounded-lg border-2 text-[9px] font-bold uppercase tracking-widest transition-all",
                    manualDiscount === 0
                      ? "bg-slate-100 border-slate-200 text-slate-600"
                      : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                  )}
                >
                  None
                </button>
              </div>
              <div className="flex bg-slate-50 rounded-lg overflow-hidden">
                <input
                  type="number"
                  min="0"
                  placeholder="Custom discount"
                  onChange={(e) => {
                    setManualDiscount(parseFloat(e.target.value) || 0);
                    setManualDiscountType('fixed');
                  }}
                  className="flex-1 bg-transparent border-none py-2 px-3 text-[11px] font-bold focus:ring-0 outline-none"
                />
                <select
                  value={manualDiscountType}
                  onChange={(e) => setManualDiscountType(e.target.value as any)}
                  className="bg-slate-100 border-none px-3 text-[9px] font-bold uppercase tracking-widest outline-none cursor-pointer"
                >
                  <option value="fixed">{currency}</option>
                  <option value="percentage">%</option>
                </select>
              </div>
            </div>
          </section>

          {/* Tip */}
          <section className="p-2.5 bg-slate-50/50 rounded-lg border border-slate-100">
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-1.5 flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-pink-500/10 flex items-center justify-center">
                <Heart size={10} className="text-pink-500" />
              </div>
              Add a Tip
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-5 gap-1.5">
                {[5, 10, 15, 20].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => { setTipAmount(pct); setTipType('percentage'); setCustomTip(''); }}
                    className={cn(
                      "py-2 rounded-lg border-2 text-[9px] font-bold uppercase tracking-widest transition-all",
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
                    "py-2 rounded-lg border-2 text-[9px] font-bold uppercase tracking-widest transition-all",
                    tipAmount === 0
                      ? "bg-slate-100 border-slate-200 text-slate-600"
                      : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                  )}
                >
                  None
                </button>
              </div>
              <div className="flex bg-slate-50 rounded-lg overflow-hidden">
                <input
                  type="number"
                  min="0"
                  placeholder="Custom tip"
                  value={customTip}
                  onChange={(e) => {
                    setCustomTip(e.target.value);
                    setTipAmount(parseFloat(e.target.value) || 0);
                    setTipType('fixed');
                  }}
                  className="flex-1 bg-transparent border-none py-2 px-3 text-[11px] font-bold focus:ring-0 outline-none"
                />
                <select
                  value={tipType}
                  onChange={(e) => setTipType(e.target.value as any)}
                  className="bg-slate-100 border-none px-3 text-[9px] font-bold uppercase tracking-widest outline-none cursor-pointer"
                >
                  <option value="fixed">{currency}</option>
                  <option value="percentage">%</option>
                </select>
              </div>
            </div>
          </section>

          {/* Payment Method */}
          <section className="p-2.5 bg-slate-50/50 rounded-lg border border-slate-100">
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-1.5 flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-zamzam-teal/10 flex items-center justify-center">
                <CreditCard size={10} className="text-zamzam-teal" />
              </div>
              Payment Method
            </h3>
            <div className={cn(
              "grid gap-4",
              (settings?.branch?.allow_cash_pos !== 0 && settings?.branch?.allow_card_pos !== 0) 
                ? "grid-cols-2" 
                : "grid-cols-1"
            )}>
              {[
                ...(settings?.branch?.allow_cash_pos !== 0 ? [{ id: 'Cash', icon: Banknote }] : []),
                ...(settings?.branch?.allow_card_pos !== 0 ? [{ id: 'Card', icon: CreditCard }] : []),
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border-2 transition-all",
                    paymentMethod === method.id 
                      ? "bg-zamzam-teal/5 border-zamzam-teal text-zamzam-teal" 
                      : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                    paymentMethod === method.id ? "bg-zamzam-teal text-white" : "bg-slate-50 text-slate-400"
                  )}>
                    <method.icon size={16} />
                  </div>
                  <span className="text-sm font-bold uppercase tracking-widest">{method.id}</span>
                  {paymentMethod === method.id && <CheckCircle2 className="ml-auto" size={20} />}
                </button>
              ))}
              {settings?.branch?.allow_cash_pos === 0 && settings?.branch?.allow_card_pos === 0 && (
                <div className="flex items-center gap-2 text-red-500 font-bold text-[10px] uppercase tracking-widest p-3 bg-red-50 rounded-lg border border-red-100 w-full">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  <span>No payment methods enabled for POS. Please enable them in Settings.</span>
                </div>
              )}
            </div>
            {paymentMethod === 'Card' && (
              <div className="mt-3 p-3 bg-white rounded-xl border border-slate-100 space-y-2.5 shadow-inner">
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
                  <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Cardholder Name</label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={cardHolder}
                    onChange={(e) => {
                      setCardHolder(e.target.value);
                      setCardError('');
                    }}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg py-1.5 px-3 text-[11px] font-bold focus:ring-4 focus:ring-zamzam-teal/10 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Card Number</label>
                  <input
                    type="text"
                    required
                    placeholder="0000 0000 0000 0000"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg py-1.5 px-3 text-[11px] font-bold focus:ring-4 focus:ring-zamzam-teal/10 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Expiry Date</label>
                    <input
                      type="text"
                      required
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={handleCardExpiryChange}
                      className="w-full bg-slate-50 border border-slate-100 rounded-lg py-1.5 px-3 text-[11px] font-bold focus:ring-4 focus:ring-zamzam-teal/10 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">CVV</label>
                    <input
                      type="text"
                      required
                      placeholder="123"
                      value={cardCvv}
                      onChange={handleCardCvvChange}
                      className="w-full bg-slate-50 border border-slate-100 rounded-lg py-1.5 px-3 text-[11px] font-bold focus:ring-4 focus:ring-zamzam-teal/10 outline-none"
                    />
                  </div>
                </div>

                {cardError && (
                  <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest mt-1.5">{cardError}</p>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex-1 mr-6">
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mb-1.5">
              <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Subtotal</span>
                <span>{currency} {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Tax</span>
                <span>{currency} {newTaxAmount.toFixed(2)}</span>
              </div>
              {promoDiscount > 0 && (
                <div className="flex justify-between text-[8px] font-bold text-green-600 uppercase tracking-widest">
                  <span>Promo</span>
                  <span>-{currency} {promoDiscount.toFixed(2)}</span>
                </div>
              )}
              {manualDiscountValue > 0 && (
                <div className="flex justify-between text-[8px] font-bold text-green-600 uppercase tracking-widest">
                  <span>Discount</span>
                  <span>-{currency} {manualDiscountValue.toFixed(2)}</span>
                </div>
              )}
              {tipValue > 0 && (
                <div className="flex justify-between text-[8px] font-bold text-pink-500 uppercase tracking-widest">
                  <span>Tip</span>
                  <span>+{currency} {tipValue.toFixed(2)}</span>
                </div>
              )}
            </div>
            <div className="space-y-0">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">Payable Amount</span>
              <div className="text-xl font-bold text-slate-900 tracking-tighter">{currency} {finalTotal.toFixed(2)}</div>
            </div>
          </div>
          <button 
            disabled={isSubmitting || (settings?.branch?.allow_cash_pos === 0 && settings?.branch?.allow_card_pos === 0)}
            onClick={handleConfirm}
            className="bg-zamzam-teal hover:bg-teal-700 disabled:bg-slate-300 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-teal-900/20 flex items-center gap-2 transition-all active:scale-95"
          >
            <span className="uppercase tracking-widest text-[10px]">
              {isSubmitting ? '...' : 'Complete'}
            </span>
            <ChevronRight size={14} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
