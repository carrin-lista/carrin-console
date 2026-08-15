import { supabase } from '../lib/supabase';

export interface AppUser {
  id: string;
  full_name?: string;
  username?: string;
  email?: string;
  subscription_count?: number;
}

export interface AppHome {
  id: string;
  name: string;
  member_count?: number;
}

export type PushAudience = 
  | { type: 'user'; user_id: string }
  | { type: 'home'; home_id: string }
  | { type: 'all' };

export interface DispatchPayload {
  audience: PushAudience;
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'success';
  target_url?: string;
  client_request_id?: string;
}

export interface DispatchMetrics {
  total_dispatches: number;
  total_sent: number;
  total_failed: number;
  total_pruned: number;
}

export interface PushDispatchRecord {
  id: string;
  title: string;
  message: string;
  type: string;
  audience_type: string;
  status: string;
  targeted_users: number;
  subscriptions_found: number;
  sent: number;
  failed: number;
  pruned: number;
  created_at: string;
  completed_at?: string;
  created_by_admin?: { name: string };
}

export const notificationService = {
  // 1. Busca de usuários sob demanda (mínimo de 2 caracteres)
  async searchUsers(query: string): Promise<AppUser[]> {
    if (!query || query.trim().length < 2) return [];

    const cleanQuery = query.trim().toLowerCase();
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, username, email')
      .or(`full_name.ilike.%${cleanQuery}%,username.ilike.%${cleanQuery}%,email.ilike.%${cleanQuery}%`)
      .limit(10);

    if (error) {
      console.error('Erro ao buscar usuários:', error);
      return [];
    }

    return (data || []).map(u => ({
      ...u,
      email: u.email ? u.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : undefined // mascaramento parcial seguro
    }));
  },

  // 2. Busca de Casas sob demanda
  async searchHomes(query: string): Promise<AppHome[]> {
    if (!query || query.trim().length < 2) return [];

    const cleanQuery = query.trim().toLowerCase();
    const { data, error } = await supabase
      .from('homes')
      .select('id, name')
      .ilike('name', `%${cleanQuery}%`)
      .limit(10);

    if (error) {
      console.error('Erro ao buscar casas:', error);
      return [];
    }

    return data || [];
  },

  // 3. Estimativa de público antes do disparo
  async estimateAudience(audience: PushAudience): Promise<{ targeted_users: number; subscriptions_found: number }> {
    let targetUserIds: string[] = [];

    if (audience.type === 'user') {
      if (!audience.user_id) return { targeted_users: 0, subscriptions_found: 0 };
      targetUserIds = [audience.user_id];
    } else if (audience.type === 'home') {
      if (!audience.home_id) return { targeted_users: 0, subscriptions_found: 0 };
      const { data: members } = await supabase
        .from('home_members')
        .select('user_id')
        .eq('home_id', audience.home_id);
      targetUserIds = (members || []).map(m => m.user_id);
    } else if (audience.type === 'all') {
      const { data: users } = await supabase.from('users').select('id');
      targetUserIds = (users || []).map(u => u.id);
    }

    if (targetUserIds.length === 0) return { targeted_users: 0, subscriptions_found: 0 };

    const { count, error } = await supabase
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: true })
      .in('user_id', targetUserIds);

    if (error) return { targeted_users: targetUserIds.length, subscriptions_found: 0 };

    return {
      targeted_users: targetUserIds.length,
      subscriptions_found: count || 0
    };
  },

  // 4. Disparo real via Edge Function admin-send-notification
  async sendNotification(payload: DispatchPayload) {
    const client_request_id = crypto.randomUUID(); // Idempotência por tentativa
    const { data, error } = await supabase.functions.invoke('admin-send-notification', {
      body: { ...payload, client_request_id }
    });

    if (error) {
      throw new Error(error.message || 'Erro ao processar o disparo de notificação.');
    }

    return data;
  },

  // 5. Histórico operacional de disparos (`push_dispatches`)
  async getDispatches(): Promise<PushDispatchRecord[]> {
    const { data, error } = await supabase
      .from('push_dispatches')
      .select(`
        *,
        created_by_admin:console_admins(name)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Erro ao buscar histórico de dispatches:', error);
      return [];
    }

    return data || [];
  },

  // 6. Métricas consolidadas da Visão Geral
  async getMetrics(): Promise<DispatchMetrics> {
    const { data, error } = await supabase
      .from('push_dispatches')
      .select('sent, failed, pruned');

    if (error || !data) {
      return { total_dispatches: 0, total_sent: 0, total_failed: 0, total_pruned: 0 };
    }

    const metrics = data.reduce((acc, curr) => ({
      total_dispatches: acc.total_dispatches + 1,
      total_sent: acc.total_sent + (curr.sent || 0),
      total_failed: acc.total_failed + (curr.failed || 0),
      total_pruned: acc.total_pruned + (curr.pruned || 0),
    }), { total_dispatches: 0, total_sent: 0, total_failed: 0, total_pruned: 0 });

    return metrics;
  },

  // 7. Ferramenta de Diagnóstico (Mantida intacta)
  async testPushNotification(payload: { user_id: string; title: string; message: string }) {
    const { data, error } = await supabase.functions.invoke('admin-test-push', {
      body: payload
    });

    if (error) {
      throw new Error(error.message || 'Erro ao invocar a função de teste de push.');
    }

    return data;
  }
};