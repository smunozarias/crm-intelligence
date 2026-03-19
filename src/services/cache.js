/**
 * Cache Service
 * Handles Supabase CRUD for deal analyses
 */

import { supabase } from '../lib/supabase';

/**
 * Load a cached analysis from Supabase by deal_id
 * Returns the cached row or null if not found
 */
export async function loadFromCache(dealId) {
  const { data, error } = await supabase
    .from('deal_analyses')
    .select('*')
    .eq('deal_id', String(dealId))
    .maybeSingle();

  if (error) {
    console.warn('Cache lookup error:', error.message);
    return null;
  }

  return data || null;
}

/**
 * Save or update an analysis in Supabase cache
 */
export async function saveToCache({ dealId, dealTitle, analysis, rawText, structuredData, metrics }) {
  const nowString = new Date().toISOString();

  const payload = {
    deal_id: String(dealId),
    deal_title: dealTitle,
    analise_ia: analysis,
    dados_brutos: rawText,
    metricas: metrics,
    atualizado_em: nowString,
  };

  // Add structured data if available
  if (structuredData) {
    payload.dados_brutos_estruturados = structuredData;
  }

  const { error } = await supabase
    .from('deal_analyses')
    .upsert(payload, { onConflict: 'deal_id' });

  if (error) {
    console.error('❌ Erro ao salvar no Supabase:', error.code, error.message);
    return { success: false, error };
  }

  console.log('✅ Cache atualizado para o deal', dealId);
  return { success: true, updatedAt: nowString };
}

/**
 * Update only the deal title in cache
 */
export async function updateCacheTitle(dealId, newTitle) {
  const { error } = await supabase
    .from('deal_analyses')
    .update({ deal_title: newTitle })
    .eq('deal_id', String(dealId));

  if (error) {
    console.warn('Failed to update cached title:', error.message);
  }
}

/**
 * Fetch all saved deals ordered by update time
 */
export async function fetchAllSavedDeals() {
  const { data, error } = await supabase
    .from('deal_analyses')
    .select('*')
    .order('atualizado_em', { ascending: false });

  if (error) throw new Error('Erro ao buscar deals salvos: ' + (error.message || error));
  return data || [];
}
