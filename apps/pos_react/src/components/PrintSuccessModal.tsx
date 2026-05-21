import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  Printer, 
  Plus, 
  Smartphone, 
  Share2,
  Mail,
  MessageSquare,
  X,
  ChevronRight,
  Loader2,
  CheckCheck,
  AlertCircle,
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { ReceiptTemplate } from './ReceiptTemplate';
import { API_BASE_URL } from '../config';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

interface PrintSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  branch: any;
}

type SharePanel = 'none' | 'sms' | 'digital';
type ShareStatus = 'idle' | 'loading' | 'success' | 'error';

export default function PrintSuccessModal({ isOpen, onClose, order, branch }: PrintSuccessModalProps) {
  const componentRef = useRef(null);
  const [sharePanel, setSharePanel] = useState<SharePanel>('none');
  const [digitalMode, setDigitalMode] = useState<'email' | 'whatsapp'>('email');
  const [recipient, setRecipient] = useState('');
  const [shareStatus, setShareStatus] = useState<ShareStatus>('idle');
  const [shareMessage, setShareMessage] = useState('');

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
  });

  const resetSharePanel = () => {
    setSharePanel('none');
    setRecipient('');
    setShareStatus('idle');
    setShareMessage('');
  };

  const handleShare = async (type: 'sms' | 'email' | 'whatsapp') => {
    if (!recipient.trim()) {
      setShareStatus('error');
      setShareMessage('Please enter a recipient.');
      return;
    }

    // Basic phone validation for SMS/WhatsApp
    if ((type === 'sms' || type === 'whatsapp') && !/^\+?[\d\s\-()]{7,15}$/.test(recipient.trim())) {
      setShareStatus('error');
      setShareMessage('Please enter a valid phone number (e.g. +61412345678).');
      return;
    }

    // Basic email validation
    if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.trim())) {
      setShareStatus('error');
      setShareMessage('Please enter a valid email address.');
      return;
    }

    const orderId = order?.id || order?.orderId;
    if (!orderId) {
      setShareStatus('error');
      setShareMessage('Order ID is missing. Cannot share receipt.');
      return;
    }

    setShareStatus('loading');
    setShareMessage('');

    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, recipient: recipient.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShareStatus('success');
        setShareMessage(data.message || 'Sent successfully!');
        setRecipient('');
      } else {
        setShareStatus('error');
        setShareMessage(data.error || 'Failed to send. Check your notification settings.');
      }
    } catch (err) {
      setShareStatus('error');
      setShareMessage('Network error. Please check your connection.');
    }
  };

  const StatusIcon = () => {
    if (shareStatus === 'loading') return <Loader2 size={14} className="animate-spin text-zamzam-teal" />;
    if (shareStatus === 'success') return <CheckCheck size={14} className="text-green-500" />;
    if (shareStatus === 'error') return <AlertCircle size={14} className="text-red-500" />;
    return null;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-10">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            className="relative w-full max-w-4xl bg-white rounded-[3.5rem] shadow-2xl overflow-hidden flex"
          >
            {/* Left Side: Success Message */}
            <div className="flex-1 p-16 flex flex-col items-center justify-center text-center border-r border-slate-100">
              <div className="w-24 h-24 bg-green-50 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner">
                <CheckCircle2 size={48} className="text-green-500" />
              </div>
              <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-4 uppercase">Order <span className="text-zamzam-teal">Confirmed</span></h2>
              <p className="text-slate-400 font-bold mb-10 max-w-xs leading-relaxed">
                Order <span className="text-slate-900 font-bold">
                  #{(order?.orderNumber || order?.order_number || '').toString()}
                </span> has been sent to the kitchen and recorded successfully.
              </p>

              <div className="w-full space-y-4">
                <button 
                  onClick={handlePrint}
                  className="w-full bg-zamzam-teal hover:bg-teal-400 text-white font-bold py-5 rounded-3xl shadow-xl shadow-teal-500/20 flex items-center justify-center gap-4 transition-all active:scale-95 group"
                >
                  <Printer size={22} className="group-hover:rotate-12 transition-transform" />
                  <span className="uppercase tracking-widest text-sm">Print Thermal Receipt</span>
                </button>

                {/* Share Panel */}
                <AnimatePresence mode="wait">
                  {sharePanel === 'none' && (
                    <motion.div
                      key="buttons"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="grid grid-cols-2 gap-4"
                    >
                      <button
                        onClick={() => { setSharePanel('digital'); setDigitalMode('email'); setShareStatus('idle'); setShareMessage(''); }}
                        className="bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all hover:text-zamzam-teal group"
                      >
                        <Share2 size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="uppercase tracking-widest text-[10px]">Digital Share</span>
                      </button>
                      <button
                        onClick={() => { setSharePanel('sms'); setShareStatus('idle'); setShareMessage(''); }}
                        className="bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all hover:text-zamzam-teal group"
                      >
                        <Smartphone size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="uppercase tracking-widest text-[10px]">Send SMS</span>
                      </button>
                    </motion.div>
                  )}

                  {/* SMS Panel */}
                  {sharePanel === 'sms' && (
                    <motion.div
                      key="sms-panel"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-zamzam-teal/10 flex items-center justify-center">
                            <Smartphone size={14} className="text-zamzam-teal" />
                          </div>
                          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Send SMS Receipt</span>
                        </div>
                        <button
                          onClick={resetSharePanel}
                          className="w-6 h-6 rounded-full bg-slate-200 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>

                      <input
                        type="tel"
                        placeholder="+61 412 345 678"
                        value={recipient}
                        onChange={(e) => { setRecipient(e.target.value); setShareStatus('idle'); setShareMessage(''); }}
                        className="w-full bg-white border border-slate-100 rounded-xl py-2.5 px-3.5 text-[11px] font-bold focus:ring-4 focus:ring-zamzam-teal/10 outline-none"
                        onKeyDown={(e) => e.key === 'Enter' && handleShare('sms')}
                      />

                      {shareMessage && (
                        <p className={cn(
                          'text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5',
                          shareStatus === 'success' ? 'text-green-600' : 'text-red-500'
                        )}>
                          <StatusIcon />
                          {shareMessage}
                        </p>
                      )}

                      <button
                        onClick={() => handleShare('sms')}
                        disabled={shareStatus === 'loading' || shareStatus === 'success'}
                        className="w-full bg-zamzam-teal disabled:bg-slate-200 disabled:text-slate-400 hover:bg-teal-500 text-white font-bold py-2.5 rounded-xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                      >
                        {shareStatus === 'loading' ? (
                          <><Loader2 size={12} className="animate-spin" /> Sending...</>
                        ) : shareStatus === 'success' ? (
                          <><CheckCheck size={12} /> Sent!</>
                        ) : (
                          <>Send SMS <ChevronRight size={12} /></>
                        )}
                      </button>
                    </motion.div>
                  )}

                  {/* Digital Share Panel */}
                  {sharePanel === 'digital' && (
                    <motion.div
                      key="digital-panel"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-zamzam-teal/10 flex items-center justify-center">
                            <Share2 size={14} className="text-zamzam-teal" />
                          </div>
                          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Digital Share</span>
                        </div>
                        <button
                          onClick={resetSharePanel}
                          className="w-6 h-6 rounded-full bg-slate-200 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>

                      {/* Mode toggle */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => { setDigitalMode('email'); setRecipient(''); setShareStatus('idle'); setShareMessage(''); }}
                          className={cn(
                            "py-2 rounded-xl border-2 text-[9px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5",
                            digitalMode === 'email'
                              ? "bg-zamzam-teal/10 border-zamzam-teal text-zamzam-teal"
                              : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                          )}
                        >
                          <Mail size={11} /> Email
                        </button>
                        <button
                          onClick={() => { setDigitalMode('whatsapp'); setRecipient(''); setShareStatus('idle'); setShareMessage(''); }}
                          className={cn(
                            "py-2 rounded-xl border-2 text-[9px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5",
                            digitalMode === 'whatsapp'
                              ? "bg-green-50 border-green-500 text-green-600"
                              : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                          )}
                        >
                          <MessageSquare size={11} /> WhatsApp
                        </button>
                      </div>

                      <input
                        type={digitalMode === 'email' ? 'email' : 'tel'}
                        placeholder={digitalMode === 'email' ? 'customer@email.com' : '+61 412 345 678'}
                        value={recipient}
                        onChange={(e) => { setRecipient(e.target.value); setShareStatus('idle'); setShareMessage(''); }}
                        className="w-full bg-white border border-slate-100 rounded-xl py-2.5 px-3.5 text-[11px] font-bold focus:ring-4 focus:ring-zamzam-teal/10 outline-none"
                        onKeyDown={(e) => e.key === 'Enter' && handleShare(digitalMode)}
                      />

                      {shareMessage && (
                        <p className={cn(
                          'text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5',
                          shareStatus === 'success' ? 'text-green-600' : 'text-red-500'
                        )}>
                          <StatusIcon />
                          {shareMessage}
                        </p>
                      )}

                      <button
                        onClick={() => handleShare(digitalMode)}
                        disabled={shareStatus === 'loading' || shareStatus === 'success'}
                        className={cn(
                          "w-full disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-2.5 rounded-xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95",
                          digitalMode === 'whatsapp' ? "bg-green-500 hover:bg-green-600" : "bg-zamzam-teal hover:bg-teal-500"
                        )}
                      >
                        {shareStatus === 'loading' ? (
                          <><Loader2 size={12} className="animate-spin" /> Sending...</>
                        ) : shareStatus === 'success' ? (
                          <><CheckCheck size={12} /> Sent!</>
                        ) : (
                          <>Send via {digitalMode === 'email' ? 'Email' : 'WhatsApp'} <ChevronRight size={12} /></>
                        )}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button 
                onClick={onClose}
                className="mt-12 flex items-center gap-3 text-slate-300 hover:text-zamzam-teal transition-all group"
              >
                <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                <span className="text-xs font-bold uppercase tracking-widest">Start New Order</span>
              </button>
            </div>

            {/* Right Side: Receipt Preview */}
            <div className="w-[420px] bg-slate-50 p-10 flex items-center justify-center">
              <div className="bg-white shadow-2xl p-2 rounded-xl scale-[0.8] origin-center">
                <div className="hidden">
                   <ReceiptTemplate ref={componentRef} order={order} branch={branch} />
                </div>
                {/* Visible Preview for UI */}
                <div className="bg-white p-6 w-[80mm] text-slate-900 font-mono text-[10px] leading-tight shadow-inner">
                  <div className="text-center mb-4">
                    <h3 className="font-bold text-sm uppercase">{branch.restaurant_name || 'Zamzam Kitchen'}</h3>
                    {branch.receipt_header ? (
                      <p className="opacity-50 whitespace-pre-line text-[8px] leading-tight">{branch.receipt_header}</p>
                    ) : (
                      <p className="opacity-50">Tax Invoice</p>
                    )}
                  </div>
                  <div className="border-t border-dashed border-slate-200 my-2" />
                  <div className="space-y-1 opacity-70">
                     <div className="flex justify-between"><span>Date:</span><span>{new Date().toLocaleDateString()}</span></div>
                     <div className="flex justify-between"><span>Type:</span><span>{order.order_type}</span></div>
                  </div>
                  <div className="border-t border-dashed border-slate-200 my-2" />
                  <div className="space-y-2 mb-4">
                    {(order?.items || []).map((i: any, idx: number) => (
                      <div key={idx} className="flex justify-between">
                        <span>{i.name} x{i.quantity}</span>
                        <span>{(i.price * i.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-dashed border-slate-200 pt-2 space-y-1">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{(order.total_amount + (order.discount_amount || 0) - (order.tip_amount || 0)).toFixed(2)}</span>
                    </div>
                    {order.promo_discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Promo</span>
                        <span>-{order.promo_discount.toFixed(2)}</span>
                      </div>
                    )}
                    {order.manual_discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount</span>
                        <span>-{order.manual_discount.toFixed(2)}</span>
                      </div>
                    )}
                    {order.reservation_fee > 0 && (
                      <div className="flex justify-between text-orange-600">
                        <span>Res. Credit</span>
                        <span>-{order.reservation_fee.toFixed(2)}</span>
                      </div>
                    )}
                    {!(order.promo_discount > 0 || order.manual_discount > 0 || order.reservation_fee > 0) && order.discount_amount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount</span>
                        <span>-{order.discount_amount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-500">
                      <span>Tax (10%)</span>
                      <span>{( (order.total_amount + (order.discount_amount || 0) - (order.tip_amount || 0)) * 0.10 ).toFixed(2)}</span>
                    </div>
                    {order.tip_amount > 0 && (
                      <div className="flex justify-between text-slate-500">
                        <span>Tip</span>
                        <span>+{order.tip_amount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-100">
                      <span>TOTAL</span>
                      <span>{branch.currency || 'USD'} {order.total_amount?.toFixed(2) || order.total}</span>
                    </div>
                  </div>
                  <div className="border-t border-dashed border-slate-200 my-4" />
                  <div className="text-center space-y-1">
                    {branch.receipt_footer ? (
                      <p className="font-bold italic text-[8px] whitespace-pre-line">{branch.receipt_footer}</p>
                    ) : (
                      <p className="font-bold italic text-[8px]">Thank You for Visiting!</p>
                    )}
                    {branch.show_qr_on_receipt === 1 && (
                      <div className="mt-2 flex justify-center opacity-30">
                        <div className="w-10 h-10 border border-slate-400 flex items-center justify-center text-[6px]">QR</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
