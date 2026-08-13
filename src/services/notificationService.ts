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

  async createNotification(notification: { title: string; message: string; type: string; created_by: string }): Promise<void> {
    const { error } = await supabase
      .from('global_notifications')
      .insert([notification]);

    if (error) throw new Error('Falha ao enviar a notificação global.');
  }
};