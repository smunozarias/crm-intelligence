import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Users, 
  MessageSquare, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Cpu,
  Loader2,
  Key,
  Hash,
  Database,
  Shield,
  List,
  Calendar,
  Target,
  History,
  User,
  Activity,
  Settings,
  Copy,
  Mail,
  Clock,
  Check,
  Building,
  Folder,
  Zap
} from 'lucide-react';

const GEMINI_MODEL = "gemini-2.5-flash";

const App = () => {
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('geminiKey') || "");
  const [pipedriveToken, setPipedriveToken] = useState(() => localStorage.getItem('pipedriveToken') || "");
  const [outboundTag, setOutboundTag] = useState(() => localStorage.getItem('outboundTag') || "Reunião 01");
  const [salesTag, setSalesTag] = useState(() => localStorage.getItem('salesTag') || "Reunião");
  const [dealId, setDealId] = useState("");
  const [useCorsProxy, setUseCorsProxy] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [status, setStatus] = useState("idle"); 
  const [errorMsg, setErrorMsg] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [hardMetrics, setHardMetrics] = useState(null);
  const [rawExtractedData, setRawExtractedData] = useState("");
  const [showRawData, setShowRawData] = useState(false);
  const [activeTab, setActiveTab] = useState("estrategia");
  const [toast, setToast] = useState(null);
  const [emailDraft, setEmailDraft] = useState("");

  useEffect(() => {
    localStorage.setItem('geminiKey', geminiKey);
    localStorage.setItem('pipedriveToken', pipedriveToken);
    localStorage.setItem('outboundTag', outboundTag);
    localStorage.setItem('salesTag', salesTag);
  }, [geminiKey, pipedriveToken, outboundTag, salesTag]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const copyToClipboard = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showToast("Copiado com sucesso!");
    } catch (err) {
      console.error('Erro ao copiar', err);
    }
    document.body.removeChild(textArea);
  };

  const parsePipedriveDate = (dateStr) => {
    if (!dateStr) return new Date().getTime();
    const normalized = dateStr.replace(' ', 'T') + 'Z';
    const parsedTime = new Date(normalized).getTime();
    return isNaN(parsedTime) ? new Date().getTime() : parsedTime;
  };

  const calculateHardMetrics = (dealData, flowItems) => {
    const today = new Date().getTime();
    const createdDate = parsePipedriveDate(dealData.data.add_time);
    const daysOpen = Math.floor((today - createdDate) / (1000 * 3600 * 24));

    let maxActionDate = createdDate;
    flowItems.forEach(item => {
      const itemDate = parsePipedriveDate(item.add_time);
      if (itemDate > maxActionDate) maxActionDate = itemDate;
    });
    
    const daysInactive = Math.floor((today - maxActionDate) / (1000 * 3600 * 24));
    const totalActions = flowItems.length;

    const metrics = { 
      daysOpen: Math.max(0, daysOpen), 
      daysInactive: Math.max(0, daysInactive), 
      totalActions 
    };
    setHardMetrics(metrics);
    return metrics;
  };

  const fetchPipedriveData = async () => {
    try {
      setStatus("fetching");
      setErrorMsg("");
      
      const dealUrl = `https://api.pipedrive.com/v1/deals/${dealId}?api_token=${pipedriveToken}`;
      const fetchDealUrl = useCorsProxy ? `https://corsproxy.io/?${encodeURIComponent(dealUrl)}` : dealUrl;

      const participantsUrl = `https://api.pipedrive.com/v1/deals/${dealId}/participants?api_token=${pipedriveToken}`;
      const fetchParticipantsUrl = useCorsProxy ? `https://corsproxy.io/?${encodeURIComponent(participantsUrl)}` : participantsUrl;

      const dealRes = await fetch(fetchDealUrl, { method: 'GET', headers: { 'Accept': 'application/json' } });
      const participantsRes = await fetch(fetchParticipantsUrl, { method: 'GET', headers: { 'Accept': 'application/json' } });

      if (!dealRes.ok) throw new Error("Token Pipedrive inválido ou Deal não encontrado.");

      const dealData = await dealRes.json();
      const participantsData = await participantsRes.json();
      
      if (!dealData.success) throw new Error("Deal não encontrado.");

      let allFlowItems = [];
      let start = 0;
      let moreItems = true;
      
      while (moreItems) {
        const flowUrl = `https://api.pipedrive.com/v1/deals/${dealId}/flow?api_token=${pipedriveToken}&limit=100&start=${start}`;
        const fetchFlowUrl = useCorsProxy ? `https://corsproxy.io/?${encodeURIComponent(flowUrl)}` : flowUrl;
        
        const flowRes = await fetch(fetchFlowUrl, { method: 'GET', headers: { 'Accept': 'application/json' } });
        if (!flowRes.ok) throw new Error("Erro ao buscar histórico.");
        
        const flowData = await flowRes.json();
        if (flowData.data) allFlowItems = allFlowItems.concat(flowData.data);
        
        if (flowData.additional_data?.pagination?.more_items_in_collection) {
          start = flowData.additional_data.pagination.next_start;
        } else {
          moreItems = false;
        }
      }

      const metrics = calculateHardMetrics(dealData, allFlowItems);

      let compiledHistory = `--- DADOS DO NEGÓCIO E MÉTRICAS EXATAS ---\n`;
      compiledHistory += `ID do Negócio: ${dealId}\n`;
      compiledHistory += `Título: ${dealData.data.title}\n`;
      compiledHistory += `Dias no Funil (Aberto há): ${metrics.daysOpen} dias\n`;
      compiledHistory += `Dias Inativo (Sem interação): ${metrics.daysInactive} dias\n`;
      compiledHistory += `Total de Interações Registradas: ${metrics.totalActions}\n\n`;

      compiledHistory += `--- PARTICIPANTES VINCULADOS ---\n`;
      if (participantsData.data && participantsData.data.length > 0) {
        participantsData.data.forEach(p => {
          const emails = p.person_id?.email?.map(e => e.value).join(', ') || '';
          compiledHistory += `- Nome: ${p.person_id?.name} | Email: ${emails}\n`;
        });
      }
      compiledHistory += `\n--- HISTÓRICO DE ATIVIDADES ---\n`;
      
      allFlowItems.forEach(item => {
        let dateStr = "Data desconhecida";
        try { dateStr = new Date(parsePipedriveDate(item.add_time)).toLocaleDateString('pt-PT'); } catch(e) {}
        
        if (item.object === 'note') {
          const cleanNote = typeof item.data?.content === 'string' ? item.data.content.replace(/<[^>]*>?/gm, '') : '';
          compiledHistory += `[${dateStr}] NOTA: ${cleanNote}\n`;
        } 
        else if (item.object === 'activity') {
          compiledHistory += `[${dateStr}] ATIVIDADE | Tipo: [${item.data?.type}] | Assunto: [${item.data?.subject}] | Estado: ${item.data?.done ? 'Concluída' : 'Pendente'}\n`;
          if (typeof item.data?.note === 'string') {
            const cleanActNote = item.data.note.replace(/<[^>]*>?/gm, '');
            compiledHistory += `   Detalhes: ${cleanActNote}\n`;
          }
        }
        else if (item.object === 'mailThread' || item.object === 'mailMessage') {
          compiledHistory += `[${dateStr}] E-MAIL: Assunto: ${item.data?.subject}\n`;
          if (item.data?.snippet) compiledHistory += `   Resumo: ${item.data.snippet}\n`;
        }
      });

      setRawExtractedData(compiledHistory);
      return compiledHistory;

    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || "Erro desconhecido ao ligar ao Pipedrive.");
      return null;
    }
  };

  const analyzeWithGemini = async (historyText) => {
    try {
      setStatus("analyzing");
      
      const systemPrompt = `
      És um especialista em Operações de Vendas (SalesOps) e analista de CRM de topo.
      A tua tarefa é analisar o histórico bruto extraído via API de um negócio e extrair métricas de Estratégia e Qualidade.
      
      CONTEXTO CRÍTICO (LEIA COM ATENÇÃO):
      O sistema calculou os dias exatos de estagnação. Se existirem muitas interações recentes nas notas ou atividades, o negócio ESTÁ QUENTE E ATIVO.
      
      ANÁLISE ESTRATÉGICA:
      1. PERSONAS ENVOLVIDAS: Nome, cargo e nível de engajamento real.
      2. PONTOS DE DOR (PAIN POINTS): O que o cliente quer resolver.
      3. OBJEÇÕES: Barreiras ativas (não resolvidas).
      4. RESUMO EXECUTIVO: Resumo claro do momento atual do deal.
      5. SENTIMENTO: Apenas responde "Positivo", "Neutro" ou "Negativo".
      6. PRÓXIMOS PASSOS SUGERIDOS (ESTRATÉGICOS): Ações práticas para a equipe fechar o negócio. IGNORE tarefas operacionais/checklists padrão.
      7. SCORE (0 a 100): Se existe contato recente, negociação ou aprovação, o score NUNCA deve ser baixo.
      
      AUDITORIA DE QUALIDADE DE CRM E PROCESSOS:
      8. REGRA DE HIGIENE SUPREMA: Colar todo o histórico de conversas do WhatsApp nas notas é o procedimento PADRÃO E CORRETO. NUNCA aponte como erro.
      9. ERROS DE ORTOGRAFIA: Foca-te só nas notas do próprio vendedor.
      10. OBJEÇÕES MAL CONTORNADAS: Objeções ignoradas.
      11. REGRA DA PERSONA: A pessoa principal do card é quem está ativamente envolvida nas notas?
      12. CONTAGEM ESTRITA DE REUNIÕES: Conta APENAS pelo "Tipo: [...]". Outbound = "[${outboundTag}]". Vendas = "[${salesTag}]".
      
      INTELIGÊNCIA DE PARTICIPANTES & PROSPECÇÃO:
      13. ALERTA STAKEHOLDER: Procura menções a "stakeholder", defensor ou influenciador favorável à Branddi.
      14. EMPRESA VS AGÊNCIA: Separa a equipe final do cliente (empresa) das agências de marketing.
      15. HISTÓRICO DE REUNIÕES ESTAGNADAS: Liste reuniões passadas específicas que aconteceram, mas não geraram avanço. Extraia Data, Participantes e o Motivo.
      `;

      const responseSchema = {
        type: "OBJECT",
        properties: {
          personas: { type: "ARRAY", items: { type: "OBJECT", properties: { nome: { type: "STRING" }, cargo: { type: "STRING" }, engajamento: { type: "STRING" } } } },
          dores: { type: "ARRAY", items: { type: "STRING" } },
          objecoes: { type: "ARRAY", items: { type: "STRING" } },
          resumo: { type: "STRING" },
          sentimento: { type: "STRING" },
          score: { type: "INTEGER" },
          proximosPassos: { type: "ARRAY", items: { type: "STRING" } },
          errosOrtografia: { type: "ARRAY", items: { type: "STRING" } },
          objecoesMalContornadas: { type: "ARRAY", items: { type: "OBJECT", properties: { objecao: { type: "STRING" }, motivo: { type: "STRING" } } } },
          regraPersonaCumprida: { type: "BOOLEAN" },
          justificativaRegraPersona: { type: "STRING" },
          reunioesOutbound: { type: "INTEGER" },
          reunioesVendas: { type: "INTEGER" },
          falhasPreenchimento: { type: "ARRAY", items: { type: "STRING" } },
          prospeccao: {
            type: "OBJECT",
            properties: {
              ultimaPessoaEngajada: { type: "OBJECT", properties: { nome: { type: "STRING" }, contexto: { type: "STRING" } } },
              motivoNaoEvolucao: { type: "STRING" },
              negativasFortes: { type: "ARRAY", items: { type: "OBJECT", properties: { nome: { type: "STRING" }, motivo: { type: "STRING" } } } },
              mapeamentoConta: { type: "ARRAY", items: { type: "OBJECT", properties: { area: { type: "STRING" }, pessoas: { type: "ARRAY", items: { type: "STRING" } } } } },
              historicoReunioesEstagnadas: { type: "ARRAY", items: { type: "OBJECT", properties: { data: { type: "STRING" }, participantes: { type: "STRING" }, motivo: { type: "STRING" } } } }
            }
          },
          participantesMapa: {
            type: "OBJECT",
            properties: {
              alertaStakeholder: { type: "OBJECT", properties: { existe: { type: "BOOLEAN" }, contexto: { type: "STRING" } } },
              removerDoCard: { type: "ARRAY", items: { type: "OBJECT", properties: { nome: { type: "STRING" }, motivo: { type: "STRING" } } } },
              equipeEmpresa: { type: "ARRAY", items: { type: "OBJECT", properties: { nome: { type: "STRING" }, email: { type: "STRING" }, cargoInferido: { type: "STRING" } } } },
              equipeAgencia: { type: "ARRAY", items: { type: "OBJECT", properties: { nome: { type: "STRING" }, email: { type: "STRING" }, nomeAgencia: { type: "STRING" } } } }
            }
          }
        },
        required: ["personas", "dores", "objecoes", "resumo", "sentimento", "score", "proximosPassos", "prospeccao", "participantesMapa"]
      };

      let retryCount = 0;
      const delays = [1000, 2000, 4000];
      let result;

      const activeApiKey = geminiKey.trim();

      while (retryCount < 3) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${activeApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `Analisa este histórico do CRM:\n\n${historyText}` }] }],
              systemInstruction: { parts: [{ text: systemPrompt }] },
              generationConfig: { 
                responseMimeType: "application/json",
                responseSchema: responseSchema
              }
            })
          });

          if (!response.ok) {
            throw new Error("Chave Gemini inválida. Por favor, verifique a sua chave no Google AI Studio.");
          }
          
          result = await response.json();
          break;
        } catch (e) {
          if (retryCount === 2) throw e;
          await new Promise(r => setTimeout(r, delays[retryCount]));
          retryCount++;
        }
      }

      let rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      
      let parsedData;
      try {
         parsedData = JSON.parse(rawText);
      } catch (e) {
         throw new Error("A IA gerou um formato de dados inválido.");
      }

      setAnalysis(parsedData);
      setEmailDraft("");
      setStatus("success");

    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMsg(err.message || "Falha na IA. Verifique a sua chave API do Gemini.");
    }
  };

  const handleStartProcess = async () => {
    if (!pipedriveToken || !dealId || !geminiKey) {
      setStatus("error");
      setErrorMsg("Preencha a Chave do Gemini, a Chave do Pipedrive e o ID do Negócio.");
      return;
    }
    const historyData = await fetchPipedriveData();
    if (historyData) {
      await analyzeWithGemini(historyData);
    }
  };

  const safeArray = (arr) => Array.isArray(arr) ? arr : [];
  const safeObj = (obj) => typeof obj === 'object' && obj !== null ? obj : {};

  const generateCRMSummary = () => {
    const text = `🤖 **Resumo Gerado por IA (Deal Intel)**\n\n📋 **Estado Atual:**\n${analysis?.resumo || ''}\n\n🎯 **Principais Dores:**\n${safeArray(analysis?.dores).map(d => `• ${d}`).join('\n')}\n\n🚧 **Objeções Identificadas:**\n${safeArray(analysis?.objecoes).map(o => `• ${o}`).join('\n')}\n\n✅ **Próximos Passos Sugeridos:**\n${safeArray(analysis?.proximosPassos).map((p, i) => `${i+1}. ${p}`).join('\n')}\n`;
    copyToClipboard(text);
  };

  const handleGenerateEmail = () => {
    const prospeccao = safeObj(analysis?.prospeccao);
    const pessoa = prospeccao?.ultimaPessoaEngajada?.nome || "Nome";
    const trava = prospeccao?.motivoNaoEvolucao || "algumas prioridades da época";
    
    const draft = `Assunto: Retomada de contato - Branddi\n\nOlá ${pessoa.split(' ')[0]}, tudo bem?\n\nEstou entrando em contato pois na nossa última interação, o avanço do projeto acabou pausando devido a ${trava.toLowerCase()}.\n\nGostaria de entender se esse cenário mudou na empresa e se faz sentido retomarmos nossa conversa para proteger a marca de vocês.\n\nFico à disposição para um papo rápido de 15 minutos na próxima semana.\n\nUm abraço,`;
    
    setEmailDraft(draft);
    copyToClipboard(draft);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8 font-sans relative">
      
      {toast && (
        <div className="fixed top-4 right-4 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 z-50">
          <Check className="w-5 h-5 text-emerald-400" />
          <span className="font-medium text-sm">{toast}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 border-b pb-6 border-slate-200 gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-3 rounded-xl shadow-sm">
              <Database className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-800">Deal Intel <span className="text-emerald-600">Enterprise</span></h1>
              <p className="text-slate-500 text-sm">Operações de Vendas & Qualidade de CRM</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
                <Settings className="w-5 h-5 text-emerald-600" />
                Configurações & Chaves
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Sua API Gemini Pessoal <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 transition-all text-sm bg-slate-50"
                    placeholder="AIzaSy..."
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Crie a sua gratuitamente no Google AI Studio.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 mt-4">
                    Sua API Pipedrive <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 transition-all text-sm bg-slate-50"
                    placeholder="Token do CRM..."
                    value={pipedriveToken}
                    onChange={(e) => setPipedriveToken(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 mt-4 text-emerald-700">ID do Negócio a Analisar</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-2.5 w-4 h-4 text-emerald-600" />
                    <input
                      type="text"
                      className="w-full p-2.5 pl-9 rounded-lg border-2 border-emerald-200 focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-slate-800"
                      placeholder="Ex: 1245"
                      value={dealId}
                      onChange={(e) => setDealId(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>

                <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden">
                  <button 
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full bg-slate-50 p-3 text-xs font-bold text-slate-600 flex justify-between items-center hover:bg-slate-100 transition-colors"
                  >
                    Parâmetros de Contagem (Tags)
                    <span>{showAdvanced ? 'Ocultar' : 'Mostrar'}</span>
                  </button>
                  {showAdvanced && (
                    <div className="p-4 bg-white space-y-3 text-sm border-t border-slate-200">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Filtro para Reunião Outbound</label>
                        <input type="text" value={outboundTag} onChange={e => setOutboundTag(e.target.value)} className="w-full p-1.5 border rounded border-slate-300" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Filtro para Reunião de Vendas</label>
                        <input type="text" value={salesTag} onChange={e => setSalesTag(e.target.value)} className="w-full p-1.5 border rounded border-slate-300" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="mt-1 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                      checked={useCorsProxy}
                      onChange={(e) => setUseCorsProxy(e.target.checked)}
                    />
                    <div>
                      <span className="text-sm font-medium text-slate-700 block">Usar CORS Proxy</span>
                      <span className="text-[11px] text-slate-500 block leading-tight mt-1">Evita bloqueios de navegador.</span>
                    </div>
                  </label>
                </div>

                <button
                  onClick={handleStartProcess}
                  disabled={status === "fetching" || status === "analyzing" || !pipedriveToken || !dealId || !geminiKey}
                  className="w-full mt-6 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-medium py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  {status === "fetching" ? <><Loader2 className="w-5 h-5 animate-spin" /> Extraindo...</> : 
                   status === "analyzing" ? <><Cpu className="w-5 h-5 animate-pulse text-emerald-400" /> Analisando IA...</> : 
                   <><Database className="w-5 h-5" /> Iniciar Inteligência</>}
                </button>
              </div>
            </div>
            
            <p className="text-[10px] text-center text-slate-400 px-4">As credenciais são guardadas localmente no seu navegador. Nenhuma chave é enviada para servidores de terceiros além da Google e Pipedrive.</p>
          </div>

          <div className="lg:col-span-8">
            
            {status === "idle" && (
              <div className="h-full min-h-[500px] flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-3xl p-12 text-center bg-white/50">
                <Shield className="w-16 h-16 mb-4 text-slate-300" />
                <h3 className="text-lg font-medium text-slate-700 mb-2">Deal Intel Enterprise</h3>
                <p className="text-sm text-slate-500 max-w-sm">
                  Adicione sua chave pessoal do Gemini e do Pipedrive para carregar o Dashboard completo.
                </p>
              </div>
            )}

            {status === "error" && (
              <div className="bg-red-50 border border-red-200 p-6 rounded-2xl text-red-700 flex flex-col items-center text-center">
                <AlertCircle className="w-12 h-12 mb-3 text-red-400" />
                <h3 className="font-bold text-lg mb-1">Aviso do Sistema</h3>
                <p className="text-sm opacity-90">{errorMsg}</p>
              </div>
            )}

            {(status === "fetching" || status === "analyzing") && (
              <div className="h-full min-h-[500px] flex flex-col items-center justify-center rounded-3xl p-12 text-center bg-white shadow-sm border border-slate-100">
                <div className="relative w-24 h-24 mb-8">
                  <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                  <div className={`absolute inset-0 border-4 ${status === 'fetching' ? 'border-blue-500' : 'border-emerald-500'} rounded-full border-t-transparent animate-spin`}></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    {status === 'fetching' ? <Database className="text-blue-500 w-8 h-8" /> : <Cpu className="text-emerald-500 w-8 h-8" />}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">
                  {status === "fetching" ? "A extrair linha do tempo do Pipedrive..." : "Aplicando IA sob Regras Estritas..."}
                </h3>
              </div>
            )}

            {status === "success" && analysis && (
              <div className="space-y-6">
                
                {hardMetrics && (
                  <div className="bg-slate-900 rounded-2xl p-4 flex flex-wrap gap-6 items-center justify-between text-white shadow-md">
                    <div className="flex items-center gap-4">
                      <Clock className="w-8 h-8 text-emerald-400 opacity-80" />
                      <div>
                        <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Tempo de Vida</p>
                        <p className="text-lg font-semibold">{hardMetrics.daysOpen} dias aberto</p>
                      </div>
                    </div>
                    <div className="h-8 w-px bg-slate-700 hidden sm:block"></div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Estagnação (Métrica Real)</p>
                      <p className={`text-lg font-semibold ${hardMetrics.daysInactive > 14 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {hardMetrics.daysInactive === 0 ? 'Ação Hoje' : `${hardMetrics.daysInactive} dias sem interação`}
                      </p>
                    </div>
                    <div className="h-8 w-px bg-slate-700 hidden sm:block"></div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Volume</p>
                      <p className="text-lg font-semibold">{hardMetrics.totalActions} atividades registradas</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap border-b border-slate-200 mb-6 gap-x-6 gap-y-3">
                  <button onClick={() => setActiveTab('estrategia')} className={`pb-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'estrategia' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    <TrendingUp className="w-4 h-4" /> Estratégia Acionável
                  </button>
                  <button onClick={() => setActiveTab('qualidade')} className={`pb-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'qualidade' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    <List className="w-4 h-4" /> Qualidade CRM
                  </button>
                  <button onClick={() => setActiveTab('prospeccao')} className={`pb-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'prospeccao' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    <Target className="w-4 h-4" /> Prospecção & Resgate
                  </button>
                  <button onClick={() => setActiveTab('participantes')} className={`pb-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'participantes' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    <Users className="w-4 h-4" /> Participantes
                  </button>
                </div>

                {activeTab === 'estrategia' && (
                  <div className="space-y-6">
                    <div className="flex justify-end">
                      <button 
                        onClick={generateCRMSummary}
                        className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-semibold py-2 px-4 rounded-lg flex items-center gap-2 text-sm transition-colors"
                      >
                        <Copy className="w-4 h-4" /> Copiar Resumo para o CRM
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Prob. de Fecho</p>
                        <span className="text-4xl font-black text-slate-800">{analysis?.score || 0}%</span>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center min-w-0 overflow-hidden">
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2 truncate">Sentimento Global</p>
                        <span className={`text-2xl font-bold capitalize truncate block w-full ${String(analysis?.sentimento).toLowerCase().includes('positivo') ? 'text-emerald-600' : String(analysis?.sentimento).toLowerCase().includes('negativo') ? 'text-rose-600' : 'text-amber-500'}`}>
                          {analysis?.sentimento || "Neutro"}
                        </span>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Intervenientes</p>
                        <span className="text-2xl font-bold text-slate-800">{safeArray(analysis?.personas).length}</span>
                      </div>
                    </div>

                    <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-10"></div>
                      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-lg">
                        <MessageSquare className="w-5 h-5 text-emerald-600" /> Resumo Executivo
                      </h3>
                      <div className="text-slate-600 leading-relaxed text-sm whitespace-pre-line">
                        {analysis?.resumo || "Resumo não disponível."}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><AlertCircle className="w-5 h-5 text-amber-500" /> Dores Principais</h3>
                        <ul className="space-y-3">
                          {safeArray(analysis?.dores).map((d, i) => (
                            <li key={i} className="text-sm text-slate-600 flex gap-3 items-start bg-amber-50/50 p-2 rounded-lg">
                              <span className="text-amber-500 mt-0.5">•</span> {d}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-rose-500" /> Objeções Ativas</h3>
                        <ul className="space-y-3">
                          {safeArray(analysis?.objecoes).map((o, i) => (
                            <li key={i} className="text-sm text-slate-600 flex gap-3 items-start bg-rose-50/50 p-2 rounded-lg">
                              <span className="text-rose-500 mt-0.5">•</span> {o}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="bg-emerald-900 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
                      <h3 className="font-bold mb-6 flex items-center gap-3 text-xl relative z-10">
                        <CheckCircle className="w-6 h-6 text-emerald-400" /> Plano de Ação Estratégico
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                        {safeArray(analysis?.proximosPassos).map((step, i) => (
                          <div key={i} className="flex gap-4 items-start bg-white/10 p-4 rounded-xl border border-white/20">
                            <span className="bg-emerald-500 text-white font-bold rounded-lg w-8 h-8 flex items-center justify-center flex-shrink-0">{i + 1}</span>
                            <p className="text-sm text-slate-100 leading-relaxed mt-1">{step}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'qualidade' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600"><Activity className="w-6 h-6" /></div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Reuniões Outbound</p>
                          <p className="text-3xl font-black text-slate-800">{analysis?.reunioesOutbound || 0}</p>
                        </div>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600"><Calendar className="w-6 h-6" /></div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Reuniões de Vendas</p>
                          <p className="text-3xl font-black text-slate-800">{analysis?.reunioesVendas || 0}</p>
                        </div>
                      </div>
                    </div>

                    <div className={`p-6 rounded-2xl border shadow-sm ${analysis?.regraPersonaCumprida ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                      <h3 className={`font-bold mb-2 flex items-center gap-2 ${analysis?.regraPersonaCumprida ? 'text-emerald-800' : 'text-rose-800'}`}>
                        {analysis?.regraPersonaCumprida ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        Auditoria: Regra da Persona Principal
                      </h3>
                      <p className={`text-sm ${analysis?.regraPersonaCumprida ? 'text-emerald-700' : 'text-rose-700'}`}>{analysis?.justificativaRegraPersona}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><AlertCircle className="w-5 h-5 text-rose-500" /> Objeções Mal Contornadas</h3>
                        {safeArray(analysis?.objecoesMalContornadas).length > 0 ? (
                          <div className="space-y-4">
                            {safeArray(analysis?.objecoesMalContornadas).map((item, i) => (
                              <div key={i} className="bg-rose-50 p-3 rounded-xl border border-rose-100">
                                <p className="text-sm font-semibold text-rose-900 mb-1">"{item.objecao}"</p>
                                <p className="text-xs text-rose-700"><span className="font-bold">Falha:</span> {item.motivo}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500 italic">Nenhuma falha grave encontrada nas respostas.</p>
                        )}
                      </div>

                      <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><AlertCircle className="w-5 h-5 text-amber-500" /> Falhas de Preenchimento</h3>
                          {safeArray(analysis?.falhasPreenchimento).length > 0 ? (
                            <ul className="space-y-2">
                              {safeArray(analysis?.falhasPreenchimento).map((falha, i) => (
                                <li key={i} className="text-sm text-slate-600 flex gap-2"><span className="text-amber-500">•</span> {falha}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-slate-500 italic">Preenchimento adequado.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'prospeccao' && safeObj(analysis?.prospeccao) && (
                  <div className="space-y-6">
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 shadow-sm">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                        <div>
                          <h3 className="font-bold text-blue-900 flex items-center gap-2 text-lg">
                            <Mail className="w-5 h-5" /> Ação de Resgate
                          </h3>
                          <p className="text-sm text-blue-700">A IA gera um template para colar no email ou WhatsApp baseada na última trava.</p>
                        </div>
                        <button 
                          onClick={handleGenerateEmail}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 text-sm shadow-md transition-all"
                        >
                          <Cpu className="w-4 h-4" /> Gerar Rascunho
                        </button>
                      </div>
                      
                      {emailDraft && (
                        <div className="mt-4">
                          <textarea 
                            readOnly 
                            value={emailDraft}
                            className="w-full h-48 p-4 bg-white border border-blue-200 rounded-xl text-sm font-mono text-slate-700 focus:outline-none resize-none"
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><User className="w-5 h-5 text-indigo-500" /> Última Pessoa Engajada</h3>
                        {analysis?.prospeccao?.ultimaPessoaEngajada?.nome ? (
                          <div>
                            <p className="text-lg font-bold text-indigo-900 mb-2">{analysis.prospeccao.ultimaPessoaEngajada.nome}</p>
                            <p className="text-sm text-slate-600 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100">
                              <span className="font-semibold block mb-1 text-indigo-800">Contexto:</span> {analysis.prospeccao.ultimaPessoaEngajada.contexto}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500 italic">Nenhum engajamento recente detectado.</p>
                        )}
                      </div>

                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><AlertCircle className="w-5 h-5 text-amber-500" /> Motivo Geral de Não Evolução</h3>
                        {analysis?.prospeccao?.motivoNaoEvolucao ? (
                          <div className="bg-amber-50 p-4 rounded-xl border border-amber-100"><p className="text-sm text-amber-900">{analysis.prospeccao.motivoNaoEvolucao}</p></div>
                        ) : (
                          <p className="text-sm text-slate-500 italic">Nenhum congelamento aparente.</p>
                        )}
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><History className="w-5 h-5 text-slate-600" /> Reuniões Passadas Sem Avanço</h3>
                      {safeArray(analysis?.prospeccao?.historicoReunioesEstagnadas).length > 0 ? (
                        <div className="space-y-4">
                          {safeArray(analysis.prospeccao.historicoReunioesEstagnadas).map((reuniao, i) => (
                            <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative">
                              <div className="absolute top-4 right-4 bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                                Não avançou
                              </div>
                              <p className="font-bold text-slate-800 text-sm mb-2 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-400" /> {reuniao.data}
                              </p>
                              <p className="text-xs text-slate-600 mb-2 flex items-start gap-2">
                                <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                <span><span className="font-semibold">Participantes:</span> {reuniao.participantes}</span>
                              </p>
                              <p className="text-sm text-rose-700 bg-rose-50 p-3 rounded-lg border border-rose-100 mt-2">
                                <span className="font-semibold text-rose-900 block mb-1">Motivo da Trava:</span> 
                                {reuniao.motivo}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 italic">Não foram encontradas reuniões específicas no histórico que tenham estagnado.</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-rose-50 p-6 rounded-2xl border border-rose-200 shadow-sm">
                        <h3 className="font-bold text-rose-900 mb-4 flex items-center gap-2"><AlertCircle className="w-5 h-5 text-rose-600" /> Zonas de Perigo</h3>
                        {safeArray(analysis?.prospeccao?.negativasFortes).length > 0 ? (
                          <div className="space-y-3">
                            {safeArray(analysis.prospeccao.negativasFortes).map((item, i) => (
                              <div key={i} className="bg-white p-3 rounded-xl border border-rose-100 shadow-sm">
                                <p className="font-bold text-rose-800 text-sm mb-1">{item.nome}</p>
                                <p className="text-xs text-rose-600">{item.motivo}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-emerald-700 font-medium">Conta segura, sem negativas graves.</p>
                        )}
                      </div>

                      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm text-white">
                        <h3 className="font-bold text-white mb-5 flex items-center gap-2"><Target className="w-5 h-5 text-emerald-400" /> Mapeamento da Conta</h3>
                        {safeArray(analysis?.prospeccao?.mapeamentoConta).length > 0 ? (
                          <div className="space-y-4">
                            {safeArray(analysis.prospeccao.mapeamentoConta).map((area, i) => (
                              <div key={i} className="border-l-2 border-emerald-500 pl-4">
                                <p className="text-sm font-bold text-emerald-300 uppercase tracking-wider mb-2">{area.area}</p>
                                <div className="flex flex-wrap gap-2">
                                  {safeArray(area.pessoas).map((pessoa, j) => (
                                    <span key={j} className="bg-slate-800 border border-slate-700 text-slate-200 text-xs px-2.5 py-1 rounded-full">{pessoa}</span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400 italic">Sem mapeamento suficiente.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'participantes' && safeObj(analysis?.participantesMapa) && (
                  <div className="space-y-6">
                    
                    {analysis?.participantesMapa?.alertaStakeholder?.existe && (
                      <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-6 rounded-2xl shadow-lg text-white flex items-start gap-4">
                        <AlertCircle className="w-10 h-10 flex-shrink-0 text-amber-100" />
                        <div>
                          <h3 className="text-xl font-bold mb-2">ALERTA DE STAKEHOLDER IDENTIFICADO!</h3>
                          <p className="mt-3 text-sm bg-black/20 p-3 rounded-lg border border-white/10"><span className="font-bold">Contexto:</span> {analysis.participantesMapa.alertaStakeholder.contexto}</p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Building className="w-5 h-5 text-indigo-500" /> Equipe Interna (Cliente)</h3>
                        {safeArray(analysis?.participantesMapa?.equipeEmpresa).length > 0 ? (
                          <div className="space-y-3">
                            {safeArray(analysis.participantesMapa.equipeEmpresa).map((p, i) => (
                              <div key={i} className="flex flex-col p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="font-bold text-slate-800 text-sm">{p.nome}</p>
                                <p className="text-xs text-slate-500 font-mono mt-1">{p.email || "Sem email"}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500 italic">Nenhum participante identificado.</p>
                        )}
                      </div>

                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Folder className="w-5 h-5 text-emerald-500" /> Agências / Terceiros</h3>
                        {safeArray(analysis?.participantesMapa?.equipeAgencia).length > 0 ? (
                          <div className="space-y-3">
                            {safeArray(analysis.participantesMapa.equipeAgencia).map((p, i) => (
                              <div key={i} className="flex flex-col p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="flex justify-between">
                                  <p className="font-bold text-slate-800 text-sm">{p.nome}</p>
                                  <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{p.nomeAgencia}</span>
                                </div>
                                <p className="text-xs text-slate-500 font-mono mt-1">{p.email || "Sem email"}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500 italic">Nenhuma agência identificada.</p>
                        )}
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-rose-200 shadow-sm">
                      <h3 className="font-bold text-rose-800 mb-4 flex items-center gap-2"><User className="w-5 h-5 text-rose-500" /> A Remover do Card</h3>
                      {safeArray(analysis?.participantesMapa?.removerDoCard).length > 0 ? (
                        <div className="space-y-3">
                          {safeArray(analysis.participantesMapa.removerDoCard).map((p, i) => (
                            <div key={i} className="flex items-start gap-3 bg-rose-50 p-3 rounded-xl border border-rose-100">
                              <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="font-bold text-rose-900 text-sm">{p.nome}</p>
                                <p className="text-xs text-rose-700 mt-1"><span className="font-semibold">Motivo:</span> {p.motivo}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-emerald-600 bg-emerald-50 p-3 rounded-lg">Todos parecem ativos.</p>
                      )}
                    </div>

                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
