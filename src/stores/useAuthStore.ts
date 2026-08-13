import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  profile: string;
  permissions: string[];
  status: string;
}

interface AuthState {
  admin: AdminUser | null;
  isLoading: boolean;
  checkSession: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  admin: null,
  isLoading: true,

  checkSession: async () => {
    set({ isLoading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        set({ admin: null, isLoading: false });
        return;
      }

      // Verificação crítica: Consulta a tabela administrativa isolada
      const { data: adminData, error } = await supabase
        .from('console_admins')
        .select('*')
        .eq('id', session.user.id)
        .single();

      // Bloqueia se não for admin ou se o status for 'suspended'
      if (error || !adminData || adminData.status === 'suspended') {
        await supabase.auth.signOut();
        set({ admin: null, isLoading: false });
        return;
      }

      set({ admin: adminData, isLoading: false });
    } catch (error) {
      console.error("Erro ao validar sessão administrativa:", error);
      set({ admin: null, isLoading: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ admin: null });
  }
}));