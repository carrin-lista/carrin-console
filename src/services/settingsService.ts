import { supabase } from '../lib/supabase';
import { auditService } from './auditService';

export interface GlobalSetting {
  key: string;
  value: any;
  description: string;
  updated_at: string;
}

export const settingsService = {
  async getSettings(): Promise<Record<string, GlobalSetting>> {
    const { data, error } = await supabase.from('global_settings').select('*');
    if (error) throw new Error('Falha ao carregar configurações globais.');
    
    const settingsRecord: Record<string, GlobalSetting> = {};
    data.forEach(setting => {
      settingsRecord[setting.key] = setting;
    });
    return settingsRecord;
  },

  async updateSetting(key: string, newValue: any, oldValue: any): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Sessão administrativa não encontrada.');

    // 1. Atualiza no banco
    const { error } = await supabase
      .from('global_settings')
      .update({ 
        value: newValue, 
        updated_by: user.id, 
        updated_at: new Date().toISOString() 
      })
      .eq('key', key);

    if (error) throw new Error('Falha ao salvar a configuração.');

    // 2. Registra na Auditoria (obrigatório pela especificação)
    await auditService.createLog('setting.updated', 'global_settings', key, {
      before: oldValue,
      after: newValue
    });
  }
};