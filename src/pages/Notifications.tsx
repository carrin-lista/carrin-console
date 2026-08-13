import { useEffect, useState } from 'react';
import { notificationService, type GlobalNotification } from '../services/notificationService';
import { auditService } from '../services/auditService';
import { useAuthStore } from '../stores/useAuthStore';
import { Bell, Search, Send, Info, AlertTriangle, CheckCircle2, X } from 'lucide-react';

export function Notifications() {
  const [notifications, setNotifications] = useState<GlobalNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newNotice, setNewNotice] = useState({ title: '', message: '', type: 'info' });

  const { admin } = useAuthStore();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin) return;
    
    setIsSubmitting(true);
    try {
      await notificationService.createNotification({
        ...newNotice,
        created_by: admin.id
      });
      
      await auditService.createLog('notification.created', 'global_notifications', null, {
        after: { title: newNotice.title, type: newNotice.type }
      });
      
      await fetchNotifications();
      setIsModalOpen(false);
      setNewNotice({ title: '', message: '', type: 'info' });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredNotifications = notifications.filter(n => 
    n.title.toLowerCase().includes(search.toLowerCase())
  );

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'info': return { icon: Info, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Informativo' };
      case 'warning': return { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Aviso Importante' };
      case 'success': return { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Sucesso/Atualização' };
      default: return { icon: Bell, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Notificação' };
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#272D2D] flex items-center gap-2"><Send size={18} className="text-emerald-600" /> Disparar Alerta Global</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSendNotification} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Título</label>
                <input required type="text" maxLength={50} value={newNotice.title} onChange={e => setNewNotice({...newNotice, title: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" placeholder="Ex: Manutenção Programada" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Mensagem</label>
                <textarea required rows={4} value={newNotice.message} onChange={e => setNewNotice({...newNotice, message: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none" placeholder="Digite o conteúdo do aviso que aparecerá para os usuários..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Tipo de Alerta</label>
                <select value={newNotice.type} onChange={e => setNewNotice({...newNotice, type: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500">
                  <option value="info">Informativo (Azul)</option>
                  <option value="warning">Aviso Crítico (Amarelo)</option>
                  <option value="success">Atualização/Sucesso (Verde)</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-70 flex justify-center items-center gap-2">
                  {isSubmitting ? 'Enviando...' : 'Enviar para Todos'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#272D2D]">Notificações Globais</h1>
          <p className="text-sm text-gray-500 mt-1">Histórico de alertas enviados para o aplicativo Carrin.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64 shrink-0">
            <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
            <input type="text" placeholder="Buscar título..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm" />
          </div>
          <button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors shrink-0 flex items-center gap-2">
            <Bell size={16} /> Novo Alerta
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm font-medium border border-red-100">{error}</div>}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-wider border-b border-gray-200 font-bold">
              <tr>
                <th className="px-6 py-4">Aviso</th>
                <th className="px-6 py-4">Mensagem</th>
                <th className="px-6 py-4">Autor</th>
                <th className="px-6 py-4">Data de Envio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex justify-center mb-2"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div></div>
                    Carregando histórico...
                  </td>
                </tr>
              ) : filteredNotifications.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-medium">Nenhum alerta global foi enviado ainda.</td></tr>
              ) : (
                filteredNotifications.map((notif) => {
                  const typeData = getTypeConfig(notif.type);
                  const Icon = typeData.icon;
                  
                  return (
                    <tr key={notif.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${typeData.bg} ${typeData.color}`}><Icon size={16} /></div>
                          <div>
                            <p className="font-bold text-[#272D2D]">{notif.title}</p>
                            <p className="text-[10px] uppercase font-bold text-gray-400 mt-0.5">{typeData.label}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4"><p className="text-sm text-gray-500 truncate max-w-xs">{notif.message}</p></td>
                      <td className="px-6 py-4 whitespace-nowrap"><span className="font-medium text-gray-700">{notif.console_admins?.name || 'Sistema'}</span></td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">{new Date(notif.created_at).toLocaleString('pt-BR')}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}