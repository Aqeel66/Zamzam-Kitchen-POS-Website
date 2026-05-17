import { useState, useEffect } from 'react';
import { 
  Lock, 
  Check, 
  Save, 
  RefreshCcw,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Users,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string; // Group concatenated string from backend
}

interface Permission {
  id: number;
  name: string;
}

export default function Permissions() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [activePermissions, setActivePermissions] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/roles`),
        fetch(`${API_BASE_URL}/permissions`)
      ]);
      const rolesData = await rolesRes.json();
      const permsData = await permsRes.json();
      setRoles(rolesData);
      setPermissions(permsData);
      if (rolesData.length > 0) {
        const firstRole = rolesData[0];
        setSelectedRole(firstRole);
        const currentPermNames = firstRole.permissions ? firstRole.permissions.split(',') : [];
        const currentPermIds = permsData
          .filter((p: Permission) => currentPermNames.includes(p.name))
          .map((p: Permission) => p.id);
        setActivePermissions(currentPermIds);
      }
    } catch (err) {
      console.error('Fetch Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRole = (role: Role) => {
    setSelectedRole(role);
    const currentPermNames = role.permissions ? role.permissions.split(',') : [];
    const currentPermIds = permissions
      .filter(p => currentPermNames.includes(p.name))
      .map(p => p.id);
    setActivePermissions(currentPermIds);
  };

  const togglePermission = (id: number) => {
    setActivePermissions(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!selectedRole) return;
    setIsSaving(true);
    setShowConfirm(false);
    try {
      const res = await fetch(`${API_BASE_URL}/roles/${selectedRole.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permission_ids: activePermissions })
      });
      if (res.ok) {
        setSaveStatus('success');
        fetchData();
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-100 border-t-zamzam-teal rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-10 max-w-[1400px] mx-auto space-y-10 min-h-full pb-20">
      {/* Header Section */}
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-zamzam-teal">
            <div className="w-10 h-10 bg-zamzam-teal/10 rounded-xl flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.4em]">Security Control</span>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Access <span className="text-zamzam-teal">Permissions</span></h1>
        </div>

        <div className="flex items-center gap-4">
          <AnimatePresence>
            {saveStatus === 'success' && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-green-50 text-green-600 px-6 py-4 rounded-2xl flex items-center gap-3 border border-green-100 shadow-sm"
              >
                <CheckCircle2 size={18} />
                <span className="text-xs font-bold uppercase tracking-widest">Security Updated</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            onClick={() => setShowConfirm(true)}
            disabled={isSaving}
            className="bg-zamzam-teal hover:bg-teal-700 text-white font-bold px-8 py-4 rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-teal-900/20 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
          >
            {isSaving ? <RefreshCcw size={18} className="animate-spin" /> : <Save size={18} />}
            {isSaving ? 'Applying...' : 'Save Security Policy'}
          </button>
        </div>
      </div>

      <div className="flex gap-10 h-[calc(100vh-250px)]">
        {/* Role Selector Sidebar */}
        <aside className="w-80 flex flex-col gap-3">
          <div className="px-6 py-2">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Access Group</h3>
          </div>
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => handleSelectRole(role)}
              className={cn(
                "w-full flex items-center justify-between p-6 rounded-[2rem] transition-all group border-2",
                selectedRole?.id === role.id 
                  ? "bg-white border-zamzam-teal text-slate-900 shadow-xl shadow-teal-900/5" 
                  : "bg-slate-50 border-transparent text-slate-400 hover:bg-white hover:border-slate-200"
              )}
            >
              <div className="flex items-center gap-4 text-left">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                  selectedRole?.id === role.id ? "bg-zamzam-teal text-white" : "bg-white text-slate-300"
                )}>
                  <Users size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-tight leading-none mb-1">{role.name}</h4>
                  <p className="text-[10px] font-bold opacity-60">System Role</p>
                </div>
              </div>
              <ChevronRight size={16} className={cn("transition-transform", selectedRole?.id === role.id ? "translate-x-0" : "-translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0")} />
            </button>
          ))}
        </aside>

        {/* Permissions Grid */}
        <main className="flex-1 bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-10 border-b border-slate-50 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">
                  Policy for <span className="text-zamzam-teal">{selectedRole?.name}</span>
                </h2>
                <p className="text-sm font-bold text-slate-400 mt-1">Select the modules and actions this role is authorized to perform.</p>
              </div>
              <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-zamzam-teal animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Active Editor</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-10 no-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {permissions.map((perm) => (
                <button
                  key={perm.id}
                  onClick={() => togglePermission(perm.id)}
                  className={cn(
                    "flex items-center justify-between p-6 rounded-2xl border-2 transition-all group",
                    activePermissions.includes(perm.id)
                      ? "border-zamzam-teal/20 bg-zamzam-teal/[0.02]"
                      : "border-slate-50 bg-white hover:border-slate-200"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                      activePermissions.includes(perm.id)
                        ? "bg-zamzam-teal text-white shadow-lg shadow-teal-900/10"
                        : "bg-slate-50 text-slate-300"
                    )}>
                      {activePermissions.includes(perm.id) ? <Check size={18} /> : <Lock size={18} />}
                    </div>
                    <div className="text-left">
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest block leading-none mb-1",
                        activePermissions.includes(perm.id) ? "text-zamzam-teal" : "text-slate-400"
                      )}>
                        {perm.name.split('_').join(' ')}
                      </span>
                      <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                        Module Access
                      </span>
                    </div>
                  </div>

                  <div className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                    activePermissions.includes(perm.id)
                      ? "border-zamzam-teal bg-zamzam-teal text-white"
                      : "border-slate-200"
                  )}>
                    {activePermissions.includes(perm.id) && <Check size={12} />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirm(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden"
            >
              <div className="p-12 text-center space-y-8">
                <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-orange-500/10 ring-8 ring-orange-50/50">
                  <AlertCircle size={40} strokeWidth={2.5} />
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-slate-900 uppercase tracking-tighter">Security Protocol Check</h3>
                  <p className="text-sm font-bold text-slate-400 leading-relaxed uppercase tracking-wider">
                    Changes to security policies affect all users assigned to <span className="text-zamzam-teal">{selectedRole?.name}</span> immediately.
                  </p>
                </div>

                <div className="bg-orange-50/50 p-6 rounded-[2rem] border border-orange-100/50">
                  <p className="text-[10px] font-bold text-orange-800/60 uppercase tracking-widest leading-loose">
                    By confirming, you acknowledge that all current sessions for this role may be affected by the new permission set.
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 px-8 py-5 rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 hover:bg-slate-100"
                  >
                    Discard Changes
                  </button>
                  <button 
                    onClick={handleSave}
                    className="flex-1 px-8 py-5 rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] text-white bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-900/20 transition-all active:scale-95"
                  >
                    Confirm & Apply
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
