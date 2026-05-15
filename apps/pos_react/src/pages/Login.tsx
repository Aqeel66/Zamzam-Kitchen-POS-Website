import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Lock, 
  ChevronRight, 
  AlertCircle, 
  Loader2,
  ChefHat
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        login(data.user);
      } else {
        setError(data.message || 'Authentication failed');
      }
    } catch (err) {
      setError('Connection failed. Please check your backend.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-slate-950">
      {/* Dynamic Background Assets */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1974&q=80')] bg-cover bg-center opacity-30 scale-110 blur-sm" />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900/90 to-zamzam-teal/20" />
      </div>

      {/* Glassmorphic Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md p-10"
      >
        <div className="bg-white/10 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 shadow-2xl shadow-black/50">
          
          {/* Logo Section */}
          <div className="flex flex-col items-center mb-10">
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 bg-zamzam-teal rounded-3xl flex items-center justify-center shadow-2xl shadow-teal-500/40 mb-6"
            >
              <ChefHat size={40} className="text-white" />
            </motion.div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">Zamzam <span className="text-zamzam-teal">Kitchen</span></h1>
            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] mt-3">POS Terminal Terminal</p>
          </div>

          {/* Form Section */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">Staff Username</label>
              <div className="relative group">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-zamzam-teal transition-colors" size={20} />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white text-sm font-bold placeholder:text-white/10 focus:ring-4 focus:ring-zamzam-teal/20 focus:border-zamzam-teal/50 outline-none transition-all"
                  placeholder="Enter username"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">Security PIN / Password</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-zamzam-teal transition-colors" size={20} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white text-sm font-bold placeholder:text-white/10 focus:ring-4 focus:ring-zamzam-teal/20 focus:border-zamzam-teal/50 outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
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
              className="w-full bg-zamzam-teal hover:bg-teal-400 disabled:bg-white/5 disabled:text-white/20 text-white font-black py-5 rounded-2xl shadow-2xl shadow-teal-500/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98] group"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <span className="uppercase tracking-widest text-sm">Initialize Terminal</span>
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer Info */}
          <div className="mt-10 pt-8 border-t border-white/5 text-center">
            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">© 2026 Zamzam Restaurant Management System</p>
          </div>
        </div>
      </motion.div>

      {/* Decorative Orbs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-zamzam-teal/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-zamzam-yellow/10 rounded-full blur-[120px] pointer-events-none" />
    </div>
  );
}
