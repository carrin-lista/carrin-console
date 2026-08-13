import { supabase } from '../lib/supabase';

export interface ConsoleAdmin {
  id: string;
  email: string;
  name: string;
  profile: 'master' | 'manager' | 'support';
  status: 'active' | 'suspended';
  created_at: string;
}

export const adminService = {
  async getAdmins(): Promise<ConsoleAdmin[]> {
    const { data, error } = await supabase
      .from('console_admins')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw new Error('Falha ao carregar a lista de administradores.');
    
    return data as ConsoleAdmin[];
  },

  async createAdmin(adminData: Omit<ConsoleAdmin, 'created_at' | 'status'>): Promise<void> {
    const { error } = await supabase
      .from('console_admins')
      .insert([{ 
        ...adminData, 
        status: 'active' 
      }]);

    if (error) throw new Error('Falha ao adicionar o administrador. Verifique se o ID está correto.');
  }
};