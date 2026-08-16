import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { consoleSupportService } from '../services/consoleSupportService';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Send, User, Home, Lock, } from 'lucide-react';

export function SupportDetail() {
  const { id } = useParams<{ id: string }>();

  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newMessage, setNewMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [ticketData, messagesData] = await Promise.all([
        consoleSupportService.getTicketDetails(id),
        consoleSupportService.getTicketMessages(id)
      ]);
      setTicket(ticketData);
      setMessages(messagesData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!id || !newMessage.trim()) return;

    setSending(true);
    try {
      // Pega o ID do admin direto do Auth do Supabase (Mais seguro)
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (!adminUser) throw new Error("Sessão de admin não encontrada");

      await consoleSupportService.sendAdminMessage(id, adminUser.id, newMessage.trim(), isInternalNote);
      
      setNewMessage('');
      await loadData(); // Recarrega a conversa para mostrar a nova mensagem
    } catch (error: any) {
      console.error("ERRO COMPLETO DO SUPABASE:", error);
      
      // Extrai a mensagem real do erro do Supabase
      const errorMessage = error.message || error.details || error.hint || JSON.stringify(error);
      alert(`Falha ao enviar: ${errorMessage}`);
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    try {
      await consoleSupportService.updateTicketStatus(id, newStatus);
      setTicket({ ...ticket, status: newStatus });
    } catch (error) {
      console.error(error);
      alert('Erro ao atualizar status.');
    }
  };

  if (loading) return <div className="text-center py-10 text-gray-400">Carregando chamado...</div>;
  if (!ticket) return <div className="text-center py-10 text-red-500">Chamado não encontrado.</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in">
      <Link to="/suporte" className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 font-medium text-sm transition-colors w-max">
        <ArrowLeft size={16} /> Voltar para Chamados
      </Link>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* COLUNA ESQUERDA: CHAT E MENSAGENS */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[70vh]">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50 shrink-0">
            <h2 className="text-lg font-bold text-[#272D2D]">{ticket.subject}</h2>
            <p className="text-sm text-gray-500 mt-1">{ticket.description}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/30">
            {messages.map(msg => {
              const isAdmin = !!msg.sender_admin_id;
              const isInternal = msg.is_internal;

              return (
                <div key={msg.id} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] text-gray-400 font-bold mb-1 mx-1 flex items-center gap-1">
                    {isInternal && <Lock size={10} className="text-amber-500" />}
                    {isAdmin ? 'Equipe Carrin' : msg.users?.full_name || 'Usuário'}
                  </span>
                  <div className={`px-4 py-3 rounded-2xl max-w-[85%] text-sm ${
                    isInternal ? 'bg-amber-100 text-amber-900 border border-amber-200 rounded-tr-sm' :
                    isAdmin ? 'bg-[#272D2D] text-white rounded-tr-sm shadow-sm' : 
                    'bg-white text-gray-700 border border-gray-200 rounded-tl-sm shadow-sm'
                  }`}>
                    {msg.message}
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-gray-100 bg-white shrink-0">
            <form onSubmit={handleSendMessage} className="space-y-3">
              <textarea 
                rows={3}
                placeholder="Escreva sua resposta..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className={`w-full border rounded-lg px-4 py-3 text-sm outline-none transition-colors resize-none ${isInternalNote ? 'bg-amber-50 border-amber-300 focus:border-amber-500' : 'bg-gray-50 border-gray-200 focus:border-emerald-500'}`}
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-600 cursor-pointer select-none hover:text-[#272D2D]">
                  <input 
                    type="checkbox" 
                    checked={isInternalNote} 
                    onChange={(e) => setIsInternalNote(e.target.checked)}
                    className="w-4 h-4 text-amber-500 rounded border-gray-300 focus:ring-amber-500"
                  />
                  <Lock size={14} className={isInternalNote ? 'text-amber-500' : 'text-gray-400'} />
                  Nota Interna (Invisível para o usuário)
                </label>
                <button 
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className={`px-6 py-2.5 rounded-lg text-white font-bold text-sm flex items-center gap-2 transition-colors disabled:opacity-50 ${isInternalNote ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                >
                  <Send size={16} /> {sending ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* COLUNA DIREITA: CONTEXTO */}
        <div className="w-full lg:w-80 space-y-4 shrink-0">
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status do Chamado</h3>
            <select 
              value={ticket.status} 
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-bold text-[#272D2D] outline-none focus:border-emerald-500"
            >
              <option value="open">Aberto</option>
              <option value="in_progress">Em Atendimento</option>
              <option value="resolved">Resolvido</option>
            </select>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2"><User size={14} /> Usuário</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                {ticket.users?.avatar_url ? <img src={ticket.users.avatar_url} className="w-full h-full object-cover" /> : <User size={20} className="m-auto mt-2 text-gray-400" />}
              </div>
              <div>
                <p className="text-sm font-bold text-[#272D2D]">{ticket.users?.full_name}</p>
                <p className="text-xs text-gray-500">{ticket.users?.email}</p>
              </div>
            </div>
            <Link to={`/usuarios/${ticket.user_id}`} className="block text-center text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 py-2 rounded-lg transition-colors">
              Ver perfil completo
            </Link>
          </div>

          {ticket.homes && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2"><Home size={14} /> Vínculo</h3>
              <div>
                <p className="text-xs text-gray-500 font-medium">Casa Vinculada</p>
                <p className="text-sm font-bold text-[#272D2D] mt-0.5">{ticket.homes.name}</p>
              </div>
              <Link to={`/casas/${ticket.home_id}`} className="block text-center text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 py-2 rounded-lg transition-colors">
                Ver detalhes da Casa
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}