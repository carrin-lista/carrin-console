import { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { CommandPalette } from './CommandPalette';
import { 
  LayoutDashboard, Users, Home, ShoppingBag, 
  Headset, Bell, LineChart, Blocks, 
  ShieldCheck, ShieldAlert, Settings, 
  Search, Menu, X, LogOut, CreditCard 
} from 'lucide-react';

export function Layout() {
  const { admin, signOut } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Ouvinte Global do Teclado para Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Nova organização da Sidebar em seções contextuais
  const navSections = [
    {
      title: 'Visão Geral',
      items: [
        { to: '/', icon: LayoutDashboard, label: 'Centro de Controle' },
        { to: '/analytics', icon: LineChart, label: 'Analytics' },
      ]
    },
    {
      title: 'Operação',
      items: [
        { to: '/usuarios', icon: Users, label: 'Usuários' },
        { to: '/casas', icon: Home, label: 'Casas' },
        { to: '/compras', icon: ShoppingBag, label: 'Compras' },
        { to: '/suporte', icon: Headset, label: 'Suporte' },
        { to: '/notificacoes', icon: Bell, label: 'Notificações' },
      ]
    },
    {
      title: 'Financeiro',
      items: [
        { to: '/assinaturas', icon: CreditCard, label: 'Assinaturas' },
      ]
    },
    {
      title: 'Sistema',
      items: [
        { to: '/integracoes', icon: Blocks, label: 'Integrações' },
        { to: '/auditoria', icon: ShieldCheck, label: 'Auditoria' },
        { to: '/admins', icon: ShieldAlert, label: 'Administradores' },
        { to: '/configuracoes', icon: Settings, label: 'Configurações' },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#F6F8FF] flex">
      
      {/* Componente Invisível que aparece quando ativado */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)} 
      />

      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out flex flex-col ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } md:relative md:flex shrink-0`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 text-emerald-600 font-extrabold text-lg">
            <div className="w-6 h-6 bg-emerald-600 rounded-md"></div>
            Carrin Console
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navegação agrupada por seções contextuais */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6 custom-scrollbar">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                {section.title}
              </h3>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-emerald-50 text-emerald-700' 
                        : 'text-[#272D2D] hover:bg-gray-50 hover:text-emerald-600'
                    }`
                  }
                >
                  <item.icon size={18} className="shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 shrink-0">
          <button 
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={18} className="shrink-0" />
            <span>Sair do Console</span>
          </button>
        </div>
      </aside>

      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 shrink-0 z-30">
          <div className="flex items-center gap-4 flex-1">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden text-gray-500 hover:text-emerald-600"
            >
              <Menu size={24} />
            </button>

            {/* BARRA DE BUSCA CONECTADA AO COMMAND PALETTE */}
            <div className="hidden sm:flex items-center relative max-w-md w-full">
              <Search size={16} className="absolute left-3 text-gray-400" />
              <button 
                onClick={() => setIsCommandPaletteOpen(true)}
                className="w-full text-left pl-9 pr-4 py-2 bg-[#F6F8FF] border border-transparent rounded-lg text-sm text-gray-500 hover:bg-gray-100 hover:border-gray-200 transition-all flex justify-between items-center"
              >
                <span>Buscar usuário, casa, compra...</span>
                <kbd className="hidden lg:inline-block text-[10px] font-bold text-gray-400 bg-white border border-gray-200 px-1.5 py-0.5 rounded">Ctrl K</kbd>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 ml-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-[#272D2D] leading-none">{admin?.name}</p>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mt-1">{admin?.profile}</p>
            </div>
            <div className="w-9 h-9 bg-emerald-100 text-emerald-700 font-bold rounded-full flex items-center justify-center shrink-0 border border-emerald-200">
              {admin?.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
      
    </div>
  );
}