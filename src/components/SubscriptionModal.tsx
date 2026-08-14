import React, { useState, useEffect } from 'react';
import { billingService } from '../services/billingService';
import type { SubscriptionSummary } from '../services/billingService';

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
  
  // Estados para abas
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  
  // Estados para Ofertas Personalizadas
  const [offers, setOffers] = useState<any[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);

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
      console.error('Falha ao carregar eventos', error);
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
      console.error('Falha ao carregar ofertas', error);
    } finally {
      setLoadingOffers(false);
    }
  };

  if (!isOpen || !home) return null;

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await billingService.createCustomOffer(home.home_id, newPrice, newLimit, 'admin-uuid');
      alert('Oferta criada com sucesso! O Dono da Casa já pode visualizá-la no app.');
      loadOffers();
      setNewLimit(10);
      setNewPrice(29.90);
    } catch (error: any) {
      alert('Erro ao criar oferta: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOffer = async (offerId: string) => {
    if (!confirm('Deseja realmente cancelar esta proposta pendente?')) return;
    try {
      await billingService.cancelCustomOffer(offerId);
      alert('Oferta cancelada com sucesso.');
      loadOffers();
    } catch (error: any) {
      alert('Erro ao cancelar oferta: ' + error.message);
    }
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const result = await billingService.syncWithAsaas(home.home_id);
      alert(`Sincronizado com sucesso! Status no Asaas: ${result.asaas_status}`);
    } catch (error: any) {
      alert('Erro na sincronização: ' + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm(`Atenção: Deseja realmente cancelar a assinatura da Casa "${home?.home_name}"? A recorrência será encerrada no Asaas.`)) {
      return;
    }
    try {
      setIsCancelling(true);
      await billingService.cancelSubscription(home.home_id);
      alert('Assinatura cancelada com sucesso.');
      onClose();
    } catch (error: any) {
      alert('Erro ao cancelar assinatura: ' + error.message);
    } finally {
      setIsCancelling(false);
    }
  };

  const translateStatus = (status: string) => {
    const map: Record<string, string> = {
      'PENDING': 'Pendente',
      'RECEIVED': 'Recebido',
      'CONFIRMED': 'Confirmado',
      'OVERDUE': 'Em Atraso',
      'REFUNDED': 'Estornado',
    };
    return map[status] || status;
  };

  const translateEvent = (eventType: string) => {
    const map: Record<string, string> = {
      'PAYMENT_CREATED': 'Fatura Gerada',
      'PAYMENT_CONFIRMED': 'Pagamento Confirmado',
      'PAYMENT_RECEIVED': 'Pagamento Recebido',
      'PAYMENT_OVERDUE': 'Pagamento Vencido',
    };
    return map[eventType] || eventType;
  };

  const paymentEvents = events.filter(e => e.payload && e.payload.payment);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black bg-opacity-50">
      <div className="relative w-full max-w-4xl p-4 md:h-auto">
        <div className="relative bg-white rounded-lg shadow">
          
          <div className="flex items-start justify-between p-4 border-b rounded-t">
            <h3 className="text-xl font-semibold text-gray-900">
              Detalhes: {home.home_name}
            </h3>
            <button onClick={onClose} className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
            </button>
          </div>

          <div className="flex border-b px-4 mt-2 overflow-x-auto">
            <button onClick={() => setActiveTab('RESUMO')} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab === 'RESUMO' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Resumo Comercial</button>
            <button onClick={() => setActiveTab('COBRANCAS')} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab === 'COBRANCAS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Cobranças</button>
            <button onClick={() => setActiveTab('EVENTOS')} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab === 'EVENTOS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Eventos Técnicos</button>
            <button onClick={() => setActiveTab('OFERTA')} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab === 'OFERTA' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Ofertas Personalizadas</button>
          </div>

          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {activeTab === 'RESUMO' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded border">
                  <p className="text-sm text-gray-500 mb-1">Status Atual</p>
                  <p className="text-lg font-bold text-gray-900">{home.commercial_status}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded border">
                  <p className="text-sm text-gray-500 mb-1">Limite de Moradores</p>
                  <p className="text-lg font-bold text-gray-900">{home.effective_limit}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded border flex flex-col justify-center">
                  <button 
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="text-blue-600 hover:underline text-sm font-medium text-left disabled:opacity-50"
                  >
                    {isSyncing ? 'Sincronizando...' : '↻ Sincronizar com Asaas'}
                  </button>
                  <p className="text-xs text-gray-400 mt-1">Verifica inconsistências entre o gateway e o Carrin.</p>
                </div>
                <div className="bg-red-50 p-4 rounded border border-red-200 flex flex-col justify-center">
                  <button 
                    onClick={handleCancelSubscription}
                    disabled={isCancelling}
                    className="text-red-600 hover:underline text-sm font-medium text-left disabled:opacity-50"
                  >
                    {isCancelling ? 'Cancelando recorrência...' : '⚠️ Cancelar Assinatura no Asaas'}
                  </button>
                  <p className="text-xs text-red-400 mt-1">Encerra cobranças futuras e atualiza o acesso.</p>
                </div>
              </div>
            )}

            {activeTab === 'COBRANCAS' && (
              <div>
                {loadingEvents ? <p className="text-gray-500 text-sm">Carregando faturas...</p> : (
                  <table className="min-w-full divide-y divide-gray-200 border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimento</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Situação</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fatura</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paymentEvents.length === 0 ? (
                        <tr><td colSpan={4} className="px-4 py-4 text-center text-sm text-gray-500">Nenhuma cobrança registrada.</td></tr>
                      ) : paymentEvents.map((evt) => (
                        <tr key={evt.id}>
                          <td className="px-4 py-3 text-sm text-gray-900">{new Date(evt.payload.payment.dueDate).toLocaleDateString('pt-BR')}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">R$ {evt.payload.payment.value.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">{translateStatus(evt.payload.payment.status)}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-blue-600">
                            {evt.payload.payment.invoiceUrl ? (
                              <a href={evt.payload.payment.invoiceUrl} target="_blank" rel="noreferrer" className="hover:underline">Ver Fatura ↗</a>
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
              <div>
                {loadingEvents ? <p className="text-gray-500 text-sm">Carregando eventos técnicos...</p> : (
                  <table className="min-w-full divide-y divide-gray-200 border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data/Hora</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Evento</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gateway ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {events.length === 0 ? (
                        <tr><td colSpan={4} className="px-4 py-4 text-center text-sm text-gray-500">Nenhum evento registrado.</td></tr>
                      ) : events.map((evt) => (
                        <tr key={evt.id}>
                          <td className="px-4 py-3 text-sm text-gray-500">{new Date(evt.created_at).toLocaleString('pt-BR')}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{translateEvent(evt.event_type)}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 font-mono text-xs">{evt.external_id}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${evt.status === 'PROCESSED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
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
                <form onSubmit={handleCreateOffer} className="bg-gray-50 p-4 rounded-lg border">
                  <h4 className="text-md font-medium text-gray-800 mb-3">Criar Nova Proposta Comercial</h4>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Novo Limite de Moradores</label>
                      <input type="number" value={newLimit} onChange={(e) => setNewLimit(Number(e.target.value))} className="w-full border border-gray-300 rounded p-2 focus:ring-blue-500 text-sm" min="6" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Novo Preço (R$)</label>
                      <input type="number" step="0.01" value={newPrice} onChange={(e) => setNewPrice(Number(e.target.value))} className="w-full border border-gray-300 rounded p-2 focus:ring-blue-500 text-sm" />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-medium disabled:opacity-50">
                      {isSubmitting ? 'Gerando...' : 'Gerar Proposta e Notificar'}
                    </button>
                  </div>
                </form>

                {/* Histórico de Ofertas */}
                <div>
                  <h4 className="text-md font-medium text-gray-800 mb-3">Histórico de Ofertas desta Casa</h4>
                  {loadingOffers ? <p className="text-gray-500 text-sm">Carregando ofertas...</p> : (
                    <table className="min-w-full divide-y divide-gray-200 border">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Criada em</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Limite</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {offers.length === 0 ? (
                          <tr><td colSpan={5} className="px-4 py-4 text-center text-sm text-gray-500">Nenhuma oferta personalizada registrada.</td></tr>
                        ) : offers.map((offer) => (
                          <tr key={offer.id}>
                            <td className="px-4 py-3 text-sm text-gray-500">{new Date(offer.created_at).toLocaleDateString('pt-BR')}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{offer.new_limit} moradores</td>
                            <td className="px-4 py-3 text-sm text-gray-900">R$ {offer.new_price.toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                offer.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                offer.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {offer.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              {offer.status === 'PENDING' && (
                                <button onClick={() => handleCancelOffer(offer.id)} className="text-red-600 hover:underline text-xs font-medium">
                                  Cancelar
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}