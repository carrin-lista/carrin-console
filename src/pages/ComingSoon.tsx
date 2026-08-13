import { Construction } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  description: string;
  icon: React.ElementType;
}

export function ComingSoon({ title, description, icon: Icon }: ComingSoonProps) {
  return (
    <div className="max-w-3xl mx-auto flex flex-col items-center justify-center py-24 text-center space-y-4 animate-in fade-in duration-500">
      <div className="w-24 h-24 bg-white border border-gray-200 shadow-sm rounded-3xl flex items-center justify-center text-gray-400 mb-2 transform rotate-3">
        <Icon size={40} strokeWidth={1.5} className="text-emerald-600" />
      </div>
      <h1 className="text-2xl font-bold text-[#272D2D]">{title}</h1>
      <p className="text-gray-500 max-w-md">
        {description}
      </p>
      <div className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-bold border border-emerald-100">
        <Construction size={16} /> Disponível na Fase 2
      </div>
    </div>
  );
}