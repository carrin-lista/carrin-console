import { useEffect, useState, useRef } from 'react';
import { 
  notificationService, 
  type PushDispatchRecord, 
  type DispatchMetrics, 
  type AppUser, 
  type AppHome, 
  type PushAudience 
} from '../services/notificationService';
import { 
  Bell, 
  Search, 
  Send, 
  AlertTriangle, 
  X, 
  CheckCircle, 
  AlertCircle, 
  BarChart3, 
  History, 
  Wrench, 
  Users, 
  Home, 
  Globe 
} from 'lucide-react';

const PUSH_DESTINATIONS = [
  { label: 'Início do Carrin', value: '/' },
  { label: 'Lista de Compras', value: '/shopping' },
];

export function Notifications() {
  const [activeTab, setActiveTab] = useState<'overview' | 'dispatches' | 'diagnostic'>('overview');
  
  // Estados da Visão Geral e Histórico
  const [metrics, setMetrics] = useState<DispatchMetrics>({ total_dispatches: 0, total_sent: 0, total_failed: 0, total_pruned: 0 });
  const [dispatches, setDispatches] = useState<PushDispatchRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Estados do Modal de Novo Disparo
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [audienceType, setAudienceType] = useState<'user' | 'home' | 'all'>('user');
  
  // Busca de Usuários sob demanda
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<AppUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const userSearchTimeout = useRef<any>(null);

  // Busca de Casas sob demanda
  const [homeQuery, setHomeQuery] = useState('');
  const [homeResults, setHomeResults] = useState<AppHome[]>([]);
  const [selectedHome, setSelectedHome] = useState<AppHome | null>(null);
  const [searchingHomes, setSearchingHomes] = useState(false);
  const homeSearchTimeout = useRef<any>(null);

  // Conteúdo da Notificação
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [noticeType, setNoticeType] = useState<'info' | 'warning' | 'success'>('info');
  const [targetUrl, setTargetUrl] = useState('/');

  // Estimativa e Envio
  const [estimating, setEstimating] = useState(false);
  const [estimateData, setEstimateData] = useState<{ targeted_users: number; subscriptions_found: number } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendFeedback, setSendFeedback] = useState<any>(null);
  const [confirmAllModal, setConfirmAllModal] = useState(false);

  // Estados da aba de Diagnóstico (Preservada)
  const [diagUsers, setDiagUsers] = useState<AppUser[]>([]);
  const [diagUserId, setDiagUserId] = useState('');
  const [diagTitle, setDiagTitle] = useState('Teste de Notificação Carrin');
  const [diagMessage, setDiagMessage] = useState('Se você recebeu isso, o Web Push está funcionando perfeitamente!');
  const [diagSubmitting, setDiagSubmitting] = useState(false);
  const [diagResult, setDiagResult] = useState<any>(null);

  useEffect(() => {
    loadOverviewData();
  }, []);

  const loadOverviewData = async () => {
    setLoadingHistory(true);
    try {
      const [m, d] = await Promise.all([
        notificationService.getMetrics(),
        notificationService.getDispatches()
      ]);
      setMetrics(m);
      setDispatches(d);
    } catch (err) {
      console.error('Erro ao carregar dados da Central:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Debounce para busca de usuários
  const handleUserSearchInput = (val: string) => {
    setUserQuery(val);
    setSelectedUser(null);
    setEstimateData(null);
    if (userSearchTimeout.current) clearTimeout(userSearchTimeout.current);

    if (val.trim().length < 2) {
      setUserResults([]);
      return;
    }

    setSearchingUsers(true);
    userSearchTimeout.current = setTimeout(async () => {
      const results = await notificationService.searchUsers(val);
      setUserResults(results);
      setSearchingUsers(false);
    }, 300);
  };

  // Debounce para busca de casas
  const handleHomeSearchInput = (val: string) => {
    setHomeQuery(val);
    setSelectedHome(null);
    setEstimateData(null);
    if (homeSearchTimeout.current) clearTimeout(homeSearchTimeout.current);

    if (val.trim().length < 2) {
      setHomeResults([]);
      return;
    }

    setSearchingHomes(true);
    homeSearchTimeout.current = setTimeout(async () => {
      const results = await notificationService.searchHomes(val);
      setHomeResults(results);
      setSearchingHomes(false);
    }, 300);
  };

  // Solicitar Estimativa quando o público é selecionado
  useEffect(() => {
    const fetchEstimate = async () => {
      let audience: PushAudience | null = null;
      if (audienceType === 'user' && selectedUser) {
        audience = { type: 'user', user_id: selectedUser.id };
      } else if (audienceType === 'home' && selectedHome) {
        audience = { type: 'home', home_id: selectedHome.id };
      } else if (audienceType === 'all') {
        audience = { type: 'all' };
      }

      if (!audience) {
        setEstimateData(null);
        return;
      }

      setEstimating(true);
      try {
        const est = await notificationService.estimateAudience(audience);
        setEstimateData(est);
      } catch (err) {
        console.error('Erro ao estimar público:', err);
      } finally {
        setEstimating(false);
      }
    };

    fetchEstimate();
  }, [audienceType, selectedUser, selectedHome]);

  const executeDispatch = async () => {
    let audience: PushAudience;
    if (audienceType === 'user') {
      if (!selectedUser) return;
      audience = { type: 'user', user_id: selectedUser.id };
    } else if (audienceType === 'home') {
      if (!selectedHome) return;
      audience = { type: 'home', home_id: selectedHome.id };
    } else {
      audience = { type: 'all' };
    }

    setIsSending(true);
    setSendFeedback(null);
    try {
      const res = await notificationService.sendNotification({
        audience,
        title,
        message,
        type: noticeType,
        target_url: targetUrl
      });
      setSendFeedback(res);
      loadOverviewData();
    } catch (err: any) {
      setSendFeedback({ success: false, error: err.message });
    } finally {
      setIsSending(false);
      setConfirmAllModal(false);
    }
  };

  const handleSendClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (audienceType === 'all') {
      setConfirmAllModal(true);
    } else {
      executeDispatch();
    }
  };

  // Carregar dados para o Diagnóstico
  const loadDiagnosticUsers = async () => {
    if (diagUsers.length > 0) return;
    try {
      const list = await notificationService.searchUsers('a'); // busca inicial ampla segura
      setDiagUsers(list);
      if (list.length > 0) setDiagUserId(list[0].id);
    } catch (err) {
      console.error('Erro ao carregar usuários para diagnóstico:', err);
    }
  };

  const handleTestPushSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagUserId) return;
    setDiagSubmitting(true);
    setDiagResult(null);
    try {
      const res = await notificationService.testPushNotification({
        user_id: diagUserId,
        title: diagTitle,
        message: diagMessage
      });
      setDiagResult(res);
    } catch (err: any) {
      setDiagResult({ success: false, error: err.message });
    } finally {
      setDiagSubmitting(false);
    }
  };

  const filteredDispatches = dispatches.filter(d => {
    const matchSearch = d.title.toLowerCase().includes(historySearch.toLowerCase()) || d.message.toLowerCase().includes(historySearch.toLowerCase());
    const matchStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      
      {/* Modal de Confirmação para Broadcast ALL */}
      {confirmAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 border border-red-100">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-bold">Atenção: Broadcast Global</h3>
            </div>
            <p className="text-sm text-gray-600">
              Você está prestes a enviar esta notificação para <b>todos os usuários</b> cadastrados no sistema.
            </p>
            {estimateData && (
              <div className="bg-gray-50 p-3 rounded-xl text-xs text-gray-700 space-y-1">
                <p>Usuários alcançados: <b>{estimateData.targeted_users}</b></p>
                <p>Aparelhos Push registrados: <b>{estimateData.subscriptions_found}</b></p>
              </div>
            )}
            <p className="text-xs text-red-500 font-medium">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setConfirmAllModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-50">Cancelar</button>
              <button onClick={executeDispatch} disabled={isSending} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 shadow-sm">Confirmar Envio</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Novo Disparo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-100 my-8">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h2 className="text-lg font-bold text-[#272D2D] flex items-center gap-2"><Send size={18} className="text-emerald-600" /> Nova Notificação (Web Push)</h2>
              <button onClick={() => { setIsModalOpen(false); setSendFeedback(null); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            {sendFeedback ? (
              <div className="p-8 space-y-6 text-center">
                <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${sendFeedback.success ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                  {sendFeedback.success ? <CheckCircle size={32} /> : <AlertCircle size={32} />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{sendFeedback.success ? 'Notificação Enviada!' : 'Falha no Envio'}</h3>
                  <p className="text-sm text-gray-500 mt-1">Status: <span className="font-semibold uppercase">{sendFeedback.status || 'Erro'}</span></p>
                </div>
                {sendFeedback.success && (
                  <div className="bg-gray-50 p-4 rounded-xl max-w-sm mx-auto text-left text-xs space-y-1.5 border border-gray-200/60 font-medium">
                    <p>Público-alvo (Usuários): <b>{sendFeedback.targeted_users}</b></p>
                    <p>Aparelhos encontrados: <b>{sendFeedback.subscriptions_found}</b></p>
                    <p>Aceitos pelo Provider: <span className="text-emerald-600 font-bold">{sendFeedback.sent}</span></p>
                    <p>Falhas de entrega: <span className="text-red-600 font-bold">{sendFeedback.failed}</span></p>
                    <p>Inscrições expiradas limpas: <b>{sendFeedback.pruned}</b></p>
                  </div>
                )}
                {sendFeedback.error && <p className="text-sm text-red-600 font-medium">{sendFeedback.error}</p>}
                <button onClick={() => { setIsModalOpen(false); setSendFeedback(null); loadOverviewData(); }} className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-sm">Fechar e Concluir</button>
              </div>
            ) : (
              <form onSubmit={handleSendClick} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                
                {/* Seleção de Público */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Público-Alvo</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button type="button" onClick={() => setAudienceType('user')} className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${audienceType === 'user' ? 'border-emerald-600 bg-emerald-50/50 text-emerald-800 shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      <Users size={14} /> Usuário Específico
                    </button>
                    <button type="button" onClick={() => setAudienceType('home')} className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${audienceType === 'home' ? 'border-emerald-600 bg-emerald-50/50 text-emerald-800 shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      <Home size={14} /> Casa Inteira
                    </button>
                    <button type="button" onClick={() => setAudienceType('all')} className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${audienceType === 'all' ? 'border-emerald-600 bg-emerald-50/50 text-emerald-800 shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      <Globe size={14} /> Todos (Global)
                    </button>
                  </div>
                </div>

                {/* Seletor Dinâmico por Tipo de Público */}
                {audienceType === 'user' && (
                  <div className="space-y-2 relative">
                    <label className="block text-xs font-bold text-gray-700 uppercase">Buscar Usuário</label>
                    <div className="relative">
                      <Search size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                      <input 
                        type="text" 
                        value={userQuery} 
                        onChange={e => handleUserSearchInput(e.target.value)} 
                        placeholder="Digite ao menos 2 letras (nome, @username ou email)..." 
                        className="w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-emerald-500" 
                      />
                    </div>
                    {searchingUsers && <p className="text-xs text-gray-400 pl-1">Buscando usuários...</p>}
                    {userResults.length > 0 && !selectedUser && (
                      <div className="bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-gray-100 z-20 absolute w-full">
                        {userResults.map(u => (
                          <div key={u.id} onClick={() => { setSelectedUser(u); setUserResults([]); }} className="p-3 hover:bg-emerald-50/50 cursor-pointer flex justify-between items-center text-xs">
                            <div>
                              <p className="font-bold text-gray-800">{u.full_name || 'Sem Nome'} <span className="text-gray-400 font-normal">({u.username || '@user'})</span></p>
                              <p className="text-gray-500">{u.email}</p>
                            </div>
                            <span className="text-emerald-600 font-bold px-2 py-1 bg-emerald-50 rounded-lg">Selecionar</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedUser && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-emerald-900">Selecionado: {selectedUser.full_name || selectedUser.username}</p>
                          <p className="text-emerald-700">{selectedUser.email}</p>
                        </div>
                        <button type="button" onClick={() => setSelectedUser(null)} className="text-emerald-700 hover:text-red-600 font-bold">Alterar</button>
                      </div>
                    )}
                  </div>
                )}

                {audienceType === 'home' && (
                  <div className="space-y-2 relative">
                    <label className="block text-xs font-bold text-gray-700 uppercase">Buscar Casa</label>
                    <div className="relative">
                      <Search size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                      <input 
                        type="text" 
                        value={homeQuery} 
                        onChange={e => handleHomeSearchInput(e.target.value)} 
                        placeholder="Digite o nome da Casa..." 
                        className="w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-emerald-500" 
                      />
                    </div>
                    {searchingHomes && <p className="text-xs text-gray-400 pl-1">Buscando casas...</p>}
                    {homeResults.length > 0 && !selectedHome && (
                      <div className="bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-gray-100 z-20 absolute w-full">
                        {homeResults.map(h => (
                          <div key={h.id} onClick={() => { setSelectedHome(h); setHomeResults([]); }} className="p-3 hover:bg-emerald-50/50 cursor-pointer flex justify-between items-center text-xs">
                            <p className="font-bold text-gray-800">{h.name}</p>
                            <span className="text-emerald-600 font-bold px-2 py-1 bg-emerald-50 rounded-lg">Selecionar</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedHome && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                        <p className="font-bold text-emerald-900">Casa Selecionada: {selectedHome.name}</p>
                        <button type="button" onClick={() => setSelectedHome(null)} className="text-emerald-700 hover:text-red-600 font-bold">Alterar</button>
                      </div>
                    )}
                  </div>
                )}

                {/* Badge de Estimativa */}
                {estimateData && (
                  <div className="bg-blue-50/60 border border-blue-100 text-blue-900 px-4 py-2.5 rounded-xl text-xs flex justify-between items-center font-medium">
                    <span>Estimativa de Alcance:</span>
                    <span><b>{estimateData.targeted_users}</b> usuários / <b>{estimateData.subscriptions_found}</b> aparelhos Push</span>
                  </div>
                )}
                {estimating && <p className="text-xs text-gray-400 animate-pulse">Calculando público estimado...</p>}

                {/* Título e Mensagem */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-bold text-gray-700 uppercase">Título</label>
                      <span className="text-[10px] text-gray-400">{title.length}/50</span>
                    </div>
                    <input required type="text" maxLength={50} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Sua lista mudou 🛒" className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Tipo de Alerta</label>
                    <select value={noticeType} onChange={e => setNoticeType(e.target.value as any)} className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-emerald-500">
                      <option value="info">Informativo (Azul)</option>
                      <option value="warning">Aviso Importante (Amarelo)</option>
                      <option value="success">Novidade / Sucesso (Verde)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold text-gray-700 uppercase">Mensagem</label>
                    <span className="text-[10px] text-gray-400">{message.length}/200</span>
                  </div>
                  <textarea required rows={3} maxLength={200} value={message} onChange={e => setMessage(e.target.value)} placeholder="Novos itens foram adicionados à sua lista..." className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium resize-none focus:outline-none focus:border-emerald-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Ao tocar na notificação (Deep Link)</label>
                  <select value={targetUrl} onChange={e => setTargetUrl(e.target.value)} className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-emerald-500">
                    {PUSH_DESTINATIONS.map(d => (
                      <option key={d.value} value={d.value}>{d.label} ({d.value})</option>
                    ))}
                  </select>
                </div>

                {/* Preview Visual */}
                <div className="bg-gray-900 text-gray-100 p-4 rounded-2xl space-y-2 border border-gray-800 shadow-inner">
                  <div className="flex items-center justify-between text-[11px] text-gray-400 font-semibold uppercase tracking-wider">
                    <span>Pré-visualização (Aproximada)</span>
                    <span>agora</span>
                  </div>
                  <div className="bg-gray-800/80 p-3.5 rounded-xl border border-gray-700/60 space-y-1">
                    <p className="font-bold text-sm text-white flex items-center gap-1.5">
                      <Bell size={13} className="text-emerald-400" /> {title || 'Título da Notificação'}
                    </p>
                    <p className="text-xs text-gray-300 leading-relaxed">{message || 'O conteúdo da sua mensagem aparecerá aqui...'}</p>
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-50">Cancelar</button>
                  <button type="submit" disabled={isSending || (audienceType === 'user' && !selectedUser) || (audienceType === 'home' && !selectedHome)} className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 shadow-sm flex justify-center items-center gap-2">
                    {isSending ? 'Enviando...' : 'Enviar agora'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-[#272D2D] tracking-tight">Central de Notificações</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie campanhas de Web Push, acompanhe a saúde das entregas e execute diagnósticos.</p>
        </div>
        <button onClick={() => { setIsModalOpen(true); setSendFeedback(null); }} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-2 shrink-0">
          <Send size={16} /> Nova notificação
        </button>
      </div>

      {/* Navegação por Abas (Tabs) */}
      <div className="flex border-b border-gray-200/80 gap-6 text-sm font-bold">
        <button onClick={() => setActiveTab('overview')} className={`pb-3.5 flex items-center gap-2 border-b-2 transition-all ${activeTab === 'overview' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
          <BarChart3 size={16} /> Visão Geral & Métricas
        </button>
        <button onClick={() => setActiveTab('dispatches')} className={`pb-3.5 flex items-center gap-2 border-b-2 transition-all ${activeTab === 'dispatches' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
          <History size={16} /> Histórico de Disparos
        </button>
        <button onClick={() => { setActiveTab('diagnostic'); loadDiagnosticUsers(); }} className={`pb-3.5 flex items-center gap-2 border-b-2 transition-all ${activeTab === 'diagnostic' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
          <Wrench size={16} /> Diagnóstico Técnico
        </button>
      </div>

      {/* AB 1: VISÃO GERAL */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total de Disparos</p>
              <p className="text-3xl font-extrabold text-[#272D2D]">{metrics.total_dispatches}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Push Aceitos</p>
              <p className="text-3xl font-extrabold text-emerald-700">{metrics.total_sent}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-red-500">Falhas Registradas</p>
              <p className="text-3xl font-extrabold text-red-600">{metrics.total_failed}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Removidas (Pruned)</p>
              <p className="text-3xl font-extrabold text-amber-700">{metrics.total_pruned}</p>
            </div>
          </div>

          <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-[#272D2D]">Últimos Disparos Realizados</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50/70 text-gray-500 uppercase text-[10px] tracking-wider border-b border-gray-200/80 font-bold">
                  <tr>
                    <th className="px-4 py-3">Título / Mensagem</th>
                    <th className="px-4 py-3">Público</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Aceitos / Total</th>
                    <th className="px-4 py-3">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dispatches.slice(0, 5).map(d => (
                    <tr key={d.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3">
                        <p className="font-bold text-gray-800">{d.title}</p>
                        <p className="text-xs text-gray-500 truncate max-w-xs">{d.message}</p>
                      </td>
                      <td className="px-4 py-3 uppercase text-xs font-bold text-gray-600">{d.audience_type}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${d.status === 'sent' ? 'bg-emerald-100 text-emerald-800' : d.status === 'partial' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-700">{d.sent} / {d.subscriptions_found}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(d.created_at).toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                  {dispatches.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nenhum disparo registrado ainda.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* AB 2: HISTÓRICO DE DISPAROS */}
      {activeTab === 'dispatches' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3.5 top-3 text-gray-400" />
              <input type="text" placeholder="Filtrar por título ou mensagem..." value={historySearch} onChange={e => setHistorySearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200/80 rounded-xl text-sm font-medium focus:outline-none focus:border-emerald-500 shadow-sm" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2.5 bg-white border border-gray-200/80 rounded-xl text-sm font-medium focus:outline-none focus:border-emerald-500 shadow-sm">
              <option value="all">Todos os Status</option>
              <option value="sent">Enviado (Sent)</option>
              <option value="partial">Parcial (Partial)</option>
              <option value="failed">Falhou (Failed)</option>
            </select>
          </div>

          <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50/70 text-gray-500 uppercase text-[10px] tracking-wider border-b border-gray-200/80 font-bold">
                  <tr>
                    <th className="px-6 py-4">Notificação</th>
                    <th className="px-6 py-4">Público</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Entrega (Aceitos/Subs)</th>
                    <th className="px-6 py-4">Responsável</th>
                    <th className="px-6 py-4">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loadingHistory ? (
                    <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">Carregando histórico...</td></tr>
                  ) : filteredDispatches.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">Nenhum registro encontrado.</td></tr>
                  ) : (
                    filteredDispatches.map(d => (
                      <tr key={d.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-800">{d.title}</p>
                          <p className="text-xs text-gray-500 truncate max-w-xs">{d.message}</p>
                        </td>
                        <td className="px-6 py-4 uppercase text-xs font-bold text-gray-600">{d.audience_type}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${d.status === 'sent' ? 'bg-emerald-100 text-emerald-800' : d.status === 'partial' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-700">{d.sent} / {d.subscriptions_found} <span className="text-[10px] text-gray-400 font-normal">({d.failed} falhas)</span></td>
                        <td className="px-6 py-4 text-xs font-medium text-gray-700">{d.created_by_admin?.name || 'Administrador'}</td>
                        <td className="px-6 py-4 text-xs text-gray-500">{new Date(d.created_at).toLocaleString('pt-BR')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* AB 3: DIAGNÓSTICO TÉCNICO (Preservado) */}
      {activeTab === 'diagnostic' && (
        <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm max-w-2xl space-y-5">
          <div>
            <h3 className="font-bold text-base text-[#272D2D]">Diagnóstico e Teste de Aparelho</h3>
            <p className="text-xs text-gray-500 mt-0.5">Dispare um teste direto para validar o transporte Web Push em um usuário específico.</p>
          </div>

          <form onSubmit={handleTestPushSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Usuário de Teste</label>
              <select value={diagUserId} onChange={e => setDiagUserId(e.target.value)} className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-emerald-500">
                {diagUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name || u.email || u.id}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Título</label>
              <input required type="text" value={diagTitle} onChange={e => setDiagTitle(e.target.value)} className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-emerald-500" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Mensagem</label>
              <textarea required rows={3} value={diagMessage} onChange={e => setDiagMessage(e.target.value)} className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium resize-none focus:outline-none focus:border-emerald-500" />
            </div>

            {diagResult && (
              <div className={`p-4 rounded-xl text-xs space-y-1.5 border ${diagResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                <p className="font-bold">{diagResult.success ? 'Push processado com sucesso' : 'Falha no transporte'}</p>
                <p>Subscriptions encontradas: <b>{diagResult.subscriptions_found}</b></p>
                <p>Push aceitos pelo Provider: <b>{diagResult.sent}</b></p>
                <p>Falhas: <b>{diagResult.failed}</b></p>
                <p>Pruned (Removidas): <b>{diagResult.pruned}</b></p>
                {diagResult.error && <p className="text-red-600 font-medium">Erro: {diagResult.error}</p>}
              </div>
            )}

            <button type="submit" disabled={diagSubmitting || !diagUserId} className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-sm disabled:opacity-50">
              {diagSubmitting ? 'Executando teste...' : 'Testar Push (Diagnóstico)'}
            </button>
          </form>
        </div>
      )}

    </div>
  );
}