import { supabase } from '../lib/supabase';

export interface User {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  home_members?: {
    role: string;
    homes: {
      id: string;
      name: string;
    } | null;
  }[];
}

export const userService = {
  async getUsers(searchQuery: string = ''): Promise<User[]> {
    let query = supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (searchQuery) {
      query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error('Falha ao carregar a lista de usuários.');
    return data || [];
  },

  async getUserById(id: string): Promise<User> {
    // Busca o usuário e faz o JOIN (junção) com a tabela de membros e casas
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        home_members (
          role,
          homes (
            id,
            name
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw new Error('Falha ao carregar os detalhes do usuário.');
    return data;
  }
};