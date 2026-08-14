import { supabase } from '../lib/supabase';

export interface SubscriptionSummary {
  home_id: string;
  home_name: string;
  owner_id: string;
  commercial_status: string;
  effective_limit: number;
  plan_type: string | null;
  price: number | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
}

export const billingService = {
  /**
   * Lista todas as Casas e seus respectivos estados comerciais
   * (Ideal para a tabela principal do Carrin Console)
   */
  async getSubscriptionsList(): Promise<SubscriptionSummary[]> {
    const { data, error } = await supabase
      .from('house_commercial_states')
      .select(`
        home_id,
        status,
        effective_limit,
        current_period_end,
        trial_ends_at,
        homes ( name, created_by ),
        subscriptions ( plan_type, price )
      `);

    if (error) {
      console.error('Erro ao buscar assinaturas:', error.message);
      throw error;
    }

    // Formata o retorno para facilitar o uso na interface
    return data.map((item: any) => ({
      home_id: item.home_id,
      home_name: item.homes?.name || 'Casa sem nome',
      owner_id: item.homes?.created_by,
      commercial_status: item.status,
      effective_limit: item.effective_limit,
      // Pega os dados da assinatura, se existir
      plan_type: item.subscriptions?.length > 0 ? item.subscriptions[0].plan_type : null,
      price: item.subscriptions?.length > 0 ? item.subscriptions[0].price : null,
      current_period_end: item.current_period_end,
      trial_ends_at: item.trial_ends_at,
    }));
  },

  /**
   * Cria uma nova Oferta Personalizada (CUSTOM)
   */
  async createCustomOffer(
    homeId: string, 
    newPrice: number, 
    newLimit: number, 
    adminId: string
  ) {
    const { data, error } = await supabase
      .from('custom_offers')
      .insert({
        home_id: homeId,
        new_price: newPrice,
        new_limit: newLimit,
        status: 'PENDING',
        created_by: adminId,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Busca o histórico de ofertas de uma Casa específica
   */
  async getHomeOffers(homeId: string) {
    const { data, error } = await supabase
      .from('custom_offers')
      .select('*')
      .eq('home_id', homeId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Cancela uma oferta personalizada pendente
   */
  async cancelCustomOffer(offerId: string) {
    const { data, error } = await supabase
      .from('custom_offers')
      .update({ status: 'CANCELLED' })
      .eq('id', offerId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Executa o cancelamento real da assinatura no Asaas via backend seguro
   */
  async cancelSubscription(homeId: string) {
    const { data, error } = await supabase.functions.invoke('asaas-cancel', {
      body: { home_id: homeId }
    });

    if (error) {
      throw new Error(error.message || 'Erro ao cancelar assinatura');
    }

    return data;
  },

  /**
   * Busca os eventos financeiros (Webhooks) vinculados a uma Casa
   */
  async getBillingEvents(homeId: string) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('gateway_customer_id')
      .eq('home_id', homeId)
      .eq('is_current', true)
      .single();

    if (!sub || !sub.gateway_customer_id) return [];

    const { data, error } = await supabase
      .from('billing_events')
      .select('*')
      .or(`payload->payment->>customer.eq.${sub.gateway_customer_id},payload->>customer.eq.${sub.gateway_customer_id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar eventos financeiros:', error);
      return [];
    }
    
    return data;
  },

  /**
   * Dispara a reconciliação e sincronização do estado da Casa com o Asaas
   */
  async syncWithAsaas(homeId: string) {
    const { data, error } = await supabase.functions.invoke('asaas-sync', {
      body: { home_id: homeId }
    });

    if (error) {
      throw new Error(error.message || 'Erro ao sincronizar com o Asaas');
    }

    return data;
  }
};