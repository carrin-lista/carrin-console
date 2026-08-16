import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { userService, type User } from '../services/userService';
import { ArrowLeft, User as UserIcon, Home, Clock, Mail, ShieldAlert, X } from 'lucide-react';

export function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'conta' | 'suporte'>('conta');
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      if (!id) return;
      try {
        setLoading(true);
        const data = await userService.getUserById(id);
        setUser(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mr-3"></div>
        Carregando perfil...
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg font-medium">
        {error || 'Usuário não encontrado.'}
      </div>
    );
  }

  // Pegamos a primeira casa que ele participa (se houver)
  const currentHome = user.home_members?.[0];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Botão Voltar */}
      <button 
        onClick={() => navigate('/usuarios')}
        className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 font-medium text-sm transition-colors w-max"
      >
        <ArrowLeft size={16} /> Voltar para lista
      </button>

      {/* Cabeçalho do Perfil */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        
        {/* Padrão Rigoroso de Container 1:1 Circular com Interação de Clique */}
        <div 
          onClick={() => user.avatar_url && setIsAvatarOpen(true)}
          className={`w-20 h-20 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center shrink-0 overflow-hidden ${user.avatar_url ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
          title={user.avatar_url ? "Ver foto ampliada" : ""}
        >
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <UserIcon size={32} className="text-gray-400" />
          )}
        </div>

        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[#272D2D]">{user.full_name || 'Usuário sem nome'}</h1>
          <p className="text-sm text-gray-500 font-medium flex items-center gap-1.5 mt-1">
            <Mail size={14} /> {user.email}
          </p>
          {user.username && (
            <span className="inline-block bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-0.5 rounded mt-2">
              {user.username}
            </span>
          )}
        </div>
        
        {/* Status / Ações Rápidas - Baseado no Documento */}
        <div className="flex flex-col items-end gap-2 border-l border-gray-100 pl-6 w-full sm:w-auto">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Conta Criada em</p>
          <p className="text-sm font-semibold text-[#272D2D] flex items-center gap-1.5">
            <Clock size={14} className="text-gray-400" />
            {new Date(user.created_at).toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="flex items-center gap-6 border-b border-gray-200 px-2">
        <button 
          onClick={() => setActiveTab('conta')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'conta' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          Visão Geral
        </button>
        <button 
          onClick={() => setActiveTab('suporte')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'suporte' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          Notas de Suporte
        </button>
      </div>

      {/* Conteúdo das Abas */}
      {activeTab === 'conta' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card: Dados da Casa */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Home size={16} /> Vínculo Familiar (Casa)
            </h3>
            
            {currentHome ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Casa Atual</p>
                  <p className="text-base font-bold text-[#272D2D]">{currentHome.homes?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Papel do Usuário</p>
                  <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded mt-1 uppercase ${
                    currentHome.role === 'owner' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {currentHome.role}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <ShieldAlert size={24} className="mx-auto text-yellow-500 mb-2" />
                <p className="text-sm font-bold text-gray-600">Sem Casa</p>
                <p className="text-xs text-gray-400 mt-1">Este usuário ainda não criou ou entrou em uma Casa.</p>
              </div>
            )}
          </div>

          {/* Card: Informações Técnicas */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
              Dados Técnicos
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 font-medium">User ID (UUID)</p>
                <code className="text-xs bg-gray-50 px-2 py-1 rounded text-gray-600 border border-gray-100 select-all block mt-1">
                  {user.id}
                </code>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400">Outros dados técnicos (como logs de login) serão disponibilizados na aba de auditoria futura.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'suporte' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center border-dashed">
          <p className="text-gray-400 font-medium text-sm">O sistema de notas internas será construído no módulo de Suporte.</p>
        </div>
      )}

      {/* Modal de Ampliação da Foto */}
      {isAvatarOpen && user.avatar_url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setIsAvatarOpen(false)}>
          <div className="relative animate-in zoom-in-95 duration-200">
            
            {/* Wrapper com Degradê da Paleta Carrin (#272D2D -> #23CE6B -> #F6F8FF) */}
            <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-full p-1.5 bg-gradient-to-tr from-[#272D2D] via-[#23CE6B] to-[#F6F8FF] shadow-2xl shrink-0">
              
              {/* Imagem interna perfeitamente circular */}
              <div className="w-full h-full rounded-full overflow-hidden bg-gray-50">
                <img src={user.avatar_url} alt="Avatar Ampliado" className="w-full h-full object-cover" />
              </div>
              
            </div>

            <button 
              onClick={(e) => { e.stopPropagation(); setIsAvatarOpen(false); }}
              className="absolute top-0 right-0 bg-[#272D2D] text-white rounded-full p-2 hover:bg-[#23CE6B] transition-colors shadow-lg"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}