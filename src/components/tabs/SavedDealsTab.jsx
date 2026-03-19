import React from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { SectionTitle } from '../ui/SectionTitle';

export const SavedDealsTab = ({
  savedDeals,
  loadingDeals,
  dealsError,
  onRefresh,
  onLoadDeal
}) => (
  <div className="max-w-6xl mx-auto fade-in">
    <SectionTitle title="Deals Salvos" subtitle="Lista dos negócios já analisados pela IA, ordenados por Health Score." />
    <div className="flex justify-end mb-4">
      <button onClick={onRefresh} className="flex items-center gap-2 bg-branddi-cyan text-branddi-navy px-4 py-2 rounded-lg text-sm font-bold hover:bg-branddi-cyan/80 transition-all">
        <RefreshCw size={16} /> Atualizar Lista
      </button>
    </div>

    {loadingDeals && (
      <div className="flex items-center justify-center gap-2 text-slate-500 py-12"><Loader2 className="animate-spin" size={24} /> Carregando deals...</div>
    )}
    {dealsError && (
      <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-700 font-bold">{dealsError}</div>
    )}

    {!loadingDeals && !dealsError && (
      savedDeals && savedDeals.length > 0 ? (
        <div className="card overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">ID</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">Título do Deal</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">Health Score</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">Sentimento</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">Dias Aberto</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">Dias s/ Contato</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">Atualizado</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {savedDeals.map((deal, idx) => {
                try {
                  return (
                    <tr key={deal.deal_id || idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-xs text-slate-400 font-mono">{deal.deal_id || '-'}</td>
                      <td className="py-3 px-4 font-bold text-branddi-navy">{deal.deal_title || <span className="text-slate-400 italic text-xs">Sem título</span>}</td>
                      <td className="py-3 px-4">
                        <span className={`font-black text-lg ${deal.analise_ia?.score > 70 ? 'text-emerald-600' : deal.analise_ia?.score > 40 ? 'text-orange-600' : 'text-red-600'}`}>{deal.analise_ia?.score ?? '-'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${deal.analise_ia?.sentimento === 'Positivo' ? 'bg-emerald-100 text-emerald-700' : deal.analise_ia?.sentimento === 'Negativo' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-700'}`}>{deal.analise_ia?.sentimento ?? '-'}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{deal.metricas?.daysOpen ?? '-'}</td>
                      <td className="py-3 px-4 text-slate-700">{deal.metricas?.daysInactive ?? '-'}</td>
                      <td className="py-3 px-4 text-slate-500 text-xs">{deal.atualizado_em ? new Date(deal.atualizado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-'}</td>
                      <td className="py-3 px-4">
                        <button
                          className="bg-branddi-cyan text-branddi-navy px-3 py-1 rounded font-bold text-xs hover:bg-branddi-cyan/80 transition-all"
                          onClick={() => onLoadDeal(deal)}
                        >Ver Análise</button>
                      </td>
                    </tr>
                  );
                } catch (err) {
                  console.error('Erro ao renderizar deal:', deal, err);
                  return (
                    <tr key={idx} className="bg-red-50">
                      <td colSpan={8} className="text-red-700 font-bold py-4 text-center">Erro ao renderizar este deal.</td>
                    </tr>
                  );
                }
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 p-8 rounded-xl text-slate-500 font-bold text-center mt-8">Nenhum deal salvo encontrado no Supabase.</div>
      )
    )}
  </div>
);
