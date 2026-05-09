import { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Phone, 
  MoreVertical, 
  Search,
  Filter,
  CheckCircle2,
  X,
  User as UserIcon,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

const roleColors: Record<string, string> = {
  'Admin': 'bg-red-50 text-red-600 border-red-100',
  'Manager': 'bg-purple-50 text-purple-600 border-purple-100',
  'Waiter': 'bg-blue-50 text-blue-600 border-blue-100',
  'Chef': 'bg-orange-50 text-orange-600 border-orange-100',
  'Cashier': 'bg-green-50 text-green-600 border-green-100',
};

export default function Staff() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
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
        setFormData({ first_name: '', last_name: '', username: '', password: '', email: '', phone: '', role_id: roles[0]?.id.toString() || '' });
        fetchUsers();
      } else {
        const error = await res.json();
        alert(`Error: ${error.message || error.error || 'Failed to add staff'}`);
      }
    } catch (err) {
      console.error('Add Staff Error:', err);
      alert('Connection failed. Please check your network.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter(user => 
    `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-10 max-w-[1600px] mx-auto space-y-10 min-h-full">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <span className="text-[10px] font-black text-zamzam-teal uppercase tracking-[0.4em] mb-2 block">Team Management</span>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Staff <span className="text-zamzam-teal">Directory</span></h1>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-slate-200 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-colors flex items-center gap-2">
            <Filter size={18} />
            Filter Roles
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-zamzam-yellow px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-zamzam-teal shadow-lg shadow-yellow-500/20 hover:scale-105 transition-transform flex items-center gap-2"
          >
            <UserPlus size={18} />
            Add Staff Member
          </button>
        </div>
      </div>

      {/* Add Staff Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">New Staff <span className="text-zamzam-teal">Member</span></h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Configure account access</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-3 text-slate-400 hover:bg-white hover:text-slate-900 rounded-2xl transition-all border border-transparent hover:border-slate-100">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddStaff} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">First Name</label>
                    <input required type="text" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-black focus:ring-4 focus:ring-zamzam-teal/10 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
                    <input required type="text" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-black focus:ring-4 focus:ring-zamzam-teal/10 outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
                    <input required type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-black focus:ring-4 focus:ring-zamzam-teal/10 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Initial Password</label>
                    <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-black focus:ring-4 focus:ring-zamzam-teal/10 outline-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Role</label>
                  <select 
                    value={formData.role_id} 
                    onChange={e => setFormData({...formData, role_id: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-black focus:ring-4 focus:ring-zamzam-teal/10 outline-none appearance-none cursor-pointer"
                  >
                    {roles.map(role => (
                      <option key={role.id} value={role.id.toString()}>{role.name}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-4">
                  <button 
                    disabled={isSubmitting}
                    className="w-full bg-zamzam-teal text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-sm shadow-xl shadow-teal-900/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Onboarding...' : 'Register Staff Member'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { title: 'Total Staff', value: users.length, icon: Users, color: 'text-blue-500 bg-blue-50' },
          { title: 'Active Now', value: users.length > 0 ? Math.floor(users.length * 0.7) : 0, icon: CheckCircle2, color: 'text-green-500 bg-green-50' },
          { title: 'Managers', value: users.filter(u => u.roles?.includes('Manager') || u.roles?.includes('Admin')).length, icon: ShieldCheck, color: 'text-purple-500 bg-purple-50' },
          { title: 'Service Team', value: users.filter(u => u.roles?.includes('Waiter')).length, icon: UserIcon, color: 'text-orange-500 bg-orange-50' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-6">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", stat.color)}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.title}</p>
              <p className="text-2xl font-black text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative group max-w-2xl">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-zamzam-teal transition-colors" size={20} />
        <input 
          type="text"
          placeholder="Search by name, email, or role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-slate-100 rounded-[1.5rem] py-4 pl-14 pr-6 text-sm font-bold shadow-sm shadow-slate-200/50 outline-none focus:ring-4 focus:ring-zamzam-teal/5 transition-all"
        />
      </div>

      {/* User Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px] relative">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div 
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-12 h-12 border-4 border-slate-100 border-t-zamzam-teal rounded-full animate-spin" />
            </motion.div>
          ) : (
            <motion.div 
              key="table"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="overflow-x-auto"
            >
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    <th className="px-10 py-6">Staff Member</th>
                    <th className="px-10 py-6">Role</th>
                    <th className="px-10 py-6">Contact Details</th>
                    <th className="px-10 py-6">Status</th>
                    <th className="px-10 py-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-black text-lg border border-slate-200 shadow-inner group-hover:bg-zamzam-teal/10 group-hover:text-zamzam-teal group-hover:border-zamzam-teal/20 transition-all">
                            {user.first_name?.[0]}{user.last_name?.[0]}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{user.first_name} {user.last_name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">@{user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex flex-wrap gap-2">
                          {(user.roles || 'Staff').split(',').map((role: string) => (
                            <span 
                              key={role}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                                roleColors[role] || 'bg-slate-50 text-slate-500 border-slate-100'
                              )}
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                            <Mail size={12} className="text-slate-300" />
                            {user.email || 'No email provided'}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                            <Phone size={12} className="text-slate-300" />
                            {user.phone || 'No phone provided'}
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Active</span>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <button className="p-3 text-slate-300 hover:text-slate-900 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-100">
                          <MoreVertical size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
