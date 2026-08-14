import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { purchaseService, type Purchase } from '../services/purchaseService';
import { ArrowLeft, Store, Calendar, Home, CheckCircle2, XCircle, Receipt } from 'lucide-react';

export function PurchaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPurchase() {
      if (!id) return;
      try {
        setLoading(true);
        const data = await purchaseService.getPurchaseById(id);
        setPurchase(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchPurchase();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mr-3"></div>
        Carregando recibo...
      </div>
    );
  }

  if (error || !purchase) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-xl font-medium">
        {error || 'Compra não encontrada.'}
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const boughtItems = purchase.shopping_items?.filter(item => item.is_completed) || [];
  const unboughtItems = purchase.shopping_items?.filter(item => !item.is_completed) || [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <button 
        onClick={() => navigate('/compras')}
        className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 font-medium text-sm transition-colors w-max"
      >
        <ArrowLeft size={16} /> Voltar para histórico
      </button>

      {/* Cabeçalho da Compra (H1 limpo sem ícone, seguindo a estrutura padrão) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 border-l-4 border-l-emerald-500">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[#272D2D] font-bold text-xl">
            <Store size={22} className="text-emerald-600" />
            <h1>{purchase.market_name || 'Mercado não informado'}</h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
            <span className="flex items-center gap-1.5">
              <Calendar size={16} className="text-gray-400" />
              {purchase.completed_at ? new Date(purchase.completed_at).toLocaleString('pt-BR') : 'Data desconhecida'}
            </span>
            {purchase.homes && (
              <Link to={`/casas/${purchase.homes.id}`} className="flex items-center gap-1.5 hover:text-emerald-600 transition-colors">
                <Home size={16} className="text-gray-400" />
                {purchase.homes.name}
              </Link>
            )}
          </div>
        </div>
        
        <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-100 min-w-[150px] text-right">
          <p className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider mb-1">Total da Compra</p>
          <p className="text-2xl font-extrabold text-emerald-600">
            {formatCurrency(purchase.total_amount)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal: Itens */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gray-50/70 flex justify-between items-center">
              <h3 className="text-sm font-bold text-[#272D2D] uppercase tracking-wider">
                Itens Comprados ({boughtItems.length})
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {boughtItems.length === 0 ? (
                <p className="p-5 text-sm text-gray-400 text-center">Nenhum item marcado como comprado.</p>
              ) : (
                boughtItems.map(item => (
                  <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                      <div>
                        <p className="font-bold text-[#272D2D]">{item.name}</p>
                        {(item.bought_quantity || item.unit_price) && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {item.bought_quantity || 1} {item.unit || 'un'} × {formatCurrency(item.unit_price || 0)}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="font-bold text-gray-700">
                      {formatCurrency(item.price || 0)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {unboughtItems.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden opacity-80">
              <div className="p-4 border-b border-gray-100 bg-red-50/50">
                <h3 className="text-sm font-bold text-red-800 uppercase tracking-wider">
                  Itens Faltantes ({unboughtItems.length})
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {unboughtItems.map(item => (
                  <div key={item.id} className="p-4 flex items-center gap-3 text-gray-500">
                    <XCircle size={18} className="text-red-400 shrink-0" />
                    <span className="line-through">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Coluna Lateral: Comprovantes */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gray-50/70 flex items-center gap-2">
              <Receipt size={18} className="text-gray-500" />
              <h3 className="text-sm font-bold text-[#272D2D] uppercase tracking-wider">
                Comprovantes
              </h3>
            </div>
            <div className="p-5">
              {!purchase.receipt_urls || purchase.receipt_urls.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Nenhum comprovante anexado.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {purchase.receipt_urls.map((url, index) => (
                    <a 
                      key={index} 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block aspect-square rounded-xl border border-gray-200 overflow-hidden hover:border-emerald-500 transition-colors shadow-sm"
                    >
                      <img src={url} alt={`Comprovante ${index + 1}`} className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}