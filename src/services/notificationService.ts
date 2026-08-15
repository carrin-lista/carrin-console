import { supabase } from '../lib/supabase';

export interface GlobalNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  created_at: string;
  console_admins: {
    name: string;
  } | null;
}

export interface AppUser {
  id: string;
  email?: string;
  full_name?: string;
  username?: string;
}

export interface PushTestResult {
  success: boolean;
  reason?: string;
  subscriptions_found: number;
  sent: number;
  failed: number;
  pruned: number;
  error?: string;
}

export const notificationService = {
  async getNotifications(): Promise<GlobalNotification[]> {
    const { data, error } = await supabase
      .from('global_notifications')
      .select(`
        id,
        title,
        message,
        type,
        created_at,
        console_admins (
          name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw new Error('Falha ao carregar o histórico de notificações.');
    return data as unknown as GlobalNotification[];
  },

  // Busca moradores/usuários reais da tabela public.users
  async getUsersForTesting(): Promise<AppUser[]> {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, username')
      .limit(100);

    if (error) {
      console.error('Erro ao buscar usuários:', error.message);
      return [];
    }
    
    return data || [];
  },

  // Executa o teste direcionado via Edge Function com segurança de Admin
  async testPushNotification(payload: { user_id: string; title: string; message: string }): Promise<PushTestResult> {
    const { data, error } = await supabase.functions.invoke('admin-test-push', {
      body: payload
    });

    if (error) {
      throw new Error(error.message || 'Erro ao invocar a função de teste de push.');
    }

    return data as PushTestResult;
  }
};