import { supabase } from '../lib/supabase';

export interface AnalyticsData {
  users: {
    total: number;
    newInPeriod: number;
    withHome: number;
    withoutHome: number;
  };
  homes: {
    total: number;
    newInPeriod: number;
    sizeDistribution: { size: string; count: number; percentage: number }[];
  };
  purchases: {
    totalCompleted: number;
    totalAmount: number;
    averageTicket: number;
    topMarkets: { name: string; count: number; percentage: number }[];
  };
  support: {
    totalInPeriod: number;
    open: number;
    inProgress: number;
    resolved: number;
  };
}

export const analyticsService = {
  async getAnalytics(days: number): Promise<AnalyticsData> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const dateFilter = startDate.toISOString();

    const [
      { count: totalUsers },
      { count: newUsers },
      { data: allHomeMembers }, 
      { count: totalHomes },
      { count: newHomes },
      { data: purchasesData }, 
      { data: supportData }
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', dateFilter),
      supabase.from('home_members').select('home_id, user_id'),
      supabase.from('homes').select('*', { count: 'exact', head: true }),
      supabase.from('homes').select('*', { count: 'exact', head: true }).gte('created_at', dateFilter),
      supabase.from('shopping_lists').select('total_amount, market_name').eq('status', 'completed').gte('completed_at', dateFilter),
      supabase.from('support_tickets').select('status').gte('created_at', dateFilter)
    ]);

    const usersWithHomeSet = new Set(allHomeMembers?.map(m => m.user_id));
    const withHomeCount = usersWithHomeSet.size;
    const withoutHomeCount = Math.max(0, (totalUsers || 0) - withHomeCount);

    const homeSizes: Record<string, number> = {};
    allHomeMembers?.forEach(m => {
      homeSizes[m.home_id] = (homeSizes[m.home_id] || 0) + 1;
    });

    const sizeCounts = { '1 membro': 0, '2 membros': 0, '3 membros': 0, '4 membros': 0, '5+ membros': 0 };
    Object.values(homeSizes).forEach(size => {
      if (size === 1) sizeCounts['1 membro']++;
      else if (size === 2) sizeCounts['2 membros']++;
      else if (size === 3) sizeCounts['3 membros']++;
      else if (size === 4) sizeCounts['4 membros']++;
      else sizeCounts['5+ membros']++;
    });

    const totalHomesCountCalculated = Object.keys(homeSizes).length || 1;
    const sizeDistribution = Object.entries(sizeCounts).map(([size, count]) => ({
      size,
      count,
      percentage: Math.round((count / totalHomesCountCalculated) * 100)
    }));

    let totalAmount = 0;
    const marketsCount: Record<string, number> = {};
    const totalPurchases = purchasesData?.length || 0;

    purchasesData?.forEach(p => {
      totalAmount += Number(p.total_amount || 0);
      const marketName = p.market_name ? p.market_name.trim().toUpperCase() : 'NÃO INFORMADO';
      marketsCount[marketName] = (marketsCount[marketName] || 0) + 1;
    });

    const averageTicket = totalPurchases > 0 ? totalAmount / totalPurchases : 0;
    const topMarkets = Object.entries(marketsCount)
      .map(([name, count]) => ({ name, count, percentage: Math.round((count / totalPurchases) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); 

    let open = 0, inProgress = 0, resolved = 0;
    supportData?.forEach(t => {
      if (t.status === 'open') open++;
      else if (t.status === 'in_progress') inProgress++;
      else if (t.status === 'resolved') resolved++;
    });

    return {
      users: {
        total: totalUsers || 0,
        newInPeriod: newUsers || 0,
        withHome: withHomeCount,
        withoutHome: withoutHomeCount
      },
      homes: {
        total: totalHomes || 0,
        newInPeriod: newHomes || 0,
        sizeDistribution
      },
      purchases: {
        totalCompleted: totalPurchases,
        totalAmount,
        averageTicket,
        topMarkets
      },
      support: {
        totalInPeriod: supportData?.length || 0,
        open,
        inProgress,
        resolved
      }
    };
  }
};