import { supabase } from '../lib/supabase';

export interface DashboardMetrics {
  totalUsers: number;
  totalHomes: number;
  totalPurchases: number;
  openTickets: number;
}

export const dashboardService = {
  async getMetrics(): Promise<DashboardMetrics> {
    // Fazemos todas as consultas em paralelo para máxima performance
    const [
      { count: usersCount, error: usersError },
      { count: homesCount, error: homesError },
      { count: purchasesCount, error: purchasesError },
      { count: ticketsCount, error: ticketsError }
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('homes').select('*', { count: 'exact', head: true }),
      supabase.from('shopping_lists').select('*', { count: 'exact', head: true }).in('status', ['completed', 'archived']),
      supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open')
    ]);

    if (usersError || homesError || purchasesError || ticketsError) {
      console.error("Erro ao buscar métricas");
      throw new Error('Falha ao carregar os indicadores operacionais.');
    }

    return {
      totalUsers: usersCount || 0,
      totalHomes: homesCount || 0,
      totalPurchases: purchasesCount || 0,
      openTickets: ticketsCount || 0
    };
  }
};