import { useEffect, useState } from 'react';
import { integrationService, type IntegrationStatus } from '../services/integrationService';
import { Blocks, CheckCircle2, XCircle, HelpCircle, Database, HardDrive, Zap, BellRing, RefreshCw } from 'lucide-react';

export function Integrations() {
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await integrationService.checkIntegrations();
      setIntegrations(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (integration: IntegrationStatus) => {
    setTestingId(integration.id);
    try {
      await integrationService.logIntegrationTest(integration.name);
      // Aqui simularíamos um teste profundo de API
      await new Promise(resolve => setTimeout(resolve, 800)); 
      await fetchStatus();
    } catch (err) {
      console.error(err);
    } finally {
      setTestingId(null);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'database': return <Database size={20} className="text-blue-500" />;
      case 'storage': return <HardDrive size={20} className="text-purple-500" />;
      case 'realtime': return <Zap size={20} className="text-yellow-500" />;
      case 'edge_function': return <BellRing size={20} className="text-emerald-500" />;
      default: return <Blocks size={20} className="text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'operational': 
        return <span className="flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md"><CheckCircle2 size={12} /> Operacional</span>;
      case 'unavailable': 
        return <span className="flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded-md"><XCircle size={12} /> Falha de Conexão</span>;
      default: 
        return <span className="flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-1 bg-gray-100 text-gray-600 border border-gray-200 rounded-md"><HelpCircle size={12} /> Status Indisponível</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#272D2D] flex items-center gap-2">
            <Blocks size={24} className="text-emerald-600" /> Integrações
          </h1>
          <p className="text-sm text-gray-500 mt-1">Monitoramento dos serviços e conexões ativas do ecossistema Carrin.</p>
        </div>
        <button 
          onClick={fetchStatus}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Atualizar Status
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm font-medium border border-red-100">{error}</div>}

      {/* GRID DE SERVIÇOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading && integrations.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-4"></div>
            Verificando conexões...
          </div>
        ) : (
          integrations.map((integration) => (
            <div key={integration.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 flex flex-col justify-between group hover:border-emerald-300 transition-colors">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
                    {getIcon(integration.type)}
                  </div>
                  {getStatusBadge(integration.status)}
                </div>
                
                <h3 className="font-bold text-[#272D2D] text-lg mb-1">{integration.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{integration.details}</p>
              </div>
              
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between mt-auto">
                <span className="text-[10px] font-mono text-gray-400">
                  Última verificação: {new Date(integration.lastCheck).toLocaleTimeString('pt-BR')}
                </span>
                
                <button 
                  onClick={() => handleTestConnection(integration)}
                  disabled={testingId === integration.id || integration.status === 'unknown'}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 disabled:text-gray-400 transition-colors flex items-center gap-1"
                >
                  {testingId === integration.id ? 'Testando...' : 'Testar Conexão'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}