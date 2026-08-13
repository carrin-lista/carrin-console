import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supportService, type SupportTicket } from '../services/supportService';
import { Search, Headset, Clock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

export function Support() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTickets();
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await supportService.getTickets(search);
      setTickets(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'open':
        return { label: 'Aberto', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle };
      case 'in_progress':
        return { label: 'Em Andamento', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock };
      case 'resolved':
        return { label: 'Resolvido', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 };
      default:
        return { label: 'Desconhecido', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: AlertCircle };
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#272D2D]">Suporte</h1>
          <p className="text-sm text-gray-500 mt-1">Gerenciamento de tickets e atendimento aos usuários.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64 shrink-0">
            <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar assunto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm"
            />
          </div>
          <button className="bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors shrink-0 flex items-center gap-2">
            <Headset size={16} /> Novo Ticket
          </button>
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
                <th className="px-6 py-4">Assunto</th>
                <th className="px-6 py-4">Usuário / Cliente</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex justify-center mb-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
                    </div>
                    Carregando tickets...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium">
                    Nenhum ticket encontrado.
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => {
                  const StatusIcon = getStatusConfig(ticket.status).icon;
                  
                  return (
                    <tr key={ticket.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-bold text-[#272D2D] truncate max-w-xs">{ticket.subject}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">ID: {ticket.id.split('-')[0]}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-medium text-gray-700">{ticket.users?.full_name || 'Usuário Excluído'}</p>
                        <p className="text-xs text-gray-400">{ticket.users?.email}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`flex w-max items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase border ${getStatusConfig(ticket.status).color}`}>
                          <StatusIcon size={12} />
                          {getStatusConfig(ticket.status).label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-gray-500 font-medium">
                          {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Link 
                          to={`/suporte/${ticket.id}`} 
                          className="text-emerald-600 font-semibold hover:text-emerald-800 transition-colors flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100"
                        >
                          Ver Ticket <ArrowRight size={14} />
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