import React, { useEffect, useState } from 'react';
import { auditService, type AuditLog } from '../services/auditService';
import { useAuthStore } from '../stores/useAuthStore';
import { Calendar, ChevronDown, ChevronUp, AlertCircle, Database, FileJson, ArrowLeft, ArrowRight } from 'lucide-react';

export function Audit() {
  const { admin } = useAuthStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [page, setPage] = useState(1);
  const [entityFilter, setEntityFilter] = useState('all');
  const [daysFilter, setDaysFilter] = useState(7);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const limit = 20;

  useEffect(() => {
    fetchLogs();
  }, [page, entityFilter, daysFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, count } = await auditService.getLogs(
        { entity_type: entityFilter, days: daysFilter }, 
        page, 
        limit
      );
      setLogs(data);
      setTotal(count);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatActionMessage = (log: AuditLog) => {
    switch (log.action) {
      case 'admin.created': return 'Adicionou um novo administrador à equipe';
      case 'ticket.status_updated': return `Alterou o status do ticket de suporte`;
      case 'notification.created': return 'Disparou uma notificação global';
      default: return `Realizou ação: ${log.action}`;
    }
  };

  const getEntityLabel = (type: string) => {
    switch (type) {
      case 'console_admins': return 'Equipe';
      case 'support_tickets': return 'Suporte';
      case 'global_notifications': return 'Notificações';
      default: return type;
    }
  };

  if (admin?.profile !== 'master' && admin?.profile !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-[#272D2D]">Acesso Negado</h2>
        <p className="text-gray-500 mt-2">Seu perfil não tem permissão para visualizar a auditoria.</p>
      </div>
    );
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Page Header Padronizado (H1 limpo sem ícone, subtítulo e filtros à direita) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-[#272D2D] tracking-tight">Auditoria</h1>
          <p className="text-sm text-gray-500 mt-1">Histórico imutável de rastreabilidade do painel.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select 
            value={entityFilter} 
            onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
            className="px-3.5 py-2.5 bg-white border border-gray-200/80 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
          >
            <option value="all">Todos os Módulos</option>
            <option value="console_admins">Administradores</option>
            <option value="support_tickets">Suporte</option>
            <option value="global_notifications">Notificações</option>
          </select>

          <select 
            value={daysFilter} 
            onChange={(e) => { setDaysFilter(Number(e.target.value)); setPage(1); }}
            className="px-3.5 py-2.5 bg-white border border-gray-200/80 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
          >
            <option value={0}>Todo o período</option>
            <option value={1}>Hoje</option>
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm font-medium border border-red-100">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/70 text-gray-500 uppercase text-[10px] tracking-wider border-b border-gray-200/80 font-bold">
              <tr>
                <th className="px-6 py-4">Autor da Ação</th>
                <th className="px-6 py-4">Ação Realizada</th>
                <th className="px-6 py-4">Módulo</th>
                <th className="px-6 py-4">Data / Hora</th>
                <th className="px-6 py-4 text-right">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex justify-center mb-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
                    </div>
                    Consultando logs imutáveis...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium">
                    Nenhum registro de auditoria encontrado para este filtro.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  
                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#272D2D]">{log.console_admins?.name || 'Sistema'}</span>
                            {log.console_admins?.profile && (
                              <span className="text-[9px] uppercase font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md">
                                {log.console_admins.profile}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium text-gray-700">{formatActionMessage(log)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500 uppercase bg-gray-100 px-2.5 py-1 rounded-lg">
                            <Database size={12} /> {getEntityLabel(log.entity_type)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500 flex items-center gap-1.5">
                          <Calendar size={14} /> {new Date(log.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button 
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors inline-flex"
                          >
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                        </td>
                      </tr>
                      
                      {isExpanded && (
                        <tr className="bg-gray-50/70 border-b border-gray-200/80">
                          <td colSpan={5} className="px-6 py-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Informações Técnicas</h4>
                                <ul className="space-y-2 text-sm text-gray-600">
                                  <li><strong>ID do Log:</strong> <code className="text-xs bg-gray-200 px-1.5 py-0.5 rounded">{log.id}</code></li>
                                  <li><strong>Ação Original:</strong> <code className="text-xs text-blue-600">{log.action}</code></li>
                                  <li><strong>ID da Entidade:</strong> {log.entity_id ? <code className="text-xs bg-gray-200 px-1.5 py-0.5 rounded">{log.entity_id}</code> : 'N/A'}</li>
                                </ul>
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                  <FileJson size={14} /> Dados do Estado (Metadata)
                                </h4>
                                <div className="space-y-2">
                                  {log.metadata?.before && (
                                    <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm">
                                      <p className="text-xs font-bold text-red-800 uppercase mb-1">Antes</p>
                                      <pre className="text-red-700 text-xs overflow-x-auto font-mono">
                                        {JSON.stringify(log.metadata.before, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  {log.metadata?.after && (
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-sm">
                                      <p className="text-xs font-bold text-emerald-800 uppercase mb-1">Depois / Ação</p>
                                      <pre className="text-emerald-700 text-xs overflow-x-auto font-mono">
                                        {JSON.stringify(log.metadata.after || log.metadata, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  {(!log.metadata || Object.keys(log.metadata).length === 0) && (
                                    <p className="text-sm text-gray-400 italic">Nenhum dado adicional registrado.</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-white">
          <p className="text-sm text-gray-500">
            Mostrando página <span className="font-bold">{page}</span> de <span className="font-bold">{totalPages || 1}</span> (Total: {total} logs)
          </p>
          <div className="flex gap-2">
            <button 
              disabled={page === 1} 
              onClick={() => setPage(page - 1)}
              className="px-3.5 py-2 border border-gray-200/80 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft size={14} /> Anterior
            </button>
            <button 
              disabled={page >= totalPages} 
              onClick={() => setPage(page + 1)}
              className="px-3.5 py-2 border border-gray-200/80 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1 transition-colors"
            >
              Próxima <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}