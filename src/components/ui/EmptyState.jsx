import React from 'react';
import { LayoutDashboard, Zap, Database } from 'lucide-react';

export const EmptyState = ({ onNewAnalysis, onSavedDeals }) => (
  <div className="max-w-lg mx-auto fade-in flex flex-col items-center justify-center py-24 text-center">
    <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mb-6">
      <LayoutDashboard size={36} className="text-slate-300" />
    </div>
    <h2 className="text-xl font-black text-slate-700 mb-2">Nenhuma análise carregada</h2>
    <p className="text-sm text-slate-400 mb-8 max-w-sm">
      Insira o ID de um negócio do Pipedrive nas configurações para gerar o relatório de inteligência, ou selecione um deal já salvo.
    </p>
    <div className="flex items-center gap-3">
      <button
        onClick={onNewAnalysis}
        className="flex items-center gap-2 bg-branddi-cyan text-branddi-navy px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-[#08b8c7] transition-all shadow-sm active:scale-95"
      >
        <Zap size={16} fill="#001D2E" />
        Nova Análise
      </button>
      <button
        onClick={onSavedDeals}
        className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95"
      >
        <Database size={16} />
        Deals Salvos
      </button>
    </div>
  </div>
);
