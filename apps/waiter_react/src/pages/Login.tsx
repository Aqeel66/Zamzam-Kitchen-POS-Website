import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UtensilsCrossed, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to login. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden">
      {/* Premium Background with Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat scale-105"
        style={{ 
          backgroundImage: `url('./assets/login_bg.png')`,
          filter: 'brightness(0.4) blur(4px)'
        }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-teal-950/80 via-transparent to-black/60" />

      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[440px]"
      >
        {/* Logo Section */}
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0.8, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
            className="inline-flex items-center justify-center p-5 bg-teal-900/40 backdrop-blur-xl rounded-[2rem] mb-6 border border-teal-500/30 shadow-2xl shadow-teal-900/40"
          >
            <UtensilsCrossed className="text-yellow-400 w-10 h-10" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-4xl font-bold text-white tracking-tighter uppercase mb-1"
          >
            Zamzam <span className="text-yellow-500">Kitchen</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-teal-200/60 font-bold text-xs uppercase tracking-[0.3em] ml-1"
          >
            Waiter Service Portal
          </motion.p>
        </div>

        {/* Login Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white/10 backdrop-blur-2xl rounded-[2.5rem] p-10 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, x: -10 }}
                  animate={{ opacity: 1, height: 'auto', x: 0 }}
                  exit={{ opacity: 0, height: 0, x: 10 }}
                  className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-4 rounded-2xl flex items-center gap-3 overflow-hidden"
                >
                  <AlertCircle size={20} className="shrink-0 text-red-400" />
                  <p className="text-sm font-semibold">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-teal-300/50 uppercase tracking-widest ml-1">Username</label>
              <div className="relative group">
                <div className="absolute inset-0 bg-teal-500/5 rounded-2xl group-focus-within:bg-teal-500/10 transition-all duration-300" />
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-500/50 w-5 h-5 group-focus-within:text-teal-400 transition-colors" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Employee ID or Name"
                  className="relative w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 text-sm font-bold focus:outline-none focus:border-teal-500/30 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-teal-300/50 uppercase tracking-widest ml-1">Password</label>
              <div className="relative group">
                <div className="absolute inset-0 bg-teal-500/5 rounded-2xl group-focus-within:bg-teal-500/10 transition-all duration-300" />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-500/50 w-5 h-5 group-focus-within:text-teal-400 transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="relative w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 text-sm font-bold focus:outline-none focus:border-teal-500/30 transition-all"
                  required
                />
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group relative w-full overflow-hidden bg-yellow-500 hover:bg-yellow-400 text-teal-950 font-bold py-4 rounded-2xl shadow-[0_10px_30px_rgba(234,179,8,0.2)] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-teal-950/30 border-t-teal-950 rounded-full animate-spin" />
              ) : (
                <>
                  <span className="tracking-tight">ACCESS PORTAL</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </motion.button>

            <div className="text-center pt-2">
              <button 
                type="button"
                className="text-white/30 hover:text-white/60 text-[10px] font-bold tracking-widest uppercase transition-colors"
                onClick={() => alert('Please contact your manager to reset your password.')}
              >
                Forgot Password?
              </button>
            </div>
          </form>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex items-center justify-center gap-3 mt-10"
        >
          <div className="h-px w-8 bg-white/10" />
          <p className="text-white/20 text-[9px] font-bold uppercase tracking-[0.4em]">
            Zamzam Kitchen RMS
          </p>
          <div className="h-px w-8 bg-white/10" />
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;
