import { supabase } from '../lib/supabase';
import { auditService } from './auditService';

export interface IntegrationStatus {
  id: string;
  name: string;
  type: 'database' | 'storage' | 'realtime' | 'edge_function';
  status: 'operational' | 'unavailable' | 'unknown';
  details: string;
  lastCheck: string;
}

export const integrationService = {
  async checkIntegrations(): Promise<IntegrationStatus[]> {
    const timestamp = new Date().toISOString();
    
    // 1. Check Database (Supabase Core)
    let dbStatus: 'operational' | 'unavailable' = 'unavailable';
    try {
      const { error } = await supabase.from('users').select('id').limit(1);
      if (!error) dbStatus = 'operational';
    } catch (e) {
      dbStatus = 'unavailable';
    }

    // 2. Check Storage
    let storageStatus: 'operational' | 'unavailable' = 'unavailable';
    try {
      const { error } = await supabase.storage.getBucket('profiles');
      // Mesmo se der erro de RLS, significa que o serviço de storage respondeu
      if (!error || error.message.includes('row-level security')) storageStatus = 'operational';
    } catch (e) {
      storageStatus = 'unavailable';
    }

    return [
      {
        id: 'supa-core',
        name: 'Supabase Database & Auth',
        type: 'database',
        status: dbStatus,
        details: 'PostgreSQL estruturado com 15 tabelas públicas e RLS.',
        lastCheck: timestamp
      },
      {
        id: 'supa-storage',
        name: 'Supabase Storage',
        type: 'storage',
        status: storageStatus,
        details: 'Buckets configurados: profiles, receipts.',
        lastCheck: timestamp
      },
      {
        id: 'supa-realtime',
        name: 'Supabase Realtime',
        type: 'realtime',
        status: 'unknown',
        details: 'Publication ativa para: notificações, convites, listas e itens.',
        lastCheck: timestamp
      },
      {
        id: 'edge-push',
        name: 'Push Notifications (Edge)',
        type: 'edge_function',
        status: 'unknown',
        details: 'Webhook acionado via trigger (on_notification_insert).',
        lastCheck: timestamp
      }
    ];
  },

  async logIntegrationTest(integrationName: string): Promise<void> {
    await auditService.createLog('integration.tested', 'system', null, {
      integration: integrationName,
      action: 'Manual connection test triggered by Admin'
    });
  }
};