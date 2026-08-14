import React, { useState, useEffect } from 'react';
import { billingService } from '../services/billingService';
import type { SubscriptionSummary } from '../services/billingService';
import { X, RefreshCw, AlertCircle, Tag, ShieldAlert, CheckCircle, Trash2, ExternalLink } from 'lucide-react';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  home: SubscriptionSummary | null;
}

export default function SubscriptionModal({ isOpen, onClose, home }: SubscriptionModalProps) {
  const [activeTab, setActiveTab] = useState<'RESUMO' | 'COBRANCAS' | 'EVENTOS' | 'OFERTA'>('RESUMO');
  const [newLimit, setNewLimit] = useState(10);
  const [newPrice, setNewPrice] = useState(29.90);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  
  // Sistema de Toast interno para evitar alerts nativos
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estados de confirmação controlados por UI (sem window.confirm)
  const [confirmCancelSub, setConfirmCancelSub] = useState(false);
  const [offerIdToCancel, setOfferIdToCancel] = useState<string | null>(null);

  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  
  const [offers, setOffers] = useState<any[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (isOpen && home) {
      if (activeTab === 'COBRANCAS' || activeTab === 'EVENTOS') {
        loadEvents();
      } else if (activeTab === 'OFERTA') {
        loadOffers();
      }
    }
  }, [isOpen, activeTab, home]);

  const loadEvents = async () => {
    if (!home) return;
    try {
      setLoadingEvents(true);
      const data = await billingService.getBillingEvents(home.home_id);
      setEvents(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const loadOffers = async () => {
    if (!home) return;
    try {
      setLoadingOffers(true);
      const data = await billingService.getHomeOffers(home.home_id);
      setOffers(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingOffers(false);
    }
  };

  if (!isOpen || !home) return null;

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await billingService.createCustomOffer(home.home_id, newPrice, newLimit);
      showToast('success', 'Oferta personalizada criada e notificação enviada para a Casa.');
      loadOffers();
      setNewLimit(10);
      setNewPrice(29.90);
    } catch (error: any) {
      showToast('error', error.message || 'Não foi possível criar a oferta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOffer = async (offerId: string) => {
    try {
      await billingService.cancelCustomOffer(offerId);
      showToast('success', 'Proposta pendente cancelada com sucesso.');
      setOfferIdToCancel(null);
      loadOffers();
    } catch (error: any) {
      showToast('error', error.message || 'Não foi possível cancelar a proposta.');
    }
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const result = await billingService.syncWithAsaas(home.home_id);
      showToast('success', `Sincronização concluída. Status no Asaas: ${translateStatus(result.asaas_status)}`);
    } catch (error: any) {
      showToast('error', error.message || 'Falha ao sincronizar com o Asaas.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setIsCancelling(true);
      await billingService.cancelSubscription(home.home_id);
      showToast('success', 'Assinatura cancelada com sucesso.');
      setConfirmCancelSub(false);
      setTimeout(() => onClose(), 1500);
    } catch (error: any) {
      showToast('error', error.message || 'Não foi possível cancelar a assinatura.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Humanização de Status (Português do Brasil)
  const translateStatus = (status: string) => {
    const map: Record<string, string> = {
      'ACTIVE': 'Ativa',
      'TRIAL': 'Trial',
      'PAST_DUE': 'Em atraso',
      'LEGACY': 'Pré-monetização',
      'CANCELLED': 'Cancelada',
      'INACTIVE': 'Inativa',
      'INTERNAL': 'Casa interna',
      'PAYMENT_REVIEW': 'Em análise',
      'PENDING': 'Pendente',
      'RECEIVED': 'Recebido',
      'CONFIRMED': 'Confirmado',
      'OVERDUE': 'Vencido',
      'REFUNDED': 'Estornado',
    };
    return map[status] || status;
  };

  const translateEvent = (eventType: string) => {
    const map: Record<string, string> = {
      'PAYMENT_CREATED': 'Fatura gerada',
      'PAYMENT_CONFIRMED': 'Pagamento confirmado',
      'PAYMENT_RECEIVED': 'Pagamento recebido',
      'PAYMENT_OVERDUE': 'Pagamento vencido',
    };
    return map[eventType] || eventType;
  };

  const renderStatusBadge = (status: string) => {
    const s = status?.toUpperCase();
    let badgeStyle = 'bg-slate-100 text-slate-700';
    if (s === 'ACTIVE' || s === 'CONFIRMED' || s === 'RECEIVED' || s === 'INTERNAL') {
      badgeStyle = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    } else if (s === 'PAST_DUE' || s === 'OVERDUE' || s === 'INACTIVE') {
      badgeStyle = 'bg-rose-50 text-rose-700 border border-rose-200';
    } else if (s === 'TRIAL' || s === 'PENDING' || s === 'PAYMENT_REVIEW') {
      badgeStyle = 'bg-amber-50 text-amber-700 border border-amber-200';
    }
    return (
      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${badgeStyle}`}>
        {translateStatus(status)}
      </span>
    );
  };

  const paymentEvents = events.filter(e => e.payload && e.payload.payment);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* TOAST FLUTUANTE INTERNO */}
        {toast && (
          <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top duration-200 ${
            toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}>
            {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{toast.text}</span>
          </div>
        )}

        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Detalhes da Assinatura</span>
            <h3 className="text-xl font-extrabold text-slate-800">{home.home_name}</h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* TABS */}
        <div className="flex border-b border-slate-100 px-6 bg-slate-50/50 gap-2 overflow-x-auto">
          {[
            { id: 'RESUMO', label: 'Resumo' },
            { id: 'COBRANCAS', label: 'Cobranças' },
            { id: 'EVENTOS', label: 'Eventos técnicos' },
            { id: 'OFERTA', label: 'Ofertas personalizadas' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-xs font-bold tracking-wide uppercase border-b-2 whitespace-nowrap transition-all ${
                activeTab === tab.id 
                  ? 'border-emerald-600 text-emerald-700 bg-white shadow-xs rounded-t-lg' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* CONTEÚDO SCROLLÁVEL */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-white">
          
          {activeTab === 'RESUMO' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Status Comercial</p>
                  <div className="mt-1">{renderStatusBadge(home.commercial_status)}</div>
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Limite de Moradores</p>
                  <p className="text-lg font-black text-slate-800 mt-1">{home.effective_limit} pessoas</p>
                </div>
              </div>

              <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">Sincronização com Asaas</p>
                  <p className="text-xs text-slate-600 mb-3">Reconcilia o status financeiro real diretamente com o gateway.</p>
                </div>
                <button 
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                  {isSyncing ? 'Sincronizando...' : 'Sincronizar com Asaas'}
                </button>
              </div>

              <div className="bg-rose-50/50 p-5 rounded-xl border border-rose-100 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-600 mb-1">Zona de Perigo</p>
                  <p className="text-xs text-slate-600 mb-3">Encerra a recorrência financeira no Asaas e bloqueia o acesso.</p>
                </div>

                {!confirmCancelSub ? (
                  <button 
                    onClick={() => setConfirmCancelSub(true)}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white py-2.5 px-4 rounded-lg text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2"
                  >
                    <ShieldAlert size={14} />
                    <span>Cancelar assinatura</span>
                  </button>
                ) : (
                  <div className="bg-white p-3 rounded-lg border border-rose-200 space-y-2">
                    <p className="text-xs font-bold text-rose-900">Deseja realmente cancelar esta assinatura?</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setConfirmCancelSub(false)}
                        className="flex-1 bg-slate-100 text-slate-700 py-1.5 rounded text-xs font-bold hover:bg-slate-200"
                      >
                        Voltar
                      </button>
                      <button 
                        onClick={handleCancelSubscription}
                        disabled={isCancelling}
                        className="flex-1 bg-rose-600 text-white py-1.5 rounded text-xs font-bold hover:bg-rose-700 disabled:opacity-50"
                      >
                        {isCancelling ? 'Cancelando...' : 'Sim, cancelar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'COBRANCAS' && (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              {loadingEvents ? (
                <p className="text-center py-8 text-slate-400 text-sm">Carregando cobranças...</p>
              ) : (
                <table className="min-w-full divide-y divide-slate-100 text-left">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-3">Vencimento</th>
                      <th className="px-5 py-3">Valor</th>
                      <th className="px-5 py-3">Situação</th>
                      <th className="px-5 py-3 text-right">Fatura</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {paymentEvents.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-slate-400 text-xs">
                          Nenhuma cobrança registrada para esta assinatura.
                        </td>
                      </tr>
                    ) : paymentEvents.map((evt) => (
                      <tr key={evt.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3.5 text-slate-700 font-medium">
                          {new Date(evt.payload.payment.dueDate).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-5 py-3.5 text-slate-900 font-bold">
                          R$ {evt.payload.payment.value.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="px-5 py-3.5">
                          {renderStatusBadge(evt.payload.payment.status)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {evt.payload.payment.invoiceUrl ? (
                            <a 
                              href={evt.payload.payment.invoiceUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-emerald-600 hover:underline text-xs font-bold inline-flex items-center gap-1"
                            >
                              <span>Ver fatura</span>
                              <ExternalLink size={12} />
                            </a>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'EVENTOS' && (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              {loadingEvents ? (
                <p className="text-center py-8 text-slate-400 text-sm">Carregando eventos técnicos...</p>
              ) : (
                <table className="min-w-full divide-y divide-slate-100 text-left">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-3">Data / Hora</th>
                      <th className="px-5 py-3">Evento</th>
                      <th className="px-5 py-3">Gateway ID</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {events.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-slate-400 text-xs">
                          Nenhum evento técnico registrado.
                        </td>
                      </tr>
                    ) : events.map((evt) => (
                      <tr key={evt.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3.5 text-slate-500 text-xs">
                          {new Date(evt.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-5 py-3.5 font-bold text-slate-800">
                          {translateEvent(evt.event_type)}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-slate-400">
                          {evt.external_id || '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                            evt.status === 'PROCESSED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {evt.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'OFERTA' && (
            <div className="space-y-6">
              {/* Formulário de Criação */}
              <form onSubmit={handleCreateOffer} className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                  <Tag size={16} className="text-emerald-600" />
                  <h4>Criar nova proposta comercial</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Novo limite de moradores
                    </label>
                    <input 
                      type="number" 
                      value={newLimit} 
                      onChange={(e) => setNewLimit(Number(e.target.value))} 
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-600" 
                      min="6" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Novo preço mensal (R$)
                    </label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={newPrice} 
                      onChange={(e) => setNewPrice(Number(e.target.value))} 
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-600" 
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-xs transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Gerando proposta...' : 'Gerar proposta e notificar'}
                  </button>
                </div>
              </form>

              {/* Histórico de Ofertas */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Histórico de ofertas desta Casa</h4>
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  {loadingOffers ? (
                    <p className="text-center py-6 text-slate-400 text-xs">Carregando ofertas...</p>
                  ) : (
                    <table className="min-w-full divide-y divide-slate-100 text-left">
                      <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <tr>
                          <th className="px-5 py-3">Criada em</th>
                          <th className="px-5 py-3">Limite</th>
                          <th className="px-5 py-3">Valor</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {offers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-5 py-8 text-center text-slate-400 text-xs">
                              Nenhuma oferta personalizada registrada para esta Casa.
                            </td>
                          </tr>
                        ) : offers.map((offer) => (
                          <tr key={offer.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-3.5 text-slate-500 text-xs">
                              {new Date(offer.created_at).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-5 py-3.5 text-slate-800 font-bold">
                              {offer.new_limit} moradores
                            </td>
                            <td className="px-5 py-3.5 text-slate-900 font-extrabold">
                              R$ {offer.new_price.toFixed(2).replace('.', ',')}
                            </td>
                            <td className="px-5 py-3.5">
                              {renderStatusBadge(offer.status)}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              {offer.status === 'PENDING' && (
                                offerIdToCancel === offer.id ? (
                                  <div className="flex items-center justify-end gap-2 bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                                    <span className="text-[11px] text-rose-700 font-bold">Cancelar?</span>
                                    <button 
                                      onClick={() => setOfferIdToCancel(null)} 
                                      className="text-slate-500 hover:text-slate-700 text-xs font-bold px-2 py-0.5"
                                    >
                                      Não
                                    </button>
                                    <button 
                                      onClick={() => handleCancelOffer(offer.id)} 
                                      className="bg-rose-600 text-white text-xs font-bold px-2.5 py-1 rounded hover:bg-rose-700 shadow-xs"
                                    >
                                      Sim
                                    </button>
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => setOfferIdToCancel(offer.id)} 
                                    className="text-rose-600 hover:underline text-xs font-bold inline-flex items-center gap-1"
                                  >
                                    <Trash2 size={13} />
                                    <span>Cancelar</span>
                                  </button>
                                )
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}