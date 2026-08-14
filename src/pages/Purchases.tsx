import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { purchaseService, type Purchase } from '../services/purchaseService';
import { Search, ShoppingBag, Calendar, Store, ArrowRight, Home } from 'lucide-react';

export function Purchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPurchases();
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchPurchases = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await purchaseService.getPurchases(search);
      setPurchases(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (isoString: string | null) => {
    if (!isoString) return 'Data desconhecida';
    return new Date(isoString).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Page Header Padronizado (H1 limpo sem ícone, subtítulo descritivo e input de busca à direita) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-[#272D2D] tracking-tight">Compras</h1>
          <p className="text-sm text-gray-500 mt-1">Histórico de compras concluídas por todas as Casas.</p>
        </div>
        
        <div className="relative w-full sm:max-w-xs shrink-0">
          <Search size={18} className="absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por mercado..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200/80 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm font-medium text-gray-800 placeholder:text-gray-400"
          />
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
                <th className="px-6 py-4">Data & Mercado</th>
                <th className="px-6 py-4">Casa</th>
                <th className="px-6 py-4">Itens</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex justify-center mb-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
                    </div>
                    Carregando histórico...
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium">
                    Nenhuma compra encontrada.
                  </td>
                </tr>
              ) : (
                purchases.map((purchase) => {
                  const itemsCount = purchase.shopping_items?.length || 0;

                  return (
                    <tr key={purchase.id} className="hover:bg-gray-50/60 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-[#272D2D] flex items-center gap-1.5">
                            <Store size={14} className="text-emerald-600" />
                            {purchase.market_name || 'Mercado não informado'}
                          </span>
                          <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1 mt-0.5">
                            <Calendar size={12} /> {formatDate(purchase.completed_at)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-gray-500 font-medium">
                          <Home size={14} className="text-gray-400" />
                          <span className="truncate max-w-[150px]">{purchase.homes?.name || 'Casa Excluída'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-gray-500 font-medium">
                          <ShoppingBag size={14} className="text-gray-400" />
                          {itemsCount}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-[#272D2D]">
                          {formatCurrency(purchase.total_amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Link 
                          to={`/compras/${purchase.id}`} 
                          className="text-emerald-600 font-semibold hover:text-emerald-800 transition-colors inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 text-xs"
                        >
                          Ver Recibo <ArrowRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}