/**
 * useDealAnalysis Hook
 * Main orchestrator: fetch → process → analyze → save
 * Uses services internally and exposes clean API to components
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchDeal, fetchParticipants, fetchUsersMap, fetchFlowItems } from '../services/pipedrive';
import { calculateHardMetrics } from '../services/metrics';
import { processToStructured, compileToText } from '../services/dataProcessor';
import { loadFromCache, saveToCache, updateCacheTitle } from '../services/cache';

export function useDealAnalysis({ showToast }) {
  // Configuration
  const [model, setModel] = useState(() => localStorage.getItem('geminiModel') || 'gemini-2.5-flash');
  const [pipedriveToken, setPipedriveToken] = useState(() => localStorage.getItem('pipedriveToken') || '');
  const [dealId, setDealId] = useState('');

  // Results
  const [dealTitle, setDealTitle] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [hardMetrics, setHardMetrics] = useState(null);
  const [rawExtractedData, setRawExtractedData] = useState('');
  const [detailedParticipants, setDetailedParticipants] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Status
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [processingStep, setProcessingStep] = useState(0);

  // Persist credentials
  useEffect(() => {
    localStorage.setItem('geminiModel', model);
    localStorage.setItem('pipedriveToken', pipedriveToken);
  }, [model, pipedriveToken]);

  /**
   * Format update date for display
   */
  const formatUpdateDate = (dateStr) => {
    const dt = new Date(dateStr);
    return `${dt.toLocaleDateString('pt-BR')} às ${dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  /**
   * Fetch data from Pipedrive (with optional cache bypass)
   */
  const fetchPipedriveData = useCallback(async (forceRefresh = false) => {
    try {
      setStatus('fetching');
      setErrorMsg('');
      setProcessingStep(1);

      // Check cache first
      if (!forceRefresh) {
        console.log('🔍 Verificando cache para ID:', dealId);
        const cached = await loadFromCache(dealId);

        if (cached) {
          console.log('✅ Cache ENCONTRADO:', cached);
          setRawExtractedData(cached.dados_brutos);
          setAnalysis(cached.analise_ia);
          setHardMetrics(cached.metricas);

          // Fetch updated title
          try {
            const dealData = await fetchDeal(dealId, pipedriveToken);
            if (dealData.data?.title) {
              setDealTitle(dealData.data.title);
              if (cached.deal_title !== dealData.data.title) {
                await updateCacheTitle(dealId, dealData.data.title);
              }
            }
          } catch {
            setDealTitle(cached.deal_title || '');
          }

          setLastUpdate(formatUpdateDate(cached.atualizado_em));
          setStatus('idle');
          showToast?.('⚡ Análise carregada do cache!');
          return null; // null = loaded from cache, no need to analyze
        }
      }

      // Fetch fresh data
      setProcessingStep(2);
      const [dealData, participantsData, usersMap] = await Promise.all([
        fetchDeal(dealId, pipedriveToken),
        fetchParticipants(dealId, pipedriveToken),
        fetchUsersMap(pipedriveToken),
      ]);

      setProcessingStep(3);
      const flowItems = await fetchFlowItems(dealId, pipedriveToken);

      setProcessingStep(4);
      const metrics = calculateHardMetrics(dealData, flowItems);
      setHardMetrics(metrics);

      // Process data intelligently
      const structuredData = processToStructured(dealData, participantsData, flowItems, usersMap, metrics);
      const compiledText = compileToText(structuredData, dealId);

      setRawExtractedData(compiledText);
      setDealTitle(dealData.data.title);

      if (participantsData.data) {
        setDetailedParticipants(participantsData.data);
      }

      return {
        compiledHistory: compiledText,
        structuredData,
        metrics,
        participants: participantsData.data,
        title: dealData.data.title,
      };
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Erro desconhecido ao ligar ao Pipedrive.');
      return null;
    }
  }, [dealId, pipedriveToken, showToast]);

  /**
   * Analyze data with Gemini AI
   */
  const analyzeWithGemini = useCallback(async (historyText, metricsObj, titleOverride, structuredData) => {
    try {
      setStatus('analyzing');
      setProcessingStep(5);

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historyText, model }),
      });

      if (!response.ok) {
        let errorMsg = 'Erro desconhecido na API Vercel';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch {
          if (response.status === 504) {
            errorMsg = 'Tempo Esgotado (504): A análise é muito complexa. Tente novamente em instantes.';
          } else {
            errorMsg = `Erro no Servidor (${response.status}).`;
          }
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      let rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const parsedData = JSON.parse(rawText.trim());

      // Map evaluation fields
      if (parsedData.resumo || parsedData.nota || parsedData.exemplos || parsedData.pontosMelhoria) {
        parsedData.avaliacaoProspecao = {
          resumo: parsedData.resumo,
          nota: parsedData.nota,
          exemplos: parsedData.exemplos,
          pontosMelhoria: parsedData.pontosMelhoria,
        };
      }

      setAnalysis(parsedData);

      const nowString = new Date().toISOString();
      setLastUpdate(formatUpdateDate(nowString));

      // Save to Supabase
      setProcessingStep(6);
      const saveResult = await saveToCache({
        dealId,
        dealTitle: titleOverride || dealTitle,
        analysis: parsedData,
        rawText: historyText,
        structuredData: structuredData || null,
        metrics: metricsObj,
      });

      if (saveResult.success) {
        showToast?.('✅ Análise salva no banco!');
      }

      setStatus('success');
      setProcessingStep(0);
    } catch (err) {
      setStatus('error');
      setProcessingStep(0);
      setErrorMsg(err.message || 'Falha na análise da IA.');
    }
  }, [model, dealId, dealTitle, showToast]);

  /**
   * Start the full analysis process
   */
  const startAnalysis = useCallback(async () => {
    if (!pipedriveToken || !dealId) return false;

    // Reset state
    setAnalysis(null);
    setHardMetrics(null);
    setErrorMsg('');
    setRawExtractedData('');
    setDealTitle('');
    setProcessingStep(1);

    const fetchRes = await fetchPipedriveData();
    if (fetchRes) {
      await analyzeWithGemini(
        fetchRes.compiledHistory,
        fetchRes.metrics,
        fetchRes.title,
        fetchRes.structuredData
      );
    } else {
      setProcessingStep(0);
    }

    return true;
  }, [pipedriveToken, dealId, fetchPipedriveData, analyzeWithGemini]);

  /**
   * Force refresh (bypass cache)
   */
  const forceRefresh = useCallback(async () => {
    setAnalysis(null);
    setHardMetrics(null);
    setErrorMsg('');
    setRawExtractedData('');

    const fetchRes = await fetchPipedriveData(true);
    if (fetchRes) {
      await analyzeWithGemini(
        fetchRes.compiledHistory,
        fetchRes.metrics,
        fetchRes.title,
        fetchRes.structuredData
      );
    }
  }, [fetchPipedriveData, analyzeWithGemini]);

  /**
   * Load a deal from saved data (no fetch needed)
   */
  const loadFromSaved = useCallback((deal) => {
    setDealId(deal.deal_id);
    setDealTitle(deal.deal_title);
    setAnalysis(deal.analise_ia);
    setHardMetrics(deal.metricas);
    setRawExtractedData(deal.dados_brutos || '');
  }, []);

  return {
    // Config
    model, setModel,
    pipedriveToken, setPipedriveToken,
    dealId, setDealId,

    // Results
    dealTitle,
    analysis,
    hardMetrics,
    rawExtractedData,
    detailedParticipants,
    lastUpdate,

    // Status
    status,
    errorMsg,
    processingStep,

    // Actions
    startAnalysis,
    forceRefresh,
    loadFromSaved,
  };
}
