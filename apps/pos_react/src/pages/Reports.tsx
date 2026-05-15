import { useState, useEffect, useRef } from 'react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area
} from 'recharts';
import { 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Users, 
  Download,
  Star,
  Activity,
  History,
  AlertCircle,
  FileText,
  BarChart3,
  Search,
  Printer,
  RotateCw,
  AlertTriangle,
  ChevronDown,
  Building,
  Layout,
  Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';

const COLORS = ['#0D9488', '#FFB300', '#6366F1', '#EC4899', '#8B5CF6', '#F59E0B'];

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

const ReportKPI = ({ title, value, icon: Icon, color, currency }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 group hover:shadow-md transition-all"
  >
    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner transition-transform group-hover:rotate-6", 
      color.includes('teal') ? "bg-teal-50 text-zamzam-teal border-teal-100" : 
      color.includes('amber') ? "bg-amber-50 text-amber-600 border-amber-100" :
      color.includes('orange') ? "bg-orange-50 text-orange-600 border-orange-100" :
      color.includes('red') ? "bg-red-50 text-red-600 border-red-100" :
      color.includes('indigo') ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
      "bg-slate-50 text-slate-900 border-slate-100")}>
      <Icon size={20} />
    </div>
    <div className="text-left">
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{title}</p>
      <div className="flex items-baseline gap-1">
        {currency && <span className="text-xs font-black text-slate-900 opacity-30">{currency}</span>}
        <span className="text-xl font-black text-slate-900 tracking-tight">{value}</span>
      </div>
    </div>
  </motion.div>
);

const CustomTooltip = ({ active, payload, currency }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-xl">
        <p className="text-xs font-black uppercase tracking-widest text-white/50 mb-1">{payload[0].payload.hour}:00</p>
        <p className="text-sm font-black">{currency} {parseFloat(payload[0].value).toFixed(2)}</p>
      </div>
    );
  }
  return null;
};

const ChannelMetric = ({ label, value, color }: any) => (
  <div className="space-y-2">
    <div className="flex justify-between items-end">
      <span className="text-xs font-black text-white/50 uppercase tracking-widest">{label}</span>
      <span className="text-sm font-black text-white">{value}%</span>
    </div>
    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        className={cn("h-full rounded-full", color)}
      />
    </div>
  </div>
);

export default function Reports() {
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currency, setCurrency] = useState('USD');
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [isReportSelectorOpen, setIsReportSelectorOpen] = useState(false);
  const [transactionType, setTransactionType] = useState('INCOME');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [orderTypeFilter, setOrderTypeFilter] = useState('ORDER TYPE');
  const [originFilter, setOriginFilter] = useState('ORIGINS');
  const [categoryFilter, setCategoryFilter] = useState('CATEGORIES');
  const [productFilter, setProductFilter] = useState('ITEMS');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [staffFilter, setStaffFilter] = useState('STAFF');
  const [statusFilter, setStatusFilter] = useState('STATUS');
  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setIsLoading(true);
        
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        // 1. Fetch all resources in parallel
        const responses = await Promise.allSettled([
          fetch(`${API_BASE_URL}/reports/financial?${params.toString()}`),
          fetch(`${API_BASE_URL}/reports/operational?${params.toString()}`),
          fetch(`${API_BASE_URL}/inventory?${params.toString()}`),
          fetch(`${API_BASE_URL}/settings?t=${Date.now()}`),
          fetch(`${API_BASE_URL}/menu`),
          fetch(`${API_BASE_URL}/orders/staff-stats`),
          fetch(`${API_BASE_URL}/orders?limit=100`),
          fetch(`${API_BASE_URL}/purchases/suppliers`),
          fetch(`${API_BASE_URL}/purchases`),
          fetch(`${API_BASE_URL}/inventory/transactions?limit=20`)
        ]);

        // 2. Safely parse results
        const getData = async (index: number) => {
          const res = responses[index];
          if (res.status === 'fulfilled' && res.value.ok) {
            try { return await res.value.json(); } catch { return null; }
          }
          return null;
        };

        const financial = await getData(0);
        const operational = await getData(1);
        const inv = await getData(2);
        const settings = await getData(3);
        const menu = await getData(4);
        const staff = await getData(5);
        const transactions = await getData(6);
        const suppliers = await getData(7);
        const purchases = await getData(8);
        const invHistory = await getData(9);

        if (settings?.tenant?.currency) setCurrency(settings.tenant.currency);

        // 3. Construct state with absolute null safety
        setData({
          summary: financial?.summary || { recent_orders: [], live: { velocity: [] } },
          menu: menu || [],
          financials: {
            revenue: financial?.summary?.net_sales || 0,
            gross_sales: financial?.summary?.gross_sales || 0,
            discounts: financial?.summary?.total_discounts || 0,
            cogs: financial?.cogs || 0,
            expenses: financial?.expenses || 0,
            profit: financial?.net_profit || 0,
            payments: financial?.payments || []
          },
          inventory: {
            items: inv || [],
            total_value: (inv || []).reduce((acc: any, curr: any) => acc + ((parseFloat(curr.quantity) || 0) * (parseFloat(curr.cost_per_unit) || 0)), 0),
            low_stock_items: (inv || []).filter((i: any) => (parseFloat(i.quantity) || 0) <= (parseFloat(i.low_stock_threshold) || 10)),
            suppliers: suppliers || [],
            purchases: purchases || [],
            history: invHistory || []
          },
          staff: {
            stats: staff || []
          },
          operational: operational || { sales_by_origin: [], popular_items: [], hourly_trends: [] },
          transactions: {
            list: transactions || []
          }
        });
        
        // Ensure summary.live exists
        setData((prev: any) => ({
          ...prev,
          summary: {
            ...prev.summary,
            live: prev.summary.live || { velocity: [] }
          }
        }));

      } catch (err) {
        console.error('Fatal synchronization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [startDate, endDate]); // Re-fetch when date range changes

  const [isExportOpen, setIsExportOpen] = useState(false);

  const exportToCSV = () => {
    if (filteredOrders.length === 0) return;
    
    const headers = ['Order ID', 'Date', 'Items', 'Type', 'Total', 'Status'];
    const rows = filteredOrders.map((o: any) => [
      `#${o.order_number || o.id}`,
      o.created_at || o.createdAt,
      o.items?.map((i: any) => `${i.quantity}x ${i.name}`).join('; '),
      o.order_type,
      o.total_amount,
      o.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r: any[]) => r.map((c: any) => `"${c}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    window.print();
  };

  if (isLoading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="w-16 h-16 border-4 border-zamzam-teal border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Initializing Financial Core...</p>
      </div>
    );
  }

  const filteredOrders = (data?.transactions?.list || []).filter((order: any) => {
    // 0. Date Filter
    if (startDate || endDate) {
      const orderTime = order.order_time || order.created_at || order.createdAt;
      if (!orderTime) return false;
      
      const orderDate = new Date(orderTime);
      if (isNaN(orderDate.getTime())) return false;

      if (startDate && orderDate < new Date(startDate)) return false;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (orderDate > end) return false;
      }
    }

    // 1. Search term
    const orderNo = (order.order_number || order.id || '').toString().toLowerCase();
    if (searchTerm && !orderNo.includes(searchTerm.toLowerCase())) return false;

    // 1. Transaction Type Filter (Only for Financials)
    if (activeTab === 'financials' && transactionType === 'EXPENSE') return false;

    // 1.5 Order Type Filter (Only for Transactions)
    if (activeTab === 'transactions' && orderTypeFilter !== 'ORDER TYPE') {
       if ((order.order_type || 'DINE-IN').toUpperCase() !== orderTypeFilter) return false;
    }

    // 2. Payment Filter
    if (paymentFilter !== 'ALL' && paymentFilter !== 'PAYMENTS') {
      const isOnline = !['CASH', 'MONEY'].includes((order.payment_method || '').toUpperCase());
      if (paymentFilter === 'CASH' && isOnline) return false;
      if (paymentFilter === 'ONLINE' && !isOnline) return false;
      if (paymentFilter === 'CARD' && (order.payment_method || '').toUpperCase() !== 'CARD') return false;
    }

    // 3. Origin Filter
    if (originFilter !== 'ORIGINS') {
      const orderOrigin = (order.origin || '').toUpperCase();
      if (originFilter === 'COUNTER/DINE-IN' && !['COUNTER', 'DINE-IN', 'IN-STORE'].includes(orderOrigin)) return false;
      if (originFilter === 'TAKEAWAY/PICKUP' && !['TAKEAWAY', 'PICKUP'].includes(orderOrigin)) return false;
      if (originFilter === 'WEBSITE' && orderOrigin !== 'WEBSITE') return false;
      if (originFilter === 'QR MENU' && orderOrigin !== 'QR MENU') return false;
    }

    // 4. Category Filter
    if (categoryFilter !== 'CATEGORIES' && categoryFilter !== 'ALL CATEGORIES') {
      const hasCategory = order.items?.some((item: any) => {
         const menuCategory = (data?.menu || []).find((c: any) => (c.name || '').toUpperCase() === categoryFilter);
         return menuCategory?.items?.some((mi: any) => mi.id === item.product_id);
      });
      if (!hasCategory) return false;
    }

    // 5. Product/Item Filter
    if (productFilter !== 'ITEMS' && productFilter !== 'ALL ITEMS') {
      const hasProduct = order.items?.some((item: any) => (item.name || '').toUpperCase() === productFilter);
      if (!hasProduct) return false;
    }

    // 6. Staff Filter
    if (staffFilter !== 'STAFF') {
      if (order.user_id?.toString() !== staffFilter && order.waiter_id?.toString() !== staffFilter) return false;
    }

    // 7. Status Filter
    if (statusFilter !== 'STATUS') {
      if ((order.status || 'PAID').toUpperCase() !== statusFilter) return false;
    }

    return true;
  });

  const reportRevenue = filteredOrders.reduce((acc: number, t: any) => acc + (parseFloat(t.total_amount) || 0), 0);
  // Unused metrics removed to satisfy build constraints

  const allItems = (data?.menu || []).reduce((acc: any[], cat: any) => [...acc, ...(cat?.items || [])], []) || [];
  const uniqueItems = Array.from(new Map(
    allItems
      .filter((item: any) => item && (item.name || item.title) && (item.id || item._id))
      .map((item: any) => [(item.name || item.title).toUpperCase(), item])
  ).values());

  if (!data) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-100 flex flex-col items-center text-center max-w-md">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mb-8">
            <AlertCircle size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-4">Analytics Unavailable</h2>
          <p className="text-sm font-bold text-slate-400 mb-8 leading-relaxed">We encountered a synchronization error while fetching the reporting suite. Please try again or check your server connection.</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-zamzam-teal text-white py-5 rounded-[2rem] text-xs font-black uppercase tracking-widest hover:bg-teal-700 transition-all shadow-xl shadow-teal-900/20 active:scale-95"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50/30 min-h-screen pb-20">
      
      {/* --- DASHBOARD HEADER & NAV --- */}
      <div className="bg-white border-b border-slate-100 px-10 py-6">
        <div className="flex flex-wrap items-center justify-between gap-6 max-w-[1600px] mx-auto">
          <div className="flex items-center gap-6">
             <div className="flex flex-col">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">REPORTS</h1>
                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] mt-2">Operational Intelligence Hub</p>
             </div>

             <div className="h-10 w-px bg-slate-100" />

             {/* --- REPORT SELECTOR DROPDOWN --- */}
             <div className="relative group">
                <button 
                  onClick={() => setIsReportSelectorOpen(!isReportSelectorOpen)}
                  className="bg-[#0F172A] px-5 py-3 rounded-2xl flex items-center gap-3 text-xs font-black text-white uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-black transition-all"
                >
                   <Activity size={16} className="text-teal-400" />
                   {activeTab === 'overview' ? 'DASHBOARD SUMMARY' : 
                    activeTab === 'financials' ? 'FINANCIAL REPORT' :
                    activeTab === 'transactions' ? 'TRANSACTION LEDGER' :
                    activeTab === 'inventory' ? 'INVENTORY REPORT' : 'STAFF PERFORMANCE'}
                   <ChevronDown size={14} className={cn("transition-transform", isReportSelectorOpen ? "rotate-180" : "")} />
                </button>

                {isReportSelectorOpen && (
                   <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
                      <div className="p-2 space-y-1">
                         {[
                            { id: 'overview', label: 'Dashboard Summary', icon: Layout, desc: 'Global operational overview' },
                            { id: 'financials', label: 'Financial Report', icon: DollarSign, desc: 'Revenue, profit & expense breakdown' },
                            { id: 'transactions', label: 'Transaction Ledger', icon: History, desc: 'Detailed order & payment history' },
                            { id: 'inventory', label: 'Inventory Report', icon: Package, desc: 'Stock health & valuation' },
                            { id: 'staff', label: 'Staff Performance', icon: Users, desc: 'Efficiency & sales by waiter' }
                         ].map((tab) => (
                            <button
                               key={tab.id}
                               onClick={() => { setActiveTab(tab.id); setIsReportSelectorOpen(false); }}
                               className={cn(
                                 "w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all text-left",
                                 activeTab === tab.id ? "bg-slate-50 border border-slate-100" : "hover:bg-slate-50/50 border border-transparent"
                               )}
                            >
                               <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", activeTab === tab.id ? "bg-white text-[#0F172A] shadow-sm" : "bg-slate-50 text-slate-400")}>
                                  <tab.icon size={18} />
                               </div>
                               <div>
                                  <p className={cn("text-xs font-black uppercase tracking-widest leading-none mb-1", activeTab === tab.id ? "text-slate-900" : "text-slate-500")}>{tab.label}</p>
                                  <p className="text-xs font-medium text-slate-400">{tab.desc}</p>
                               </div>
                            </button>
                         ))}
                      </div>
                   </div>
                )}
             </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="hidden lg:flex items-center gap-6 px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex flex-col">
                   <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Live Velocity</p>
                   <div className="flex items-center gap-2">
                      <Activity size={12} className="text-teal-500" />
                      <p className="text-sm font-black text-slate-900 tracking-tight">{(data.summary?.live?.velocity || []).reduce((a: any, b: any) => a + b.orders, 0)} ORDERS/HR</p>
                   </div>
                </div>
                <div className="w-px h-6 bg-slate-200" />
                <div className="flex flex-col">
                   <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                      <p className="text-sm font-black text-slate-900 tracking-tight">STABLE</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>

      <main className="p-8 space-y-8 max-w-[1600px] mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
               {/* --- DASHBOARD SUMMARY VIEW --- */}
               <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  <ReportKPI 
                    title="Gross Sales" 
                    value={(data.financials?.gross_sales || 0).toLocaleString()} 
                    icon={TrendingUp} 
                    color="bg-teal-50" 
                    currency={currency} 
                  />
                  <ReportKPI 
                    title="Net Profit" 
                    value={(data.financials?.profit || 0).toLocaleString()} 
                    icon={DollarSign} 
                    color="bg-amber-50" 
                    currency={currency} 
                  />
                  <ReportKPI 
                    title="Total Items" 
                    value={(data.inventory?.items || []).length} 
                    icon={Package} 
                    color="bg-orange-50" 
                  />
                  <ReportKPI 
                    title="Low Stock" 
                    value={(data.inventory?.low_stock_items || []).length} 
                    icon={AlertTriangle} 
                    color="bg-red-50" 
                  />
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Financials Overview Chart */}
                  <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
                     <div className="flex items-center justify-between mb-8">
                        <div>
                           <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Revenue Velocity</h3>
                           <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Real-time performance metrics</p>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-teal-500" />
                              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Revenue</span>
                           </div>
                        </div>
                     </div>
                     <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                           <AreaChart data={data.summary?.live?.velocity || []}>
                              <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#0D9488" stopOpacity={0.1}/>
                                  <stop offset="95%" stopColor="#0D9488" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                              <XAxis 
                                dataKey="hour" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 9, fontWeight: 900, fill: '#94A3B8' }} 
                                tickFormatter={(val) => `${val}:00`}
                              />
                              <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 9, fontWeight: 900, fill: '#94A3B8' }} 
                              />
                              <Tooltip content={<CustomTooltip currency={currency} />} />
                              <Area 
                                type="monotone" 
                                dataKey="revenue" 
                                stroke="#0D9488" 
                                strokeWidth={3} 
                                fillOpacity={1} 
                                fill="url(#colorRevenue)" 
                              />
                           </AreaChart>
                        </ResponsiveContainer>
                     </div>
                  </div>

                  {/* Operational Summary */}
                  <div className="bg-[#0F172A] rounded-[2rem] p-8 text-white shadow-xl shadow-slate-200">
                     <h3 className="text-lg font-black uppercase tracking-tight mb-8">Channel Split</h3>
                     <div className="space-y-8">
                        {(data.operational?.sales_by_origin || []).slice(0, 4).map((origin: any, idx: number) => (
                           <ChannelMetric 
                              key={idx} 
                              label={origin.name} 
                              value={origin.percentage || 0} 
                              color={idx % 2 === 0 ? "bg-teal-400" : "bg-amber-400"} 
                           />
                        ))}
                     </div>
                     <div className="mt-12 p-6 bg-white/5 rounded-3xl border border-white/10">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                              <Star className="text-amber-400" size={20} />
                           </div>
                           <div>
                              <p className="text-xs font-black text-white/50 uppercase tracking-widest">Top Selling Item</p>
                              <p className="text-lg font-black">{data.operational?.popular_items?.[0]?.name || 'N/A'}</p>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'financials' && (
          <motion.div key="financials" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            
            {/* FLUTTER-STYLE BI HEADER (PRIMARY METRICS) */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-1.5 flex flex-col lg:flex-row gap-1 items-stretch">
                {/* GROSS PROFIT BLOCK */}
                <div className="flex-1 bg-slate-50/50 rounded-[1.8rem] p-4 flex flex-col justify-center border border-slate-100/50">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center">
                      <BarChart3 size={10} className="text-white" />
                    </div>
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Gross Profit</span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tighter">{currency} {data.financials.revenue.toLocaleString()}</h2>
                  <p className="text-xs font-black text-blue-500 uppercase tracking-widest mt-0.5">{(data.financials.revenue / (data.financials.gross_sales || 1) * 100).toFixed(1)}% Margin</p>
                </div>

                {/* BAR CHART SECTION */}
                <div className="flex-[1.5] bg-white rounded-[1.8rem] p-6 flex flex-col justify-between">
                  <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                    {[
                      { label: 'COGS', value: data.financials.cogs, color: 'bg-slate-200' },
                      { label: 'Expenses', value: data.financials.expenses, color: 'bg-slate-200' },
                      { label: 'Gross Sales', value: data.financials.gross_sales, color: 'bg-blue-500' },
                      { label: 'Net Profit', value: data.financials.profit, color: 'bg-green-500' }
                    ].map((m, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{m.label}</span>
                          <span className="text-xs font-black text-slate-900 uppercase">{currency} {m.value.toLocaleString()}</span>
                        </div>
                        <div className="h-1 bg-slate-50 rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full rounded-full transition-all duration-1000", m.color)} 
                            style={{ width: `${Math.min(100, (m.value / (data.financials.gross_sales || 1)) * 100)}%` }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* NET PROFIT BLOCK */}
                <div className="flex-1 bg-slate-50/50 rounded-[1.8rem] p-4 flex flex-col justify-center border border-slate-100/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Net Profit</span>
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-500/20">
                      <DollarSign size={12} />
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tighter">{currency} {data.financials.profit.toLocaleString()}</h2>
                    <p className="text-xs font-black text-green-500 uppercase tracking-widest mt-0.5">{(data.financials.profit / (data.financials.gross_sales || 1) * 100).toFixed(1)}% Margin</p>
                  </div>
                </div>
            </div>

            {/* --- FILTER BAR --- */}
            <div className="flex flex-wrap items-center gap-1 px-2">
               {/* Date Selector */}
               <div className="bg-white px-2 py-2 rounded-xl border border-slate-100 shadow-sm flex items-center gap-1">
                  <Calendar size={14} className="text-orange-400" />
                  <div className="flex items-center gap-1">
                     <input 
                       type="date" 
                       className="text-xs font-black uppercase text-slate-900 border-none outline-none bg-transparent w-20" 
                       value={startDate}
                       onChange={(e) => setStartDate(e.target.value)}
                     />
                     <span className="text-slate-300">/</span>
                     <input 
                       type="date" 
                       className="text-xs font-black uppercase text-slate-900 border-none outline-none bg-transparent w-20" 
                       value={endDate}
                       onChange={(e) => setEndDate(e.target.value)}
                     />
                  </div>
               </div>

               {/* Search */}
               <div className="w-32 bg-white px-2 py-2 rounded-xl border border-slate-100 shadow-sm flex items-center gap-1">
                  <Search size={14} className="text-slate-300" />
                  <input 
                    type="text" 
                    placeholder="Search..."
                    className="bg-transparent border-none outline-none text-xs font-bold text-slate-900 w-full placeholder:text-slate-300 uppercase"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
               </div>

               {/* Active Dropdowns */}
               <select 
                 value={transactionType} 
                 onChange={(e) => setTransactionType(e.target.value)}
                 className="bg-white px-2 py-2 rounded-xl border border-slate-100 shadow-sm text-xs font-black uppercase tracking-widest text-slate-900 outline-none cursor-pointer hover:bg-slate-50"
               >
                 <option value="INCOME">INCOME</option>
                 <option value="EXPENSE">EXPENSE</option>
               </select>

               <select 
                 value={paymentFilter} 
                 onChange={(e) => setPaymentFilter(e.target.value)}
                 className="bg-white px-2 py-2 rounded-xl border border-slate-100 shadow-sm text-xs font-black uppercase tracking-widest text-slate-900 outline-none cursor-pointer hover:bg-slate-50"
               >
                 <option value="ALL">PAYMENTS</option>
                 <option value="CASH">CASH</option>
                 <option value="ONLINE">ONLINE</option>
               </select>

               <select 
                 value={originFilter} 
                 onChange={(e) => setOriginFilter(e.target.value)}
                 className="bg-white px-2 py-2 rounded-xl border border-slate-100 shadow-sm text-xs font-black uppercase tracking-widest text-slate-900 outline-none cursor-pointer hover:bg-slate-50"
               >
                 <option value="ORIGINS">ORIGINS</option>
                 <option value="COUNTER/DINE-IN">COUNTER/DINE-IN</option>
                 <option value="TAKEAWAY/PICKUP">TAKEAWAY/PICKUP</option>
                 <option value="WEBSITE">WEBSITE</option>
                 <option value="QR MENU">QR MENU</option>
               </select>

               <select 
                 value={categoryFilter} 
                 onChange={(e) => setCategoryFilter(e.target.value)}
                 className="bg-white px-2 py-2 rounded-xl border border-slate-100 shadow-sm text-xs font-black uppercase tracking-widest text-slate-900 outline-none cursor-pointer hover:bg-slate-50"
               >
                 <option value="CATEGORIES">CATEGORIES</option>
                 {data.menu.map((cat: any) => (
                   <option key={cat.name} value={cat.name.toUpperCase()}>{cat.name.toUpperCase()}</option>
                 ))}
               </select>

               <select 
                 value={productFilter} 
                 onChange={(e) => setProductFilter(e.target.value)}
                 className="bg-white px-2 py-2 rounded-xl border border-slate-100 shadow-sm text-xs font-black uppercase tracking-widest text-slate-900 outline-none cursor-pointer hover:bg-slate-50"
               >
                 <option value="ITEMS">ITEMS</option>
                 {uniqueItems.map((item: any) => (
                   <option key={item.id} value={item.name.toUpperCase()}>{item.name.toUpperCase()}</option>
                 ))}
               </select>

              {/* Export & Refresh */}
              <div className="flex items-center gap-1.5 ml-auto">
                <div className="relative">
                  <button 
                    onClick={() => setIsExportOpen(!isExportOpen)}
                    className="bg-slate-900 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white hover:bg-black transition-all shadow-sm flex items-center gap-2"
                  >
                    <Download size={14} />
                    Export
                  </button>
                  {isExportOpen && (
                    <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-50">
                      <button 
                        onClick={() => { exportToCSV(); setIsExportOpen(false); }}
                        className="w-full flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all text-left border-b border-slate-50"
                      >
                        <FileText size={14} />
                        CSV
                      </button>
                      <button 
                        onClick={() => { exportToPDF(); setIsExportOpen(false); }}
                        className="w-full flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all text-left"
                      >
                        <Printer size={14} />
                        PDF
                      </button>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => window.location.reload()}
                  className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
                >
                    <RotateCw size={14} />
                </button>
              </div>
            </div>
            
            {/* Removed Channel Performance and Settlement Breakdown per user request */}


            {/* FINANCIAL LEDGER SECTION - SYNCHRONIZED TABLE FORMAT */}
            <div className="mt-4">
               <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-8 py-4 border-b border-slate-50 bg-slate-50/20 flex items-center justify-between">
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Financial Ledger</h3>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{filteredOrders.length} Transactions</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-[#FFF9F2] border-y border-slate-100">
                          <th className="px-8 py-3 text-left text-xs font-black text-slate-900 uppercase tracking-[0.2em]">ID</th>
                          <th className="px-8 py-3 text-left text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Time</th>
                          <th className="px-8 py-3 text-left text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Items</th>
                          <th className="px-8 py-3 text-center text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Type</th>
                          <th className="px-8 py-3 text-center text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Total</th>
                          <th className="px-8 py-3 text-right text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredOrders.map((t: any) => (
                          <tr key={t.id} className="hover:bg-slate-50/50 transition-all duration-300 group">
                            <td className="px-8 py-3 font-black text-slate-600 uppercase tracking-tight text-sm">#{t.order_number || t.id || 'N/A'}</td>
                            <td className="px-8 py-3 text-xs font-bold text-slate-400 tabular-nums uppercase">
                              {(() => {
                                try {
                                  const d = new Date(t.order_time || t.created_at || t.createdAt);
                                  return isNaN(d.getTime()) ? 'INVALID DATE' : d.toISOString().replace('T', ' ').slice(0, 19);
                                } catch {
                                  return 'DATE N/A';
                                }
                              })()}
                            </td>
                            <td className="px-8 py-3 max-w-[300px]">
                                <div className="flex flex-wrap gap-1.5">
                                  {(() => {
                                    const items = t.items || [];
                                    if (items.length === 0) return <span className="text-xs font-bold text-slate-300 uppercase tracking-widest italic">No items details</span>;
                                    const firstItem = items[0];
                                    return (
                                      <div className="flex items-center gap-1.5">
                                        <span className="bg-slate-50 text-xs font-black text-slate-500 px-2 py-1 rounded-md border border-slate-100">{firstItem.quantity}× {firstItem.name}</span>
                                        {items.length > 1 && <span className="text-xs font-black text-orange-500 px-1 py-1 uppercase">+ {items.length - 1} MORE</span>}
                                      </div>
                                    );
                                  })()}
                                </div>
                            </td>
                            <td className="px-8 py-3 text-center">
                               <span className="text-xs font-black text-slate-600 uppercase tracking-tight">{t.order_type || 'Dine-In'}</span>
                            </td>
                            <td className="px-8 py-3 text-center font-black text-orange-500 tabular-nums text-lg">
                              {currency} {parseFloat(t.total_amount || 0).toFixed(2)}
                            </td>
                            <td className="px-8 py-3 text-right">
                               <span className={cn("px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border shadow-sm", 
                                 t.status?.toLowerCase() === 'paid' ? "bg-green-50 text-green-600 border-green-100" : 
                                 t.status?.toLowerCase() === 'ready' ? "bg-blue-50 text-blue-600 border-blue-100" :
                                 "bg-amber-50 text-amber-600 border-amber-100")}>
                                 {t.status || 'Paid'}
                               </span>
                            </td>
                          </tr>
                        ))}
                        {filteredOrders.length === 0 && (
                           <tr>
                             <td colSpan={6} className="px-12 py-20 text-center text-xs font-black text-slate-400 uppercase tracking-[0.4em]">No matching financial records found</td>
                           </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
               </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'inventory' && (
          <motion.div key="inventory" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            {/* --- INVENTORY BI HEADER --- */}
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-8">
                  <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Business Intelligence</h1>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center text-orange-400">
                         <Package size={18} />
                       </div>
                       <div>
                          <p className="text-xs font-bold text-slate-400 uppercase leading-none">Total Items</p>
                          <p className="text-xl font-black text-slate-900 leading-none mt-1">{(data.inventory.items || []).length}</p>
                       </div>
                    </div>
                    <div className="h-8 w-px bg-slate-100" />
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center text-red-400">
                         <AlertTriangle size={18} />
                       </div>
                       <div>
                          <p className="text-xs font-bold text-slate-400 uppercase leading-none">Low Stock</p>
                          <p className="text-xl font-black text-slate-900 leading-none mt-1">{(data.inventory.low_stock_items || []).length}</p>
                       </div>
                    </div>
                    <div className="h-8 w-px bg-slate-100" />
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center text-green-400">
                         <DollarSign size={18} />
                       </div>
                       <div>
                          <p className="text-xs font-bold text-slate-400 uppercase leading-none">Inv. Value</p>
                          <p className="text-xl font-black text-slate-900 leading-none mt-1">{currency}{data.inventory.total_value?.toFixed(2) || '0.00'}</p>
                       </div>
                    </div>
                  </div>
               </div>

               <div className="bg-white border border-slate-100 px-6 py-4 rounded-3xl shadow-sm flex items-center gap-4 min-w-[240px] justify-between cursor-pointer hover:bg-slate-50 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-orange-100 rounded-md flex items-center justify-center text-orange-500">
                       <Layout size={14} />
                    </div>
                    <span className="text-xs font-black text-orange-500 uppercase tracking-widest">Inventory Status</span>
                  </div>
                  <ChevronDown size={18} className="text-orange-300" />
               </div>
            </div>

            {/* --- STANDARDIZED INVENTORY FILTER BAR --- */}
            <div className="bg-white border border-slate-100 p-1.5 rounded-2xl shadow-sm flex flex-wrap items-center gap-1">
               <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-50 flex items-center gap-2 group transition-all">
                  <Calendar size={14} className="text-orange-500" />
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs font-black text-slate-900 uppercase tracking-widest cursor-pointer"
                  />
                  <div className="w-px h-3 bg-slate-200 mx-1" />
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs font-black text-slate-900 uppercase tracking-widest cursor-pointer"
                  />
               </div>

               <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-50 flex items-center gap-2 w-32 group focus-within:bg-white focus-within:border-orange-200 transition-all">
                  <Search size={14} className="text-slate-300" />
                  <input 
                    type="text" 
                    placeholder="SEARCH..."
                    className="bg-transparent border-none outline-none text-xs font-black text-slate-900 w-full placeholder:text-slate-300 uppercase tracking-widest"
                  />
               </div>

               <select className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-50 text-xs font-black text-slate-600 uppercase tracking-widest outline-none appearance-none min-w-[100px] text-center hover:bg-slate-100 cursor-pointer transition-all">
                  <option>SUPPLIERS</option>
               </select>

               <select className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-50 text-xs font-black text-slate-600 uppercase tracking-widest outline-none appearance-none min-w-[120px] text-center hover:bg-slate-100 cursor-pointer transition-all">
                  <option>STOCK STATUS</option>
                  <option>HEALTHY</option>
                  <option>LOW STOCK</option>
                  <option>OUT OF STOCK</option>
               </select>

               <select className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-50 text-xs font-black text-slate-600 uppercase tracking-widest outline-none appearance-none min-w-[100px] text-center hover:bg-slate-100 cursor-pointer transition-all">
                  <option>ITEMS</option>
               </select>

               <div className="flex items-center gap-1.5 ml-auto">
                  <div className="relative">
                    <button 
                      onClick={() => setIsExportOpen(!isExportOpen)}
                      className="bg-[#0F172A] px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white hover:bg-black transition-all shadow-sm flex items-center gap-2"
                    >
                      <Download size={14} />
                      EXPORT
                    </button>
                    {isExportOpen && (
                      <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-50">
                        <button 
                          onClick={() => { exportToCSV(); setIsExportOpen(false); }}
                          className="w-full flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all text-left border-b border-slate-50"
                        >
                          <FileText size={14} />
                          CSV
                        </button>
                        <button 
                          onClick={() => { exportToPDF(); setIsExportOpen(false); }}
                          className="w-full flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all text-left"
                        >
                          <Printer size={14} />
                          PDF
                        </button>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => window.location.reload()}
                    className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
                  >
                      <RotateCw size={14} />
                  </button>
               </div>
            </div>

            {/* --- INVENTORY BREAKDOWN TABLE --- */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
               <div className="px-10 py-6 border-b border-slate-50 flex items-center justify-between">
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Inventory Breakdown</h3>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full">
                    <thead>
                       <tr className="bg-[#FFF9F2] border-y border-slate-100">
                          <th className="px-10 py-4 text-left text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Item Name</th>
                          <th className="px-10 py-4 text-left text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Supplier</th>
                          <th className="px-10 py-4 text-left text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Stock Level</th>
                          <th className="px-10 py-4 text-left text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Cost/Unit</th>
                          <th className="px-10 py-4 text-left text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Total Value</th>
                          <th className="px-10 py-4 text-right text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Status</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {(data.inventory.items || [])
                         .map((item: any, idx: number) => {
                            const quantity = parseFloat(item.quantity) || 0;
                            const threshold = parseFloat(item.low_stock_threshold) || 10;
                            const status = quantity <= threshold ? 'LOW STOCK' : 'HEALTHY';
                            const cost = parseFloat(item.cost_per_unit) || 0;
                            const total = quantity * cost;

                            return (
                               <tr key={idx} className="hover:bg-slate-50/50 transition-all group">
                                  <td className="px-10 py-4 font-black text-slate-900 uppercase text-xs">{item.name}</td>
                                  <td className="px-10 py-4 text-xs font-bold text-slate-400 uppercase">{item.supplier_name || 'NOT SET'}</td>
                                  <td className="px-10 py-4 text-xs font-black text-slate-600 uppercase tracking-tight">{item.quantity} {item.unit || 'UNIT'}</td>
                                  <td className="px-10 py-4 text-xs font-bold text-slate-500 tabular-nums">{currency} {cost.toFixed(2)}</td>
                                  <td className="px-10 py-4 text-xs font-black text-orange-500 tabular-nums">{currency} {total.toFixed(2)}</td>
                                  <td className="px-10 py-4 text-right">
                                     <span className={cn(
                                       "px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest",
                                       status === 'HEALTHY' ? "bg-green-50 text-green-600 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"
                                     )}>
                                       {status}
                                     </span>
                                  </td>
                               </tr>
                            );
                         })}
                    </tbody>
                 </table>
               </div>
            </div>

            {/* --- BOTTOM ROW: SUPPLIERS & PURCHASE ORDERS --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="lg:col-span-1 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="px-8 py-6 border-b border-slate-50">
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Trusted Suppliers</h3>
                  </div>
                  <div className="p-6 space-y-4">
                     {(data.inventory.suppliers || []).slice(0, 5).map((s: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-2xl transition-all group">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-400">
                                 <Building size={18} />
                              </div>
                              <div>
                                 <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{s.name}</p>
                                 <p className="text-xs font-medium text-slate-400">{s.contact_email || 'No email'}</p>
                              </div>
                           </div>
                           <span className="text-xs font-black text-green-500">{s.reliability_score || 100}%</span>
                        </div>
                     ))}
                     {(data.inventory.suppliers || []).length === 0 && (
                        <p className="text-center py-10 text-xs font-black text-slate-300 uppercase tracking-widest">No suppliers registered</p>
                     )}
                  </div>
               </div>

               <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-10 py-6 border-b border-slate-50">
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Recent Purchase Orders</h3>
                  </div>
                  <div className="overflow-x-auto">
                     <table className="w-full">
                        <thead>
                           <tr className="bg-slate-50/50 border-b border-slate-100">
                              <th className="px-10 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Date</th>
                              <th className="px-10 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Invoice</th>
                              <th className="px-10 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Supplier</th>
                              <th className="px-10 py-4 text-center text-xs font-black text-slate-400 uppercase tracking-widest">Amount</th>
                              <th className="px-10 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {(data.inventory.purchases || []).slice(0, 5).map((order: any) => (
                              <tr key={order.id} className="hover:bg-slate-50/50 transition-all">
                                 <td className="px-10 py-4 text-xs font-bold text-slate-400">{new Date(order.order_date).toLocaleDateString()}</td>
                                 <td className="px-10 py-4 text-xs font-black text-slate-900 uppercase">#{order.invoice_number || order.id}</td>
                                 <td className="px-10 py-4 text-xs font-black text-slate-700 uppercase">{order.supplier_name}</td>
                                 <td className="px-10 py-4 text-center text-xs font-black text-indigo-500 tabular-nums">{currency} {parseFloat(order.total_amount).toFixed(2)}</td>
                                 <td className="px-10 py-4 text-right">
                                    <span className={cn(
                                       "px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border",
                                       order.status === 'Received' ? "bg-teal-50 text-teal-600 border-teal-100" : "bg-orange-50 text-orange-600 border-orange-100"
                                    )}>
                                       {order.status}
                                    </span>
                                 </td>
                              </tr>
                           ))}
                           {(data.inventory.purchases || []).length === 0 && (
                              <tr>
                                 <td colSpan={5} className="px-10 py-12 text-center text-xs font-black text-slate-300 uppercase tracking-[0.4em]">No recent orders tracked</td>
                              </tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'staff' && (
          <motion.div key="staff" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               <ReportKPI title="Avg Order Value" value="42.50" subValue="Per Staff Ticket" icon={Users} color="bg-indigo-600" currency={currency} />
               <ReportKPI title="Active Waiters" value={(data.staff.stats || []).length} subValue="Currently Serving" icon={Activity} color="bg-zamzam-teal" />
               <ReportKPI title="Top Performer" value={(data.staff.stats?.[0]?.first_name || 'N/A')} subValue="Highest Sales Volume" icon={Star} color="bg-zamzam-yellow" />
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
               <div className="px-12 py-2 bg-white/40 border-b border-slate-100 backdrop-blur-sm sticky top-[72px] z-[30]">
                 <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Waitstaff Contribution</h3>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full">
                   <thead>
                     <tr className="bg-slate-50/50">
                       <th className="px-8 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Professional</th>
                       <th className="px-8 py-4 text-center text-xs font-black text-slate-400 uppercase tracking-widest">Role</th>
                       <th className="px-8 py-4 text-center text-xs font-black text-slate-400 uppercase tracking-widest">Tickets</th>
                       <th className="px-8 py-4 text-center text-xs font-black text-slate-400 uppercase tracking-widest">Volume</th>
                       <th className="px-8 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Performance</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                     {Array.isArray(data.staff.stats) && data.staff.stats.map((staff: any) => {
                       const roles = typeof staff.roles === 'string' ? staff.roles.split(',').map((r: string) => r.trim()) : [];
                       const primaryRole = roles[0] || 'Staff';

                       return (
                        <tr key={staff.user_id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center font-black text-slate-400 group-hover:bg-zamzam-teal group-hover:text-white transition-all uppercase text-xs">
                                {staff.first_name?.[0]}{staff.last_name?.[0]}
                              </div>
                              <span className="font-black text-slate-900 uppercase tracking-tight text-xs">{staff.first_name} {staff.last_name}</span>
                            </div>
                          </td>
                          <td className="px-8 py-4 text-center">
                            <span className="px-2 py-1 bg-teal-50 text-zamzam-teal rounded-md text-xs font-black uppercase tracking-widest border border-teal-100">
                              {primaryRole}
                            </span>
                          </td>
                          <td className="px-8 py-4 text-center font-black text-slate-900 tabular-nums text-xs">{staff.order_count}</td>
                          <td className="px-8 py-4 text-center font-black text-slate-900 tabular-nums text-xs">{currency} {parseFloat(staff.total_sales || 0).toFixed(2)}</td>
                          <td className="px-8 py-4 text-right">
                             <div className="flex items-center justify-end gap-2">
                               <div className="w-20 h-1 bg-slate-100 rounded-full overflow-hidden">
                                 <div className="h-full bg-zamzam-teal" style={{ width: `${Math.min(100, (staff.order_count / 50) * 100)}%` }} />
                               </div>
                               <span className="text-xs font-black text-slate-400 uppercase">{Math.round((staff.order_count / 50) * 100)}%</span>
                             </div>
                          </td>
                        </tr>
                       );
                     })}
                     {(!Array.isArray(data.staff.stats) || data.staff.stats.length === 0) && (
                       <tr>
                         <td colSpan={5} className="px-8 py-10 text-center text-xs font-black text-slate-400 uppercase tracking-[0.2em]">No performance data recorded for the selected period</td>
                       </tr>
                     )}
                   </tbody>
                 </table>
               </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'transactions' && (
          <motion.div 
          key="transactions"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="p-4 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-700"
        >
             {/* Removed KPI cards and header per user request */}
             {/* --- PREMIUM FILTER BAR --- */}
             <div className="bg-white/80 backdrop-blur-xl border border-slate-100 p-1.5 rounded-xl shadow-sm flex flex-wrap items-center gap-1">
                 <div className="relative group">
                   <input 
                     type="date" 
                     ref={startInputRef}
                     value={startDate}
                     onChange={(e) => {
                       setStartDate(e.target.value);
                       if (e.target.value) {
                         setTimeout(() => endInputRef.current?.showPicker(), 500);
                       }
                     }}
                     className="absolute opacity-0 pointer-events-none"
                   />
                   <input 
                     type="date" 
                     ref={endInputRef}
                     value={endDate}
                     onChange={(e) => setEndDate(e.target.value)}
                     className="absolute opacity-0 pointer-events-none"
                   />
                   <button 
                     onClick={() => startInputRef.current?.showPicker()}
                     className="flex items-center gap-1.5 bg-slate-50 px-2 py-2 rounded-xl border border-slate-100 hover:bg-slate-100 transition-all text-xs font-black uppercase tracking-widest text-slate-900 shadow-sm"
                   >
                     <Calendar size={14} className="text-orange-500" />
                     {startDate && endDate ? `${startDate} to ${endDate}` : 'DATE'}
                   </button>
                 </div>

                  <div className="relative group w-[120px]">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" size={12} />
                    <input 
                      type="text" 
                      placeholder="Search..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-2 pl-8 pr-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-orange-500/10 focus:bg-white focus:border-orange-200 transition-all placeholder:text-slate-300 uppercase tracking-widest shadow-sm"
                    />
                  </div>

                <select 
                  value={orderTypeFilter}
                  onChange={(e) => setOrderTypeFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-100 rounded-xl py-2 px-2 text-xs font-black uppercase tracking-widest text-slate-600 outline-none hover:bg-slate-100 appearance-none min-w-[80px] text-center shadow-sm"
                >
                  <option>ORDER TYPE</option>
                  <option>DINE-IN</option>
                  <option>TAKEAWAY</option>
                  <option>PICKUP</option>
                  <option>DELIVERY</option>
                </select>

                <select 
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-100 rounded-xl py-2 px-2 text-xs font-black uppercase tracking-widest text-slate-600 outline-none hover:bg-slate-100 appearance-none min-w-[80px] text-center shadow-sm"
                >
                  <option>PAYMENTS</option>
                  <option>CASH</option>
                  <option>CARD</option>
                  <option>ONLINE</option>
                </select>

                <select 
                  value={originFilter}
                  onChange={(e) => setOriginFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-100 rounded-xl py-2 px-2 text-xs font-black uppercase tracking-widest text-slate-600 outline-none hover:bg-slate-100 appearance-none min-w-[80px] text-center shadow-sm"
                >
                  <option>ORIGINS</option>
                  <option>IN-STORE</option>
                  <option>WEBSITE</option>
                  <option>QR MENU</option>
                </select>

                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-100 rounded-xl py-2 px-2 text-xs font-black uppercase tracking-widest text-slate-600 outline-none hover:bg-slate-100 appearance-none min-w-[80px] text-center shadow-sm"
                >
                  <option>STATUS</option>
                  <option>PAID</option>
                  <option>READY</option>
                  <option>COMPLETED</option>
                  <option>CANCELLED</option>
                </select>

                <select 
                  value={categoryFilter} 
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-100 rounded-xl py-2 px-2 text-xs font-black uppercase tracking-widest text-slate-600 outline-none hover:bg-slate-100 appearance-none min-w-[100px] text-center shadow-sm"
                >
                  <option>CATEGORIES</option>
                  {(data?.menu || []).map((cat: any) => (
                    <option key={cat.id || cat.name} value={(cat.name || '').toUpperCase()}>{(cat.name || 'UNKNOWN').toUpperCase()}</option>
                  ))}
                </select>

                <select 
                  value={productFilter} 
                  onChange={(e) => setProductFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-100 rounded-xl py-2 px-2 text-xs font-black uppercase tracking-widest text-slate-600 outline-none hover:bg-slate-100 appearance-none min-w-[100px] text-center shadow-sm"
                >
                  <option>ITEMS</option>
                  {uniqueItems.map((item: any) => (
                    <option key={item.id} value={(item.name || item.title || '').toUpperCase()}>{(item.name || item.title || 'UNKNOWN').toUpperCase()}</option>
                  ))}
                </select>

                {/* Export & Refresh */}
                <div className="flex items-center gap-1.5 ml-auto">
                  <div className="relative">
                    <button 
                      onClick={() => setIsExportOpen(!isExportOpen)}
                      className="bg-slate-900 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white hover:bg-black transition-all shadow-sm flex items-center gap-2"
                    >
                      <Download size={14} />
                      Export
                    </button>
                    {isExportOpen && (
                      <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-50">
                        <button 
                          onClick={() => { exportToCSV(); setIsExportOpen(false); }}
                          className="w-full flex items-center gap-2 px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all text-left border-b border-slate-50"
                        >
                          <FileText size={14} />
                          CSV
                        </button>
                        <button 
                          onClick={() => { exportToPDF(); setIsExportOpen(false); }}
                          className="w-full flex items-center gap-2 px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all text-left"
                        >
                          <Printer size={14} />
                          PDF
                        </button>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => window.location.reload()}
                    className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
                  >
                      <RotateCw size={14} />
                  </button>
                </div>
              </div>

             {/* --- ORDERS TABLE --- */}
             <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-8 py-4 border-b border-slate-50 bg-slate-50/20">
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Orders in View</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#FFF9F2] border-y border-slate-100">
                        <th className="px-8 py-3 text-left text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">ID</th>
                        <th className="px-8 py-3 text-left text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Time</th>
                        <th className="px-8 py-3 text-left text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Items</th>
                        <th className="px-8 py-3 text-center text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Type</th>
                        <th className="px-8 py-3 text-center text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Total</th>
                        <th className="px-8 py-3 text-right text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredOrders.map((t: any) => (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-all duration-300 group">
                          <td className="px-8 py-3 font-black text-slate-600 uppercase tracking-tight text-sm">#{t.order_number || t.id || 'N/A'}</td>
                          <td className="px-8 py-3 text-xs font-bold text-slate-400 tabular-nums uppercase">
                            {(() => {
                              try {
                                const d = new Date(t.order_time || t.created_at || t.createdAt);
                                return isNaN(d.getTime()) ? 'INVALID DATE' : d.toISOString().replace('T', ' ').slice(0, 19);
                              } catch {
                                return 'DATE N/A';
                              }
                            })()}
                          </td>
                          <td className="px-8 py-3 max-w-[300px]">
                              <div className="flex flex-wrap gap-1.5">
                                {(() => {
                                  const items = t.items || [];
                                  
                                  if (productFilter !== 'ITEMS' && productFilter !== 'ALL ITEMS') {
                                    const target = items.find((i: any) => (i.name || '').toUpperCase() === productFilter);
                                    if (target) return <span className="bg-orange-50 text-[10px] font-black text-orange-600 px-2 py-1 rounded-md border border-orange-100">{target.quantity}× {target.name}</span>;
                                  }

                                  if (categoryFilter !== 'CATEGORIES' && categoryFilter !== 'ALL CATEGORIES') {
                                    const menuCategory = (data?.menu || []).find((c: any) => (c.name || '').toUpperCase() === categoryFilter);
                                    const catItems = items.filter((i: any) => menuCategory?.items?.some((mi: any) => mi.id === i.product_id));
                                    const totalQty = catItems.reduce((acc: number, i: any) => acc + (parseFloat(i.quantity) || 1), 0);
                                    if (totalQty > 0) return <span className="bg-blue-50 text-[10px] font-black text-blue-600 px-2 py-1 rounded-md border border-blue-100 uppercase">{categoryFilter}: {totalQty} ITEMS</span>;
                                  }

                                  if (items.length === 0) return <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">No items details</span>;
                                  const firstItem = items[0];
                                  return (
                                    <div className="flex items-center gap-1.5">
                                      <span className="bg-slate-50 text-[10px] font-black text-slate-500 px-2 py-1 rounded-md border border-slate-100">{firstItem.quantity}× {firstItem.name}</span>
                                      {items.length > 1 && <span className="text-[10px] font-black text-orange-500 px-1 py-1 uppercase">+ {items.length - 1} MORE</span>}
                                    </div>
                                  );
                                })()}
                              </div>
                          </td>
                          <td className="px-8 py-3 text-center">
                             <span className="text-xs font-black text-slate-600 uppercase tracking-tight">{t.order_type || 'Dine-In'}</span>
                          </td>
                          <td className="px-8 py-3 text-center font-black text-orange-500 tabular-nums text-lg">
                            {currency} {parseFloat(t.total_amount || 0).toFixed(2)}
                          </td>
                          <td className="px-8 py-3 text-right">
                             <span className={cn("px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm", 
                               t.status?.toLowerCase() === 'paid' ? "bg-green-50 text-green-600 border-green-100" : 
                               t.status?.toLowerCase() === 'ready' ? "bg-blue-50 text-blue-600 border-blue-100" :
                               "bg-amber-50 text-amber-600 border-amber-100")}>
                               {t.status || 'Paid'}
                             </span>
                          </td>
                        </tr>
                      ))}
                      {filteredOrders.length === 0 && (
                         <tr>
                           <td colSpan={6} className="px-12 py-20 text-center text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">No matching records found in this view</td>
                         </tr>
                      )}
                    </tbody>
                  </table>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  </div>
);
}
