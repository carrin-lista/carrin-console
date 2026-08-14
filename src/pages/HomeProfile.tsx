import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, ShoppingBag, RefreshCw, Search, CheckCircle2, Tag } from 'lucide-react';

export function HomeProfile() {
  const { id } = useParams<{ id: string }>();
  const [home, setHome] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'RESUMO' | 'MEMBROS' | 'LISTAS'>('RESUMO');

  // Estados de Listas da Casa
  const [activeList, setActiveList] = useState<any>(null);
  const [activeItems, setActiveItems] = useState<any[]>([]);
  const [historyLists, setHistoryLists] = useState<any[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [listsError, setListsError] = useState<string | null>(null);
  const [itemSearch, setItemSearch] = useState('');

  useEffect(() => {
    if (id) {
      loadHomeProfile();
      loadHomeLists();
    }
  }, [id]);

  const loadHomeProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('homes')
        .select(`
          *,
          home_members (
            role,
            users ( id, full_name, username, email, phone, avatar_url )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setHome(data);
    } catch (error) {
      console.error('Erro ao carregar perfil da Casa:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHomeLists = async () => {
    if (!id) return;
    try {
      setLoadingLists(true);
      setListsError(null);
      
      const { data: lists, error } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('home_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (lists && lists.length > 0) {
        const currentActive = lists.find((l: any) => l.status === 'active' || l.status === 'in_progress' || !l.status) || lists[0];
        setActiveList(currentActive);

        const { data: items, error: itemsError } = await supabase
          .from('shopping_items')
          .select('*')
          .eq('home_id', id);
        
        if (itemsError) {
          setListsError(itemsError.message);
        } else {
          setActiveItems(items || []);
        }

        setHistoryLists(lists.filter((l: any) => l.id !== currentActive?.id));
      } else {
        setActiveList(null);
        setActiveItems([]);
        setHistoryLists([]);
      }
    } catch (err: any) {
      setListsError(err.message || 'Erro ao carregar dados de listas.');
    } finally {
      setLoadingLists(false);
    }
  };

  // Função inteligente que descobre a última alteração real (entre a lista e os itens)
  const getLatestRealUpdate = () => {
    if (!activeList) return null;
    let latestTime = new Date(activeList.updated_at || activeList.created_at).getTime();

    activeItems.forEach(item => {
      const itemTime = new Date(item.updated_at || item.created_at).getTime();
      if (itemTime > latestTime) {
        latestTime = itemTime;
      }
    });

    return new Date(latestTime);
  };

  const filteredItems = activeItems.filter(item => 
    item.name?.toLowerCase().includes(itemSearch.toLowerCase()) ||
    item.category?.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const completedCount = activeItems.filter(i => i.checked).length;
  const progressPercent = activeItems.length > 0 ? Math.round((completedCount / activeItems.length) * 100) : 0;
  const lastUpdateReal = getLatestRealUpdate();

  if (loading) return <div className="max-w-7xl mx-auto py-16 text-center text-gray-400 text-sm">Carregando informações da Casa...</div>;

  const owner = home.home_members?.find((m: any) => m.role === 'owner')?.users;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header Padronizado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-3">
          <Link to="/casas" className="p-2 bg-white border border-gray-200/80 rounded-xl text-gray-500 hover:text-gray-800 transition-colors shadow-sm">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#272D2D] tracking-tight">{home.name}</h1>
            <p className="text-sm text-gray-500 mt-1">Detalhes operacionais e listas de compras da Casa.</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200/80 gap-6 bg-white px-6 rounded-2xl border shadow-sm">
        {[
          { id: 'RESUMO', label: 'Resumo' },
          { id: 'MEMBROS', label: `Membros (${home.home_members?.length || 0})` },
          { id: 'LISTAS', label: 'Listas e Compras' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`py-4 text-xs font-bold tracking-wide uppercase border-b-2 transition-all ${
              activeTab === tab.id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'RESUMO' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Informações gerais</h3>
            <div className="space-y-3 text-sm">
              <div><p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">ID da Casa</p><p className="font-mono text-xs text-gray-700 mt-0.5">{home.id}</p></div>
              <div><p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Data de criação</p><p className="font-medium text-gray-800 mt-0.5">{new Date(home.created_at).toLocaleString('pt-BR')}</p></div>
              <div><p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Dono atual</p><p className="font-bold text-gray-800 mt-0.5">{owner?.full_name || owner?.email || 'Não definido'}</p></div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'MEMBROS' && (
        <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/70 text-gray-500 uppercase text-[10px] tracking-wider border-b border-gray-200/80 font-bold">
              <tr><th className="px-6 py-4">Membro</th><th className="px-6 py-4">Papel</th><th className="px-6 py-4">E-mail</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {home.home_members?.map((m: any, idx: number) => (
                <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-4 font-bold text-[#272D2D]">{m.users?.full_name || 'Usuário'}</td>
                  <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${m.role === 'owner' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>{m.role}</span></td>
                  <td className="px-6 py-4 text-xs text-gray-500">{m.users?.email || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'LISTAS' && (
        <div className="space-y-6">
          {listsError && <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-800 text-xs font-semibold">{listsError}</div>}

          <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#272D2D] uppercase tracking-wider">Lista ativa em andamento</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {completedCount} de {activeItems.length} itens comprados ({progressPercent}%)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Buscar item..." 
                    value={itemSearch} 
                    onChange={(e) => setItemSearch(e.target.value)} 
                    className="pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs w-48 focus:outline-none focus:border-emerald-500 bg-gray-50 font-medium text-gray-800" 
                  />
                </div>
                <button 
                  onClick={loadHomeLists} 
                  disabled={loadingLists} 
                  className="bg-white border border-gray-200/80 text-gray-700 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <RefreshCw size={14} className={loadingLists ? 'animate-spin' : ''} /> 
                  <span>Atualizar</span>
                </button>
              </div>
            </div>

            {activeItems.length > 0 && (
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
              </div>
            )}

            {loadingLists ? (
              <p className="text-center py-6 text-gray-400 text-xs">Carregando itens...</p>
            ) : !activeList ? (
              <div className="text-center py-10 space-y-2"><ShoppingBag size={32} className="mx-auto text-gray-300" /><p className="text-sm font-bold text-gray-700">Nenhuma lista em andamento</p></div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-gray-400 font-medium px-1">
                  <span>Última atualização real: {lastUpdateReal ? lastUpdateReal.toLocaleString('pt-BR') : '—'}</span>
                  <span className="font-mono text-[11px]">ID: {activeList.id}</span>
                </div>

                <div className="bg-gray-50/70 border border-gray-200/80 rounded-2xl p-4 max-h-72 overflow-y-auto space-y-2">
                  {filteredItems.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-gray-200/60 shadow-xs text-xs">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${item.checked ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                          <CheckCircle2 size= {14} />
                        </div>
                        <div>
                          <span className={`font-bold block ${item.checked ? 'line-through text-gray-400' : 'text-gray-800'}`}>{item.name}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            {item.category && <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md"><Tag size={10} className="inline mr-1" />{item.category}</span>}
                          </div>
                        </div>
                      </div>
                      <span className="font-bold text-gray-700 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-100">{item.quantity || 1} {item.unit || ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Histórico de listas anteriores</h3>
            {historyLists.length === 0 ? <p className="text-center py-8 text-gray-400 text-xs">Nenhum histórico encontrado.</p> : (
              <div className="divide-y divide-gray-100">
                {historyLists.map((list: any) => (
                  <div key={list.id} className="py-3.5 flex items-center justify-between text-xs">
                    <div><p className="font-bold text-gray-800">{list.name || 'Lista'}</p><p className="text-gray-400 text-[11px]">{new Date(list.created_at).toLocaleDateString('pt-BR')}</p></div>
                    <span className="bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded-md uppercase text-[10px]">{list.status || 'Concluída'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}