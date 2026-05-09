import { Routes, Route, Link, useLocation } from 'react-router-dom';
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
  Table2,
  Calendar,
  MessageSquare
} from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useState, useEffect } from 'react';
import { API_BASE_URL } from './config';

import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Reports from './pages/Reports';
import Inventory from './pages/Inventory';
import Staff from './pages/Staff';
import KDS from './pages/KDS';
import Settings from './pages/Settings';
import Login from './pages/Login';
import MenuDesigner from './pages/MenuDesigner';
import Customers from './pages/Customers';
import Promotions from './pages/Promotions';
import QRMenu from './pages/QRMenu';
import Permissions from './pages/Permissions';
import Tables from './pages/Tables';
import Reservations from './pages/Reservations';
import Communications from './pages/Communications';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AppContent = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const location = useLocation();
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    if (isAuthenticated) {
      console.log('📡 Fetching tenant settings...');
      fetch(`${API_BASE_URL}/settings`)
        .then(async res => {
          if (!res.ok) throw new Error(`Server returned ${res.status}`);
          return res.json();
        })
        .then(data => {
          console.log('✅ Settings loaded:', data);
          setSettings(data);
        })
        .catch(err => {
          console.error('❌ Error fetching settings:', err);
          // Fallback settings to keep UI alive
          setSettings({
            tenant: { restaurant_name: 'Zamzam Kitchen', tagline: 'Connection Error' }
          });
        });
    }
  }, [isAuthenticated]);

  // Public Routes (Bypass Auth)
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

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: ShoppingCart, label: 'Orders', path: '/orders' },
    { icon: ChefHat, label: 'KDS', path: '/kds' },
    { icon: Table2, label: 'Tables', path: '/tables' },
    { icon: Calendar, label: 'Reservations', path: '/reservations' },
    { icon: LayoutGrid, label: 'Menu Studio', path: '/menu' },
    { icon: Users, label: 'Customers', path: '/customers' },
    { icon: MessageSquare, label: 'Communications', path: '/communications' },
    { icon: Ticket, label: 'Promotions', path: '/promotions' },
    { icon: BarChart3, label: 'Reports', path: '/reports' },
    { icon: Package, label: 'Inventory', path: '/inventory' },
    { icon: Users, label: 'Staff', path: '/staff' },
    { icon: Shield, label: 'Permissions', path: '/permissions' },
    { icon: SettingsIcon, label: 'Settings', path: '/settings' },
  ];

  if (!settings && isAuthenticated) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-zamzam-teal text-white p-6">
        <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-6" />
        <h2 className="text-2xl font-black uppercase tracking-widest text-center">Initializing <span className="text-zamzam-yellow text-2xl">POS</span></h2>
        <p className="text-white/60 text-sm font-medium mt-2 animate-pulse uppercase tracking-[0.2em] text-center">Synchronizing Security Policies...</p>
        
        <button 
          onClick={() => {
            localStorage.removeItem('pos_user');
            window.location.href = '/pos/';
          }}
          className="mt-12 px-6 py-3 bg-white/10 hover:bg-red-500/20 text-white/60 hover:text-red-300 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border border-white/10 shadow-xl"
        >
          Force Session Reset / Logout
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-bg-main overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-zamzam-teal text-white flex flex-col shadow-2xl z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-9 h-9 bg-zamzam-yellow rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/20 overflow-hidden">
            {settings?.tenant?.logo_url ? (
              <img src={settings.tenant.logo_url} className="w-full h-full object-contain" />
            ) : (
              <ShoppingCart className="text-zamzam-teal w-5 h-5" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="font-black text-lg tracking-tighter uppercase leading-none truncate">
              {settings?.tenant?.restaurant_name || 'Zamzam'}
            </h1>
            <p className="text-[8px] font-bold text-teal-400/60 uppercase tracking-widest mt-1 truncate">
              {settings?.tenant?.tagline || 'POS Terminal'}
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 group",
                  isActive 
                    ? "bg-white/10 text-zamzam-yellow shadow-inner shadow-black/10" 
                    : "text-teal-100/40 hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon className={cn(
                  "w-4 h-4 transition-transform duration-300",
                  isActive ? "scale-110" : "group-hover:scale-110"
                )} />
                <span className="font-bold text-[13px] uppercase tracking-wider">{item.label}</span>
                {isActive && (
                  <motion.div 
                    layoutId="active-pill"
                    className="ml-auto w-1 h-1 bg-zamzam-yellow rounded-full shadow-[0_0_8px_#FFB300]"
                  />
                )}
              </Link>
            );
          })}
          
          <div className="pt-8 pb-4 opacity-20 hover:opacity-100 transition-opacity">
            <button 
              onClick={() => {
                localStorage.removeItem('pos_user');
                window.location.href = '/pos/';
              }}
              className="w-full text-center text-[9px] font-bold text-white uppercase tracking-[0.2em]"
            >
              Emergency Session Reset
            </button>
          </div>
        </nav>

      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10">
          <div className="relative w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-zamzam-teal transition-colors" />
            <input 
              type="text" 
              placeholder="Search orders, customers, or menu..."
              className="w-full bg-slate-100 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-zamzam-teal/10 focus:bg-white transition-all outline-none"
            />
          </div>

          <div className="flex items-center gap-6">
            <button className="relative p-2 text-slate-400 hover:text-zamzam-teal transition-colors">
              <Bell className="w-6 h-6" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <div className="h-8 w-px bg-slate-200" />
            
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-slate-900 leading-none uppercase">{user?.first_name} {user?.last_name}</p>
                <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest mt-1">{user?.roles}</p>
              </div>
              <div className="w-10 h-10 bg-zamzam-yellow/10 rounded-xl flex items-center justify-center border border-zamzam-yellow/20 shadow-sm font-black text-zamzam-yellow">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              
              <button 
                onClick={() => {
                  logout();
                  window.location.href = '/pos/';
                }}
                className="ml-2 p-2.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-100 shadow-sm"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Content View */}
        <div className="flex-1 overflow-auto bg-bg-main relative">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/kds" element={<KDS />} />
            <Route path="/tables" element={<Tables />} />
            <Route path="/reservations" element={<Reservations />} />
            <Route path="/menu" element={<MenuDesigner />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/communications" element={<Communications />} />
            <Route path="/promotions" element={<Promotions />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/staff" element={<Staff />} />
            <Route path="/permissions" element={<Permissions />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
