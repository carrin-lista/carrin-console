import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Home, ShoppingBag, LayoutDashboard, X } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Fecha o modal ao apertar Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Foca no input automaticamente quando abre
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 10);
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Ações rápidas fixas de navegação
  const defaultActions = [
    { id: 'dash', title: 'Ir para Centro de Controle', icon: LayoutDashboard, route: '/' },
    { id: 'users', title: 'Ir para Usuários', icon: Users, route: '/usuarios' },
    { id: 'homes', title: 'Ir para Casas', icon: Home, route: '/casas' },
    { id: 'purchases', title: 'Ir para Compras', icon: ShoppingBag, route: '/compras' },
  ];

  // Filtra as ações pelo que o usuário digitou
  const filteredActions = defaultActions.filter(action => 
    action.title.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (route: string) => {
    navigate(route);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* Overlay clicável para fechar */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-white w-full max-w-xl rounded-xl shadow-2xl overflow-hidden border border-gray-200 animate-in slide-in-from-top-4 duration-200">
        
        {/* Barra de Busca */}
        <div className="flex items-center px-4 py-3 border-b border-gray-100">
          <Search size={20} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="O que você precisa encontrar?"
            className="flex-1 bg-transparent border-none focus:outline-none px-3 text-gray-700 placeholder-gray-400"
          />
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Resultados */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {query.length > 0 && (
            <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
              Ações Rápidas
            </div>
          )}
          
          <div className="space-y-1">
            {filteredActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleSelect(action.route)}
                className="w-full flex items-center gap-3 px-3 py-3 text-sm text-left text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition-colors group"
              >
                <div className="p-1.5 bg-gray-100 group-hover:bg-emerald-100 rounded-md text-gray-500 group-hover:text-emerald-600 transition-colors">
                  <action.icon size={16} />
                </div>
                <span className="font-medium">{action.title}</span>
              </button>
            ))}
            
            {filteredActions.length === 0 && (
              <div className="py-8 text-center text-sm text-gray-400">
                Nenhum atalho encontrado para "{query}".<br/>
                (Busca global no banco será conectada futuramente)
              </div>
            )}
          </div>
        </div>

        {/* Footer com atalhos visuais */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
          <div className="flex items-center gap-2">
            Navegue pelos módulos administrativos
          </div>
          <div className="flex gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded shadow-sm">ESC</kbd> para fechar
          </div>
        </div>

      </div>
    </div>
  );
}