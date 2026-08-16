import { supabase } from '../lib/supabase';

export const consoleSupportService = {
  // Busca todos os chamados com as informações cruzadas do usuário e da Casa
  async getAllTickets(statusFilter?: string) {
    let query = supabase
      .from('support_tickets')
      .select(`
        *,
        users!user_id (id, full_name, username, email, avatar_url),
        homes!home_id (id, name)
      `)
      .order('updated_at', { ascending: false });

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // Busca um chamado específico
  async getTicketDetails(ticketId: string) {
    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        users!user_id (id, full_name, username, email, avatar_url),
        homes!home_id (id, name)
      `)
      .eq('id', ticketId)
      .single();

    if (error) throw error;
    return data;
  },

  // Busca as mensagens da conversa (públicas e notas internas)
  async getTicketMessages(ticketId: string) {
    const { data, error } = await supabase
      .from('support_ticket_messages')
      .select(`
        *,
        users!sender_user_id (full_name, avatar_url)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Envia uma mensagem da equipe e dispara notificação push se for pública
  async sendAdminMessage(ticketId: string, adminId: string, message: string, isInternal: boolean) {
    // 1. Salva a mensagem no banco
    const { error: insertError } = await supabase
      .from('support_ticket_messages')
      .insert([{
        ticket_id: ticketId,
        sender_admin_id: adminId,
        message,
        is_internal: isInternal
      }]);

    if (insertError) throw insertError;

    // 2. Atualiza a data da última movimentação no ticket (para ele subir na lista)
    const { error: updateError, data: ticketData } = await supabase
      .from('support_tickets')
      .update({ 
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString()
      })
      .eq('id', ticketId)
      .select('user_id') // Pega o dono do ticket para a notificação
      .single();

    if (updateError) throw updateError;

    // 3. SE A MENSAGEM NÃO FOR INTERNA, DISPARA A NOTIFICAÇÃO PRO APP DO USUÁRIO
    if (!isInternal && ticketData?.user_id) {
      await supabase.from('notifications').insert([{
        user_id: ticketData.user_id,
        title: 'A equipe Carrin respondeu 💬',
        message: 'Tem uma nova resposta no seu chamado de suporte.',
        type: 'support_reply',
        read: false
      }]);
    }
  },

  // Atualiza o status do chamado (Em atendimento, Resolvido, etc)
  async updateTicketStatus(ticketId: string, status: string) {
    const { error } = await supabase
      .from('support_tickets')
      .update({ 
        status,
        updated_at: new Date().toISOString(),
        ...(status === 'resolved' ? { resolved_at: new Date().toISOString() } : {})
      })
      .eq('id', ticketId);

    if (error) throw error;
  }
};