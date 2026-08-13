import { supabase } from '../lib/supabase';

export interface PurchaseItem {
  id: string;
  name: string;
  category_id: string | null;
  quantity: number | null;
  unit: string | null;
  price: number | null;
  is_completed: boolean;
  unit_price: number | null;
  bought_quantity: number | null;
}

export interface Purchase {
  id: string;
  status: string;
  completed_at: string | null;
  total_amount: number;
  market_name: string | null;
  receipt_urls?: string[];
  homes: {
    id: string;
    name: string;
  } | null;
  shopping_items: PurchaseItem[];
}

export const purchaseService = {
  async getPurchases(searchQuery: string = ''): Promise<Purchase[]> {
    let query = supabase
      .from('shopping_lists')
      .select(`
        id,
        status,
        completed_at,
        total_amount,
        market_name,
        homes (
          id,
          name
        ),
        shopping_items (
          id
        )
      `)
      .in('status', ['completed', 'archived'])
      .order('completed_at', { ascending: false, nullsFirst: false })
      .limit(50);

    if (searchQuery) {
      query = query.ilike('market_name', `%${searchQuery}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error('Falha ao carregar o histórico de compras.');
    
    return data as unknown as Purchase[];
  },

  async getPurchaseById(id: string): Promise<Purchase> {
    const { data, error } = await supabase
      .from('shopping_lists')
      .select(`
        *,
        homes (
          id,
          name
        ),
        shopping_items (
          id,
          name,
          category_id,
          quantity,
          unit,
          price,
          is_completed,
          unit_price,
          bought_quantity
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw new Error('Falha ao carregar os detalhes da compra.');
    return data as unknown as Purchase;
  }
};