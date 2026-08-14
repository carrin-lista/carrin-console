import React, { useState, useEffect } from 'react';
import { billingService, type SubscriptionSummary } from '../services/billingService';
import SubscriptionModal from '../components/SubscriptionModal';
import { Search, RefreshCw, Filter } from 'lucide-react';

export function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  
  const [selectedHome, setSelectedHome] = useState<SubscriptionSummary | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const data = await billingService.getSubscriptionsList();
      setSubscriptions(data || []);
    } catch (error) {
      console.error('Erro ao carregar lista de assinaturas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

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
    };
    return map[status] || status;
  };

  const renderStatusBadge = (status: string) => {
    const s = status?.toUpperCase();
    let badgeStyle = 'bg-slate-100 text-slate-700';
    if (s === 'ACTIVE' || s === 'INTERNAL') {
      badgeStyle = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    } else if (s === 'PAST_DUE' || s === 'INACTIVE') {
      badgeStyle = 'bg-rose-50 text-rose-700 border border-rose-200';
    } else if (s === 'TRIAL' || s === 'PAYMENT_REVIEW') {
      badgeStyle = 'bg-amber-50 text-amber-700 border border-amber-200';
    } else if (s === 'CANCELLED') {
      badgeStyle = 'bg-slate-100 text-slate-600 border border-slate-200';
    }
    return (
      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${badgeStyle}`}>
        {translateStatus(status)}
      </span>
    );
  };

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const matchesSearch = sub.home_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          sub.home_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedStatusFilter === 'ALL') return matchesSearch;
    return matchesSearch && sub.commercial_status === selectedStatusFilter;
  });

  const handleOpenModal = (home: SubscriptionSummary) => {
    setSelectedHome(home);
    setIsModalOpen(true);
  };

  const filterOptions = [
    { id: 'ALL', label: 'Todas' },
    { id: 'ACTIVE', label: 'Ativas' },
    { id: 'TRIAL', label: 'Trial' },
    { id: 'PAST_DUE', label: 'Em atraso' },
    { id: 'LEGACY', label: 'Pré-monetização' },
    { id: 'CANCELLED', label: 'Canceladas' },
    { id: 'INACTIVE', label: 'Inativas' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Page Header Padronizado IDÊNTICO ao modelo de Casas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-[#272D2D] tracking-tight">Monetização e Assinaturas</h1>
          <p className="text-sm text-gray-500 mt-1">Acompanhe assinaturas, trials, cobranças e condições comerciais do Carrin.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={loadSubscriptions}
            className="bg-white hover:bg-gray-50 border border-gray-200/80 text-gray-700 px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* FILTROS E BUSCA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-xs shrink-0">
          <Search size={18} className="absolute left-3.5 top-3 text-gray-400" />
          <input 
            type="text"
            placeholder="Buscar nome da casa ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200/80 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm font-medium text-gray-800 placeholder:text-gray-400"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0">
          <Filter size={14} className="text-gray-400 mr-1 shrink-0 hidden sm:block" />
          {filterOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelectedStatusFilter(opt.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
                selectedStatusFilter === opt.id
                  ? 'bg-emerald-600 text-white shadow-emerald-200'
                  : 'bg-white hover:bg-gray-50 text-gray-600 border border-gray-200/80'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* TABELA PRINCIPAL */}
      <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Carregando assinaturas...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50/70 text-gray-500 uppercase text-[10px] tracking-wider border-b border-gray-200/80 font-bold">
                <tr>
                  <th className="px-6 py-4">Casa</th>
                  <th className="px-6 py-4">Status comercial</th>
                  <th className="px-6 py-4">Plano / Valor</th>
                  <th className="px-6 py-4">Limite de moradores</th>
                  <th className="px-6 py-4">Vencimento / Período</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSubscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium">
                      Nenhuma assinatura encontrada com os filtros selecionados.
                    </td>
                  </tr>
                ) : filteredSubscriptions.map((sub) => (
                  <tr 
                    key={sub.home_id} 
                    onClick={() => handleOpenModal(sub)}
                    className="hover:bg-gray-50/60 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-[#272D2D] group-hover:text-emerald-600 transition-colors">
                        {sub.home_name}
                      </div>
                      <div className="font-mono text-[11px] text-gray-400 font-medium">
                        {sub.home_id}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderStatusBadge(sub.commercial_status)}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-[#272D2D]">
                        {sub.price ? `R$ ${sub.price.toFixed(2).replace('.', ',')}` : 'R$ 19,00'}
                      </div>
                      <div className="text-[11px] text-gray-400 uppercase font-bold">
                        {sub.plan_type || 'Standard'}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 font-medium">
                      {sub.effective_limit} pessoas
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-medium">
                      {sub.current_period_end 
                        ? new Date(sub.current_period_end).toLocaleDateString('pt-BR')
                        : sub.trial_ends_at 
                          ? `Trial até ${new Date(sub.trial_ends_at).toLocaleDateString('pt-BR')}`
                          : '—'}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenModal(sub);
                        }}
                        className="text-emerald-600 font-semibold hover:text-emerald-800 transition-colors inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 text-xs"
                      >
                        Gerenciar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SubscriptionModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          loadSubscriptions();
        }}
        home={selectedHome}
      />

    </div>
  );
}