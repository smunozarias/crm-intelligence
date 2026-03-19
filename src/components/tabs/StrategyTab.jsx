import React from 'react';
import {
  User, AlertCircle, Shield, FileText, ShieldAlert,
  Send, Mail, Phone, Linkedin, Copy
} from 'lucide-react';
import { SectionTitle } from '../ui/SectionTitle';

export const StrategyTab = ({ analysis, onCopyText }) => (
  <div className="space-y-8 fade-in max-w-6xl mx-auto">
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* PERSONAS E DORES */}
      <div className="space-y-8">
        <div className="card p-8">
          <SectionTitle title="Personas & Decisores" subtitle="Quem manda no negócio." />
          <div className="space-y-4 mt-4">
            {analysis.personas.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500"><User size={20} /></div>
                  <div>
                    <p className="font-bold text-slate-800 leading-none">{p.nome || "Não definido"}</p>
                    <p className="text-xs text-slate-500 mt-1">{p.cargo}</p>
                  </div>
                </div>
                <span title={p.engajamento} className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase max-w-[140px] truncate inline-block text-right ${p.engajamento === 'Alto' ? 'bg-emerald-100 text-emerald-700' : p.engajamento === 'Baixo' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-700'}`}>
                  {p.engajamento}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-8 border-t-8 border-orange-500">
          <SectionTitle title="Negativas Fortes" subtitle="Barreiras explícitas onde a prospecção parou." />
          <div className="space-y-3 mt-4">
            {analysis.prospeccao?.negativasFortes?.length > 0 ? analysis.prospeccao?.negativasFortes.map((item, i) => (
              <div key={i} className="bg-orange-50/50 p-4 rounded-xl border-l-4 border-orange-500">
                <p className="text-sm font-bold text-orange-800">{item.nome}</p>
                <p className="text-xs text-orange-600 mt-1">{item.motivo}</p>
              </div>
            )) : <div className="p-4 bg-emerald-50 rounded-xl"><p className="text-sm font-bold text-emerald-700">Nenhuma negativa forte levantada.</p></div>}
          </div>
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Sustentação do Não (Motivo Geral da Estagnação)</p>
            <div className="bg-slate-900 rounded-xl p-4 text-white text-sm font-bold">
              {analysis.prospeccao?.motivoNaoEvolucao || "Negócio andando sem resistência grave identificada."}
            </div>
          </div>
        </div>
      </div>

      {/* OBJEÇÕES CRUZADAS COM CONTORNAMENTOS */}
      <div className="space-y-8">
        <div className="card p-8 border-t-4 border-red-500">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center"><Shield size={20} /></div>
            <div>
              <h3 className="font-black text-slate-800 text-lg">Contornos de Objeção</h3>
              <p className="text-xs text-slate-500">Argumentos práticos contra o que o cliente reclamou.</p>
            </div>
          </div>

          <div className="space-y-4">
            {analysis.contornosObjecoes?.length > 0 ? analysis.contornosObjecoes.map((item, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="bg-red-50 px-4 py-3 border-b border-red-100 flex items-center gap-2">
                  <AlertCircle size={14} className="text-red-500 shrink-0" />
                  <span className="text-sm font-bold text-red-800 leading-tight">Cliente: "{item.objecao}"</span>
                </div>
                <div className="p-4">
                  <p className="text-[10px] font-bold text-branddi-cyan uppercase tracking-wider mb-2">Sugestão de Contorno (IA)</p>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">{item.contornoPersonalizado}</p>
                  
                  {item.dadosDoDeal && (
                    <div className="mt-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Baseado no Real:</p>
                      <p className="text-[11px] text-slate-600 leading-tight">{item.dadosDoDeal}</p>
                    </div>
                  )}
                </div>
              </div>
            )) : <div className="p-4 bg-emerald-50 rounded-xl"><p className="text-sm font-bold text-emerald-700">O cliente não levantou nenhuma objeção a ser contornada.</p></div>}
          </div>

          {/* Fallback de Objeções mal contornadas do SDR antigo que não viraram playbook */}
          {analysis.objecoesMalContornadas?.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-100">
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Objeções Mal Geridas pelo SDR</p>
               <div className="space-y-3">
                  {analysis.objecoesMalContornadas.map((ob, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-lg text-xs">
                      <span className="font-bold text-red-600">{ob.objecao}</span>
                      <p className="text-slate-500 mt-1">{ob.motivo}</p>
                    </div>
                  ))}
               </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* BRIEFING DE REUNIÃO */}
    {analysis.prontidaoReuniao && (
      <div className="card p-8 border-t-4 border-branddi-navy">
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-branddi-navy/10 text-branddi-navy rounded-lg flex items-center justify-center shrink-0"><FileText size={20} /></div>
            <div>
              <h3 className="font-black text-slate-800 text-xl">Briefing Pré-Reunião</h3>
              <p className="text-xs text-slate-500">Leia antes de abrir o Google Meet.</p>
            </div>
          </div>
          <button 
             onClick={() => onCopyText(`BRIEFING PRÉ-REUNIÃO\n\nResumo: ${analysis.prontidaoReuniao.resumoExecutivo}\n\nPontos a interrogar:\n${analysis.prontidaoReuniao.pontosDiscutir?.join('\n')}`)} 
             className="md:ml-auto text-xs bg-branddi-navy text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-800 transition-colors flex items-center gap-2 w-max"
          >
            <Copy size={14} /> Copiar Check-list Inteiro
          </button>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-5 rounded-xl border-l-4 border-branddi-cyan mb-6">
          <p className="text-[10px] font-bold text-branddi-cyan uppercase tracking-wider mb-2">Qual o Status da Conta?</p>
          <p className="text-sm text-slate-700 leading-relaxed font-medium">{analysis.prontidaoReuniao.resumoExecutivo}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">O que tem de ser dito</p>
            <ul className="space-y-3">
              {analysis.prontidaoReuniao.pontosDiscutir?.map((ponto, i) => (
                 <li key={i} className="flex gap-3 text-sm text-slate-700 items-start">
                   <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 items-center justify-center flex text-[10px] font-bold mt-0.5 shrink-0">{i+1}</div>
                   <span className="font-medium">{ponto}</span>
                 </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Perguntas a fazer</p>
            <ul className="space-y-3">
              {analysis.prontidaoReuniao.perguntasEstrategicas?.map((pergunta, i) => (
                 <li key={i} className="flex gap-3 text-sm text-branddi-navy items-start">
                   <span className="text-branddi-cyan font-bold italic text-lg leading-none mt-0.5">?</span>
                   <span className="font-bold">{pergunta}</span>
                 </li>
              ))}
            </ul>
          </div>
        </div>

        {analysis.prontidaoReuniao.armadilhasEvitar?.length > 0 && (
          <div className="mt-8 bg-red-50 p-5 rounded-xl border border-red-100 flex gap-4 items-start">
            <ShieldAlert size={24} className="text-red-500 shrink-0" />
            <div>
              <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">Armadilhas: O cliente pode alegar que...</p>
              <ul className="space-y-1">
                {analysis.prontidaoReuniao.armadilhasEvitar.map((arm, i) => (
                  <li key={i} className="text-sm text-red-800">- {arm}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    )}

    {/* MENSAGENS PERSONALIZADAS TEMPLATES */}
    <div className="card p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-branddi-cyan/10 text-branddi-cyan rounded-lg flex items-center justify-center"><Send size={20} /></div>
        <div>
          <h3 className="font-black text-slate-800 text-lg">Templates Gerados p/ Follow-up</h3>
          <p className="text-xs text-slate-500">Ctrl+C / Ctrl+V de mensagens quentes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {analysis.mensagensPersonalizadas?.email && (
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 hover:border-branddi-cyan transition-all group">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2"><Mail size={16} className="text-blue-600" /><span className="text-[10px] font-black text-blue-600 uppercase">E-mail</span></div>
              <button onClick={() => onCopyText(`Assunto: ${analysis.mensagensPersonalizadas.email.assunto}\n\n${analysis.mensagensPersonalizadas.email.corpo}`)} className="text-[10px] bg-white border border-slate-300 px-2 py-1 rounded font-bold hover:bg-slate-100 transition-colors flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100"><Copy size={12} /> Copiar</button>
            </div>
            <p className="text-xs font-bold text-slate-800 mb-2">Assunto: {analysis.mensagensPersonalizadas.email.assunto}</p>
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{analysis.mensagensPersonalizadas.email.corpo}</p>
          </div>
        )}

        {analysis.mensagensPersonalizadas?.whatsapp && (
          <div className="bg-emerald-50/30 rounded-xl p-5 border border-emerald-100 hover:border-emerald-400 transition-all group">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-emerald-100">
              <div className="flex items-center gap-2"><Phone size={16} className="text-emerald-600" /><span className="text-[10px] font-black text-emerald-600 uppercase">WhatsApp</span></div>
              <button onClick={() => onCopyText(analysis.mensagensPersonalizadas.whatsapp.mensagem)} className="text-[10px] bg-white border border-slate-300 px-2 py-1 rounded font-bold hover:bg-slate-100 transition-colors flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100"><Copy size={12} /> Copiar</button>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{analysis.mensagensPersonalizadas.whatsapp.mensagem}</p>
          </div>
        )}

        {analysis.mensagensPersonalizadas?.linkedin && (
          <div className="bg-blue-50/30 rounded-xl p-5 border border-blue-100 hover:border-blue-400 transition-all group">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-blue-100">
              <div className="flex items-center gap-2"><Linkedin size={16} className="text-blue-700" /><span className="text-[10px] font-black text-blue-700 uppercase">LinkedIn</span></div>
              <button onClick={() => onCopyText(analysis.mensagensPersonalizadas.linkedin.mensagem)} className="text-[10px] bg-white border border-slate-300 px-2 py-1 rounded font-bold hover:bg-slate-100 transition-colors flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100"><Copy size={12} /> Copiar</button>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{analysis.mensagensPersonalizadas.linkedin.mensagem}</p>
          </div>
        )}
      </div>
    </div>
  </div>
);
