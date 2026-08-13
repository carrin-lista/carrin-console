import { supabase } from '../lib/supabase';

export interface AuditLog {
  id: string;
  admin_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: any;
  created_at: string;
  console_admins?: {
    name: string;
    profile: string;
  } | null;
}

export const auditService = {
  async createLog(
    action: string,
    entity_type: string,
    entity_id: string | null = null,
    metadata: any = {}
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('console_audit_logs').insert([{
        admin_id: user.id,
        action,
        entity_type,
        entity_id,
        metadata
      }]);
    } catch (error) {
      console.error('Falha silenciosa ao registrar auditoria:', error);
    }
  },

  async getLogs(
    filters: { entity_type?: string; days?: number },
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: AuditLog[]; count: number }> {
    let query = supabase
      .from('console_audit_logs')
      .select(`
        *,
        console_admins (
          name,
          profile
        )
      `, { count: 'exact' });

    if (filters.entity_type && filters.entity_type !== 'all') {
      query = query.eq('entity_type', filters.entity_type);
    }
    
    if (filters.days && filters.days > 0) {
      const date = new Date();
      date.setDate(date.getDate() - filters.days);
      query = query.gte('created_at', date.toISOString());
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw new Error('Falha ao carregar os logs de auditoria.');

    return { data: data as unknown as AuditLog[], count: count || 0 };
  }
};