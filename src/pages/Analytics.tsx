import { useEffect, useState } from 'react';
import { analyticsService, type AnalyticsData } from '../services/analyticsService';
import { LineChart, Users, Home, ShoppingBag, Headset, Info, Clock } from 'lucide-react';

export function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchData();
  }, [days]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyticsService.getAnalytics(days);
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#272D2D] flex items-center gap-2">
            <LineChart size={24} className="text-emerald-600" /> Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">Inteligência de dados e evolução da operação.</p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider text-[10px]">Período:</span>
          <select 
            value={days} 
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
            <option value={365}>Último Ano</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm font-medium border border-red-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 text-gray-400">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-4"></div>
          Processando inteligência de dados...
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <Users size={18} className="text-blue-500" />
              <h2 className="font-bold text-[#272D2D]">Base de Usuários</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Histórico</p>
                <p className="text-2xl font-extrabold text-[#272D2D] mt-1">{data.users.total}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <p className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Novos no Período</p>
                <p className="text-2xl font-extrabold text-blue-600 mt-1">+{data.users.newInPeriod}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-gray-600 mb-2">Engajamento (Com Casa vs Sem Casa)</p>
              <div className="flex h-6 rounded-full overflow-hidden bg-gray-100">
                <div 
                  className="bg-blue-500 h-full transition-all duration-1000" 
                  style={{ width: `${(data.users.withHome / (data.users.total || 1)) * 100}%` }}
                ></div>
                <div 
                  className="bg-gray-300 h-full transition-all duration-1000" 
                  style={{ width: `${(data.users.withoutHome / (data.users.total || 1)) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between mt-2 text-xs font-medium">
                <span className="text-blue-600 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Com Casa ({data.users.withHome})</span>
                <span className="text-gray-500 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gray-300"></div> Sem Casa ({data.users.withoutHome})</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <ShoppingBag size={18} className="text-emerald-500" />
              <h2 className="font-bold text-[#272D2D]">Movimentação de Compras</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Valor Registrado</p>
                <p className="text-2xl font-extrabold text-[#272D2D] mt-1">{formatCurrency(data.purchases.totalAmount)}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Ticket Médio (Por Compra)</p>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1">{formatCurrency(data.purchases.averageTicket)}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-gray-600 mb-3">Top 5 Mercados Utilizados</p>
              <div className="space-y-3">
                {data.purchases.topMarkets.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Nenhum mercado registrado no período.</p>
                ) : (
                  data.purchases.topMarkets.map((market, index) => (
                    <div key={index}>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-gray-700">{market.name}</span>
                        <span className="text-emerald-600">{market.count} compras</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div 
                          className="h-full bg-emerald-400 transition-all duration-1000" 
                          style={{ width: `${market.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <Home size={18} className="text-purple-500" />
              <h2 className="font-bold text-[#272D2D]">Distribuição de Casas</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Ativas</p>
                <p className="text-2xl font-extrabold text-[#272D2D] mt-1">{data.homes.total}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                <p className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">Criadas no Período</p>
                <p className="text-2xl font-extrabold text-purple-600 mt-1">+{data.homes.newInPeriod}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-gray-600 mb-3">Tamanho das Casas (Moradores)</p>
              <div className="flex gap-1 h-12">
                {data.homes.sizeDistribution.map((dist, index) => (
                  <div 
                    key={index} 
                    title={`${dist.size}: ${dist.count} casas`}
                    className={`h-full flex items-end justify-center rounded-sm transition-all duration-1000 ${
                      index === 0 ? 'bg-purple-200' : 
                      index === 1 ? 'bg-purple-300' : 
                      index === 2 ? 'bg-purple-400' : 
                      index === 3 ? 'bg-purple-500' : 'bg-purple-600'
                    }`}
                    style={{ width: `${Math.max(dist.percentage, 5)}%` }}
                  >
                    <span className="text-[10px] font-bold text-white mb-1 opacity-0 hover:opacity-100">{dist.percentage}%</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-[10px] font-bold text-gray-400 uppercase">
                <span>Pequenas (1-2)</span>
                <span>Grandes (5+)</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <Headset size={18} className="text-orange-500" />
              <h2 className="font-bold text-[#272D2D]">Demanda de Suporte</h2>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <div className="flex-1">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Tickets no Período</p>
                <p className="text-2xl font-extrabold text-[#272D2D] mt-1">{data.support.totalInPeriod}</p>
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-bold text-red-400 uppercase tracking-wider">Abertos</p>
                <p className="text-2xl font-extrabold text-red-500 mt-1">{data.support.open}</p>
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Resolvidos</p>
                <p className="text-2xl font-extrabold text-emerald-500 mt-1">{data.support.resolved}</p>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-start gap-3">
              <Clock size={20} className="text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-gray-700">Tempo Médio de Resolução</p>
                <span className="inline-flex items-center gap-1 mt-1 bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase border border-yellow-200">
                  <Info size={12} /> Ainda não disponível
                </span>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Esta métrica depende de dados (timestamp de resolução exata) que o banco de dados do Carrin ainda não registra nativamente.
                </p>
              </div>
            </div>
          </div>

        </div>
      ) : null}
    </div>
  );
}