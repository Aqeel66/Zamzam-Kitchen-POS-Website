import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Keyboard, X } from 'lucide-react';

interface ClockTimePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (time: string) => void;
  initialTime?: string;
}

export default function ClockTimePicker({ isOpen, onClose, onSelect, initialTime = "12:00" }: ClockTimePickerProps) {
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<'AM' | 'PM'>('PM');
  const [mode, setMode] = useState<'hour' | 'minute'>('hour');

  useEffect(() => {
    if (initialTime) {
      const [hStr, mStr] = initialTime.split(':');
      let h = parseInt(hStr);
      const m = parseInt(mStr);
      const p = h >= 12 ? 'PM' : 'AM';
      
      if (h > 12) h -= 12;
      if (h === 0) h = 12;
      
      setHour(h);
      setMinute(m);
      setPeriod(p);
    }
  }, [initialTime, isOpen]);

  const handleConfirm = () => {
    let finalHour = hour;
    if (period === 'PM' && hour < 12) finalHour += 12;
    if (period === 'AM' && hour === 12) finalHour = 0;
    
    const timeString = `${finalHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    onSelect(timeString);
    onClose();
  };

  const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const getRotation = () => {
    if (mode === 'hour') {
      return (hour % 12) * 30;
    } else {
      return (minute / 5) * 30;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-8">
              <h3 className="text-slate-400 text-sm font-bold mb-8 uppercase tracking-widest px-2">Select time</h3>
              
              <div className="flex items-start justify-between mb-10 px-2">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setMode('hour')}
                    className={`text-6xl font-bold rounded-2xl px-6 py-4 transition-all ${mode === 'hour' ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/30' : 'bg-slate-50 text-slate-900'}`}
                  >
                    {hour}
                  </button>
                  <span className="text-5xl font-bold text-slate-900 mt-2">:</span>
                  <button 
                    onClick={() => setMode('minute')}
                    className={`text-6xl font-bold rounded-2xl px-6 py-4 transition-all ${mode === 'minute' ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/30' : 'bg-slate-50 text-slate-900'}`}
                  >
                    {minute.toString().padStart(2, '0')}
                  </button>
                </div>

                <div className="flex flex-col bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 mt-2">
                  <button 
                    onClick={() => setPeriod('AM')}
                    className={`px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all ${period === 'AM' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    AM
                  </button>
                  <button 
                    onClick={() => setPeriod('PM')}
                    className={`px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all border-t border-slate-100 ${period === 'PM' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    PM
                  </button>
                </div>
              </div>

              <div className="relative aspect-square flex items-center justify-center mb-8">
                <div className="absolute inset-0 bg-slate-50 rounded-full scale-90 border-4 border-white shadow-inner" />
                
                {/* Clock Face */}
                <div className="relative w-full h-full">
                  {(mode === 'hour' ? hours : minutes).map((val, i) => {
                    const angle = (i * 30) - 90;
                    const radius = 110;
                    const x = Math.cos(angle * (Math.PI / 180)) * radius;
                    const y = Math.sin(angle * (Math.PI / 180)) * radius;
                    
                    const isSelected = mode === 'hour' ? hour === val : minute === val;

                    return (
                      <button
                        key={val}
                        onClick={() => {
                          if (mode === 'hour') {
                            setHour(val);
                            setMode('minute');
                          } else {
                            setMinute(val);
                          }
                        }}
                        style={{ transform: `translate(${x}px, ${y}px)` }}
                        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${isSelected ? 'bg-orange-500 text-white scale-125 z-10' : 'text-slate-400 hover:text-slate-900'}`}
                      >
                        {mode === 'minute' ? val.toString().padStart(2, '0') : val}
                      </button>
                    );
                  })}

                  {/* Clock Hand */}
                  <div 
                    className="absolute left-1/2 top-1/2 w-1 h-24 bg-orange-500 origin-bottom rounded-full -translate-x-1/2 -translate-y-full transition-transform duration-300 ease-out pointer-events-none"
                    style={{ transform: `translateX(-50%) translateY(-100%) rotate(${getRotation()}deg)` }}
                  >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-orange-500 rounded-full" />
                  </div>
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-orange-500 rounded-full" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button className="p-4 text-slate-300 hover:text-orange-500 transition-colors">
                  <Keyboard size={24} />
                </button>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={onClose}
                    className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleConfirm}
                    className="px-8 py-4 bg-orange-500 text-white text-xs font-bold uppercase tracking-widest rounded-2xl shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-all active:scale-[0.98]"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
