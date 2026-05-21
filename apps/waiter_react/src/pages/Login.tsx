import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Lock, 
  ChevronRight, 
  AlertCircle, 
  Loader2,
  ChefHat,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api, { resolveImageUrl } from '../services/api';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<any>(null);

  // Fetch settings for dynamic branding on the login screen
  useEffect(() => {
    api.get(`/settings?t=${Date.now()}`)
      .then(res => {
        const data = res.data;
        setSettings(data);
      })
      .catch(err => console.error('Error fetching login settings:', err));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to login. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const bgUrl = settings?.tenant?.login_background_url 
    ? resolveImageUrl(settings.tenant.login_background_url)
    : 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1974&q=80';

  return (
    <div className="fixed inset-0 h-screen w-full flex items-center justify-center overflow-hidden bg-slate-950">
      {/* Dynamic Background Assets */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-100 scale-110 blur-[2px] transition-all duration-1000"
          style={{ backgroundImage: `url(${bgUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/40 via-slate-900/20 to-transparent" />
      </div>

      {/* Glassmorphic Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md p-8"
      >
        <div className="bg-transparent border border-white/10 rounded-[2rem] p-8 shadow-2xl shadow-black/50">
          
          {/* Logo Section */}
          <div className="flex flex-col items-center mb-10">
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="flex items-center justify-center gap-6 mb-6"
            >
              <div className="w-32 h-32 flex items-center justify-center overflow-hidden">
                {settings?.tenant?.logo_url ? (
                  <img src={resolveImageUrl(settings.tenant.logo_url) || ''} className="w-full h-full object-contain filter drop-shadow-2xl" />
                ) : (
                  <ChefHat size={64} className="text-white" />
                )}
              </div>
              
              {/* Halal Certification Logo */}
              <div className="w-20 h-20 flex items-center justify-center">
                {settings?.tenant?.secondary_logo_url ? (
                  <img 
                    src={resolveImageUrl(settings.tenant.secondary_logo_url)} 
                    alt="Halal Certification"
                    className="w-full h-full object-contain drop-shadow-sm transition-transform hover:scale-105 duration-300"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full border-[3px] border-green-500/80 flex flex-col items-center justify-center bg-white/10 backdrop-blur-md text-green-400 p-2 shadow-lg transition-transform hover:scale-105 duration-300">
                    <span className="text-[20px] font-bold leading-none mb-1 mt-1 text-white">حلال</span>
                    <div className="h-[2px] w-12 bg-green-500/80 mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-tighter leading-none text-green-400">HALAL</span>
                  </div>
                )}
              </div>
            </motion.div>
            <h1 className="text-3xl font-bold text-white tracking-tighter uppercase leading-none text-center drop-shadow-xl">
              {settings?.tenant?.restaurant_name?.split(' ')[0] || 'Zamzam'} 
              <span className="text-sky-400 ml-2 drop-shadow-xl">{settings?.tenant?.restaurant_name?.split(' ').slice(1).join(' ') || 'Kitchen'}</span>
            </h1>
            <p className="text-[10px] font-bold text-white uppercase tracking-[0.4em] mt-3 drop-shadow-md">
              {settings?.tenant?.tagline || 'Authentic Halal Flavours'}
            </p>
            <div className="mt-5 bg-black/40 backdrop-blur-md border border-white/20 px-6 py-2 rounded-full shadow-lg">
              <span className="text-sm font-bold text-white drop-shadow-md uppercase tracking-[0.2em]">Waiters Portal</span>
            </div>
          </div>

          {/* Form Section */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white drop-shadow-md uppercase tracking-widest px-2">Staff Username</label>
              <div className="relative group">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-teal-400 transition-colors" size={20} />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl py-4 pl-14 pr-6 text-white text-sm font-bold placeholder:text-slate-400 focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500/50 outline-none transition-all"
                  placeholder="Enter username"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white drop-shadow-md uppercase tracking-widest px-2">Security PIN / Password</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-teal-400 transition-colors" size={20} />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl py-4 pl-14 pr-12 text-white text-sm font-bold placeholder:text-slate-400 focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500/50 outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700 p-1.5 rounded-lg transition-colors z-10"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-400 text-xs font-bold overflow-hidden"
                >
                  <AlertCircle size={16} />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              disabled={isLoading}
              type="submit"
              className="w-full bg-teal-500 hover:bg-teal-400 disabled:bg-white/5 disabled:text-white/20 text-white font-bold py-4 rounded-2xl shadow-2xl shadow-teal-500/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98] group"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <span className="uppercase tracking-widest text-sm">Login</span>
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer Info */}
          <div className="mt-10 pt-8 border-t border-white/20 text-center">
            <p className="text-[9px] font-bold text-white drop-shadow-md uppercase tracking-[0.2em]">© 2026 {settings?.tenant?.restaurant_name || 'Zamzam'} Management System</p>
          </div>
        </div>
      </motion.div>

      {/* Decorative Orbs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-teal-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-yellow-500/10 rounded-full blur-[120px] pointer-events-none" />
    </div>
  );
}
