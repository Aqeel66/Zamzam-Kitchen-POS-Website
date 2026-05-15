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
  Loader2
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
  const { user, logout } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersData, statsData] = await Promise.all([
          orderService.fetchOrders(),
          orderService.fetchDashboardStats()
        ]);
        setOrders(ordersData);
        setDashboardStats(statsData);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
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
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 min-h-[400px] flex flex-col items-center justify-center text-center">
                <UtensilsCrossed size={48} className="text-slate-200 mb-4" />
                <h3 className="text-xl font-bold text-teal-900 mb-2">Digital Menu</h3>
                <p className="text-slate-500 max-w-xs">Use the "Create New Order" button to browse full menu and place orders.</p>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-teal-900 mb-6">All Active Orders</h3>
                {orders.map((order) => (
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
              </div>
            )}

            {activeTab === 'table' && (
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 min-h-[400px] flex flex-col items-center justify-center text-center">
                <LayoutDashboard size={48} className="text-slate-200 mb-4" />
                <h3 className="text-xl font-bold text-teal-900 mb-2">Table Management</h3>
                <p className="text-slate-500 max-w-xs">Coming soon: Live table occupancy tracking.</p>
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
