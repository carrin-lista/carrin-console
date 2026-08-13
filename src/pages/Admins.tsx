import { useEffect, useState } from 'react';
import { adminService, type ConsoleAdmin } from '../services/adminService';
import { auditService } from '../services/auditService';
import { useAuthStore } from '../stores/useAuthStore';
import { Search, ShieldAlert, ShieldCheck, UserPlus, Mail, X } from 'lucide-react';

export function Admins() {
  const [admins, setAdmins] = useState<ConsoleAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ id: '', email: '', name: '', profile: 'manager' as const });

  const { admin: currentAdmin } = useAuthStore();

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getAdmins();
      setAdmins(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await adminService.createAdmin(newAdmin);
      
      await auditService.createLog('admin.created', 'console_admins', newAdmin.id, {
        after: { email: newAdmin.email, name: newAdmin.name, profile: newAdmin.profile }
      });

      await fetchAdmins(); 
      setIsModalOpen(false); 
      setNewAdmin({ id: '', email: '', name: '', profile: 'manager' }); 
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAdmins = admins.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) || 
    a.email.toLowerCase().includes(search.toLowerCase())
  );

  const getProfileBadge = (profile: string) => {
    switch (profile) {
      case 'master': return <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1 w-max"><ShieldAlert size={12} /> Master</span>;
      case 'manager': return <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1 w-max"><ShieldCheck size={12} /> Manager</span>;
      default: return <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase w-max">{profile}</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#272D2D]">Adicionar Administrador</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateAdmin} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">User ID (Supabase)</label>
                <input required type="text" value={newAdmin.id} onChange={e => setNewAdmin({...newAdmin, id: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" placeholder="UUID do auth.users" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Nome Completo</label>
                <input required type="text" value={newAdmin.name} onChange={e => setNewAdmin({...newAdmin, name: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">E-mail Corporativo</label>
                <input required type="email" value={newAdmin.email} onChange={e => setNewAdmin({...newAdmin, email: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Nível de Acesso</label>
                <select value={newAdmin.profile} onChange={e => setNewAdmin({...newAdmin, profile: e.target.value as any})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500">
                  <option value="manager">Manager (Gestão Básica)</option>
                  <option value="support">Support (Apenas Suporte)</option>
                  <option value="master">Master (Acesso Total)</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-70">
                  {isSubmitting ? 'Salvando...' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#272D2D]">Administradores</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie os acessos e permissões da equipe ao Carrin Console.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64 shrink-0">
            <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
            <input type="text" placeholder="Buscar por nome ou email..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm" />
          </div>
          {currentAdmin?.profile === 'master' && (
            <button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors shrink-0 flex items-center gap-2">
              <UserPlus size={16} /> Adicionar Membro
            </button>
          )}
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm font-medium border border-red-100">{error}</div>}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-wider border-b border-gray-200 font-bold">
              <tr>
                <th className="px-6 py-4">Membro da Equipe</th>
                <th className="px-6 py-4">Nível de Acesso</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex justify-center mb-2"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div></div>
                    Carregando equipe...
                  </td>
                </tr>
              ) : filteredAdmins.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-12 text-center text-gray-400 font-medium">Nenhum administrador encontrado.</td></tr>
              ) : (
                filteredAdmins.map((admin) => (
                  <tr key={admin.id} className={`transition-colors group ${admin.status === 'suspended' ? 'bg-gray-50/50' : 'hover:bg-gray-50'}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-sm shrink-0">
                          {admin.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className={`font-bold ${admin.status === 'suspended' ? 'text-gray-400' : 'text-[#272D2D]'}`}>
                            {admin.name} {admin.id === currentAdmin?.id && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded ml-2 uppercase font-bold">Você</span>}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Mail size={12} /> {admin.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getProfileBadge(admin.profile)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded uppercase ${admin.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                        {admin.status === 'active' ? 'Ativo' : 'Suspenso'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}