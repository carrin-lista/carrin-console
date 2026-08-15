import { useEffect, useState } from 'react';
import { notificationService, type GlobalNotification, type AppUser, type PushTestResult } from '../services/notificationService';
import { auditService } from '../services/auditService';
import { useAuthStore } from '../stores/useAuthStore';
import { Bell, Search, Info, AlertTriangle, CheckCircle2, X, Smartphone, CheckCircle, AlertCircle } from 'lucide-react';

export function Notifications() {
  const [notifications, setNotifications] = useState<GlobalNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estados para o Teste de Push Individual
  const [users, setUsers] = useState<AppUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [testNotice, setTestNotice] = useState({
    title: 'Teste de Notificação Carrin',
    message: 'Se você recebeu isso, o Web Push está funcionando perfeitamente!'
  });
  const [testResult, setTestResult] = useState<PushTestResult | null>(null);

  const { admin } = useAuthStore();

  useEffect(() => {
    fetchNotifications();
    fetchUsers();
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

  const fetchUsers = async () => {
    try {
      const list = await notificationService.getUsersForTesting();
      setUsers(list);
      if (list.length > 0) setSelectedUserId(list[0].id);
    } catch (err) {
      console.error('Erro ao buscar usuários para teste:', err);
    }
  };

  const handleTestPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin || !selectedUserId) return;
    
    setIsSubmitting(true);
    setTestResult(null);

    try {
      const result = await notificationService.testPushNotification({
        user_id: selectedUserId,
        title: testNotice.title,
        message: testNotice.message
      });
      
      setTestResult(result);
      
      // Auditoria segura da ação administrativa[cite: 4]
      await auditService.createLog('push.tested', 'push_subscriptions', null, {
        target_user_id: selectedUserId,
        subscriptions_found: result.subscriptions_found,
        sent: result.sent,
        failed: result.failed,
        pruned: result.pruned
      });
      
    } catch (err: any) {
      setTestResult({
        success: false,
        reason: 'EXCEPTION',
        subscriptions_found: 0,
        sent: 0,
        failed: 1,
        pruned: 0,
        error: err.message
      });
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#272D2D] flex items-center gap-2"><Smartphone size={18} className="text-emerald-600" /> Testar Web Push (Individual)</h2>
              <button onClick={() => { setIsModalOpen(false); setTestResult(null); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleTestPush} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Selecionar Usuário de Teste</label>
                <select 
                  value={selectedUserId} 
                  onChange={e => setSelectedUserId(e.target.value)} 
                  className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 font-medium text-gray-800"
                >
                  {users.length === 0 ? (
                    <option value="">Nenhum usuário encontrado</option>
                  ) : (
                    users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.email || u.id}
                      </option>
                    ))
                  )}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">O teste enviará uma notificação direta para os aparelhos conectados deste usuário.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Título</label>
                <input required type="text" maxLength={50} value={testNotice.title} onChange={e => setTestNotice({...testNotice, title: e.target.value})} className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 font-medium text-gray-800" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Mensagem</label>
                <textarea required rows={3} value={testNotice.message} onChange={e => setTestNotice({...testNotice, message: e.target.value})} className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 resize-none font-medium text-gray-800" />
              </div>

              {/* Bloco de feedback do resultado do teste */}
              {testResult && (
                <div className={`p-4 rounded-xl text-xs space-y-1.5 border ${testResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                  <div className="flex items-center gap-1.5 font-bold">
                    {testResult.success ? <CheckCircle size={16} className="text-emerald-600" /> : <AlertCircle size={16} className="text-amber-600" />}
                    <span>{testResult.success ? 'Push Processado com Sucesso' : `Atenção: ${testResult.reason || 'Falha no Envio'}`}</span>
                  </div>
                  <p>Aparelhos encontrados (Subscriptions): <b>{testResult.subscriptions_found}</b></p>
                  <p>Enviados com sucesso: <b>{testResult.sent}</b></p>
                  <p>Falhas de envio: <b>{testResult.failed}</b></p>
                  <p>Inscrições expiradas limpas (Pruned): <b>{testResult.pruned}</b></p>
                  {testResult.error && <p className="text-red-600 font-medium pt-1">Erro: {testResult.error}</p>}
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => { setIsModalOpen(false); setTestResult(null); }} className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors">Fechar</button>
                <button type="submit" disabled={isSubmitting || !selectedUserId} className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-70 flex justify-center items-center gap-2 shadow-sm">
                  {isSubmitting ? 'Enviando...' : 'Testar Push'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-[#272D2D] tracking-tight">Gerenciamento de Push</h1>
          <p className="text-sm text-gray-500 mt-1">Diagnóstico individual e histórico de infraestrutura Web Push.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64 shrink-0">
            <Search size={18} className="absolute left-3.5 top-3 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar histórico..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200/80 rounded-xl text-sm focus:outline-none focus:border-emerald-500 font-medium text-gray-800 placeholder:text-gray-400 shadow-sm" 
            />
          </div>
          <button onClick={() => { setIsModalOpen(true); setTestResult(null); }} className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shrink-0 flex items-center gap-2 shadow-sm">
            <Smartphone size={16} /> Testar Push
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm font-medium border border-red-100">{error}</div>}

      <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/70 text-gray-500 uppercase text-[10px] tracking-wider border-b border-gray-200/80 font-bold">
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
                <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-medium">Nenhum registro encontrado.</td></tr>
              ) : (
                filteredNotifications.map((notif) => {
                  const typeData = getTypeConfig(notif.type);
                  const Icon = typeData.icon;
                  
                  return (
                    <tr key={notif.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${typeData.bg} ${typeData.color}`}><Icon size={16} /></div>
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