import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { homeService, type Home } from '../services/homeService';
import { Search, Home as HomeIcon, Users, ArrowRight } from 'lucide-react';

export function Homes() {
  const [homes, setHomes] = useState<Home[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHomes();
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchHomes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await homeService.getHomes(search);
      setHomes(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getOwner = (home: Home) => {
    return home.home_members?.find(m => m.role === 'owner')?.users;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#272D2D]">Casas</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie os ambientes compartilhados do Carrin.</p>
        </div>
        
        <div className="relative w-full sm:max-w-xs shrink-0">
          <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar nome da casa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm font-medium border border-red-100">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-wider border-b border-gray-200 font-bold">
              <tr>
                <th className="px-6 py-4">Casa</th>
                <th className="px-6 py-4">Dono Atual</th>
                <th className="px-6 py-4">Membros</th>
                <th className="px-6 py-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex justify-center mb-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
                    </div>
                    Carregando casas...
                  </td>
                </tr>
              ) : homes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-medium">
                    Nenhuma casa encontrada.
                  </td>
                </tr>
              ) : (
                homes.map((home) => {
                  const owner = getOwner(home);
                  const membersCount = home.home_members?.length || 0;

                  return (
                    <tr key={home.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {home.photo_url ? (
                            <img src={home.photo_url} alt="Casa" className="w-8 h-8 rounded-lg border border-gray-200 object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                              <HomeIcon size={14} />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-[#272D2D]">{home.name}</p>
                            <p className="text-[11px] text-gray-400 font-medium">
                              Criada em {new Date(home.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {owner ? (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[#272D2D]">{owner.full_name || 'Usuário'}</span>
                            <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">Dono</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-xs">Sem dono</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-gray-500 font-medium">
                          <Users size={14} />
                          <span>{membersCount} {membersCount === 1 ? 'morador' : 'moradores'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Link 
                          to={`/casas/${home.id}`} 
                          className="text-emerald-600 font-semibold hover:text-emerald-800 transition-colors flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100"
                        >
                          Ver Casa <ArrowRight size={14} />
                        </Link>
                      </td>
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