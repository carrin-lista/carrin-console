import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';

// Ícones SVG consistentes com o padrão visual
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
);
const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
);

type AuthView = 'login' | 'forgot_password';

export function Login() {
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  
  const navigate = useNavigate();
  const { checkSession } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      const { data: adminData, error: adminError } = await supabase
        .from('console_admins')
        .select('status')
        .eq('id', authData.user.id)
        .single();

      if (adminError || !adminData || adminData.status === 'suspended') {
        await supabase.auth.signOut();
        throw new Error('Acesso negado. Esta conta não possui privilégios administrativos ativos.');
      }

      await checkSession();
      navigate('/');
    } catch (err: any) {
      console.error(err);
      let msg = err.message || 'Erro ao tentar fazer login.';
      if (msg === 'Invalid login credentials') {
        msg = 'E-mail ou senha incorretos.';
      }
      setFeedback({ text: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
      });
      if (error) throw error;
      setFeedback({ 
        text: 'Confira seu e-mail. Se existir uma conta administrativa vinculada a esse endereço, enviaremos as instruções.', 
        type: 'success' 
      });
    } catch (err: any) {
      setFeedback({ text: err.message || 'Não foi possível enviar o e-mail de recuperação.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-[#F6F8FF]">
      {/* Card principal com arredondamento idêntico ao cliente (rounded-3xl) e padding suave */}
      <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-sm w-full max-w-md text-center transition-all border border-gray-100">
        
        {/* Logo oficial do Carrin */}
        <div className="flex justify-center w-full mb-3">
          <img 
            src="/carrinlogo.png" 
            alt="Carrin" 
            className="h-10 w-auto object-contain" 
          />
        </div>

        {/* Identificação do Console com badge arredondado e tipografia padronizada */}
        <div className="mb-6">
          <span className="text-[10px] font-bold tracking-wider uppercase text-[#23CE6B] bg-[#F6F8FF] px-3 py-1 rounded-full inline-block mb-2 border border-[#23CE6B]/20">
            Console Administrativo
          </span>
          <p className="text-[#272D2D] font-bold text-base">
            {view === 'login' ? 'Bem-vindo de volta.' : 'Recuperar senha'}
          </p>
        </div>

        {view === 'forgot_password' && !feedback && (
          <p className="text-sm text-gray-500 mb-6 font-medium">Digite seu e-mail corporativo para receber as instruções de redefinição.</p>
        )}

        {feedback && (
          <div className={`mb-5 p-3 rounded-2xl text-xs font-bold text-left ${feedback.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-[#272D2D] border border-[#23CE6B]/30'}`}>
            {feedback.text}
          </div>
        )}

        {view === 'login' ? (
          <form onSubmit={handleLogin} className="flex flex-col gap-4 text-left">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 px-1">
                E-mail
              </label>
              <input
                type="email"
                placeholder="voce@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                /* Inputs com cantos super arredondados iguaizinhas ao cliente (rounded-2xl) */
                className="w-full px-4 py-3.5 bg-[#F6F8FF]/60 border border-gray-200 rounded-2xl text-sm font-medium text-[#272D2D] placeholder:text-gray-400 focus:outline-none focus:border-[#23CE6B] focus:ring-1 focus:ring-[#23CE6B] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 px-1">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo de 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 bg-[#F6F8FF]/60 border border-gray-200 rounded-2xl text-sm font-medium text-[#272D2D] placeholder:text-gray-400 focus:outline-none focus:border-[#23CE6B] focus:ring-1 focus:ring-[#23CE6B] transition-all pr-12"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  aria-label="Mostrar senha"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#272D2D] transition-colors"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <div className="mt-2">
              <button
                type="submit"
                disabled={loading}
                /* Botão com arredondamento fluido idêntico ao cliente (rounded-2xl) e cor #23CE6B */
                className="w-full bg-[#23CE6B] hover:bg-[#1fb85e] text-white py-3.5 rounded-2xl font-bold text-sm transition-colors disabled:opacity-70 shadow-sm"
              >
                {loading ? 'Aguarde...' : 'Entrar'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword} className="flex flex-col gap-4 text-left">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 px-1">
                E-mail
              </label>
              <input
                type="email"
                placeholder="voce@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3.5 bg-[#F6F8FF]/60 border border-gray-200 rounded-2xl text-sm font-medium text-[#272D2D] placeholder:text-gray-400 focus:outline-none focus:border-[#23CE6B] focus:ring-1 focus:ring-[#23CE6B] transition-all"
              />
            </div>

            <div className="mt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#23CE6B] hover:bg-[#1fb85e] text-white py-3.5 rounded-2xl font-bold text-sm transition-colors disabled:opacity-70 shadow-sm"
              >
                {loading ? 'Enviando...' : 'Enviar Link'}
              </button>
            </div>
          </form>
        )}

        {view === 'login' && (
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => { setView('forgot_password'); setFeedback(null); }}
              className="text-xs font-bold text-gray-500 hover:text-[#272D2D] transition-colors"
            >
              Esqueci minha senha
            </button>
          </div>
        )}

        {view === 'forgot_password' && (
          <button
            type="button"
            onClick={() => { setView('login'); setFeedback(null); }}
            className="mt-6 text-xs font-bold text-gray-500 hover:text-[#272D2D] transition-colors"
          >
            ← Voltar para o login
          </button>
        )}
      </div>
    </div>
  );
}