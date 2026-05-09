import { 
  TrendingUp, 
  Users as UsersIcon, 
  ShoppingBag, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight,
  MoreVertical
} from 'lucide-react';
import { motion } from 'framer-motion';

const StatCard = ({ title, value, change, icon: Icon, trend }: any) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm shadow-slate-200/50"
  >
    <div className="flex items-center justify-between mb-4">
      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-zamzam-teal border border-slate-100">
        <Icon size={24} />
      </div>
      <div className={cn(
        "flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black",
        trend === 'up' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
      )}>
        {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        {change}
      </div>
    </div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
    <h3 className="text-2xl font-black text-slate-900">{value}</h3>
  </motion.div>
);

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

export default function Dashboard() {
  const stats = [
    { title: "Total Revenue", value: "$12,450.00", change: "+12.5%", icon: TrendingUp, trend: 'up' },
    { title: "Active Tables", value: "14 / 20", change: "+2", icon: ShoppingBag, trend: 'up' },
    { title: "Total Customers", value: "184", change: "-3.2%", icon: UsersIcon, trend: 'down' },
    { title: "Avg. Service Time", value: "24m 10s", change: "-2m", icon: Clock, trend: 'up' }, // Lower is better
  ];

  return (
    <div className="p-10 max-w-[1600px] mx-auto space-y-10">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <span className="text-[10px] font-black text-zamzam-teal uppercase tracking-[0.4em] mb-2 block">Analytical Overview</span>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Mission <span className="text-zamzam-teal">Control</span></h1>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-slate-200 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-colors">Download Report</button>
          <button className="bg-zamzam-yellow px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-zamzam-teal shadow-lg shadow-yellow-500/20 hover:scale-105 transition-transform">Live View</button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <StatCard key={idx} {...stat} />
        ))}
      </div>

      {/* Middle Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm shadow-slate-200/50 overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Recent Orders</h2>
            <button className="text-zamzam-teal font-black text-xs uppercase tracking-widest hover:underline">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <th className="px-8 py-4">Order ID</th>
                  <th className="px-8 py-4">Table</th>
                  <th className="px-8 py-4">Waiter</th>
                  <th className="px-8 py-4">Status</th>
                  <th className="px-8 py-4">Amount</th>
                  <th className="px-8 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[
                  { id: '#ZK-1204', table: 'T-04', waiter: 'Ahmed R.', status: 'Preparing', amount: '$42.50' },
                  { id: '#ZK-1205', table: 'T-12', waiter: 'Sara K.', status: 'Served', amount: '$128.00' },
                  { id: '#ZK-1206', table: 'TA-02', waiter: 'Hassan M.', status: 'Ready', amount: '$18.90' },
                  { id: '#ZK-1207', table: 'T-09', waiter: 'Ahmed R.', status: 'Ordered', amount: '$65.00' },
                ].map((order, idx) => (
                  <tr key={idx} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-6 text-sm font-black text-slate-900">{order.id}</td>
                    <td className="px-8 py-6 text-sm font-bold text-slate-500">{order.table}</td>
                    <td className="px-8 py-6 text-sm font-bold text-slate-500">{order.waiter}</td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                        order.status === 'Served' ? "bg-green-50 text-green-600" : 
                        order.status === 'Preparing' ? "bg-blue-50 text-blue-600" :
                        order.status === 'Ready' ? "bg-yellow-50 text-yellow-600" : "bg-slate-100 text-slate-600"
                      )}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-sm font-black text-zamzam-teal">{order.amount}</td>
                    <td className="px-8 py-6 text-right">
                      <button className="text-slate-300 hover:text-slate-600 transition-colors">
                        <MoreVertical size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Kitchen Status / Small Utility */}
        <div className="bg-zamzam-teal rounded-[2.5rem] p-8 text-white shadow-2xl shadow-teal-950/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl" />
          <h2 className="text-lg font-black uppercase tracking-tight mb-8">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'New Order', icon: ShoppingBag, color: 'bg-white/10 text-white' },
              { label: 'Kitchen', icon: Clock, color: 'bg-white/10 text-white' },
              { label: 'Expenses', icon: TrendingUp, color: 'bg-white/10 text-white' },
              { label: 'Support', icon: UsersIcon, color: 'bg-white/10 text-white' },
            ].map((action, idx) => (
              <button key={idx} className={cn(
                "flex flex-col items-center justify-center p-6 rounded-3xl transition-all hover:scale-105 active:scale-95 border border-white/5 shadow-lg",
                action.color
              )}>
                <action.icon size={24} className="mb-3" />
                <span className="text-[10px] font-black uppercase tracking-widest">{action.label}</span>
              </button>
            ))}
          </div>
          
          <div className="mt-12 bg-black/20 rounded-[2rem] p-6 border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black text-teal-300/60 uppercase tracking-widest">Kitchen Queue</span>
              <span className="text-xs font-black text-zamzam-yellow">8 ITEMS</span>
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 bg-zamzam-yellow rounded-full" />
                  <div className="h-2 flex-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.random() * 100}%` }}
                      className="h-full bg-teal-400"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
