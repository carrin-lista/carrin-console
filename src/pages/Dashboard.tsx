import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardService, type DashboardMetrics } from '../services/dashboardService';
import { useAuthStore } from '../stores/useAuthStore';
import { Users, Home, ShoppingBag, AlertCircle, ArrowRight, LayoutDashboard, Activity } from 'lucide-react';

export function Dashboard() {
  const { admin } = useAuthStore();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const data = await dashboardService.getMetrics();
        setMetrics(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-[#272D2D] flex items-center gap-2">
            <LayoutDashboard size={24} className="text-emerald-600" />
            Centro de Controle
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Bem-vindo(a) de volta, <strong className="text-gray-700">{admin?.name}</strong>. Aqui está o resumo da operação hoje.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
          <Activity size={16} />
          <span>Sistema Operante</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm font-medium border border-red-100">
          {error}
        </div>
      )}

      {/* Grid de Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card: Usuários */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between group hover:border-emerald-300 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users size={20} />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-[#272D2D]">
              {loading ? <span className="animate-pulse bg-gray-200 text-transparent rounded">000</span> : metrics?.totalUsers}
            </h3>
            <p className="text-sm text-gray-500 font-medium mt-1">Usuários Cadastrados</p>
          </div>
          <Link to="/usuarios" className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
            Gerenciar <ArrowRight size={12} />
          </Link>
        </div>

        {/* Card: Casas */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between group hover:border-emerald-300 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Home size={20} />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-[#272D2D]">
              {loading ? <span className="animate-pulse bg-gray-200 text-transparent rounded">000</span> : metrics?.totalHomes}
            </h3>
            <p className="text-sm text-gray-500 font-medium mt-1">Casas Ativas</p>
          </div>
          <Link to="/casas" className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
            Ver ambientes <ArrowRight size={12} />
          </Link>
        </div>

        {/* Card: Compras */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between group hover:border-emerald-300 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShoppingBag size={20} />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-[#272D2D]">
              {loading ? <span className="animate-pulse bg-gray-200 text-transparent rounded">000</span> : metrics?.totalPurchases}
            </h3>
            <p className="text-sm text-gray-500 font-medium mt-1">Compras Finalizadas</p>
          </div>
          <Link to="/compras" className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
            Histórico completo <ArrowRight size={12} />
          </Link>
        </div>

        {/* Card: Suporte Crítico */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between group hover:border-red-300 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${metrics?.openTickets && metrics.openTickets > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'}`}>
              <AlertCircle size={20} />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-[#272D2D]">
              {loading ? <span className="animate-pulse bg-gray-200 text-transparent rounded">00</span> : metrics?.openTickets}
            </h3>
            <p className="text-sm text-gray-500 font-medium mt-1">Tickets Abertos</p>
          </div>
          <Link to="/suporte" className={`mt-4 flex items-center gap-1 text-xs font-bold transition-opacity ${metrics?.openTickets && metrics.openTickets > 0 ? 'text-red-600 opacity-100' : 'text-gray-400 opacity-0 group-hover:opacity-100'}`}>
            Responder agora <ArrowRight size={12} />
          </Link>
        </div>

      </div>
    </div>
  );
}