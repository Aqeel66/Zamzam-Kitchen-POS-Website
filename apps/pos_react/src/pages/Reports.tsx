import { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight,
  Download
} from 'lucide-react';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '../config';

const COLORS = ['#006064', '#FFB300', '#0097A7', '#FFC107', '#00BCD4'];

const StatCard = ({ title, value, change, icon: Icon, trend }: any) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm shadow-slate-200/50"
  >
    <div className="flex items-center justify-between mb-6">
      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-zamzam-teal border border-slate-100 shadow-inner">
        <Icon size={28} />
      </div>
      <div className={cn(
        "flex items-center gap-1 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest",
        trend === 'up' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
      )}>
        {trend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
        {change}
      </div>
    </div>
    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{title}</p>
    <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{value}</h3>
  </motion.div>
);

export default function Reports() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/orders/summary`)
      .then(res => res.json())
      .then(json => {
        setData(json);
        setIsLoading(false);
      })
      .catch(err => console.error('Error fetching summary:', err));
  }, []);

  if (isLoading || !data) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-100 border-t-zamzam-teal rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-10 max-w-[1600px] mx-auto space-y-10 bg-bg-main min-h-full">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <span className="text-[10px] font-black text-zamzam-teal uppercase tracking-[0.4em] mb-2 block">Financial Analytics</span>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Performance <span className="text-zamzam-teal">Hub</span></h1>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-slate-200 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-colors flex items-center gap-2">
            <Calendar size={16} />
            Last 30 Days
          </button>
          <button className="bg-zamzam-teal text-white px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-teal-900/20 hover:scale-105 transition-transform flex items-center gap-2">
            <Download size={16} />
            Export Data
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard title="Total Revenue" value={`$${data.today.total.toLocaleString()}`} change="+14.2%" icon={DollarSign} trend="up" />
        <StatCard title="Total Orders" value={data.today.count} change="+8.1%" icon={ShoppingBag} trend="up" />
        <StatCard title="Average Bill" value={`$${(data.today.total / (data.today.count || 1)).toFixed(2)}`} change="-2.4%" icon={TrendingUp} trend="down" />
        <StatCard title="Tips Collected" value={`$${data.today.tips.toFixed(2)}`} change="+22.5%" icon={Users} trend="up" />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Sales Performance Area Chart */}
        <div className="xl:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Revenue Trends</h2>
            <div className="flex gap-2">
              <span className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <div className="w-3 h-3 rounded-full bg-zamzam-teal" />
                Current Period
              </span>
            </div>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trends}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#006064" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#006064" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', padding: '1rem' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 900, color: '#006064' }}
                  labelStyle={{ fontSize: '10px', fontWeight: 900, color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#006064" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorTotal)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Types Distribution */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col">
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-8">Channel Mix</h2>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.types}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="order_type"
                  >
                    {data.types.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full mt-8">
              {data.types.map((type: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <div>
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{type.order_type || 'Unknown'}</p>
                    <p className="text-[10px] font-bold text-slate-400">{type.count} Orders</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Selling Items */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Signature Favorites</h2>
            <Utensils size={20} className="text-slate-200" />
          </div>
          <div className="space-y-6">
            {data.topItems.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center gap-4 group">
                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center font-black text-slate-400 group-hover:bg-zamzam-teal/5 group-hover:text-zamzam-teal transition-colors">
                  #{idx + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{item.name}</p>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.sold / data.topItems[0].sold) * 100}%` }}
                      className="h-full bg-zamzam-teal"
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">{item.sold}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sold</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Payment Insights</h2>
            <CreditCard size={20} className="text-slate-200" />
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.payments}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="payment_method" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} 
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}
                />
                <Bar 
                  dataKey="total" 
                  fill="#FFB300" 
                  radius={[8, 8, 0, 0]} 
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

const Utensils = ({ size, className }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
    <path d="M7 2v20" />
    <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
  </svg>
);

const CreditCard = ({ size, className }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <line x1="2" x2="22" y1="10" y2="10" />
  </svg>
);

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');
