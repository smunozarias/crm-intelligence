import React from 'react';
import { Loader2, Check } from 'lucide-react';

const STEPS = [
  { step: 1, label: 'Verificando cache no banco de dados...' },
  { step: 2, label: 'Extraindo dados brutos do Pipedrive...' },
  { step: 3, label: 'Buscando histórico de atividades e anotações...' },
  { step: 4, label: 'Processando métricas e contagens...' },
  { step: 5, label: 'Analisando dados com Inteligência Artificial...' },
  { step: 6, label: 'Salvando resultados no banco...' },
];

export const ProcessingStepper = ({ dealId, processingStep }) => (
  <div className="max-w-2xl mx-auto fade-in">
    <div className="card p-10">
      <div className="text-center mb-8">
        <Loader2 className="animate-spin text-branddi-cyan mx-auto mb-4" size={40} />
        <h2 className="text-xl font-black text-slate-800">Analisando Deal #{dealId}</h2>
        <p className="text-sm text-slate-500 mt-1">Aguarde enquanto processamos os dados...</p>
      </div>
      <div className="space-y-3">
        {STEPS.map(({ step, label }) => (
          <div
            key={step}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
              processingStep > step ? 'bg-emerald-50 border border-emerald-200' :
              processingStep === step ? 'bg-branddi-cyan/10 border border-branddi-cyan/30' :
              'bg-slate-50 border border-slate-100 opacity-40'
            }`}
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0">
              {processingStep > step ? (
                <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Check size={14} className="text-white" />
                </div>
              ) : processingStep === step ? (
                <Loader2 size={18} className="animate-spin text-branddi-cyan" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-slate-400">{step}</span>
                </div>
              )}
            </div>
            <span className={`text-sm font-medium ${
              processingStep > step ? 'text-emerald-700' :
              processingStep === step ? 'text-branddi-navy font-bold' :
              'text-slate-400'
            }`}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);
