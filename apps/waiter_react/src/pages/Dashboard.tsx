import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  ClipboardList, 
  User, 
  LogOut, 
  Bell, 
  Clock, 
  CheckCircle2,
  Plus,
  Loader2,
  AlertCircle,
  ShoppingCart,
  ChefHat,
  Calendar,
  Users2,
  Table as TableIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { orderService, tableService, menuService } from '../services/orderService';
import { resolveImageUrl, POS_URL } from '../services/api';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeMenuCategory, setActiveMenuCategory] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [_tables, setTables] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, logout } = useAuth();

  // Mapping tabs to POS App routes
  const tabToRoute: Record<string, string> = {
    'pos': 'orders',
    'kds': 'kds',
    'orders': 'order-status',
    'waiting': 'waiting-list',
    'reservations': 'reservations',
    'table': 'tables'
  };

  const isIframeTab = Object.keys(tabToRoute).includes(activeTab);

  const currency = settings?.tenant?.currency_symbol || '$';

  const fetchData = async () => {
    try {
      setError(null);
      
      const [ordersData, statsData, tablesData, menuData, settingsData, reservationsData, customersData, summaryDataRes] = await Promise.allSettled([
        orderService.fetchOrders(),
        orderService.fetchDashboardStats(),
        tableService.fetchTables(),
        menuService.fetchAllItems(),
        orderService.fetchSettings(),
        orderService.fetchReservations(),
        orderService.fetchCustomers(),
        orderService.fetchSummary()
      ]);

      if (ordersData.status === 'fulfilled') setOrders(Array.isArray(ordersData.value) ? ordersData.value : []);
      if (statsData.status === 'fulfilled') setDashboardStats(statsData.value);
      if (tablesData.status === 'fulfilled') setTables(Array.isArray(tablesData.value) ? tablesData.value : []);
      if (settingsData.status === 'fulfilled') setSettings(settingsData.value);
      if (reservationsData.status === 'fulfilled') setReservations(Array.isArray(reservationsData.value) ? reservationsData.value : []);
      if (customersData.status === 'fulfilled') setCustomers(Array.isArray(customersData.value) ? customersData.value : []);
      if (summaryDataRes.status === 'fulfilled') setSummaryData(summaryDataRes.value);
      
      if (menuData.status === 'fulfilled') {
        const mData = Array.isArray(menuData.value) ? menuData.value : [];
        setCategories(mData);
        if (mData.length > 0 && !activeMenuCategory) setActiveMenuCategory(mData[0]);
      }
    } catch (err) {
      console.error('General data fetch error:', err);
      setError("Failed to initialize dashboard.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#F8F9FA] overflow-hidden">
      
      {/* Desktop Sidebar (Hidden on Mobile) */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col">
        <div className="pt-2 pb-4 px-4 flex flex-col items-center text-center shrink-0">
          <div className="flex items-center justify-center gap-6 mb-3">
            {/* Zamzam Badge Logo */}
            <div className="w-20 h-20 flex items-center justify-center">
              {settings?.tenant?.logo_url ? (
                <img 
                  src={resolveImageUrl(settings.tenant.logo_url)} 
                  alt="Zamzam Logo"
                  className="w-full h-full object-contain drop-shadow-md"
                />
              ) : (
                <div className="w-full h-full bg-teal-900 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-teal-900/20">
                  <UtensilsCrossed size={32} />
                </div>
              )}
            </div>
            
            {/* Halal Certification Logo */}
            <div className="w-16 h-16 flex items-center justify-center">
              {settings?.tenant?.secondary_logo_url ? (
                <img 
                  src={resolveImageUrl(settings.tenant.secondary_logo_url)} 
                  alt="Halal Certification"
                  className="w-full h-full object-contain drop-shadow-sm transition-transform hover:scale-105 duration-300"
                />
              ) : (
                <div className="w-16 h-16 rounded-full border-[2.5px] border-green-600 flex flex-col items-center justify-center bg-white text-green-600 p-2 shadow-sm transition-transform hover:scale-105 duration-300">
                  <span className="text-[16px] font-bold leading-none mb-1 mt-0.5">حلال</span>
                  <div className="h-[2px] w-10 bg-green-600 mb-1" />
                  <span className="text-[8px] font-bold uppercase tracking-tighter leading-none">HALAL</span>
                </div>
              )}
            </div>
          </div>
          
          <h1 className="text-xl font-bold text-teal-900 tracking-tighter uppercase leading-none">
            Zamzam Kitchen
          </h1>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em] py-1.5 border-y border-slate-50 w-full mt-1.5">
            Authentic Halal Flavours
          </p>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
          <SidebarItem 
            icon={<LayoutDashboard size={18} />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')}
            color="bg-slate-50 text-slate-500"
          />
          <SidebarItem 
            icon={<ShoppingCart size={18} />} 
            label="POS" 
            active={activeTab === 'pos'}
            onClick={() => setActiveTab('pos')}
            color="bg-orange-50 text-orange-600"
          />
          <SidebarItem 
            icon={<ChefHat size={18} />} 
            label="KDS" 
            active={activeTab === 'kds'} 
            onClick={() => setActiveTab('kds')}
            badge={orders.filter(o => ['Pending', 'Ordered', 'Preparing', 'Ready', 'Paid', 'Partially Paid'].includes(o.status)).length}
            color="bg-teal-50 text-teal-600"
          />
          <SidebarItem 
            icon={<ClipboardList size={18} />} 
            label="ORDERS" 
            active={activeTab === 'orders'} 
            onClick={() => setActiveTab('orders')}
            badge={orders.length}
            color="bg-slate-50 text-slate-600"
          />
          <SidebarItem 
            icon={<Users2 size={18} />} 
            label="WAITING" 
            active={activeTab === 'waiting'} 
            onClick={() => setActiveTab('waiting')}
            badge={orders.filter(o => o.status === 'Waiting' || o.status === 'Ready').length}
            color="bg-blue-50 text-blue-600"
          />
          <SidebarItem 
            icon={<Calendar size={18} />} 
            label="RESERVATION" 
            active={activeTab === 'reservations'} 
            onClick={() => setActiveTab('reservations')}
            badge={reservations.length}
            color="bg-indigo-50 text-indigo-600"
          />
          <SidebarItem 
            icon={<TableIcon size={18} />} 
            label="TABLES" 
            active={activeTab === 'table'} 
            onClick={() => setActiveTab('table')}
            color="bg-green-50 text-green-600"
          />
          <SidebarItem 
            icon={<User size={18} />} 
            label="Customers" 
            active={activeTab === 'customers'} 
            onClick={() => setActiveTab('customers')}
            color="bg-slate-50 text-slate-500"
          />
        </nav>

      </aside>

      {/* Mobile Bottom Navigation (Hidden on Desktop) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around items-center p-2 z-[60] pb-safe">
        <MobileNavItem icon={<LayoutDashboard size={22} />} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <MobileNavItem icon={<User size={22} />} active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} />
        <button onClick={() => setActiveTab('pos')} className={`p-4 rounded-2xl -mt-8 shadow-lg transition-all ${activeTab === 'pos' ? 'bg-teal-900 text-white shadow-teal-900/30' : 'bg-zamzam-yellow shadow-yellow-500/30 active:scale-90'}`}><Plus size={24} /></button>
        <MobileNavItem icon={<LogOut size={22} />} onClick={logout} />
      </nav>

      {/* Main Content */}
      <main className={`flex-1 flex flex-col overflow-hidden ${isIframeTab ? 'p-0' : 'p-8'}`}>
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 px-6 lg:px-0 shrink-0">
          <div className="flex-1 flex items-center gap-4">
            {isIframeTab ? (
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-2xl bg-teal-900 flex items-center justify-center shadow-lg shadow-teal-900/20">
                    {activeTab === 'pos' ? <ShoppingCart size={20} className="text-white" /> :
                     activeTab === 'kds' ? <ChefHat size={20} className="text-white" /> :
                     activeTab === 'table' ? <TableIcon size={20} className="text-white" /> :
                     activeTab === 'reservations' ? <Calendar size={20} className="text-white" /> :
                     activeTab === 'waiting' ? <Users2 size={20} className="text-white" /> :
                     <ClipboardList size={20} className="text-white" />}
                 </div>
                 <div>
                   <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tighter leading-none">
                     {activeTab === 'pos' ? 'Ordering Terminal' :
                      activeTab === 'kds' ? 'Kitchen Display' :
                      activeTab === 'table' ? 'Tables Map' :
                      activeTab === 'reservations' ? 'Reservations' :
                      activeTab === 'waiting' ? 'Waiting List' : 'Order Status'}
                   </h2>
                   <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest mt-1">Live Operational Sync Active</p>
                 </div>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-bold text-slate-800 leading-tight">
                  Welcome back, {user?.first_name || 'Waiter'}! <span role="img" aria-label="emoji">👋</span>
                </h2>
                <p className="text-xs font-medium text-slate-400 mt-1">
                  {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 bg-white p-2 pr-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                <User size={20} />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-bold text-slate-800 leading-tight">{user?.first_name} {user?.last_name}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Staff Account</p>
              </div>
            </div>
            <div className="h-8 w-px bg-slate-100 mx-2" />
            <button 
              onClick={logout}
              className="p-2 text-slate-400 hover:text-red-500 transition-all rounded-xl hover:bg-red-50 active:scale-90"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto no-scrollbar">

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-teal-900 w-8 h-8" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-100 rounded-3xl p-12 flex flex-col items-center justify-center text-center">
            <AlertCircle className="text-red-500 w-12 h-12 mb-4" />
            <h3 className="text-lg font-bold text-red-900 mb-2">Connection Problem</h3>
            <p className="text-red-600 text-sm max-w-xs mb-6">{error}</p>
            <button onClick={() => window.location.reload()} className="bg-red-500 text-white px-6 py-2 rounded-xl font-bold text-sm">Retry Connection</button>
          </div>
        ) : (
          <>

            {activeTab === 'dashboard' && (
              <>
                {/* Stats Row (POS Sync) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <StatCard 
                    title="Today's Sales" 
                    value={`${currency}${summaryData?.todayStats?.total?.toFixed(2) || '0.00'}`} 
                    icon={<CheckCircle2 size={20} />} 
                    theme="teal" 
                    subtitle={`${summaryData?.todayStats?.count || 0} Orders Today`}
                  />
                  <StatCard 
                    title="Active Tickets" 
                    value={summaryData?.liveActive?.count || 0} 
                    icon={<Bell size={20} />} 
                    theme="white" 
                    trend="Live in Kitchen"
                  />
                  <StatCard 
                    title="Unpaid Orders" 
                    value={summaryData?.liveUnpaid?.count || 0} 
                    icon={<Clock size={20} />} 
                    theme="white" 
                    trend="Needs Checkout"
                    trendColor="text-yellow-600"
                  />
                  <StatCard 
                    title="Today's Tips" 
                    value={`${currency}${summaryData?.todayTips?.tips?.toFixed(2) || '0.00'}`} 
                    icon={<Plus size={20} />} 
                    theme="white" 
                    trend="Staff Earnings"
                  />
                </div>

                <div className="mb-8">
                  <button 
                    onClick={() => setActiveTab('pos')}
                    className="w-full bg-[#FFB300] hover:bg-[#FFA000] p-4 transition-all rounded-[2rem] flex items-center justify-center gap-3 shadow-lg shadow-yellow-500/20 active:scale-[0.98] group"
                  >
                    <Plus className="group-hover:rotate-90 transition-transform" />
                    <span className="font-bold uppercase tracking-widest text-sm">Create New Table Order</span>
                  </button>
                </div>

                {/* Lists Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-24 lg:pb-0">
                  {/* Order List */}
                  <section className="col-span-1 lg:col-span-8 bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-teal-900">Live Order Tracking</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {orders.slice(0, 10).map((order) => (
                        <OrderListItem 
                          key={order.id}
                          id={order.order_number || order.id} 
                          name={order.customer_name || (order.table_number ? `Table ${order.table_number}` : 'No Table')} 
                          items={order.item_count || 0} 
                          status={order.status} 
                          subStatus={order.order_type}
                          color={order.status === 'Completed' ? 'bg-teal-600' : order.status === 'Pending' ? 'bg-yellow-500' : 'bg-teal-900'} 
                        />
                      ))}
                      {orders.length === 0 && (
                        <div className="text-center py-12 text-slate-400 font-medium">No active orders found</div>
                      )}
                    </div>
                  </section>

                  {/* Sidebar Info */}
                  <div className="col-span-1 lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold">Popular Dishes</h3>
                      </div>
                      <div className="space-y-4">
                        {dashboardStats?.popularDishes?.map((dish: any, idx: number) => (
                          <DishItem 
                            key={idx}
                            rank={(idx + 1).toString().padStart(2, '0')} 
                            name={dish.name} 
                            orders={dish.orders} 
                          />
                        ))}
                        {(!dashboardStats?.popularDishes || dashboardStats.popularDishes.length === 0) && (
                          <p className="text-xs text-slate-400 text-center py-4">No data for today yet</p>
                        )}
                      </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-red-500">Out of Stock</h3>
                      </div>
                      <div className="space-y-4">
                        {dashboardStats?.outOfStock?.map((item: any, idx: number) => (
                          <StockItem key={idx} name={item.name} time="N/A" />
                        ))}
                        {(!dashboardStats?.outOfStock || dashboardStats.outOfStock.length === 0) && (
                          <p className="text-xs text-slate-400 text-center py-4">All items in stock</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {isIframeTab && (
              <div className="h-[calc(100vh-72px)] w-full overflow-hidden relative bg-white">
                <iframe 
                  key={activeTab}
                  src={`${POS_URL}${POS_URL.endsWith('/') ? '' : '/'}${tabToRoute[activeTab]}?user=${encodeURIComponent(JSON.stringify(user))}&embedded=true`}
                  className="w-full h-full border-none"
                  title="POS Terminal"
                />
              </div>
            )}

            {activeTab === 'menu' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-teal-900">Digital Menu Viewer</h3>
                  <div className="flex gap-2">
                    {categories.map((cat: any) => (
                      <button
                        key={cat.id}
                        onClick={() => setActiveMenuCategory(cat)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          activeMenuCategory?.id === cat.id 
                            ? 'bg-teal-900 text-white shadow-lg shadow-teal-900/20' 
                            : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {activeMenuCategory?.items?.map((item: any) => (
                    <div key={item.id} className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-3 group hover:border-teal-900/20 transition-all">
                      <div className="aspect-square rounded-[1.5rem] bg-slate-50 overflow-hidden relative">
                         <img 
                            src={resolveImageUrl(item.image_url || item.image)} 
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500"
                         />
                         {!item.is_available && (
                           <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                             <span className="bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">Out of Stock</span>
                           </div>
                         )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm mb-1">{item.name}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-teal-900 font-bold text-sm">{currency}{parseFloat(item.price).toFixed(2)}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">{item.badge || 'Standard'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!activeMenuCategory?.items || activeMenuCategory.items.length === 0) && (
                    <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                      <p className="text-slate-400 font-medium">Select a category to view items</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'customers' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-teal-900">Customer Directory</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {customers.map((customer) => (
                    <div key={customer.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-teal-900/20 transition-all">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                          <Users2 size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 leading-tight">{customer.first_name} {customer.last_name}</p>
                          <p className="text-xs text-slate-400 font-medium">{customer.phone}</p>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-teal-900 uppercase tracking-widest">Regular Guest</span>
                        <button className="text-teal-900 text-xs font-bold uppercase hover:underline">View History</button>
                      </div>
                    </div>
                  ))}
                  {customers.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
                      <p className="text-slate-400 font-medium">No customers found in directory</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  </div>
  );
};

const SidebarItem = ({ icon, label, active, onClick, badge, color }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all group ${
      active ? 'bg-teal-900 text-white shadow-lg shadow-teal-900/20' : 'text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-100'
    }`}
  >
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-xl transition-colors ${active ? 'bg-white/20 text-white' : color}`}>
        {icon}
      </div>
      <span className={`text-[11px] font-bold uppercase tracking-widest ${active ? 'text-white' : 'text-slate-600'}`}>{label}</span>
    </div>
    {badge !== undefined && (
      <div className={`min-w-[20px] h-5 rounded-full flex items-center justify-center text-[10px] font-bold px-1.5 transition-all ${
        active ? 'bg-white text-teal-900' : 
        badge > 0 ? 'bg-teal-900 text-white shadow-lg shadow-teal-900/10' : 'bg-slate-100 text-slate-400'
      }`}>
        {badge}
      </div>
    )}
  </button>
);

const MobileNavItem = ({ icon, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`p-3 rounded-xl transition-all ${
      active ? 'text-teal-900 bg-teal-50' : 'text-slate-400 hover:text-slate-600'
    }`}
  >
    {icon}
  </button>
);

const StatCard = ({ title, value, icon, theme, subtitle, trend, trendColor = 'text-teal-600' }: any) => (
  <div className={`p-6 rounded-3xl shadow-sm border transition-all hover:scale-[1.02] ${
    theme === 'teal' ? 'bg-[#006064] text-white border-transparent shadow-teal-900/10' : 'bg-white text-slate-800 border-slate-100'
  }`}>
    <div className="flex justify-between items-center mb-4">
      <span className={`text-xs font-bold uppercase tracking-wider ${theme === 'teal' ? 'opacity-80' : 'text-slate-400'}`}>
        {title}
      </span>
      <div className={`p-2 rounded-lg ${theme === 'teal' ? 'bg-white/10' : 'bg-slate-50 text-slate-400'}`}>
        {icon}
      </div>
    </div>
    <div className="flex flex-col gap-1">
      <span className="text-3xl font-bold">{value}</span>
      {subtitle && <span className="text-[10px] opacity-70 font-medium">{subtitle}</span>}
      {trend && <span className={`text-[11px] font-bold ${trendColor}`}>{trend}</span>}
    </div>
  </div>
);

const OrderListItem = ({ id, name, items, status, subStatus, color }: any) => (
  <div className="flex items-center gap-3 group cursor-pointer hover:bg-slate-50/80 p-3 bg-slate-50/30 rounded-2xl transition-all border border-slate-100/50 hover:border-teal-900/10 hover:shadow-sm">
    <div className={`px-2.5 py-1.5 rounded-xl ${color} flex items-center justify-center text-white text-[9px] font-bold uppercase tracking-widest shrink-0 shadow-sm min-w-[70px] text-center`}>
      {id}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-bold text-xs text-slate-800 truncate">{name}</p>
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{items} Items</p>
    </div>
    <div className="text-right shrink-0">
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg ${
        status === 'Ready' || status === 'Completed' || status === 'Served' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50' : 
        status === 'Pending' || status === 'Ordered' ? 'bg-amber-50 text-amber-600 border border-amber-100/50' : 
        'bg-teal-50 text-teal-600 border border-teal-100/50'
      }`}>
        <span className="text-[9px] font-bold uppercase tracking-widest">{status}</span>
      </div>
      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">{subStatus}</p>
    </div>
  </div>
);

const DishItem = ({ rank, name, orders }: any) => (
  <div className="flex items-center gap-3">
    <span className="text-xs font-bold text-slate-300 w-4">{rank}</span>
    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
      <UtensilsCrossed size={18} className="text-slate-400" />
    </div>
    <div className="flex-1">
      <p className="text-sm font-bold truncate">{name}</p>
      <p className="text-xs text-slate-400 font-medium">Orders: {orders}</p>
    </div>
  </div>
);

const StockItem = ({ name, time }: any) => (
  <div className="flex items-center justify-between p-3 bg-red-50 rounded-2xl">
    <div className="flex-1 min-w-0">
      <p className="text-sm font-bold truncate text-red-900">{name}</p>
      <p className="text-[10px] text-red-500 font-bold">RE-STOCK AT {time}</p>
    </div>
  </div>
);

export default Dashboard;
