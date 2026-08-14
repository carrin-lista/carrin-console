import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { homeService, type Home } from '../services/homeService';
import { ArrowLeft, Home as HomeIcon, Users, Calendar, ArrowRight } from 'lucide-react';

export function HomeProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [home, setHome] = useState<Home | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHome() {
      if (!id) return;
      try {
        setLoading(true);
        const data = await homeService.getHomeById(id);
        setHome(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchHome();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mr-3"></div>
        Carregando casa...
      </div>
    );
  }

  if (error || !home) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-xl font-medium border border-red-100">
        {error || 'Casa não encontrada.'}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <button 
        onClick={() => navigate('/casas')}
        className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 font-medium text-sm transition-colors w-max"
      >
        <ArrowLeft size={16} /> Voltar para lista
      </button>

      {/* Cabeçalho da Casa */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="w-20 h-20 rounded-xl border border-gray-200/80 bg-emerald-50 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
          {home.photo_url ? (
            <img src={home.photo_url} alt="Casa" className="w-full h-full object-cover" />
          ) : (
            <HomeIcon size={32} className="text-emerald-600" />
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[#272D2D] tracking-tight">{home.name}</h1>
          <p className="text-sm text-gray-500 font-medium flex items-center gap-1.5 mt-1">
            <Users size={14} /> {home.home_members?.length || 0} moradores
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-1.5 border-l border-gray-100 pl-6 w-full sm:w-auto">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Casa Criada em</p>
          <p className="text-sm font-semibold text-[#272D2D] flex items-center gap-1.5">
            <Calendar size={14} className="text-gray-400" />
            {new Date(home.created_at).toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>

      {/* Lista de Membros */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/70">
          <h3 className="text-sm font-bold text-[#272D2D] uppercase tracking-wider">Moradores Atuais</h3>
        </div>
        
        <div className="divide-y divide-gray-100">
          {home.home_members?.map((member, index) => {
            const user = member.users;
            if (!user) return null;

            return (
              <div key={index} className="p-5 flex items-center justify-between hover:bg-gray-50/60 transition-colors">
                <div className="flex items-center gap-3">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full border border-gray-200 object-cover shadow-sm" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 font-bold text-sm shadow-sm">
                      {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-[#272D2D]">{user.full_name || 'Sem nome'}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase ${
                    member.role === 'owner' ? 'bg-purple-100 text-purple-700' : 
                    member.role === 'admin' ? 'bg-blue-100 text-blue-700' : 
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {member.role}
                  </span>
                  
                  <Link 
                    to={`/usuarios/${user.id}`}
                    className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                    title="Ver perfil do usuário"
                  >
                    <ArrowRight size={18} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}