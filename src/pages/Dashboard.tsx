import React, { useState, useEffect } from 'react';
import { dashboardService } from '../services/dashboardService';
import { Users, Home, ShoppingBag, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';

export function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const data = await dashboardService?.getMetrics?.() || {};
        setStats(data);
      } catch (error) {
        console.error('Erro ao carregar métricas do dashboard:', error);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Page Header Padronizado IDÊNTICO ao modelo de Casas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-[#272D2D] tracking-tight">Centro de Controle</h1>
          <p className="text-sm text-gray-500 mt-1">Visão geral da operação e métricas em tempo real do ecossistema Carrin.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3.5 py-2 rounded-xl text-xs font-bold border border-emerald-200 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Sistema Operacional</span>
        </div>
      </div>

      {/* GRID DE MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total de Usuários</p>
            <h3 className="text-2xl font-black text-[#272D2D] mt-1">
              {loading ? '...' : (stats?.totalUsers || '—')}
            </h3>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Casas Ativas</p>
            <h3 className="text-2xl font-black text-[#272D2D] mt-1">
              {loading ? '...' : (stats?.totalHomes || '—')}
            </h3>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <Home size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Compras Registradas</p>
            <h3 className="text-2xl font-black text-[#272D2D] mt-1">
              {loading ? '...' : (stats?.totalPurchases || '—')}
            </h3>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
            <ShoppingBag size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Tickets de Suporte</p>
            <h3 className="text-2xl font-black text-[#272D2D] mt-1">
              {loading ? '...' : (stats?.openTickets || '—')}
            </h3>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
            <AlertTriangle size={20} />
          </div>
        </div>

      </div>

      {/* BLOCOS OPERACIONAIS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Atividade Operacional Recente</h3>
            <Activity size={16} className="text-gray-400" />
          </div>
          <div className="text-center py-12 text-gray-400 text-sm font-medium">
            Nenhuma atividade crítica registrada no momento.
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Saúde do Sistema</h3>
            <ShieldCheck size={16} className="text-emerald-600" />
          </div>
          
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-gray-600">API Supabase</span>
              <span className="text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">Operacional</span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-gray-600">Gateway Asaas</span>
              <span className="text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">Conectado</span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-gray-600">Serviço de Push</span>
              <span className="text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">Ativo</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}