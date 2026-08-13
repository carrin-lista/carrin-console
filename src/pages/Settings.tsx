import { useEffect, useState } from 'react';
import { settingsService, type GlobalSetting } from '../services/settingsService';
import { useAuthStore } from '../stores/useAuthStore';
import { Settings as SettingsIcon, AlertTriangle, Save, X, ToggleLeft, ToggleRight, Users, Wrench } from 'lucide-react';

export function Settings() {
  const { admin } = useAuthStore();
  const [settings, setSettings] = useState<Record<string, GlobalSetting>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados dos inputs locais (antes de salvar)
  const [maxMembers, setMaxMembers] = useState<number>(5);
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState<string>('');

  // Estados do Modal de Confirmação
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    key: string;
    oldValue: any;
    newValue: any;
    title: string;
    description: string;
  } | null>(null);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await settingsService.getSettings();
      setSettings(data);
      
      // Sincroniza os estados locais
      if (data['home_max_members']) setMaxMembers(Number(data['home_max_members'].value));
      if (data['app_maintenance_mode']) setMaintenanceMode(Boolean(data['app_maintenance_mode'].value));
      if (data['app_maintenance_message']) setMaintenanceMsg(String(data['app_maintenance_message'].value));
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSave = (key: string, newValue: any, title: string, description: string) => {
    const oldValue = settings[key]?.value;
    if (oldValue === newValue) return; // Não faz nada se não mudou

    setConfirmModal({
      isOpen: true,
      key,
      oldValue,
      newValue,
      title,
      description
    });
  };

  const executeSave = async () => {
    if (!confirmModal) return;
    setSaving(true);
    try {
      await settingsService.updateSetting(confirmModal.key, confirmModal.newValue, confirmModal.oldValue);
      await fetchSettings(); // Recarrega do banco para garantir consistência
      setConfirmModal(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (admin?.profile !== 'master' && admin?.profile !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-[#272D2D]">Acesso Negado</h2>
        <p className="text-gray-500 mt-2">Apenas Administradores podem alterar configurações globais.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* MODAL DE CONFIRMAÇÃO (Exigência da Fase 2.3) */}
      {confirmModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-center text-[#272D2D] mb-2">{confirmModal.title}</h3>
              <p className="text-sm text-gray-500 text-center mb-6">{confirmModal.description}</p>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center text-sm mb-2 pb-2 border-b border-gray-200">
                  <span className="text-gray-500 font-bold uppercase text-[10px]">Valor Atual</span>
                  <span className="text-red-500 font-mono break-all">{String(confirmModal.oldValue)}</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-1">
                  <span className="text-gray-500 font-bold uppercase text-[10px]">Novo Valor</span>
                  <span className="text-emerald-600 font-bold font-mono break-all">{String(confirmModal.newValue)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setConfirmModal(null)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button onClick={executeSave} disabled={saving} className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-bold hover:bg-orange-600 transition-colors disabled:opacity-70 flex justify-center items-center gap-2">
                  {saving ? 'Salvando...' : 'Confirmar Alteração'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#272D2D] flex items-center gap-2">
            <SettingsIcon size={24} className="text-emerald-600" /> Configurações Globais
          </h1>
          <p className="text-sm text-gray-500 mt-1">Variáveis de ambiente e regras de negócio do Carrin App.</p>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm font-medium border border-red-100">{error}</div>}

      {loading ? (
        <div className="flex justify-center items-center py-20 text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mr-3"></div>
          Carregando regras...
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* SEÇÃO 1: CASAS */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center gap-2">
              <Users size={18} className="text-gray-500" />
              <h2 className="font-bold text-gray-700 uppercase tracking-wider text-xs">Regras de Casas</h2>
            </div>
            
            <div className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-[#272D2D] text-sm mb-1">Limite de Membros por Casa</h3>
                  <p className="text-xs text-gray-500 leading-relaxed max-w-md">{settings['home_max_members']?.description}</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <input 
                    type="number" 
                    min={1} 
                    max={20}
                    value={maxMembers}
                    onChange={(e) => setMaxMembers(Number(e.target.value))}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center font-bold text-[#272D2D] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button 
                    onClick={() => handleRequestSave('home_max_members', maxMembers, 'Alterar Limite de Membros?', 'Isso afetará quantas pessoas podem entrar simultaneamente em qualquer Casa do aplicativo.')}
                    disabled={maxMembers === Number(settings['home_max_members']?.value)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-bold border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200"
                  >
                    <Save size={16} /> Salvar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: APLICATIVO */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center gap-2">
              <Wrench size={18} className="text-gray-500" />
              <h2 className="font-bold text-gray-700 uppercase tracking-wider text-xs">Controles do Aplicativo</h2>
            </div>
            
            <div className="p-6 space-y-8">
              
              {/* Toggle de Manutenção */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
                <div className="flex-1">
                  <h3 className="font-bold text-[#272D2D] text-sm mb-1">Modo Manutenção Global</h3>
                  <p className="text-xs text-gray-500 leading-relaxed max-w-md">{settings['app_maintenance_mode']?.description}</p>
                  {maintenanceMode ? (
                    <span className="inline-block mt-2 text-[10px] uppercase font-bold px-2 py-0.5 bg-red-100 text-red-700 rounded border border-red-200">Em Manutenção</span>
                  ) : (
                    <span className="inline-block mt-2 text-[10px] uppercase font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded border border-emerald-200">Operacional</span>
                  )}
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button 
                    onClick={() => {
                      const newValue = !maintenanceMode;
                      setMaintenanceMode(newValue);
                      handleRequestSave('app_maintenance_mode', newValue, 'Alterar Status do Aplicativo?', newValue ? 'Atenção: Isso bloqueará o acesso de TODOS os usuários ao aplicativo instantaneamente.' : 'O aplicativo voltará a ficar disponível para todos os usuários.');
                    }}
                    className={`transition-colors ${maintenanceMode ? 'text-red-500' : 'text-gray-300 hover:text-emerald-500'}`}
                  >
                    {maintenanceMode ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}
                  </button>
                </div>
              </div>

              {/* Mensagem de Manutenção */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-[#272D2D] text-sm mb-1">Aviso de Manutenção</h3>
                  <p className="text-xs text-gray-500 leading-relaxed max-w-md mb-3">{settings['app_maintenance_message']?.description}</p>
                  
                  <textarea 
                    rows={2}
                    value={maintenanceMsg}
                    onChange={(e) => setMaintenanceMsg(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#272D2D] focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                  />
                </div>
                <div className="flex items-center sm:mt-12 w-full sm:w-auto">
                  <button 
                    onClick={() => handleRequestSave('app_maintenance_message', maintenanceMsg, 'Atualizar Aviso?', 'Esta será a mensagem que os usuários lerão na tela de bloqueio.')}
                    disabled={maintenanceMsg === String(settings['app_maintenance_message']?.value)}
                    className="w-full sm:w-auto flex justify-center items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-bold border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200"
                  >
                    <Save size={16} /> Salvar Texto
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}
    </div>
  );
}