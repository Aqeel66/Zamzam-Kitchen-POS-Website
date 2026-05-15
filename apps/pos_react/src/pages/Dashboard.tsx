import { 
  TrendingUp, 
  Users as UsersIcon, 
  ShoppingBag, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight,
  MoreVertical,
  Activity,
  Zap,
  DollarSign,
  AlertCircle,
  PieChart,
  BarChart3,
  Calendar,
  LayoutDashboard,
  Bell,
  Utensils,
  ChevronRight,
  Flame,
  Globe,
  Star
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL, resolveImageUrl } from '../config';

const cn = (...inputs: (string | undefined | null | false)[]) => inputs.filter(Boolean).join(' ');

// --- PREMIUM COMPONENTS ---

const KPIBlock = ({ title, value, subValue, icon: Icon, trend, color, currency }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -5, scale: 1.02 }}
    className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group transition-all"
  >
    <div className={cn("absolute top-0 left-0 w-full h-1", color)} />
    <div className="flex items-center justify-between mb-6">
      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:rotate-12", 
        color.includes('teal') ? "bg-zamzam-teal/10 text-zamzam-teal" : 
        color.includes('yellow') ? "bg-zamzam-yellow/10 text-zamzam-yellow" : "bg-slate-100 text-slate-900")}>
        <Icon size={28} strokeWidth={2.5} />
      </div>
      <div className={cn("flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest",
        trend === 'up' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
        {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        {subValue}
      </div>
    </div>
    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{title}</p>
    <h3 className="text-xl font-black text-slate-900 tracking-tight">{value} <span className="text-xs text-slate-400 font-bold">{currency && title.includes('Revenue') ? currency : ''}</span></h3>
  </motion.div>
);

const SalesBar = ({ hour, value, max }: any) => (
  <div className="flex flex-col items-center gap-4 group">
    <div className="flex-1 w-12 bg-slate-50 rounded-2xl relative overflow-hidden flex flex-col justify-end">
      <motion.div 
        initial={{ height: 0 }}
        animate={{ height: `${(value / max) * 100}%` }}
        transition={{ duration: 1.5, ease: "circOut" }}
        className={cn("w-full rounded-2xl transition-all group-hover:brightness-110", 
          value > max * 0.8 ? "bg-zamzam-yellow" : "bg-zamzam-teal")}
      />
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-xs font-black text-slate-900 bg-white/90 backdrop-blur py-1 px-2 rounded-lg shadow-xl">{value}</span>
      </div>
    </div>
    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{hour}</span>
  </div>
);

export default function Dashboard() {
  const [settings, setSettings] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/settings?t=${Date.now()}`);
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      console.error('Dashboard Settings Error:', err);
    }
  };

  useEffect(() => {
    fetchSettings();

    fetch(`${API_BASE_URL}/orders/summary`)
      .then(res => res.json())
      .then(data => setSummary(data))
      .catch(err => console.error('Dashboard Summary Error:', err));

    window.addEventListener('settings-updated', fetchSettings);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      clearInterval(timer);
      window.removeEventListener('settings-updated', fetchSettings);
    };
  }, []);

  const currency = settings?.tenant?.currency || 'USD';

  const heroBg = settings?.tenant?.hero_background_url 
    ? resolveImageUrl(settings?.tenant?.hero_background_url)
    : 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1974&q=80';

  return (
    <div className="p-6 max-w-[1650px] mx-auto space-y-8 bg-slate-50/50 min-h-screen">
      
      {/* --- TOP HUD --- */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-slate-900 rounded-[2rem] flex items-center justify-center text-zamzam-yellow shadow-2xl shadow-slate-900/20">
            <LayoutDashboard size={32} />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase leading-none mb-2">Operations <span className="text-zamzam-teal">Pulse</span></h1>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm">
                <Clock size={14} className="text-zamzam-teal" /> {currentTime.toLocaleTimeString()}
              </span>
              <span className="flex items-center gap-2 text-xs font-black text-green-600 uppercase tracking-widest bg-green-50 px-3 py-1.5 rounded-xl border border-green-100">
                <Activity size={14} /> Server Active
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right mr-4">
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Kitchen Load</p>
            <p className="text-xs font-black text-zamzam-yellow bg-slate-900 px-4 py-2 rounded-xl flex items-center gap-2">
              <Flame size={14} className="text-orange-400" /> PEAK CAPACITY
            </p>
          </div>
          <button className="w-14 h-14 bg-white border border-slate-100 rounded-[1.5rem] flex items-center justify-center text-slate-400 hover:text-slate-900 hover:shadow-xl transition-all relative">
            <Bell size={24} />
            <div className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full border-4 border-white" />
          </button>
        </div>
      </header>

      {/* --- HERO --- */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative h-[240px] rounded-[2rem] overflow-hidden shadow-[0_20px_40px_rgba(15,23,42,0.1)] group"
      >
        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105" style={{ backgroundImage: `url(${heroBg})` }} />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent" />
        
        <div className="relative h-full flex flex-col justify-center px-16 max-w-3xl">
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            <span className="px-5 py-2 bg-zamzam-yellow/20 backdrop-blur-md text-zamzam-yellow text-xs font-black uppercase tracking-[0.4em] rounded-full mb-6 inline-block border border-zamzam-yellow/30">Master Terminal v1.5</span>
            <h1 className="text-2xl font-black text-white tracking-tighter leading-[0.9] mb-4 uppercase">
              {settings?.tenant?.restaurant_name || 'Zamzam'} <br />
              <span className="text-zamzam-teal">Global Command</span>
            </h1>
            <p className="text-white/50 text-sm font-medium uppercase tracking-[0.1em] leading-relaxed max-w-lg mb-8">
              {settings?.tenant?.tagline || 'Orchestrating culinary excellence across every terminal and table.'}
            </p>
            <div className="flex gap-4">
              <button className="bg-zamzam-teal text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-teal-500/40 hover:bg-teal-400 transition-all flex items-center gap-3 active:scale-95">
                <Globe size={18} /> Global Sync
              </button>
              <button className="bg-white/10 backdrop-blur-lg border border-white/20 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/20 transition-all flex items-center gap-3">
                <Calendar size={18} /> Daily Report
              </button>
            </div>
          </motion.div>
        </div>

        <div className="absolute bottom-10 right-16 flex gap-10">
          <div className="text-right">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-2">Web Orders</p>
            <p className="text-xl font-black text-white">42 <span className="text-xs text-zamzam-teal">+8</span></p>
          </div>
          <div className="text-right">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-2">POS Terminal</p>
            <p className="text-xl font-black text-white">128 <span className="text-xs text-zamzam-yellow">+12</span></p>
          </div>
        </div>
      </motion.div>

      {/* --- STATS RIBBON --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <KPIBlock 
          title="Gross Revenue" 
          value={parseFloat(summary?.today?.total || 0).toFixed(2)} 
          currency={currency} 
          subValue="+14.2%" 
          icon={DollarSign} 
          trend="up" 
          color="bg-zamzam-teal" 
        />
        <KPIBlock 
          title="Open Tickets" 
          value={`${summary?.live?.active || 0} Orders`} 
          subValue="Live Queue" 
          icon={ShoppingBag} 
          trend="up" 
          color="bg-zamzam-yellow" 
        />
        <KPIBlock title="Food Cost Avg" value="28.4%" subValue="-2.1%" icon={PieChart} trend="up" color="bg-zamzam-teal" />
        <KPIBlock title="Total Covers" value={`${summary?.live?.active || 0} People`} subValue="+84 Today" icon={UsersIcon} trend="up" color="bg-slate-900" />
      </div>

      {/* --- ANALYTICS HUB --- */}
      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-8 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/30 flex flex-col">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">Sales Velocity</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Hourly Performance Traffic</p>
            </div>
            <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
               {['Hourly', 'Daily', 'Monthly'].map(tab => (
                 <button key={tab} className={cn("px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all", tab === 'Hourly' ? "bg-white text-slate-900 shadow-lg" : "text-slate-400 hover:text-slate-600")}>{tab}</button>
               ))}
            </div>
          </div>
          <div className="flex-1 min-h-[350px] flex items-stretch gap-8 px-6">
            {[
              { h: '11AM', v: 45 }, { h: '12PM', v: 85 }, { h: '01PM', v: 120 }, { h: '02PM', v: 95 },
              { h: '03PM', v: 40 }, { h: '04PM', v: 35 }, { h: '05PM', v: 60 }, { h: '06PM', v: 90 },
              { h: '07PM', v: 145 }, { h: '08PM', v: 160 }, { h: '09PM', v: 130 }, { h: '10PM', v: 80 }
            ].map((d, i) => (
              <SalesBar key={i} hour={d.h} value={d.v} max={160} />
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
           <div className="bg-slate-900 p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden flex-1 flex flex-col">
              <div className="absolute top-0 right-0 w-40 h-40 bg-zamzam-teal/20 rounded-full -mr-20 -mt-20 blur-3xl" />
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-base font-black uppercase tracking-tight">Order Feed</h2>
                <span className="px-3 py-1 bg-zamzam-teal rounded-lg text-[9px] font-black uppercase animate-pulse">LIVE STREAM</span>
              </div>
              <div className="space-y-4 flex-1">
                 {[
                   { id: '#1204', table: 'T-04', time: '4m ago', status: 'Cooking' },
                   { id: '#1205', table: 'TA-02', time: '12m ago', status: 'Served' },
                   { id: '#1206', table: 'T-12', time: '1m ago', status: 'New' },
                   { id: '#1207', table: 'T-09', time: '8m ago', status: 'Ready' },
                 ].map((order, i) => (
                   <div key={i} className="flex items-center justify-between bg-white/5 p-5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all cursor-pointer group">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white font-black text-xs">{order.id.slice(1)}</div>
                         <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-zamzam-yellow">{order.table}</p>
                            <p className="text-[9px] font-bold text-white/40 uppercase">{order.time}</p>
                         </div>
                      </div>
                      <div className={cn("px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest", 
                        order.status === 'Served' ? "bg-green-500/20 text-green-400" :
                        order.status === 'Cooking' ? "bg-blue-500/20 text-blue-400" :
                        order.status === 'Ready' ? "bg-zamzam-yellow/20 text-zamzam-yellow" : "bg-white/20 text-white")}>
                        {order.status}
                      </div>
                   </div>
                 ))}
              </div>
              <button className="mt-8 w-full bg-zamzam-yellow text-slate-900 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-yellow-500/20">
                 Launch Kitchen Monitor
              </button>
           </div>
           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-lg flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shadow-inner"><AlertCircle size={24} /></div>
                 <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Inventory Alert</p>
                    <p className="text-sm font-black text-slate-900 uppercase">3 Items Sold Out</p>
                 </div>
              </div>
              <ChevronRight className="text-slate-300" />
           </div>
        </div>
      </div>

      {/* --- TRENDING HUB --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
         <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/30 flex flex-col">
            <div className="flex items-center gap-4 mb-6">
               <div className="w-12 h-12 bg-zamzam-teal rounded-2xl flex items-center justify-center text-white"><Star size={24} strokeWidth={2.5} /></div>
               <div><h3 className="text-base font-black text-slate-900 uppercase">Best Sellers</h3><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Popular Today</p></div>
            </div>
            <div className="space-y-4">
               {[
                 { name: 'Chicken Biryani', count: 124, trend: 'up' },
                 { name: 'Lamb Mansaf', count: 98, trend: 'up' },
                 { name: 'Mixed Grill', count: 85, trend: 'down' },
               ].map((item, i) => (
                 <div key={i} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{item.name}</span>
                    <div className="flex items-center gap-3">
                       <span className="text-xs font-black text-zamzam-teal">{item.count}</span>
                       {item.trend === 'up' ? <TrendingUp size={14} className="text-green-500" /> : <TrendingUp size={14} className="text-red-500 rotate-180" />}
                    </div>
                 </div>
               ))}
            </div>
         </div>
         <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/30">
            <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white"><BarChart3 size={24} /></div>
                   <div><h3 className="text-base font-black text-slate-900 uppercase">Profit Analysis</h3><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Recipe Margin Review</p></div>
               </div>
               <button className="text-xs font-black text-zamzam-teal uppercase tracking-widest hover:underline">Full Analytics</button>
            </div>
            <div className="grid grid-cols-2 gap-8 mt-10">
               <div className="p-8 bg-slate-50 rounded-[2rem] flex flex-col justify-center items-center text-center">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Target Food Cost %</p>
                   <p className="text-xl font-black text-zamzam-teal">32%</p>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full mt-6 overflow-hidden">
                     <div className="w-[85%] h-full bg-zamzam-teal rounded-full shadow-lg shadow-teal-500/20" />
                  </div>
               </div>
               <div className="p-8 bg-slate-900 rounded-[2rem] flex flex-col justify-center items-center text-center text-white">
                  <p className="text-xs font-black text-white/40 uppercase tracking-widest mb-2">Net Margin Today</p>
                   <p className="text-xl font-black text-zamzam-yellow">41.8%</p>
                  <p className="text-xs font-black text-green-400 uppercase tracking-widest mt-6">+2.5% vs Yesterday</p>
               </div>
            </div>
         </div>
       </div>
    </div>
  );
}
