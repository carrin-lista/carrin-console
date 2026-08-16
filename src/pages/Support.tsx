import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { consoleSupportService } from '../services/consoleSupportService';
import { Plus, Search, X, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';

export function Support() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const loadTickets = async () => {
    try {
      setLoading(true);
      // Usando o novo serviço com suporte a filtro
      const data = await consoleSupportService.getAllTickets(statusFilter);
      setTickets(data || []);
    } catch (error) {
      console.error('Erro ao carregar tickets de suporte:', error);
    } finally {
      setLoading(false);
    }
  };

  // Recarrega sempre que o filtro de status mudar
  useEffect(() => {
    loadTickets();
  }, [statusFilter]);

  // Busca de usuários para o Modal
  useEffect(() => {
    const searchUsers = async () => {
      if (!userQuery || userQuery.length < 2) {
        setUserResults([]);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, username, email')
          .or(`full_name.ilike.%${userQuery}%,username.ilike.%${userQuery}%,email.ilike.%${userQuery}%`)
          .limit(5);

        if (!error && data) {
          setUserResults(data);
        }
      } catch (err) {
        console.error('Erro na busca de usuários:', err);
      }
    };

    const timer = setTimeout(searchUsers, 300);
    return () => clearTimeout(timer);
  }, [userQuery]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      showToast('error', 'Selecione um usuário para abrir o ticket.');
      return;
    }
    if (!subject.trim() || !description.trim()) {
      showToast('error', 'Preencha o assunto e a descrição.');
      return;
    }

    try {
      setIsSubmitting(true);
      const { data: { user: _adminUser } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: selectedUser.id,
          subject: subject.trim(),
          description: description.trim(),
          status: 'open', // Ajustado para o novo padrão em minúsculo
          category: 'other', // Campo novo do schema
        });

      if (error) throw error;

      showToast('success', 'Ticket criado com sucesso.');
      setIsModalOpen(false);
      setSelectedUser(null);
      setUserQuery('');
      setSubject('');
      setDescription('');
      loadTickets();
    } catch (error: any) {
      showToast('error', error.message || 'Não foi possível criar o ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const translateStatus = (status: string) => {
    const s = status?.toLowerCase();
    const map: Record<string, string> = {
      'open': 'Aberto',
      'in_progress': 'Em andamento',
      'resolved': 'Resolvido',
      'closed': 'Fechado'
    };
    return map[s] || status;
  };

  const renderStatusBadge = (status: string) => {
    const s = status?.toLowerCase();
    let badgeStyle = 'bg-slate-100 text-slate-700';
    if (s === 'open') badgeStyle = 'bg-amber-50 text-amber-700 border border-amber-200';
    else if (s === 'in_progress') badgeStyle = 'bg-blue-50 text-blue-700 border border-blue-200';
    else if (s === 'resolved' || s === 'closed') badgeStyle = 'bg-emerald-50 text-emerald-700 border border-emerald-200';

    return (
      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${badgeStyle}`}>
        {translateStatus(status)}
      </span>
    );
  };

  const filteredTickets = tickets.filter(t => 
    t.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.users?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.users?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 relative animate-in fade-in">

      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top duration-200 ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-[#272D2D] tracking-tight">Central de Suporte</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie e acompanhe os atendimentos abertos pelos usuários do ecossistema.</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Novo ticket</span>
        </button>
      </div>

      {/* BARRA DE BUSCA E FILTROS */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search size={18} className="absolute left-3.5 top-3 text-gray-400" />
          <input 
            type="text"
            placeholder="Buscar por assunto ou nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200/80 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm font-medium text-gray-800 placeholder:text-gray-400"
          />
        </div>
        
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-gray-200/80 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-emerald-500 shadow-sm text-gray-700"
        >
          <option value="all">Todos os chamados</option>
          <option value="open">Abertos</option>
          <option value="in_progress">Em andamento</option>
          <option value="resolved">Resolvidos</option>
        </select>
      </div>

      {/* TABELA DE TICKETS */}
      <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Carregando tickets...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50/70 text-gray-500 uppercase text-[10px] tracking-wider border-b border-gray-200/80 font-bold">
                <tr>
                  <th className="px-6 py-4">Usuário</th>
                  <th className="px-6 py-4">Assunto</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Última Interação</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium">
                      Nenhum ticket de suporte encontrado.
                    </td>
                  </tr>
                ) : filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50/60 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-[#272D2D]">
                        {ticket.users?.full_name || 'Usuário Desconhecido'}
                      </div>
                      <div className="text-[11px] text-gray-400 font-medium">
                        {ticket.users?.email || ticket.users?.username || '—'}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-[#272D2D]">
                        {ticket.subject}
                      </div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">
                        {ticket.category}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderStatusBadge(ticket.status)}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-medium">
                      {new Date(ticket.updated_at || ticket.created_at).toLocaleString('pt-BR')}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {/* Corrigido para utilizar o Link do react-router-dom */}
                      <Link 
                        to={`/suporte/${ticket.id}`} 
                        className="text-emerald-600 font-semibold hover:text-emerald-800 transition-colors inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 text-xs"
                      >
                        <span>Ver detalhes</span>
                        <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE NOVO TICKET */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
            
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100">
              <h3 className="text-lg font-extrabold text-slate-800">Abrir Novo Ticket de Suporte</h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Usuário Atendido
                </label>
                {selectedUser ? (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                    <div>
                      <p className="text-xs font-bold text-emerald-900">{selectedUser.full_name || selectedUser.username}</p>
                      <p className="text-[11px] text-emerald-700">{selectedUser.email}</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setSelectedUser(null)} 
                      className="text-xs font-bold text-rose-600 hover:underline"
                    >
                      Alterar
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Buscar por nome, username ou e-mail..."
                      value={userQuery}
                      onChange={(e) => setUserQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
                    />
                    {userResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-20">
                        {userResults.map((u) => (
                          <div 
                            key={u.id}
                            onClick={() => {
                              setSelectedUser(u);
                              setUserResults([]);
                            }}
                            className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                          >
                            <p className="text-xs font-bold text-slate-800">{u.full_name || 'Sem nome'} <span className="text-slate-400 font-normal">({u.username || '@user'})</span></p>
                            <p className="text-[11px] text-slate-500">{u.email}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Assunto
                </label>
                <input 
                  type="text"
                  placeholder="Ex: Problema com sincronização de fatura"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Descrição do Atendimento
                </label>
                <textarea 
                  rows={4}
                  placeholder="Descreva detalhadamente o contexto ou solicitação do usuário..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-800 focus:outline-none focus:border-emerald-600 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Criando ticket...' : 'Criar ticket'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}