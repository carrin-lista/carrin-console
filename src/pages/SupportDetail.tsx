import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supportService, type SupportTicket } from '../services/supportService';
import { auditService } from '../services/auditService';
import { supabase } from '../lib/supabase';
import { ArrowLeft, User, Calendar, AlertCircle, Clock, CheckCircle2, MessageSquare, CreditCard } from 'lucide-react';

export function SupportDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [houseContext, setHouseContext] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchTicket();
  }, [id]);

  async function fetchTicket() {
    if (!id) return;
    try {
      setLoading(true);
      const data = await supportService.getTicketById(id);
      setTicket(data);

      const ticketUserId = (data as unknown as { user_id?: string })?.user_id;

      if (ticketUserId) {
        const { data: memberData } = await supabase
          .from('home_members')
          .select('home_id, homes ( name ), role')
          .eq('user_id', ticketUserId)
          .maybeSingle();

        if (memberData?.home_id) {
          const { data: commercialState } = await supabase
            .from('house_commercial_states')
            .select('*')
            .eq('home_id', memberData.home_id)
            .maybeSingle();

          const { data: subscriptionData } = await supabase
            .from('subscriptions')
            .select('plan_type, price')
            .eq('home_id', memberData.home_id)
            .eq('is_current', true)
            .maybeSingle();

          setHouseContext({
            home_id: memberData.home_id,
            home_name: (memberData.homes as any)?.name || 'Casa sem nome',
            role: memberData.role,
            ...commercialState,
            plan_type: subscriptionData?.plan_type || 'STANDARD',
            price: subscriptionData?.price || 19.00
          });
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleStatusChange = async (newStatus: 'open' | 'in_progress' | 'resolved') => {
    if (!ticket || ticket.status === newStatus) return;
    try {
      setUpdating(true);
      await supportService.updateTicketStatus(ticket.id, newStatus);
      
      await auditService.createLog('ticket.status_updated', 'support_tickets', ticket.id, {
        before: { status: ticket.status },
        after: { status: newStatus }
      });
      
      setTicket({ ...ticket, status: newStatus });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mr-3"></div>
        Carregando ticket...
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg font-medium">{error || 'Ticket não encontrado.'}</div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button onClick={() => navigate('/suporte')} className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 font-medium text-sm transition-colors w-max">
        <ArrowLeft size={16} /> Voltar para lista
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 border-l-4 border-l-emerald-500">
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-2 text-[#272D2D] font-bold text-xl">
            <MessageSquare size={24} className="text-emerald-600" />
            <h1>{ticket.subject}</h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
            <span className="flex items-center gap-1.5"><Calendar size={16} className="text-gray-400" /> {new Date(ticket.created_at).toLocaleString('pt-BR')}</span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-400 font-mono text-xs">ID: {ticket.id}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Descrição do Problema</h3>
            <div className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm">
              {ticket.description || <span className="text-gray-400 italic">O usuário não forneceu uma descrição detalhada.</span>}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 text-[#272D2D] font-bold text-base mb-4 border-b border-gray-100 pb-2">
              <CreditCard size={18} className="text-emerald-600" />
              <h3>Contexto Comercial e Assinatura da Casa</h3>
            </div>
            
            {houseContext ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-400 uppercase font-medium">Casa</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5 truncate">{houseContext.home_name}</p>
                  <p className="text-[11px] text-emerald-600 font-medium mt-0.5 capitalize">Papel: {houseContext.role}</p>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-400 uppercase font-medium">Status Comercial</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{houseContext.status || 'TRIAL'}</p>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-400 uppercase font-medium">Limite Atual</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{houseContext.effective_limit || 5} moradores</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Este usuário não está associado a nenhuma Casa no momento.</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-[#272D2D] uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Status do Chamado</h3>
            <div className="space-y-2">
              <button onClick={() => handleStatusChange('open')} disabled={updating} className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-bold border transition-all ${ticket.status === 'open' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                <div className="flex items-center gap-2"><AlertCircle size={16} /> Aberto</div>
                {ticket.status === 'open' && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
              </button>
              <button onClick={() => handleStatusChange('in_progress')} disabled={updating} className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-bold border transition-all ${ticket.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                <div className="flex items-center gap-2"><Clock size={16} /> Em Andamento</div>
                {ticket.status === 'in_progress' && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
              </button>
              <button onClick={() => handleStatusChange('resolved')} disabled={updating} className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-bold border transition-all ${ticket.status === 'resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                <div className="flex items-center gap-2"><CheckCircle2 size={16} /> Resolvido</div>
                {ticket.status === 'resolved' && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-[#272D2D] uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Informações do Cliente</h3>
            {ticket.users ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200 overflow-hidden shrink-0">
                  {ticket.users.avatar_url ? <img src={ticket.users.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : <User size={18} />}
                </div>
                <div className="overflow-hidden">
                  <p className="font-bold text-[#272D2D] truncate">{ticket.users.full_name || 'Sem nome'}</p>
                  <p className="text-xs text-gray-500 truncate">{ticket.users.email}</p>
                  <Link to={`/usuarios/${ticket.users.id}`} className="text-[11px] font-bold text-emerald-600 hover:underline mt-1 inline-block">Ver Perfil Completo</Link>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Usuário excluído do sistema.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}