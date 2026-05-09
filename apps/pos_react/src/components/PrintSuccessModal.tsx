import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  Printer, 
  Plus, 
  Smartphone, 
  Share2
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { ReceiptTemplate } from './ReceiptTemplate';

interface PrintSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  branch: any;
}

export default function PrintSuccessModal({ isOpen, onClose, order, branch }: PrintSuccessModalProps) {
  const componentRef = useRef(null);
  
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
  });

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
              <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4 uppercase">Order <span className="text-zamzam-teal">Confirmed</span></h2>
              <p className="text-slate-400 font-bold mb-10 max-w-xs leading-relaxed">
                Order <span className="text-slate-900 font-black">#{order?.id}</span> has been sent to the kitchen and recorded successfully.
              </p>

              <div className="w-full space-y-4">
                <button 
                  onClick={handlePrint}
                  className="w-full bg-zamzam-teal hover:bg-teal-400 text-white font-black py-5 rounded-3xl shadow-xl shadow-teal-500/20 flex items-center justify-center gap-4 transition-all active:scale-95 group"
                >
                  <Printer size={22} className="group-hover:rotate-12 transition-transform" />
                  <span className="uppercase tracking-widest text-sm">Print Thermal Receipt</span>
                </button>
                <div className="grid grid-cols-2 gap-4">
                  <button className="bg-slate-50 hover:bg-slate-100 text-slate-600 font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all">
                    <Share2 size={18} />
                    <span className="uppercase tracking-widest text-[10px]">Digital Share</span>
                  </button>
                  <button className="bg-slate-50 hover:bg-slate-100 text-slate-600 font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all">
                    <Smartphone size={18} />
                    <span className="uppercase tracking-widest text-[10px]">Send SMS</span>
                  </button>
                </div>
              </div>

              <button 
                onClick={onClose}
                className="mt-12 flex items-center gap-3 text-slate-300 hover:text-zamzam-teal transition-all group"
              >
                <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                <span className="text-xs font-black uppercase tracking-widest">Start New Order</span>
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
                    <h3 className="font-black text-sm uppercase">{branch.restaurant_name || 'Zamzam Kitchen'}</h3>
                    <p className="opacity-50">Tax Invoice</p>
                  </div>
                  <div className="border-t border-dashed border-slate-200 my-2" />
                  <div className="space-y-1 opacity-70">
                     <div className="flex justify-between"><span>Date:</span><span>{new Date().toLocaleDateString()}</span></div>
                     <div className="flex justify-between"><span>Type:</span><span>{order.order_type}</span></div>
                  </div>
                  <div className="border-t border-dashed border-slate-200 my-2" />
                  <div className="space-y-2 mb-4">
                    {order.items.map((i: any, idx: number) => (
                      <div key={idx} className="flex justify-between">
                        <span>{i.name} x{i.quantity}</span>
                        <span>{(i.price * i.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-dashed border-slate-200 pt-2 flex justify-between font-black text-base">
                    <span>TOTAL</span>
                    <span>AED {order.total}</span>
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
