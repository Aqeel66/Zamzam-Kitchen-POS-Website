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
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { orderService } from '../services/orderService';
import NewOrder from './NewOrder';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, logout } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        // Fetch orders and stats separately to avoid one failing the other
        try {
          const ordersData = await orderService.fetchOrders();
          setOrders(Array.isArray(ordersData) ? ordersData : []);
        } catch (e) { 
          console.error('Orders fetch failed', e);
          setError("Backend connection issue. Please restart your server.");
        }

        try {
          const statsData = await orderService.fetchDashboardStats();
          setDashboardStats(statsData);
        } catch (e) { console.error('Dashboard stats fetch failed', e); }

      } catch (err) {
        console.error('General data fetch error:', err);
        setError("Failed to initialize dashboard.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const stats = {
    new: orders.filter(o => o.status === 'Pending').length,
    total: orders.length,
    waiting: orders.filter(o => o.status === 'Preparing').length
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#F8F9FA] overflow-hidden">
      {showNewOrder && <NewOrder onClose={() => setShowNewOrder(false)} />}
      
      {/* Desktop Sidebar (Hidden on Mobile) */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col">
        <div className="p-8 flex items-center gap-3">
          <div className="bg-teal-900/10 p-2 rounded-xl">
            <UtensilsCrossed className="text-teal-900 w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-teal-900 tracking-tight">zamzam kitchen</h1>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <SidebarItem 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <SidebarItem 
            icon={<UtensilsCrossed size={20} />} 
            label="Menu" 
            active={activeTab === 'menu'} 
            onClick={() => setActiveTab('menu')} 
          />
          <SidebarItem 
            icon={<ClipboardList size={20} />} 
            label="Orders" 
            active={activeTab === 'orders'} 
            onClick={() => setActiveTab('orders')} 
          />
          <SidebarItem 
            icon={<User size={20} />} 
            label="Table" 
            active={activeTab === 'table'} 
            onClick={() => setActiveTab('table')} 
          />
        </nav>

        <div className="p-6 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
              <User className="text-slate-500 w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{user?.first_name} {user?.last_name}</p>
              <p className="text-xs text-slate-500 font-medium">Waiter</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-2 text-slate-500 hover:text-red-500 transition-colors text-sm font-medium w-full"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation (Hidden on Desktop) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around items-center p-2 z-[60] pb-safe">
        <MobileNavItem icon={<LayoutDashboard size={22} />} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <MobileNavItem icon={<UtensilsCrossed size={22} />} active={activeTab === 'menu'} onClick={() => setActiveTab('menu')} />
        <button onClick={() => setShowNewOrder(true)} className="bg-zamzam-yellow p-4 rounded-2xl -mt-8 shadow-lg shadow-yellow-500/30 active:scale-90 transition-all"><Plus size={24} /></button>
        <MobileNavItem icon={<ClipboardList size={22} />} active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} />
        <MobileNavItem icon={<LogOut size={22} />} onClick={logout} />
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Nice! We have a lot of orders <span role="img" aria-label="emoji">😁</span>
            </h2>
          </div>
          <div className="text-sm font-medium text-slate-500">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </header>

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
                {/* Stats Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <StatCard 
                    title="New Orders" 
                    value={stats.new} 
                    icon={<Bell size={20} />} 
                    theme="teal" 
                    subtitle="* Newest"
                  />
                  <StatCard 
                    title="Total Orders" 
                    value={stats.total} 
                    icon={<CheckCircle2 size={20} />} 
                    theme="white" 
                    trend="+2,5% than usual"
                  />
                  <StatCard 
                    title="Waiting List" 
                    value={stats.waiting} 
                    icon={<Clock size={20} />} 
                    theme="white" 
                    trend="+3,2% than usual"
                    trendColor="text-yellow-600"
                  />
                  <button 
                    onClick={() => setShowNewOrder(true)}
                    className="bg-[#FFB300] hover:bg-[#FFA000] transition-all rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-yellow-500/20 active:scale-95 group"
                  >
                    <Plus className="group-hover:rotate-90 transition-transform" />
                    <span className="font-bold uppercase">Create New Order</span>
                  </button>
                </div>

                {/* Lists Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-24 lg:pb-0">
                  {/* Order List */}
                  <section className="col-span-1 lg:col-span-8 bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-teal-900">Live Order Tracking</h3>
                    </div>
                    <div className="space-y-4">
                      {orders.slice(0, 10).map((order) => (
                        <OrderListItem 
                          key={order.id}
                          id={order.order_number?.slice(-3) || order.id} 
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

            {activeTab === 'menu' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-teal-900">Digital Menu Viewer</h3>
                  <button onClick={() => setShowNewOrder(true)} className="bg-zamzam-yellow px-6 py-2 rounded-xl font-bold text-sm shadow-sm active:scale-95 transition-all">
                    START NEW ORDER
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dashboardStats?.popularDishes?.map((dish: any, idx: number) => (
                    <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-900">
                        <UtensilsCrossed size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{dish.name}</p>
                        <p className="text-xs text-slate-400 font-medium">Daily Favorite</p>
                      </div>
                    </div>
                  ))}
                  {(!dashboardStats?.popularDishes || dashboardStats.popularDishes.length === 0) && (
                    <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                      <p className="text-slate-400 font-medium">Menu browsing is active. Click "Create New Order" to see the full catalog with categories.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-4 pb-20">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-teal-900">All Active Orders</h3>
                  <div className="flex gap-2">
                    <span className="bg-teal-900 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase">{orders.length} ACTIVE</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {orders.map((order) => (
                    <div key={order.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:border-teal-900/20 transition-all cursor-pointer group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl ${order.status === 'Completed' ? 'bg-teal-600' : 'bg-teal-900'} flex items-center justify-center text-white text-xs font-black shadow-lg`}>
                            {order.order_number?.slice(-3) || order.id}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{order.customer_name || `Table ${order.table_number || '??'}`}</p>
                            <p className="text-[10px] text-slate-400 font-black uppercase">{order.order_type}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase ${
                          order.status === 'Ready' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                        <span className="text-xs text-slate-400 font-medium">{order.item_count || 0} Items Selected</span>
                        <span className="text-sm font-black text-teal-900">£{parseFloat(order.total_amount).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                  {orders.length === 0 && (
                    <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                      <p className="text-slate-400 font-medium">No active orders found</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'table' && (
              <div className="bg-white rounded-[2.5rem] p-12 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-teal-50 rounded-3xl flex items-center justify-center text-teal-900 mb-6">
                  <LayoutDashboard size={32} />
                </div>
                <h3 className="text-2xl font-black text-teal-900 mb-2 uppercase tracking-tight">Table View</h3>
                <p className="text-slate-500 max-w-xs font-medium text-sm">
                  Switching to "Select Table" in the Order flow provides a live view of available tables.
                </p>
                <button onClick={() => setShowNewOrder(true)} className="mt-8 bg-teal-900 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-teal-900/20 active:scale-95 transition-all">
                  Open Table Map
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

const SidebarItem = ({ icon, label, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
      active ? 'bg-[#FFB300] text-slate-900 font-bold' : 'text-slate-500 hover:bg-slate-50'
    }`}
  >
    {icon}
    <span className="text-sm">{label}</span>
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
      <span className="text-3xl font-black">{value}</span>
      {subtitle && <span className="text-[10px] opacity-70 font-medium">{subtitle}</span>}
      {trend && <span className={`text-[11px] font-black ${trendColor}`}>{trend}</span>}
    </div>
  </div>
);

const OrderListItem = ({ id, name, items, status, subStatus, color }: any) => (
  <div className="flex items-center gap-3 group cursor-pointer hover:bg-slate-50 p-2 rounded-2xl transition-colors border border-transparent hover:border-slate-100">
    <div className={`w-11 h-11 rounded-full ${color} flex items-center justify-center text-white text-xs font-black shadow-sm`}>
      {id}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-bold text-sm truncate">{name}</p>
      <p className="text-xs text-slate-400 font-medium">{items} Items</p>
    </div>
    <div className="text-right">
      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${
        status === 'Ready' || status === 'Completed' ? 'bg-teal-50 text-teal-600' : 'bg-yellow-50 text-yellow-600'
      }`}>
        <span className="text-[10px] font-black uppercase tracking-wider">{status}</span>
      </div>
      <p className="text-[10px] text-slate-400 font-medium mt-1">{subStatus}</p>
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
