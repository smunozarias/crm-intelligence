import React, { useState } from 'react';
import {
  Shield, CheckCircle, Hash, LayoutDashboard, Zap, Loader2,
  Settings, ChevronRight, AlertCircle
} from 'lucide-react';
import { SectionTitle } from '../ui/SectionTitle';

export const ConfigTab = ({
  pipedriveToken, setPipedriveToken,
  dealId, setDealId,
  model, setModel,
  status, errorMsg,
  onStartProcess
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="max-w-4xl mx-auto space-y-8 fade-in">
      <SectionTitle title="Configuração da Inteligência" subtitle="Configure suas chaves e o negócio que deseja analisar no histórico Branddi." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* KEYS CARD */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center"><Shield size={20} /></div>
            <div>
              <h3 className="font-bold text-slate-800">Chaves de API</h3>
              <p className="text-xs text-slate-500">Credenciais para conexão Pipedrive e Gemini.</p>
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-sm text-slate-500 mb-4">A inteligência está sendo rodada em servidores seguros. Sua chave do Google Cloud está protegida na Vercel.</p>
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block uppercase">Pipedrive Token</label>
              {pipedriveToken ? (
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 text-sm text-emerald-700 font-semibold flex items-center gap-2">
                    <CheckCircle size={16} className="text-emerald-600" />
                    Token configurado
                  </div>
                  <button onClick={() => setPipedriveToken('')} className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg font-bold hover:bg-slate-50 transition-colors">Alterar</button>
                </div>
              ) : (
                <input
                  type="password"
                  value={pipedriveToken}
                  onChange={(e) => setPipedriveToken(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-branddi-cyan outline-none transition-all"
                  placeholder="Token do seu CRM"
                />
              )}
            </div>
          </div>
        </div>

        {/* DEAL CARD */}
        <div className="card p-6 border-2 border-branddi-cyan/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-branddi-cyan/10 text-branddi-cyan rounded-lg flex items-center justify-center"><LayoutDashboard size={20} /></div>
            <div>
              <h3 className="font-bold text-slate-800">Negócio Alvo</h3>
              <p className="text-xs text-slate-500">Qual ID deseja passar pelo crivo da IA?</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block uppercase">Deal ID (Pipedrive)</label>
              <div className="relative">
                <Hash className="absolute left-3 top-2.5 text-branddi-cyan" size={16} />
                <input
                  type="text"
                  value={dealId}
                  onChange={(e) => setDealId(e.target.value)}
                  className="w-full bg-white border-2 border-branddi-cyan/10 rounded-lg pl-10 pr-4 py-2 text-sm font-bold text-branddi-navy focus:border-branddi-cyan outline-none transition-all"
                  placeholder="Ex: 10298"
                />
              </div>
            </div>
            <button
              onClick={onStartProcess}
              disabled={status === 'fetching' || status === 'analyzing'}
              className="w-full bg-branddi-cyan hover:bg-[#08b8c7] text-branddi-navy font-bold py-2.5 px-6 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {status === 'fetching' || status === 'analyzing' ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Zap size={18} fill="#001D2E" />
              )}
              <span>Iniciar Inteligência Branddi</span>
            </button>
          </div>
        </div>
      </div>

      {/* ADVANCED SETTINGS */}
      <div className="card overflow-hidden">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-6 py-4 flex items-center justify-between text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Settings size={18} className="text-slate-400" />
            <span className="font-semibold text-sm">Configurações Avançadas (Tags)</span>
          </div>
          <ChevronRight className={`transition-transform ${showAdvanced ? 'rotate-90' : ''}`} size={18} />
        </button>
        {showAdvanced && (
          <div className="p-6 bg-slate-50 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6 slide-in-from-top">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase px-1 mb-1 block">Modelo Gemini</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium outline-none"
              >
                <option value="gemini-3.1-pro">Gemini 3.1 Pro (Elite)</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Avançado)</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Padrão)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ERROR STATE */}
      {status === 'error' && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-4 animate-in slide-in-from-bottom">
          <div className="w-10 h-10 bg-red-100 text-red-600 rounded-lg flex items-center justify-center shrink-0"><AlertCircle size={24} /></div>
          <div>
            <h4 className="font-bold text-red-800">Ops! Algo correu mal</h4>
            <p className="text-sm text-red-600 mt-1">{errorMsg}</p>
          </div>
        </div>
      )}
    </div>
  );
};
