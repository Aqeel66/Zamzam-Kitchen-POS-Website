import { 
  CheckCircle2, 
  Printer, 
  X, 
  Share2, 
  MessageSquare,
  Plus,
  Check
} from 'lucide-react';
import { motion } from 'framer-motion';

const cn = (...inputs: (string | undefined | null | false)[]) => inputs.filter(Boolean).join(' ');

export default function PrintSuccessModal({ isOpen, onClose, order }: any) {
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        onClick={onClose} 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" 
      />
      
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        className="relative w-full max-w-4xl bg-white rounded-[3.5rem] shadow-2xl overflow-hidden flex"
      >
        {/* Left Side: Success Message */}
        <div className="flex-1 p-16 flex flex-col items-center justify-center text-center">
          <motion.div 
            initial={{ scale: 0 }} 
            animate={{ scale: 1 }} 
            className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-white mb-8 shadow-xl shadow-green-500/20"
          >
            <Check size={40} strokeWidth={3} />
          </motion.div>
          
          <h2 className="text-4xl font-black text-teal-950 uppercase tracking-tighter mb-4">
            Order <span className="text-zamzam-teal">Confirmed</span>
          </h2>
          <p className="text-sm font-bold text-slate-400 leading-relaxed max-w-xs mb-10">
            Order <span className="text-zamzam-teal">#{order.id}</span> has been sent to the kitchen and recorded successfully.
          </p>

          <div className="w-full space-y-4">
            <button className="w-full bg-zamzam-teal text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-teal-900/20 flex items-center justify-center gap-3 hover:bg-teal-700 transition-all">
              <Printer size={20} />
              Print Thermal Receipt
            </button>
            
            <div className="grid grid-cols-2 gap-4">
              <button className="bg-slate-50 text-teal-950 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-slate-100 transition-all border border-slate-100">
                <Share2 size={16} />
                Digital Share
              </button>
              <button className="bg-slate-50 text-teal-950 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-slate-100 transition-all border border-slate-100">
                <MessageSquare size={16} />
                Send SMS
              </button>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="mt-10 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] hover:text-zamzam-teal transition-colors flex items-center gap-2"
          >
            <Plus size={14} />
            Start New Order
          </button>
        </div>

        {/* Right Side: Receipt Preview */}
        <div className="w-[45%] bg-slate-50 flex items-center justify-center p-12 border-l border-slate-100">
          <div className="bg-white w-full aspect-[3/4] rounded-2xl shadow-xl shadow-slate-200 p-8 flex flex-col text-[9px] font-bold text-slate-600 space-y-4 font-mono">
            <div className="text-center space-y-1">
              <h4 className="text-slate-900 font-black uppercase text-xs">Zamzam Kitchen</h4>
              <p className="text-[7px] uppercase tracking-widest opacity-60">Tax Invoice</p>
            </div>
            
            <div className="flex justify-between border-b border-dashed border-slate-200 pb-2 mt-4">
              <div className="space-y-1">
                <p>Date:</p>
                <p>Type:</p>
              </div>
              <div className="text-right space-y-1 text-slate-900">
                <p>{new Date().toLocaleDateString()}</p>
                <p>{order.order_type}</p>
              </div>
            </div>

            <div className="flex-1 py-4 space-y-2">
              {order.items?.map((item: any) => (
                <div key={item.id} className="flex justify-between">
                  <p className="truncate pr-4">{item.name} x{item.quantity}</p>
                  <p className="text-slate-900">{(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-slate-200 pt-4 flex justify-between items-center">
              <p className="text-xs font-black text-slate-900">TOTAL</p>
              <div className="text-right">
                <p className="text-xs font-black text-teal-950">{(order.total || 0).toFixed(2)}</p>
                <p className="text-[7px] text-slate-400">AED</p>
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="absolute top-8 right-8 p-2 text-slate-300 hover:text-slate-900 transition-colors"
        >
          <X size={24} />
        </button>
      </motion.div>
    </div>
  );
}
