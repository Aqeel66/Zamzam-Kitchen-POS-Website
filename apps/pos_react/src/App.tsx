import { useState, useEffect, Component, type ErrorInfo, type ReactNode } from 'react';
import { Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  BarChart3, 
  Package, 
  Users, 
  Settings as SettingsIcon, 
  LogOut,
  Bell,
  Search,
  ChefHat,
  LayoutGrid,
  Ticket,
  Shield,
  ShieldCheck,
  Table,
  Calendar,
  ClipboardList,
  UserSquare2,
  Truck,
  AlertCircle,
  UtensilsCrossed,
  Key,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL, resolveImageUrl } from './config';

import { useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Reports from './pages/Reports';
import Inventory from './pages/Inventory';
import Purchases from './pages/Purchases';
import Staff from './pages/Staff';
import KDS from './pages/KDS';
import Settings from './pages/Settings';
import Login from './pages/Login';
import MenuDesigner from './pages/MenuDesigner';
import Customers from './pages/Customers';
import Promotions from './pages/Promotions';
import QRMenu from './pages/QRMenu';
import Permissions from './pages/Permissions';
import Reservations from './pages/Reservations';
import Tables from './pages/Tables';
import OrderStatus from './pages/OrderStatus';
import WaitingList from './pages/WaitingList';
import Categories from './pages/Categories';
import FoodItems from './pages/FoodItems';
import { CartProvider } from './context/CartContext';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs.filter(Boolean)));
}

// Error Boundary to prevent white screen crashes
class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white rounded-[2.5rem] m-6 border border-slate-100 shadow-sm">
          <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-500 mb-6">
            <AlertCircle size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2 uppercase tracking-tight">Something went wrong</h2>
          <p className="text-slate-500 mb-8 max-w-md text-sm font-medium">This page encountered an error while rendering. Try reloading the application.</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-zamzam-teal text-white px-10 py-5 rounded-2xl font-bold uppercase tracking-widest shadow-xl shadow-teal-900/20 active:scale-95 transition-all text-xs"
          >
            Reload POS Terminal
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const getTodayStr = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

const rawNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/', perm: 'view_dashboard' },
  { type: 'header', label: 'Menu Management' },
  { icon: UtensilsCrossed, label: 'Food Items', path: '/food-items', perm: 'manage_menu' },
  { icon: LayoutGrid, label: 'Categories', path: '/categories', perm: 'manage_menu' },
  { type: 'header', label: 'Operations' },
  { icon: Package, label: 'Inventory', path: '/inventory', perm: 'manage_inventory' },
  { icon: Truck, label: 'Purchases', path: '/purchases', perm: 'manage_purchase' },
  { icon: Users, label: 'Staff', path: '/staff', perm: 'manage_users' },
  { icon: ShieldCheck, label: 'Roles & Permissions', path: '/permissions', perm: 'manage_roles' },
  { icon: UserSquare2, label: 'Customers', path: '/customers', perm: 'manage_customers' },
  { icon: BarChart3, label: 'Reports', path: '/reports', perm: 'view_reports' },
  { icon: Ticket, label: 'Promotions', path: '/promotions', perm: 'manage_promotions' },
  { icon: SettingsIcon, label: 'Settings', path: '/settings', perm: 'manage_settings_general' },
];

const ProtectedRoute = ({ perm, children }: { perm: string | string[], children: React.ReactNode }) => {
  const { user } = useAuth();
  const location = useLocation();
  const perms = Array.isArray(perm) ? perm : [perm];
  
  const hasAccess = perms.some(p => {
    if (!user || !user.permissions) return false;
    return user.permissions.some((up: string) => up.toLowerCase() === p.toLowerCase());
  });
  
  if (!hasAccess) {
    if (location.pathname === '/') {
      const allRoutes = [
        { path: '/orders', perm: 'access_pos' },
        { path: '/kds', perm: 'view_kds' },
        { path: '/order-status', perm: 'manage_orders' },
        { path: '/reservations', perm: 'manage_reservations' },
        { path: '/tables', perm: 'manage_tables' },
        ...rawNavItems
      ];
      const firstAccessibleRoute = allRoutes.find(item => {
        if (!item.path || item.path === '/') return false;
        if (!item.perm) return false;
        return user?.permissions?.some((up: string) => up.toLowerCase() === (item.perm as string).toLowerCase());
      });
      if (firstAccessibleRoute && firstAccessibleRoute.path) {
        return <Navigate to={firstAccessibleRoute.path} replace />;
      }
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center h-full">
        <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-500 mb-6">
          <Shield size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2 uppercase tracking-tight">Access Restricted</h2>
        <p className="text-slate-500 mb-8 max-w-md text-sm font-medium">You don't have permission to view this module. Please contact your administrator if you need access.</p>
      </div>
    );
  }
  return <>{children}</>;
};

export default function App() {
  const { isAuthenticated, logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [changePasswordData, setChangePasswordData] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (!searchQuery || searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await fetch(`${API_BASE_URL}/orders?search=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data.slice(0, 5) : []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);
  
  const [settings, setSettings] = useState<any>({
    tenant: { restaurant_name: 'Zamzam Kitchen', tagline: 'Loading...' },
    branch: {}
  });

  const [kdsCount, setKdsCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [waitingCount, setWaitingCount] = useState(0);
  const [reservationCount, setReservationCount] = useState(0);
  const [occupiedTableCount, setOccupiedTableCount] = useState(0);
  const [liveNotifications, setLiveNotifications] = useState<any[]>([]);
  const [lastNotificationId, setLastNotificationId] = useState<number>(0);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  const hasPermission = (perm: string) => {
    if (!user || !user.permissions) return false;
    return user.permissions.some(p => p.toLowerCase() === perm.toLowerCase());
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (changePasswordData.new_password !== changePasswordData.confirm_password) {
      showToast('New passwords do not match', 'error');
      return;
    }
    if (!user) return;
    setIsChangingPassword(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/${user.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          old_password: changePasswordData.old_password,
          new_password: changePasswordData.new_password
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Password updated successfully', 'success');
        setIsChangePasswordModalOpen(false);
        setChangePasswordData({ old_password: '', new_password: '', confirm_password: '' });
      } else {
        showToast(data.error || 'Failed to update password', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('An error occurred', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Initial fallback notifications
  const defaultNotifications = [
    { id: 'd1', title: 'System Online', time: 'Just now', content: 'POS Terminal initialized successfully', type: 'system' },
  ];

  const [isStatsFetching, setIsStatsFetching] = useState(false);
  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/settings?t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSettings(data);
      if (data?.tenant?.primary_accent_color) {
        const color = data.tenant.primary_accent_color;
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
          document.documentElement.style.setProperty('--zamzam-teal-rgb', `${r} ${g} ${b}`);
        }
      }
    } catch (err) {
      console.error('Settings load failed:', err);
    }
  };

  const fetchLiveStats = async () => {
    if (isStatsFetching) return;
    setIsStatsFetching(true);
    
    // If settings are still loading, try fetching them again
    if (settings?.tenant?.tagline === 'Loading...') {
      fetchSettings();
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const [ordRes, resRes, tableRes] = await Promise.all([
        fetch(`${API_BASE_URL}/orders?includeSplits=true&t=${Date.now()}`, { signal: controller.signal }),
        fetch(`${API_BASE_URL}/reservations?startDate=2024-01-01`, { signal: controller.signal }),
        fetch(`${API_BASE_URL}/tables`, { signal: controller.signal })
      ]);
      
      clearTimeout(timeoutId);
      const ordersData = await ordRes.json();
      const resData = await resRes.json();
      const tablesData = await tableRes.json();

      const ordersArray = Array.isArray(ordersData) ? ordersData : [];
      const resArray = Array.isArray(resData) ? resData : [];

      console.log('--- POS LIVE STATS SYNC ---');
      const getLowerStatus = (o: any) => (o.status || '').toLowerCase().trim();
      const todayStr = new Date().toISOString().split('T')[0];

      // Exclude split child orders and split parent orders (Partially Paid) from standard live counts
      const primaryOrders = ordersArray.filter((o: any) => {
        const isChild = o.parent_order_id !== null && o.parent_order_id !== undefined;
        const isParent = getLowerStatus(o) === 'partially paid';
        return !isChild && !isParent;
      });

      setKdsCount(primaryOrders.filter((o: any) => ['ordered', 'pending', 'preparing', 'paid'].includes(getLowerStatus(o))).length);
      setReservationCount(resArray.filter((r: any) => (r.status === 'Pending' || r.status === 'Confirmed') && r.reservation_date >= todayStr).length);
      setOrderCount(primaryOrders.length);
      setWaitingCount(primaryOrders.filter((o: any) => ['waiting', 'ready'].includes(getLowerStatus(o))).length);
      setPendingCount(primaryOrders.filter((o: any) => ['pending', 'ordered'].includes(getLowerStatus(o))).length);

      if (Array.isArray(tablesData) && Array.isArray(ordersArray)) {
        const activeTableIdentifiers = new Set();
        primaryOrders.filter((o: any) => (o.table_id || o.table_number) && !['cancelled', 'rejected', 'completed'].includes(getLowerStatus(o))).forEach((o: any) => {
          if (o.table_id) activeTableIdentifiers.add(String(o.table_id));
          else if (o.table_number) {
            const tableObj = tablesData.find((t: any) => String(t.table_number).toLowerCase().trim() === String(o.table_number).toLowerCase().trim());
            if (tableObj) activeTableIdentifiers.add(String(tableObj.id));
          }
        });
        setOccupiedTableCount(activeTableIdentifiers.size);
      }

      const websiteRes = resArray.filter((r: any) => (r.origin?.toLowerCase() === 'website' || r.origin?.toLowerCase() === 'web') && r.status === 'Pending');
      setLiveNotifications(prev => {
        const existingIds = new Set(prev.map(n => n.id));
        const newNotifs = websiteRes.map((r: any) => ({ id: `res-${r.id}`, title: 'New Web Booking', time: 'Action Required', content: `${r.first_name} booked Table ${r.assigned_table_number || 'TBD'} for ${r.party_size} guests`, type: 'reservation' }));
        const filteredNew = newNotifs.filter(n => !existingIds.has(n.id));
        return [...filteredNew, ...prev].slice(0, 10);
      });
    } catch (err) {
      console.error('Live Stats Error:', err);
    } finally {
      setIsStatsFetching(false);
      clearTimeout(timeoutId);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchSettings();
      fetchLiveStats();
      const statsInterval = setInterval(fetchLiveStats, 10000);
      const handleSettingsUpdate = () => fetchSettings();
      window.addEventListener('settings-updated', handleSettingsUpdate);
      window.addEventListener('show-toast', (e: any) => showToast(e.detail.message, e.detail.type));
      return () => {
        window.removeEventListener('settings-updated', handleSettingsUpdate);
        clearInterval(statsInterval);
      };
    }
  }, [isAuthenticated]);

  if (location.pathname.startsWith('/menu/table/')) {
    return (
      <Routes>
        <Route path="/menu/table/:tableId" element={<QRMenu />} />
      </Routes>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const navItems = rawNavItems.filter(item => {
    if (item.type === 'header') {
      if (item.label === 'Menu Management') return hasPermission('manage_menu');
      if (item.label === 'Operations') {
        return ['manage_inventory', 'manage_purchase', 'manage_users', 'manage_roles', 'manage_customers', 'view_reports', 'manage_promotions', 'manage_settings_general'].some(p => hasPermission(p));
      }
      return true;
    }
    return hasPermission(item.perm as string);
  });

  const getSidebarBg = () => {
    const mode = settings?.tenant?.theme_mode || 'Light';
    switch(mode) {
      case 'Zamzam Classic': return '#0D9488';
      case 'Emerald Green': return '#059669';
      case 'Aura Purple': return '#581c87';
      case 'Midnight Blue': return '#1e1b4b';
      case 'Dark': return '#0f172a';
      case 'Light': return '#f8fafc';
      default: return settings?.tenant?.primary_accent_color || '#f8fafc';
    }
  };

  const isLightSidebar = settings?.tenant?.theme_mode === 'Light' || !settings?.tenant?.theme_mode;

  const isEmbedded = 
    new URLSearchParams(location.search).get('embedded') === 'true' ||
    new URLSearchParams(window.location.search).get('embedded') === 'true' ||
    (typeof window !== 'undefined' && window.self !== window.top);

  return (
    <div className="flex h-screen bg-bg-main overflow-hidden">
      {/* Sidebar */}
      {!isEmbedded && (
        <aside 
          style={{ backgroundColor: getSidebarBg() }}
          className={cn(
            "w-60 flex flex-col shadow-2xl z-20 transition-colors duration-500",
            isLightSidebar ? "border-r border-slate-200" : "border-r border-white/5"
          )}
        >
        <div className={cn(
          "p-4 flex flex-col items-center gap-4 border-b pb-5 mb-1",
          isLightSidebar ? "border-slate-100" : "border-white/5"
        )}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 flex items-center justify-center overflow-hidden shrink-0 group transition-transform duration-500 hover:rotate-6">
              {settings?.tenant?.logo_url ? (
                <img src={resolveImageUrl(settings.tenant.logo_url) || ''} className={cn("w-full h-full object-contain filter", isLightSidebar ? "drop-shadow-md" : "drop-shadow-lg")} />
              ) : (
                <ShoppingCart className={cn("w-8 h-8", isLightSidebar ? "text-zamzam-teal" : "text-white")} />
              )}
            </div>
            {settings?.tenant?.secondary_logo_url && (
              <div className="w-14 h-14 flex items-center justify-center overflow-hidden shrink-0 transition-all hover:scale-110">
                <img src={resolveImageUrl(settings.tenant.secondary_logo_url) || ''} className={cn("w-full h-full object-contain", isLightSidebar ? "" : "brightness-0 invert opacity-80")} />
              </div>
            )}
          </div>

          <div className="text-center">
            <h1 className={cn(
              "font-bold text-sm tracking-tighter uppercase leading-none drop-shadow-md",
              isLightSidebar ? "text-slate-900" : "text-white"
            )}>
              {settings?.tenant?.restaurant_name || 'Zamzam'}
            </h1>
            <p className={cn(
              "text-[8px] font-bold uppercase tracking-[0.3em] mt-1 truncate max-w-[160px]",
              isLightSidebar ? "text-slate-400" : "text-white/50"
            )}>
              {settings?.tenant?.tagline || 'POS Terminal'}
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto no-scrollbar">
          {navItems.map((item, idx) => {
            if ((item as any).type === 'header') {
              return (
                <div key={idx} className="px-4 pt-6 pb-2.5">
                  <p className={cn(
                    "text-[10px] font-semibold uppercase tracking-[0.15em]",
                    isLightSidebar ? "text-slate-500/80" : "text-white/40"
                  )}>
                    {(item as any).label}
                  </p>
                </div>
              );
            }
            const isActive = location.pathname === item.path;
            const isSettings = item.label === 'Settings';
            return (
              <div key={item.path} className={cn(isSettings && "pt-4 mt-4 border-t border-white/10")}>
                <Link 
                  to={item.path!}
                  className={cn(
                    "flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-300 group relative",
                    isActive 
                      ? isLightSidebar 
                          ? "bg-zamzam-teal/10 text-zamzam-teal shadow-sm"
                          : "bg-white/12 text-white shadow-lg shadow-black/20" 
                      : isLightSidebar
                          ? "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                          : "text-white/70 hover:bg-white/15 hover:text-white"
                  )}
                >
                  {(() => {
                    const IconComponent = item.icon as any;
                    return IconComponent ? (
                      <IconComponent className={cn(
                        "w-5 h-5 transition-all duration-300",
                        isActive 
                          ? "text-zamzam-yellow scale-110" 
                          : isLightSidebar
                              ? "text-slate-400 group-hover:text-zamzam-teal group-hover:scale-110"
                              : "group-hover:scale-110 opacity-60 group-hover:opacity-100"
                      )} />
                    ) : null;
                  })()}
                  <span className={cn(
                    "font-medium text-[13.5px] tracking-tight transition-all",
                    isActive ? "font-semibold" : ""
                  )}>
                    {item.label}
                  </span>
                  {isActive && (
                    <motion.div 
                      layoutId="active-indicator"
                      className="absolute left-0 w-1.5 h-6 bg-zamzam-yellow rounded-r-full shadow-[0_0_12px_rgba(255,179,0,0.5)]"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                    />
                  )}
                </Link>
              </div>
            );
          })}
          
          <div className="pt-6 pb-4">
            <button 
              onClick={() => {
                logout();
                window.location.href = '/pos/';
              }}
              className="w-full px-4 py-2.5 bg-white/5 hover:bg-red-500/10 rounded-xl text-[8px] font-bold text-white/20 hover:text-red-400 uppercase tracking-[0.3em] transition-all border border-transparent hover:border-red-500/20"
            >
              Emergency Reset
            </button>
          </div>
        </nav>
      </aside>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        {!isEmbedded && (
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="relative w-72 group z-50">
              {location.pathname !== '/menu-designer' && (
                <>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-zamzam-teal transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Search orders or customers..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSearchResults(true);
                    }}
                    onFocus={() => setShowSearchResults(true)}
                    className="w-full bg-slate-100 border-none rounded-xl py-2 pl-9 pr-3 text-xs font-medium focus:ring-2 focus:ring-zamzam-teal/10 focus:bg-white transition-all outline-none shadow-inner"
                  />
                  
                  {showSearchResults && (searchQuery.length >= 2) && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowSearchResults(false)} />
                      <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50">
                        {isSearching ? (
                          <div className="p-4 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">Searching...</div>
                        ) : searchResults.length > 0 ? (
                          <div className="max-h-80 overflow-y-auto no-scrollbar">
                            {searchResults.map(order => (
                              <button 
                                key={order.id}
                                onClick={() => {
                                  setShowSearchResults(false);
                                  setSearchQuery('');
                                  navigate('/orders'); // Assuming they can find it on the Orders page
                                }}
                                className="w-full text-left p-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors flex items-center justify-between group"
                              >
                                <div>
                                  <p className="text-xs font-bold text-slate-900 group-hover:text-zamzam-teal transition-colors">
                                    Order #{order.order_number || order.id}
                                  </p>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                                    {order.customer_name || 'Guest'}
                                  </p>
                                </div>
                                <span className={cn(
                                  "text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg",
                                  order.status === 'Paid' ? "bg-green-50 text-green-600" :
                                  order.status === 'Pending' ? "bg-orange-50 text-orange-600" :
                                  "bg-slate-100 text-slate-500"
                                )}>
                                  {order.status}
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">No results found</div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* LIVE STATUS BADGES - Unified Header Tabs */}
            {!isEmbedded && (
              <div className="flex items-center gap-3">
                {hasPermission('access_pos') && (
                  <Link to="/orders" className="flex items-center gap-2 px-4 py-2 bg-orange-50 hover:bg-orange-100 border border-orange-100 rounded-xl transition-all group shadow-sm">
                    <ShoppingCart size={16} className="text-orange-500 group-hover:scale-110 transition-transform shrink-0" />
                    <span className="text-[10px] font-bold text-orange-900 uppercase tracking-widest">POS</span>
                  </Link>
                )}

                {hasPermission('view_kds') && (
                  <Link to="/kds" className="flex items-center gap-2 px-4 py-2 bg-teal-50 hover:bg-teal-100 border border-teal-100 rounded-xl transition-all group shadow-sm">
                    <div className="relative shrink-0">
                      <ChefHat size={16} className="text-zamzam-teal group-hover:scale-110 transition-transform" />
                      {kdsCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse shadow-sm shadow-teal-500/50" />}
                    </div>
                    <span className="text-[10px] font-bold text-zamzam-teal uppercase tracking-widest">KDS</span>
                    <span className="text-[9px] font-bold bg-teal-500 text-white px-2 py-0.5 rounded-full min-w-[18px] text-center shadow-sm">{kdsCount}</span>
                  </Link>
                )}

                {hasPermission('manage_orders') && (
                  <Link to="/order-status" className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all group shadow-sm">
                    <div className="relative shrink-0">
                      <ClipboardList size={16} className="text-slate-600 group-hover:scale-110 transition-transform" />
                      {pendingCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shadow-sm shadow-amber-500/50" />}
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Orders</span>
                    <span className="text-[9px] font-bold bg-slate-500 text-white px-2 py-0.5 rounded-full min-w-[18px] text-center shadow-sm">{orderCount}</span>
                  </Link>
                )}

                {(hasPermission('manage_reservations') || hasPermission('manage_tables')) && (
                  <Link to="/waiting-list" className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl transition-all group shadow-sm">
                    <div className="relative shrink-0">
                      <Users size={16} className="text-blue-500 group-hover:scale-110 transition-transform" />
                      {waitingCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-sm shadow-blue-500/50" />}
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Waiting</span>
                    <span className="text-[9px] font-bold bg-blue-500 text-white px-2 py-0.5 rounded-full min-w-[18px] text-center shadow-sm">{waitingCount}</span>
                  </Link>
                )}
              </div>
            )}
          </div>
 
          {/* Right Side Actions & User Profile */}
          <div className="flex items-center gap-4">
            {!isEmbedded && (
              <div className="flex items-center gap-2">
                {hasPermission('manage_reservations') && (
                  <Link to="/reservations" className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl transition-all group shadow-sm border",
                    location.pathname === '/reservations'
                      ? "bg-indigo-600 text-white shadow-indigo-500/20"
                      : "bg-indigo-50 text-indigo-600 border-indigo-100"
                  )}>
                    <Calendar size={13} className={cn(
                      "group-hover:scale-110 transition-transform shrink-0",
                      location.pathname === '/reservations' ? "text-white" : "text-indigo-500"
                    )} />
                    <span className={cn(
                      "text-[8px] font-bold uppercase tracking-wider",
                      location.pathname === '/reservations' ? "text-white" : "text-indigo-600"
                    )}>Reservation</span>
                    <span className={cn(
                      "text-[7px] font-bold px-1 py-0.5 rounded-full min-w-[14px] text-center",
                      location.pathname === '/reservations' ? "bg-white/20 text-white" : "bg-indigo-500 text-white"
                    )}>{reservationCount}</span>
                  </Link>
                )}
   
                {hasPermission('manage_tables') && (
                  <Link to="/tables" className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 hover:bg-green-100 border border-green-100 rounded-xl transition-all group shadow-sm shadow-green-500/5">
                    <div className="relative shrink-0">
                      <Table size={13} className="text-green-600 group-hover:scale-110 transition-transform" />
                      {occupiedTableCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-1 h-1 bg-green-500 rounded-full animate-pulse" />}
                    </div>
                    <span className="text-[8px] font-bold text-green-700 uppercase tracking-wider">Tables</span>
                    <span className="text-[7px] font-bold bg-green-600 text-white px-1 py-0.5 rounded-full min-w-[14px] text-center">{occupiedTableCount}</span>
                  </Link>
                )}
              </div>
            )}
 
            {!isEmbedded && <div className="h-6 w-px bg-slate-200 mx-1" />}
 
            {!isEmbedded && (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className={cn(
                      "relative p-1.5 rounded-lg transition-all",
                      showNotifications ? "bg-zamzam-teal text-white shadow-lg shadow-teal-900/20" : "text-slate-400 hover:text-zamzam-teal hover:bg-slate-50"
                    )}
                  >
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full border border-white" />
                  </button>
  
                  <AnimatePresence>
                    {showNotifications && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 mt-3 w-80 bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden z-50 shadow-slate-900/10"
                        >
                          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                            <h3 className="font-bold text-sm uppercase tracking-widest text-slate-900">Notifications</h3>
                            <span className="text-[9px] font-bold text-zamzam-teal bg-teal-50 px-2 py-1 rounded-lg">{liveNotifications.length + defaultNotifications.length} NEW</span>
                          </div>
                          <div className="max-h-96 overflow-y-auto no-scrollbar">
                            {[...liveNotifications, ...defaultNotifications].map((n) => (
                              <div key={n.id} className="p-4 hover:bg-slate-50 border-b border-slate-50 transition-colors cursor-pointer group">
                                <div className="flex justify-between items-start mb-1">
                                  <p className={cn(
                                    "text-[10px] font-bold uppercase tracking-tight transition-colors",
                                    n.type === 'reservation' ? "text-purple-600" : "text-slate-900 group-hover:text-zamzam-teal"
                                  )}>
                                    {n.title}
                                  </p>
                                  <span className="text-[9px] font-bold text-slate-400">{n.time}</span>
                                </div>
                                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{n.content}</p>
                              </div>
                            ))}
                          </div>
                          <button className="w-full p-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:text-zamzam-teal transition-colors bg-slate-50/50">
                            View All Activities
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
                
                <div className="h-5 w-px bg-slate-200" />
                
                <div className="relative">
                  <button 
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center gap-3 hover:bg-slate-50 p-1.5 rounded-xl transition-all"
                  >
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-bold text-slate-900 leading-none uppercase">{user?.first_name} {user?.last_name}</p>
                      <p className="text-[7px] font-bold text-teal-600 uppercase tracking-widest mt-0.5">{user?.roles}</p>
                    </div>
                  </button>

                  <AnimatePresence>
                    {showProfileMenu && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 flex flex-col p-2 gap-1"
                        >
                          <button 
                            onClick={() => {
                              setIsChangePasswordModalOpen(true);
                              setShowProfileMenu(false);
                            }}
                            className="flex items-center gap-3 w-full p-2.5 text-left hover:bg-slate-50 rounded-xl transition-all group"
                          >
                            <div className="p-1.5 bg-indigo-50 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white rounded-lg transition-all">
                              <Key className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Change Password</span>
                          </button>
                          
                          <div className="h-px w-full bg-slate-100 my-1" />
                          
                          <button 
                            onClick={() => {
                              logout();
                              window.location.href = '/pos/';
                            }}
                            className="flex items-center gap-3 w-full p-2.5 text-left hover:bg-red-50/50 rounded-xl transition-all group"
                          >
                            <div className="p-1.5 bg-red-50 text-red-500 group-hover:bg-red-500 group-hover:text-white rounded-lg transition-all">
                              <LogOut className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Sign Out</span>
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        </header>
        )}

        <div className="flex-1 overflow-y-auto no-scrollbar bg-slate-50">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<ProtectedRoute perm="view_dashboard"><Dashboard /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute perm="access_pos"><Orders /></ProtectedRoute>} />
              <Route path="/order-status" element={<ProtectedRoute perm="manage_orders"><OrderStatus /></ProtectedRoute>} />
              <Route path="/waiting-list" element={<ProtectedRoute perm={['manage_reservations', 'manage_tables']}><WaitingList /></ProtectedRoute>} />
              <Route path="/reservations" element={<ProtectedRoute perm="manage_reservations"><Reservations /></ProtectedRoute>} />
              <Route path="/tables" element={<ProtectedRoute perm="manage_tables"><Tables /></ProtectedRoute>} />
              <Route path="/kds" element={<ProtectedRoute perm="view_kds"><KDS /></ProtectedRoute>} />
              <Route path="/menu-designer" element={<ProtectedRoute perm="manage_menu"><MenuDesigner /></ProtectedRoute>} />
              <Route path="/categories" element={<ProtectedRoute perm="manage_menu"><Categories /></ProtectedRoute>} />
              <Route path="/food-items" element={<ProtectedRoute perm="manage_menu"><FoodItems /></ProtectedRoute>} />
              <Route path="/customers" element={<ProtectedRoute perm="manage_customers"><Customers /></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute perm="manage_inventory"><Inventory /></ProtectedRoute>} />
              <Route path="/purchases" element={<ProtectedRoute perm="manage_purchase"><Purchases /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute perm="view_reports"><Reports /></ProtectedRoute>} />
              <Route path="/staff" element={<ProtectedRoute perm={['manage_users', 'manage_hr']}><Staff /></ProtectedRoute>} />
              <Route path="/permissions" element={<ProtectedRoute perm="manage_roles"><Permissions /></ProtectedRoute>} />
              <Route path="/promotions" element={<ProtectedRoute perm="manage_promotions"><Promotions /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute perm="manage_settings_general"><Settings /></ProtectedRoute>} />
            </Routes>
          </ErrorBoundary>
        </div>

        {/* Global Toast Notification (Flutter Style) */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, x: -20, y: 0 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={cn(
                "fixed bottom-6 left-6 z-[9999] px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3",
                toast.type === 'success' ? "bg-emerald-500 text-white border-emerald-400" : 
                toast.type === 'error' ? "bg-red-500 text-white border-red-400" :
                "bg-slate-800 text-white border-slate-700"
              )}
            >
              {toast.type === 'success' ? <ShieldCheck size={20} /> : <AlertCircle size={20} />}
              <span className="text-xs font-bold uppercase tracking-widest">{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Change Password Modal */}
        <AnimatePresence>
          {isChangePasswordModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsChangePasswordModalOpen(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
              >
                <div className="p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 uppercase">Change Password</h2>
                      <p className="text-xs font-bold text-slate-400">Update your security credentials.</p>
                    </div>
                    <button onClick={() => setIsChangePasswordModalOpen(false)} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center transition-all">
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Current Password</label>
                      <input 
                        required
                        type="password" 
                        value={changePasswordData.old_password}
                        onChange={(e) => setChangePasswordData({...changePasswordData, old_password: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 rounded-2xl py-3 px-4 text-sm font-bold text-slate-900 outline-none transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">New Password</label>
                      <input 
                        required
                        type="password" 
                        value={changePasswordData.new_password}
                        onChange={(e) => setChangePasswordData({...changePasswordData, new_password: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 rounded-2xl py-3 px-4 text-sm font-bold text-slate-900 outline-none transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Confirm New Password</label>
                      <input 
                        required
                        type="password" 
                        value={changePasswordData.confirm_password}
                        onChange={(e) => setChangePasswordData({...changePasswordData, confirm_password: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 rounded-2xl py-3 px-4 text-sm font-bold text-slate-900 outline-none transition-all"
                        placeholder="••••••••"
                      />
                    </div>

                    <div className="pt-4">
                      <button 
                        type="submit"
                        disabled={isChangingPassword}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isChangingPassword ? (
                          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Key size={16} /> Update Password
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
