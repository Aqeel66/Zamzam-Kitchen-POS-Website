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
  UserCheck,
  ChevronDown
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
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
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
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = isEditMode ? `${API_BASE_URL}/users/${selectedUserId}` : `${API_BASE_URL}/users`;
      const method = isEditMode ? 'PUT' : 'POST';
      
      const payload: any = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        role_ids: [parseInt(formData.role_id)]
      };
      
      if (!isEditMode) {
        payload.username = formData.username;
        payload.password = formData.password;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchUsers();
      } else {
        const error = await res.json();
        alert(`Error: ${error.message || error.error || 'Failed to save staff'}`);
      }
    } catch (err) {
      console.error('Save Staff Error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (user: any) => {
    setIsEditMode(true);
    setSelectedUserId(user.id);
    const userRoleIds = typeof user.role_ids === 'string' ? user.role_ids.split(',').map((id: string) => id.trim()) : [];
    setFormData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      username: user.username || '',
      password: '',
      email: user.email || '',
      phone: user.phone || '',
      role_id: userRoleIds[0] || (roles[0]?.id.toString() || '')
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (user: any) => {
    if (window.confirm(`Are you sure you want to delete ${user.first_name} ${user.last_name}?`)) {
      try {
        const res = await fetch(`${API_BASE_URL}/users/${user.id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchUsers();
        } else {
          alert('Failed to delete user');
        }
      } catch (err) {
        console.error('Delete User Error:', err);
      }
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
          onClick={() => {
            setIsEditMode(false);
            setFormData({
              first_name: '', last_name: '', username: '', password: '', 
              email: '', phone: '', role_id: ''
            });
            setIsModalOpen(true);
          }}
          className="bg-zamzam-teal hover:bg-teal-700 text-white font-bold px-8 py-4 rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-teal-900/20 active:scale-95 transition-all flex items-center gap-3"
        >
          <UserPlus size={18} />
          Add Team Member
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto relative z-10">
          <button
            onClick={() => setActiveFilter('All')}
            className={cn(
              "px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
              activeFilter === 'All' 
                ? "bg-zamzam-teal text-white shadow-lg shadow-teal-900/10" 
                : "bg-slate-50 text-slate-400 hover:bg-slate-100"
            )}
          >
            All
          </button>
          
          {roles.slice(0, 4).map((role) => (
            <button
              key={role.id}
              onClick={() => setActiveFilter(role.name)}
              className={cn(
                "px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                activeFilter === role.name 
                  ? "bg-zamzam-teal text-white shadow-lg shadow-teal-900/10" 
                  : "bg-slate-50 text-slate-400 hover:bg-slate-100"
              )}
            >
              {role.name}
            </button>
          ))}

          {roles.length > 4 && (
            <div className="relative">
              <button 
                onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
                className={cn(
                  "px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2",
                  roles.slice(4).some(r => r.name === activeFilter)
                    ? "bg-zamzam-teal text-white shadow-lg shadow-teal-900/10"
                    : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                )}
              >
                {roles.slice(4).some(r => r.name === activeFilter) ? activeFilter : 'More'} 
                <ChevronDown size={14} className={cn("transition-transform", isMoreDropdownOpen ? "rotate-180" : "")} />
              </button>
              
              <AnimatePresence>
                {isMoreDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-[calc(100%+0.5rem)] right-0 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 min-w-[150px] flex flex-col py-2"
                  >
                    {roles.slice(4).map((role) => (
                      <button
                        key={role.id}
                        onClick={() => {
                          setActiveFilter(role.name);
                          setIsMoreDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all",
                          activeFilter === role.name 
                            ? "bg-zamzam-teal/10 text-zamzam-teal" 
                            : "text-slate-500 hover:bg-slate-50"
                        )}
                      >
                        {role.name}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
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
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user: any) => {
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
                          <button 
                            onClick={() => handleEditClick(user)}
                            className="p-2.5 bg-slate-50 text-slate-400 hover:text-zamzam-teal hover:bg-zamzam-teal/10 rounded-xl transition-all"
                          >
                            <UserCheck size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(user)}
                            className="p-2.5 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-10 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Users size={48} className="mb-4 opacity-20" />
                      <p className="text-lg font-bold text-slate-900 mb-1">No Team Members Found</p>
                      <p className="text-xs uppercase tracking-widest">No users are currently assigned to the "{activeFilter}" role.</p>
                    </div>
                  </td>
                </tr>
              )}
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
                    <h2 className="text-2xl font-bold text-slate-900 uppercase">
                      {isEditMode ? 'Edit Team Member' : 'New Team Member'}
                    </h2>
                    <p className="text-sm font-bold text-slate-400">
                      {isEditMode ? 'Update details for this staff member.' : 'Add a new professional to your restaurant staff.'}
                    </p>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center transition-all">
                    <X size={20} />
                  </button>
                </div>

                    <form onSubmit={handleAddStaff} className="space-y-6" autoComplete="off">
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

                  {!isEditMode && (
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Username</label>
                        <input 
                          required
                          type="text" 
                          autoComplete="new-username"
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
                          autoComplete="new-password"
                          value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                          className="w-full bg-slate-50 border-2 border-transparent focus:border-zamzam-teal/20 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 outline-none transition-all"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  )}

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
                        <option value="" disabled>Select a role...</option>
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
