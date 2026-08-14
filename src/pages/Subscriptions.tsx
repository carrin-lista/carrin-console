import { useEffect, useState } from 'react';
import { billingService } from '../services/billingService';
import type { SubscriptionSummary } from '../services/billingService';
import SubscriptionModal from '../components/SubscriptionModal';
import { CreditCard, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  
  const [selectedHome, setSelectedHome] = useState<SubscriptionSummary | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const data = await billingService.getSubscriptionsList();
      setSubscriptions(data);
    } catch (error) {
      console.error('Erro ao carregar assinaturas', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub => 
    filter === 'ALL' ? true : sub.commercial_status === filter
  );

  const totalCount = subscriptions.length;
  const activeCount = subscriptions.filter(s => s.commercial_status === 'ACTIVE').length;
  const trialCount = subscriptions.filter(s => s.commercial_status === 'TRIAL').length;
  const pastDueCount = subscriptions.filter(s => s.commercial_status === 'PAST_DUE').length;

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      TRIAL: 'bg-blue-100 text-blue-800',
      PAST_DUE: 'bg-yellow-100 text-yellow-800',
      CANCELLED: 'bg-red-100 text-red-800',
      LEGACY: 'bg-gray-100 text-gray-800',
      INACTIVE: 'bg-gray-300 text-gray-800',
      NONE: 'bg-gray-100 text-gray-600',
    };
    
    return (
      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Page Header Padronizado (H1 limpo sem ícone, subtítulo e ação alinhada à direita) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-[#272D2D] tracking-tight">Monetização e Assinaturas</h1>
          <p className="text-sm text-gray-500 mt-1">Central operacional de controle de faturamento, planos e limites (Asaas).</p>
        </div>
        <button 
          onClick={loadSubscriptions}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl shadow-sm text-sm font-bold transition-colors flex items-center justify-center gap-2 shrink-0"
        >
          <span>↻ Atualizar Dados</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200/80 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total de Casas</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">{totalCount}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <CreditCard size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200/80 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ativas (Pagantes)</p>
            <p className="text-2xl font-extrabold text-green-600 mt-1">{activeCount}</p>
          </div>
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200/80 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Em Trial</p>
            <p className="text-2xl font-extrabold text-blue-600 mt-1">{trialCount}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Clock size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200/80 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pagamento Atrasado</p>
            <p className="text-2xl font-extrabold text-yellow-600 mt-1">{pastDueCount}</p>
          </div>
          <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-xl flex items-center justify-center">
            <AlertCircle size={24} />
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {['ALL', 'ACTIVE', 'TRIAL', 'PAST_DUE', 'LEGACY', 'CANCELLED', 'INACTIVE'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors uppercase ${
              filter === status 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'bg-white text-gray-700 border border-gray-200/80 hover:bg-gray-50'
            }`}
          >
            {status === 'ALL' ? 'Todas' : status}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/70">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Casa</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status Comercial</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Plano</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Limite</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Mensalidade</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Período / Vencimento</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">Carregando assinaturas do Asaas...</td>
                </tr>
              ) : filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">Nenhuma casa encontrada com este status.</td>
                </tr>
              ) : (
                filteredSubscriptions.map((sub, index) => (
                  <tr key={sub.home_id || index} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{sub.home_name}</div>
                      <div className="text-xs text-gray-400 font-mono">{sub.home_id.substring(0, 8)}...</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(sub.commercial_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 uppercase font-medium">
                      {sub.plan_type || 'STANDARD'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sub.effective_limit} <span className="text-gray-400 text-xs">moradores</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      {formatCurrency(sub.price || 19.00)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sub.commercial_status === 'TRIAL' 
                        ? formatDate(sub.trial_ends_at) 
                        : formatDate(sub.current_period_end)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => {
                          setSelectedHome(sub);
                          setIsModalOpen(true);
                        }}
                        className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition-colors font-bold text-xs"
                      >
                        Detalhes & Faturas
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SubscriptionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        home={selectedHome} 
      />
    </div>
  );
}