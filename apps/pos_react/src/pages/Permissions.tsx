import { useState, useEffect } from 'react';
import { 
  Lock, 
  Check, 
  Save, 
  RefreshCcw,
  ChevronRight,
  UserCheck,
  ShieldAlert,
  Shield
} from 'lucide-react';
import { API_BASE_URL } from '../config';

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
        handleSelectRole(rolesData[0], permsData);
      }
    } catch (err) {
      console.error('Fetch Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRole = (role: Role, allPerms: Permission[]) => {
    setSelectedRole(role);
    // Parse role.permissions string to IDs
    const currentPermNames = role.permissions ? role.permissions.split(',') : [];
    const currentPermIds = allPerms
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
    try {
      const res = await fetch(`${API_BASE_URL}/roles/${selectedRole.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permission_ids: activePermissions })
      });
      if (res.ok) {
        alert(`Security Policy for ${selectedRole.name} has been updated successfully.`);
        fetchData();
      } else {
        const errData = await res.json();
        alert(`Failed to save: ${errData.error || 'Server Error'}`);
      }
    } catch (err) {
      console.error('Save Error:', err);
      alert('Network error. Failed to apply security changes.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-zamzam-teal rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-10">
      <header>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase leading-none">Security <span className="text-zamzam-teal">&</span> Permissions</h1>
        <p className="text-slate-400 font-bold mt-2 uppercase tracking-widest text-xs flex items-center gap-2">
          <Shield size={14} className="text-zamzam-teal" />
          Define role-based access control and system permissions
        </p>
      </header>

      <div className="grid grid-cols-12 gap-10">
        {/* Roles List */}
        <div className="col-span-4 space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Access Roles</h3>
          <div className="space-y-3">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => handleSelectRole(role, permissions)}
                className={`w-full text-left p-6 rounded-[2rem] border transition-all flex items-center justify-between group ${
                  selectedRole?.id === role.id 
                  ? 'bg-zamzam-teal border-zamzam-teal text-white shadow-xl shadow-teal-500/20' 
                  : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                    selectedRole?.id === role.id ? 'bg-white/10' : 'bg-slate-50 group-hover:bg-zamzam-teal/5'
                  }`}>
                    <UserCheck size={24} />
                  </div>
                  <div>
                    <p className="font-black uppercase tracking-tight text-sm">{role.name}</p>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${
                      selectedRole?.id === role.id ? 'text-white/60' : 'text-slate-400'
                    }`}>{role.description || 'System Role'}</p>
                  </div>
                </div>
                <ChevronRight size={18} className={selectedRole?.id === role.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} />
              </button>
            ))}
          </div>
        </div>

        {/* Permissions Grid */}
        <div className="col-span-8 bg-white rounded-[3rem] border border-slate-100 shadow-sm flex flex-col overflow-hidden">
          <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                {selectedRole?.name} <span className="text-zamzam-teal">Abilities</span>
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Configure exactly what this role can see and do
              </p>
            </div>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="bg-zamzam-teal text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-teal-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
            >
              {isSaving ? <RefreshCcw className="animate-spin" size={18} /> : <Save size={18} />}
              Apply Changes
            </button>
          </div>

          <div className="p-10 flex-1 overflow-y-auto max-h-[600px]">
            <div className="grid grid-cols-2 gap-4">
              {permissions.map((perm) => (
                <div 
                  key={perm.id}
                  onClick={() => togglePermission(perm.id)}
                  className={`p-6 rounded-[1.5rem] border-2 cursor-pointer transition-all flex items-center justify-between group ${
                    activePermissions.includes(perm.id)
                    ? 'border-zamzam-teal bg-zamzam-teal/5'
                    : 'border-slate-50 bg-white hover:border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      activePermissions.includes(perm.id) ? 'bg-zamzam-teal text-white' : 'bg-slate-50 text-slate-300'
                    }`}>
                      <Lock size={18} />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">
                      {perm.name.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    activePermissions.includes(perm.id) 
                    ? 'bg-zamzam-teal border-zamzam-teal text-white' 
                    : 'border-slate-100'
                  }`}>
                    {activePermissions.includes(perm.id) && <Check size={14} strokeWidth={4} />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-8 bg-orange-50/50 border-t border-orange-100 flex items-center gap-4 mx-10 mb-10 rounded-[2rem]">
            <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
              <ShieldAlert size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Security Warning</p>
              <p className="text-[11px] font-bold text-orange-800/60 leading-relaxed">
                Changes to permissions take effect immediately for all active users assigned to this role.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
