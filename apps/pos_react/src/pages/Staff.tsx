import { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Phone, 
  Search,
  CheckCircle2,
  X,
  User as UserIcon,
  ShieldCheck,
  Shield,
  ChefHat,
  Timer,
  Smartphone,
  Trash2,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

const roleConfigs: Record<string, { color: string, icon: any, bg: string }> = {
  'Admin': { color: 'text-red-600', bg: 'bg-red-50', icon: ShieldCheck },
  'Manager': { color: 'text-purple-600', bg: 'bg-purple-50', icon: Shield },
  'Waiter': { color: 'text-blue-600', bg: 'bg-blue-50', icon: Timer },
  'Chef': { color: 'text-orange-600', bg: 'bg-orange-50', icon: ChefHat },
  'Cashier': { color: 'text-green-600', bg: 'bg-green-50', icon: Smartphone },
};

export default function Staff() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    username: '',
    password: '',
    email: '',
    phone: '',
    role_id: ''
  });

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users`);
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/roles`);
      const data = await res.json();
      setRoles(data);
      if (data.length > 0) {
        setFormData(prev => ({ ...prev, role_id: data[0].id.toString() }));
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          role_ids: [parseInt(formData.role_id)]
        })
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ 
          first_name: '', 
          last_name: '', 
          username: '', 
          password: '', 
          email: '', 
          phone: '', 
          role_id: roles[0]?.id.toString() || '' 
        });
        fetchUsers();
      } else {
        const error = await res.json();
        alert(`Error: ${error.message || error.error || 'Failed to add staff'}`);
      }
    } catch (err) {
      console.error('Add Staff Error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.first_name + " " + user.last_name).toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.username.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Handle comma-separated roles string from backend
    const userRoles = typeof user.roles === 'string' ? user.roles.split(',').map((r: any) => r.trim()) : [];
    const roleName = userRoles[0] || 'Staff';
    
    const matchesFilter = activeFilter === 'All' || userRoles.some((r: any) => r.toLowerCase() === activeFilter.toLowerCase());
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-10 max-w-[1400px] mx-auto space-y-10 min-h-full pb-20">
      {/* Header Section */}
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-zamzam-teal">
            <div className="w-10 h-10 bg-zamzam-teal/10 rounded-xl flex items-center justify-center">
              <Users size={20} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.4em]">Internal Operations</span>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Team <span className="text-zamzam-teal">Management</span></h1>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-zamzam-teal hover:bg-teal-700 text-white font-bold px-8 py-4 rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-teal-900/20 active:scale-95 transition-all flex items-center gap-3"
        >
          <UserPlus size={18} />
          Add Team Member
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto no-scrollbar">
          {['All', 'Admin', 'Manager', 'Waiter', 'Chef', 'Cashier'].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                activeFilter === filter 
                  ? "bg-zamzam-teal text-white shadow-lg shadow-teal-900/10" 
                  : "bg-slate-50 text-slate-400 hover:bg-slate-100"
              )}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-zamzam-teal transition-colors" size={18} />
          <input 
            type="text"
            placeholder="Search by name or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border-2 border-transparent focus:border-zamzam-teal/20 focus:bg-white rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-slate-900 outline-none transition-all placeholder:text-slate-300"
          />
        </div>
      </div>

      {/* Staff Grid */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-slate-100 border-t-zamzam-teal rounded-full animate-spin" />
        </div>
      ) : (
        <motion.div 
          layout
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden"
        >
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-10 py-6">Team Member</th>
                <th className="px-10 py-6">Role</th>
                <th className="px-10 py-6">Contact Info</th>
                <th className="px-10 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map((user: any) => {
                const userRoles = typeof user.roles === 'string' ? user.roles.split(',').map((r: any) => r.trim()) : [];
                const roleName = userRoles[0] || 'Staff';
                const matchedRoleKey = Object.keys(roleConfigs).find(k => k.toLowerCase() === roleName.toLowerCase());
                const config = (matchedRoleKey ? roleConfigs[matchedRoleKey] : null) || { color: 'text-slate-600', bg: 'bg-slate-50', icon: UserIcon };
                
                return (
                  <tr key={user.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 border border-slate-100 group-hover:border-zamzam-teal/30 transition-colors">
                          <UserIcon size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 leading-tight">{user.first_name} {user.last_name}</p>
                          <p className="text-[10px] font-bold text-zamzam-teal uppercase tracking-widest opacity-60">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <span className={cn("px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center gap-2 w-fit", config.bg, config.color)}>
                        <config.icon size={12} />
                        {roleName}
                      </span>
                    </td>
                    <td className="px-10 py-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                          <Mail size={12} className="text-slate-300" /> {user.email || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                          <Phone size={12} className="text-slate-300" /> {user.phone || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2.5 bg-slate-50 text-slate-400 hover:text-zamzam-teal hover:bg-zamzam-teal/10 rounded-xl transition-all">
                          <UserCheck size={16} />
                        </button>
                        <button className="p-2.5 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </motion.div>
      )}

      {/* Add Staff Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="p-10 space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 uppercase">New Team Member</h2>
                    <p className="text-sm font-bold text-slate-400">Add a new professional to your restaurant staff.</p>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center transition-all">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleAddStaff} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">First Name</label>
                      <input 
                        required
                        type="text" 
                        value={formData.first_name}
                        onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-zamzam-teal/20 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 outline-none transition-all"
                        placeholder="John"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Last Name</label>
                      <input 
                        required
                        type="text" 
                        value={formData.last_name}
                        onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-zamzam-teal/20 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 outline-none transition-all"
                        placeholder="Doe"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Username</label>
                      <input 
                        required
                        type="text" 
                        value={formData.username}
                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-zamzam-teal/20 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 outline-none transition-all"
                        placeholder="johndoe123"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Password</label>
                      <input 
                        required
                        type="password" 
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-zamzam-teal/20 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 outline-none transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Email Address</label>
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-zamzam-teal/20 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 outline-none transition-all"
                      placeholder="john.doe@restaurant.com"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Role</label>
                      <select 
                        required
                        value={formData.role_id}
                        onChange={(e) => setFormData({...formData, role_id: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-zamzam-teal/20 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 outline-none transition-all appearance-none cursor-pointer"
                      >
                        {roles.map(role => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Phone Number</label>
                      <input 
                        type="text" 
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-zamzam-teal/20 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 outline-none transition-all"
                        placeholder="+1 234 567 890"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-zamzam-teal hover:bg-teal-700 text-white font-bold py-5 rounded-[2rem] text-xs uppercase tracking-[0.2em] shadow-2xl shadow-teal-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 size={18} />
                          Finalize Team Member
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
    </div>
  );
}
