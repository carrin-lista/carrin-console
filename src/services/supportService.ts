import { supabase } from '../lib/supabase';

export interface SupportTicket {
  id: string;
  subject: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'resolved';
  created_at: string;
  users: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url?: string | null;
  } | null;
  console_admins: {
    id: string;
    name: string;
  } | null;
}

export const supportService = {
  async getTickets(searchQuery: string = ''): Promise<SupportTicket[]> {
    let query = supabase
      .from('support_tickets')
      .select(`
        id,
        subject,
        description,
        status,
        created_at,
        users (id, full_name, email),
        console_admins (id, name)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (searchQuery) {
      query = query.ilike('subject', `%${searchQuery}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error('Falha ao carregar os tickets de suporte.');
    
    return data as unknown as SupportTicket[];
  },

  async getTicketById(id: string): Promise<SupportTicket> {
    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        id,
        subject,
        description,
        status,
        created_at,
        users (id, full_name, email, avatar_url),
        console_admins (id, name)
      `)
      .eq('id', id)
      .single();

    if (error) throw new Error('Falha ao carregar os detalhes do ticket.');
    return data as unknown as SupportTicket;
  },

  async updateTicketStatus(id: string, newStatus: 'open' | 'in_progress' | 'resolved'): Promise<void> {
    const { error } = await supabase
      .from('support_tickets')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) throw new Error('Falha ao atualizar o status do ticket.');
  }
};