import React from 'react';
import { Settings, Cpu, Copy, RefreshCw } from 'lucide-react';

export const TopBar = ({ analysis, onNewAnalysis, onForceRefresh, isProcessing, onCopyInsight }) => {
  const copyInsight = () => {
    if (!analysis) return;
    const text = `🔹 Resumo Executivo:\n${analysis.resumo}\n\n🔹 Principais Dores:\n${analysis.dores.join(', ')}\n\n🔹 Objeções ativas:\n${analysis.objecoes.join(', ')}\n\n🔹 Próximos Passos:\n${analysis.proximosPassos.join('\n')}`;
    onCopyInsight(text);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-end px-8 z-10 shadow-sm shadow-slate-100/50">
      <div className="flex items-center gap-3">
        {analysis && (
          <button
            onClick={onForceRefresh}
            disabled={isProcessing}
            className="flex items-center gap-2 bg-orange-50 text-orange-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-100 transition-all border border-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={15} className={isProcessing ? 'animate-spin' : ''} />
            <span>{isProcessing ? 'Processando...' : 'Atualizar Análise'}</span>
          </button>
        )}
        <button
          onClick={onNewAnalysis}
          className="flex items-center gap-2 bg-white text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm border border-slate-200">
          <Settings size={16} />
          <span>Nova Análise</span>
        </button>
        <button
          onClick={copyInsight}
          disabled={!analysis}
          className="flex items-center gap-2 bg-branddi-navy text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-all shadow-md shadow-slate-200 active:scale-95 border border-branddi-cyan/20 disabled:opacity-50 disabled:cursor-not-allowed">
          <Cpu size={16} />
          <span>Gerar Insight</span>
        </button>
      </div>
    </header>
  );
};
