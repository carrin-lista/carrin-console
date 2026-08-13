import { supabase } from '../lib/supabase';

export interface HomeMember {
  role: string;
  users: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
}

export interface Home {
  id: string;
  name: string;
  created_at: string;
  photo_url: string | null;
  home_members: HomeMember[];
}

export const homeService = {
  async getHomes(searchQuery: string = ''): Promise<Home[]> {
    let query = supabase
      .from('homes')
      .select(`
        id,
        name,
        created_at,
        photo_url,
        home_members (
          role,
          users (
            id,
            full_name,
            email,
            avatar_url
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (searchQuery) {
      query = query.ilike('name', `%${searchQuery}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error('Falha ao carregar a lista de casas.');
    
    return data as unknown as Home[];
  },

  async getHomeById(id: string): Promise<Home> {
    const { data, error } = await supabase
      .from('homes')
      .select(`
        *,
        home_members (
          role,
          created_at,
          users (
            id,
            full_name,
            email,
            username,
            avatar_url
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw new Error('Falha ao carregar os detalhes da casa.');
    return data as unknown as Home;
  }
};