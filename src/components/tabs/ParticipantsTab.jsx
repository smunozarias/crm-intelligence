import React from 'react';
import { Users, AlertTriangle, Shield, MapPin, Crown, Star, Zap } from 'lucide-react';
import { SectionTitle } from '../ui/SectionTitle';

const parseEngajamento = (eng) => {
  const raw = (eng || '').trim();
  const lower = raw.toLowerCase();
  let nivel = 'Neutro';
  if (lower.startsWith('alto')) nivel = 'Alto';
  else if (lower.startsWith('médio') || lower.startsWith('medio')) nivel = 'Médio';
  else if (lower.startsWith('baixo')) nivel = 'Baixo';
  else if (lower.startsWith('nulo')) nivel = 'Nulo';
  // Extract detail after the dash separator
  const dashIdx = raw.indexOf(' - ');
  const detalhe = dashIdx > -1 ? raw.substring(dashIdx + 3).trim() : (raw.length > 10 ? raw : '');
  return { nivel, detalhe };
};

const nivelColor = {
  'Alto':   { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Médio':  { bg: 'bg-amber-100',   text: 'text-amber-700',  border: 'border-amber-200' },
  'Baixo':  { bg: 'bg-slate-100',   text: 'text-slate-600',  border: 'border-slate-200' },
  'Nulo':   { bg: 'bg-red-50',      text: 'text-red-500',    border: 'border-red-200' },
  'Neutro': { bg: 'bg-slate-100',   text: 'text-slate-600',  border: 'border-slate-200' },
};

export const ParticipantsTab = ({ analysis }) => {
  const personas = analysis?.personas || [];
  const ultimaEngajada = analysis?.prospeccao?.ultimaPessoaEngajada;
  const mapeamentoConta = analysis?.prospeccao?.mapeamentoConta || [];
  const removerDoCard = analysis?.participantesMapa?.removerDoCard || [];
  const alertaStakeholder = analysis?.participantesMapa?.alertaStakeholder;

  return (
    <div className="space-y-6 fade-in">

      {/* ═══ ALERTAS (se existirem) ═══ */}
      {(alertaStakeholder?.existe || removerDoCard.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alertaStakeholder?.existe && (
            <div className="card p-5 border-l-4 border-orange-500 bg-gradient-to-r from-orange-50 to-white">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={16} className="text-orange-500" />
                <p className="text-xs font-black text-orange-600 uppercase">Alerta de Stakeholder Decisivo</p>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{alertaStakeholder.contexto}</p>
            </div>
          )}

          {removerDoCard.length > 0 && (
            <div className="card p-5 border-l-4 border-red-400 bg-gradient-to-r from-red-50 to-white">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-red-500" />
                <p className="text-xs font-black text-red-600 uppercase">Participantes a Remover</p>
              </div>
              <div className="space-y-2">
                {removerDoCard.map((p, i) => (
                  <div key={i} className="flex items-center justify-between bg-white p-2 rounded-lg border border-red-100">
                    <span className="text-xs font-bold text-slate-700">{p.nome}</span>
                    <span className="text-[10px] text-red-500 font-medium">{p.motivo}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ ÚLTIMO ENGAJAMENTO ═══ */}
      {ultimaEngajada && (
        <div className="card p-5 border-l-4 border-branddi-cyan">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} className="text-branddi-cyan" />
            <p className="text-xs font-black text-branddi-navy uppercase">Última Pessoa Engajada</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-branddi-cyan/20 flex items-center justify-center">
              <span className="text-sm font-black text-branddi-navy">{(ultimaEngajada.nome || '?')[0]}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{ultimaEngajada.nome}</p>
              <p className="text-xs text-slate-500 mt-0.5">{ultimaEngajada.contexto}</p>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MAPA DE PODER (Personas + Engajamento) ═══ */}
      <div className="card p-6">
        <SectionTitle title="Mapa de Poder" subtitle="Personas envolvidas no deal, com nível de engajamento e papel." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {personas.length > 0 ? personas.map((p, i) => {
            const { nivel, detalhe } = parseEngajamento(p.engajamento);
            const color = nivelColor[nivel] || nivelColor['Neutro'];
            return (
              <div key={i} className={`p-4 rounded-xl border ${color.border} ${color.bg} hover:shadow-sm transition-all`}>
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-full bg-white flex items-center justify-center border ${color.border} shrink-0 mt-0.5`}>
                    {i === 0 ? <Crown size={14} className="text-orange-500" /> : <Star size={14} className={color.text} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-800">{p.nome}</p>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-white ${color.text} border ${color.border} shrink-0`}>
                        {nivel}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">{p.cargo}</p>
                    {detalhe && (
                      <p className="text-[10px] text-slate-400 mt-1 leading-snug italic">{detalhe}</p>
                    )}
                  </div>
                </div>
                {p.resumoEnvolvimento && (
                  <p className="text-[11px] text-slate-600 mt-2 pl-12 leading-snug">{p.resumoEnvolvimento}</p>
                )}
              </div>
            );
          }) : (
            <p className="text-xs text-slate-500 col-span-2 p-4 text-center">Nenhuma persona identificada.</p>
          )}
        </div>
      </div>

      {/* ═══ MAPEAMENTO POR ÁREA ═══ */}
      {mapeamentoConta.length > 0 && (
        <div className="card p-6">
          <SectionTitle title="Mapeamento por Área" subtitle="Departamentos e pessoas-chave identificados." />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {mapeamentoConta.map((area, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={14} className="text-indigo-500" />
                  <p className="text-xs font-black text-indigo-600 uppercase tracking-wider">{area.area}</p>
                </div>
                <div className="space-y-1.5">
                  {(area.pessoas || []).map((nome, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"></div>
                      <span className="text-xs text-slate-600 font-medium">{nome}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
