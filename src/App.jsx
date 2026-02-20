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
  Zap,
  LayoutDashboard,
  LogOut,
  Bell,
  Menu,
  ChevronRight,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { supabase } from './lib/supabase';


const App = () => {
  // Authentication State
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // 1. CONFIGURATION STATES
  const [model, setModel] = useState(() => localStorage.getItem('geminiModel') || "gemini-2.5-flash");
  const [pipedriveToken, setPipedriveToken] = useState(() => localStorage.getItem('pipedriveToken') || "");
  const [outboundTag, setOutboundTag] = useState(() => localStorage.getItem('outboundTag') || "Reunião 01");
  const [salesTag, setSalesTag] = useState(() => localStorage.getItem('salesTag') || "Reunião");
  const [dealId, setDealId] = useState("");
  const [dealTitle, setDealTitle] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [hardMetrics, setHardMetrics] = useState(null);
  const [rawExtractedData, setRawExtractedData] = useState("");
  const [activeTab, setActiveTab] = useState("config"); // Default to config
  const [toast, setToast] = useState(null);

  // Save credentials to LocalStorage
  useEffect(() => {
    localStorage.setItem('geminiModel', model);
    localStorage.setItem('pipedriveToken', pipedriveToken);
    localStorage.setItem('outboundTag', outboundTag);
    localStorage.setItem('salesTag', salesTag);
  }, [model, pipedriveToken, outboundTag, salesTag]);

  // Handle Supabase Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
      if (error) throw error;
    } catch (error) {
      showToast("Erro ao fazer login. Verifique as credenciais do Supabase.");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

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

    const totalActions = flowItems.filter(item => {
      if (item.object === 'mailThread' || item.object === 'mailMessage') return true;
      if (item.object === 'activity') {
        const t = (item.data?.type || '').toLowerCase();
        return ['call', 'email', 'meeting', 'task', 'linkedin', 'whatsapp', 'ligação'].some(k => t.includes(k));
      }
      return false;
    }).length;

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

      const dealUrl = `/api/pipedrive/deals/${dealId}?api_token=${pipedriveToken}`;
      const participantsUrl = `/api/pipedrive/deals/${dealId}/participants?api_token=${pipedriveToken}`;

      const dealRes = await fetch(dealUrl, { method: 'GET', headers: { 'Accept': 'application/json' } });

      if (!dealRes.ok) {
        const errorText = await dealRes.text();
        throw new Error(`Erro na API (${dealRes.status}): ${dealRes.status === 401 ? "Token inválido" : "Negócio não encontrado"}. Detalhes: ${errorText.substring(0, 50)}`);
      }

      const participantsRes = await fetch(participantsUrl, { method: 'GET', headers: { 'Accept': 'application/json' } });

      const dealData = await dealRes.json();
      const participantsData = participantsRes.ok ? await participantsRes.json() : { success: false, data: [] };

      if (!dealData.success) throw new Error("A API do Pipedrive retornou sucesso=false para este Deal.");

      let allFlowItems = [];
      let start = 0;
      let moreItems = true;

      while (moreItems) {
        const flowUrl = `/api/pipedrive/deals/${dealId}/flow?api_token=${pipedriveToken}&limit=100&start=${start}`;
        const flowRes = await fetch(flowUrl, { method: 'GET', headers: { 'Accept': 'application/json' } });
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
        try { dateStr = new Date(parsePipedriveDate(item.add_time)).toLocaleDateString('pt-PT'); } catch (e) { }

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
      setDealTitle(dealData.data.title);
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

      const response = await fetch(`/api/gemini`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historyText, model })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro desconhecido na API Vercel");
      }

      const result = await response.json();
      let rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const parsedData = JSON.parse(rawText.trim());

      setAnalysis(parsedData);
      setActiveTab("dashboard");
      setStatus("success");

    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || "Falha na análise da IA.");
    }
  };

  const handleStartProcess = async () => {
    if (!pipedriveToken || !dealId) {
      setActiveTab("config");
      showToast("Preencha as configurações do Pipedrive primeiro!");
      return;
    }
    const historyData = await fetchPipedriveData();
    if (historyData) await analyzeWithGemini(historyData);
  };

  const copyInsight = () => {
    if (!analysis) return;
    const text = `🔹 Resumo Executivo:\n${analysis.resumo}\n\n🔹 Principais Dores:\n${analysis.dores.join(', ')}\n\n🔹 Objeções ativas:\n${analysis.objecoes.join(', ')}\n\n🔹 Próximos Passos:\n${analysis.proximosPassos.join('\n')}`;
    copyToClipboard(text);
  };

  // UI HELPERS
  const SidebarIcon = ({ icon: Icon, label, id, active, onClick }) => (
    <div
      onClick={() => onClick(id)}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${active ? 'bg-branddi-cyan text-branddi-navy font-bold' : 'text-slate-400 hover:bg-slate-800'}`}
    >
      <Icon size={20} />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );

  const SectionTitle = ({ title, subtitle }) => (
    <div className="mb-6 fade-in">
      <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h1>
      <p className="text-slate-500 text-sm mt-1">{subtitle}</p>
    </div>
  );

  if (authLoading) {
    return (
      <div className="flex h-screen w-screen bg-slate-50 items-center justify-center">
        <Loader2 className="animate-spin text-branddi-cyan" size={40} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen w-screen bg-slate-50 items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 text-center border border-slate-100">
          <div className="w-16 h-16 bg-branddi-cyan/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Zap size={32} className="text-branddi-cyan" fill="#001D2E" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">CRM Intelligence</h1>
          <p className="text-slate-500 text-sm mt-2 mb-8">Faça login com a sua conta corporativa para acessar a inteligência de vendas da Branddi.</p>

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm group"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="group-hover:text-slate-900">Continuar com Google</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-64 bg-branddi-navy border-r border-slate-800 flex flex-col z-20 text-white">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-branddi-cyan rounded-xl flex items-center justify-center text-branddi-navy shadow-lg shadow-branddi-cyan/20">
            <Zap size={24} fill="#001D2E" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-white leading-tight">Pipedrive</span>
            <span className="text-[10px] font-bold text-branddi-cyan uppercase tracking-tight">Intelligence Branddi</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-4 mb-2">Principal</p>
          <SidebarIcon icon={Settings} label="Configurações" id="config" active={activeTab === 'config'} onClick={setActiveTab} />

          <div className={`pt-4 ${!analysis ? 'opacity-40 pointer-events-none' : ''}`}>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-4 mb-2">Relatórios IA</p>
            <SidebarIcon icon={LayoutDashboard} label="Dashboard" id="dashboard" active={activeTab === 'dashboard'} onClick={setActiveTab} />
            <SidebarIcon icon={Target} label="Inteligência" id="inteligencia" active={activeTab === 'inteligencia'} onClick={setActiveTab} />
            <SidebarIcon icon={Search} label="Prospecção" id="prospeccao" active={activeTab === 'prospeccao'} onClick={setActiveTab} />
            <SidebarIcon icon={Users} label="Participantes" id="participantes" active={activeTab === 'participantes'} onClick={setActiveTab} />
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800/50 p-3 rounded-lg flex items-center gap-3 cursor-pointer hover:bg-slate-800 transition-colors">
            <div className="w-8 h-8 rounded-full bg-branddi-cyan/20 flex items-center justify-center text-branddi-cyan font-bold text-xs">{user?.email?.charAt(0).toUpperCase() || 'U'}</div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{user?.user_metadata?.full_name || user?.email}</p>
              <button onClick={handleLogout} className="text-[10px] text-slate-400 truncate hover:text-white transition-colors">Sair da Conta</button>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* TOP BAR */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shadow-sm shadow-slate-100/50">
          <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 w-96 max-w-full">
            <Search size={18} className="text-slate-400" />
            <input
              placeholder="Buscar Negócios, Contatos ou Relatórios..."
              className="bg-transparent border-none focus:outline-none text-sm w-full"
            />
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-branddi-cyan transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-branddi-cyan rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
            <button
              onClick={copyInsight}
              disabled={!analysis}
              className="flex items-center gap-2 bg-branddi-navy text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-all shadow-md shadow-slate-200 active:scale-95 border border-branddi-cyan/20 disabled:opacity-50 disabled:cursor-not-allowed">
              <Cpu size={16} />
              <span>Gerar Insight</span>
            </button>
          </div>
        </header>

        {/* PAGE BODY */}
        <div className="flex-1 overflow-y-auto p-8 relative">

          {/* TOASTS */}
          {toast && (
            <div className="fixed bottom-8 right-8 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom z-50">
              <CheckCircle size={18} className="text-emerald-400" />
              <span className="text-sm font-medium">{toast}</span>
            </div>
          )}

          {/* CONFIG SECTION */}
          {activeTab === 'config' && (
            <div className="max-w-4xl mx-auto space-y-8 fade-in">
              <SectionTitle title="Configuração da Inteligência" subtitle="Configure suas chaves e o negócio que deseja analisar no histórico Branddi." />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* KEYS CARD */}
                <div className="card p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                      <Shield size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">Chaves de API</h3>
                      <p className="text-xs text-slate-500">Credenciais para conexão Pipedrive e Gemini.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-sm text-slate-500 mb-4">A inteligência está sendo rodada em servidores seguros. Sua chave do Google Cloud está protegida na Vercel.</p>
                    <div>
                      <label className="text-xs font-bold text-slate-600 mb-1 block uppercase">Pipedrive Token</label>
                      <input
                        type="password"
                        value={pipedriveToken}
                        onChange={(e) => setPipedriveToken(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-branddi-cyan outline-none transition-all"
                        placeholder="Token do seu CRM"
                      />
                    </div>
                  </div>
                </div>

                {/* DEAL CARD */}
                <div className="card p-6 border-2 border-branddi-cyan/20">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-branddi-cyan/10 text-branddi-cyan rounded-lg flex items-center justify-center">
                      <LayoutDashboard size={20} />
                    </div>
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
                      onClick={handleStartProcess}
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
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash (Padrão)</option>
                        <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                        <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                        <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Experimental)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase px-1 mb-1 block">Tag Outbound (Prospecção)</label>
                      <input
                        value={outboundTag} onChange={(e) => setOutboundTag(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase px-1 mb-1 block">Tag Vendas (Reunião)</label>
                      <input
                        value={salesTag} onChange={(e) => setSalesTag(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ERROR STATE */}
              {status === 'error' && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-4 animate-in slide-in-from-bottom">
                  <div className="w-10 h-10 bg-red-100 text-red-600 rounded-lg flex items-center justify-center shrink-0">
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-red-800">Ops! Algo correu mal</h4>
                    <p className="text-sm text-red-600 mt-1">{errorMsg}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DASHBOARD RELATIVO AO NEGÓCIO */}
          {activeTab !== 'config' && analysis && (
            <div className="max-w-6xl mx-auto space-y-8 fade-in">

              {/* HEADER DASHBOARD */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-8">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-branddi-cyan/20 text-branddi-navy text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border border-branddi-cyan/30">Análise em tempo real</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 text-xs font-medium">Extraído em {new Date().toLocaleTimeString()}</span>
                  </div>
                  <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">{dealTitle} <span className="text-slate-400 text-xl font-medium block md:inline mt-1 md:mt-0">#{dealId}</span></h1>
                  <p className="text-slate-500 text-sm mt-1 flex items-center gap-1.5">
                    <Target size={14} className="text-branddi-cyan" />
                    Status do Algoritmo: <span className="text-emerald-600 font-bold">Processado com Sucesso</span>
                  </p>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => window.print()} className="bg-white border border-slate-200 p-2.5 rounded-lg text-slate-600 hover:bg-slate-50 shadow-sm transition-all active:scale-95">
                    <LogOut size={18} className="rotate-270" />
                  </button>
                  <button onClick={() => copyToClipboard(rawExtractedData)} className="bg-white border border-slate-200 px-4 py-2.5 rounded-lg text-slate-600 font-bold text-sm hover:bg-slate-50 shadow-sm flex items-center gap-2 transition-all active:scale-95">
                    <Copy size={16} />
                    <span>Dados Brutos</span>
                  </button>
                  <button onClick={() => setActiveTab('config')} className="bg-white border border-slate-200 px-4 py-2.5 rounded-lg text-slate-600 font-bold text-sm hover:bg-slate-50 shadow-sm flex items-center gap-2 transition-all active:scale-95">
                    <Settings size={16} />
                    <span>Nova Análise</span>
                  </button>
                </div>
              </div>

              {/* DASHBOARD TAB */}
              {activeTab === 'dashboard' && (
                <div className="space-y-8 fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                    <div className="card p-6 flex flex-col justify-between h-40">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Health Score</p>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className={`text-4xl font-black ${analysis.score > 70 ? 'text-emerald-600' : analysis.score > 40 ? 'text-orange-600' : 'text-red-600'}`}>
                          {analysis.score}
                        </span>
                        <span className="text-slate-300 font-bold">/100</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-1000 ${analysis.score > 70 ? 'bg-emerald-500' : analysis.score > 40 ? 'bg-orange-500' : 'bg-red-500'}`}
                          style={{ width: `${analysis.score}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="card p-6 flex flex-col justify-between h-40">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sentimento</p>
                      <div className="mt-2 flex items-center gap-3">
                        {analysis.sentimento === 'Positivo' ? <Zap className="text-orange-500" size={32} fill="#f97316" /> : <MessageSquare size={32} className="text-slate-400" />}
                        <span className="text-2xl font-black text-slate-800">{analysis.sentimento}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">Predição baseada em 100% das notas</p>
                    </div>

                    <div className="card p-6 flex flex-col justify-between h-40">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dias Aberto</p>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-4xl font-black text-slate-800">{hardMetrics?.daysOpen}</span>
                        <span className="text-slate-400 text-sm font-bold ml-1">DIAS</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-4">
                        <TrendingUp size={14} className="text-slate-300" />
                        <span className="text-[10px] font-bold text-slate-400">Pipeline Performance</span>
                      </div>
                    </div>

                    <div className="card p-6 flex flex-col justify-between h-40 bg-slate-900 text-white border-none shadow-orange-200">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inatividade</p>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className={`text-4xl font-black ${hardMetrics?.daysInactive > 10 ? 'text-orange-400' : 'text-white'}`}>{hardMetrics?.daysInactive}</span>
                        <span className="text-slate-500 text-sm font-bold ml-1">DIAS</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-4">
                        <div className={`w-2 h-2 rounded-full ${hardMetrics?.daysInactive > 10 ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                        <span className="text-[10px] font-bold text-slate-400">{hardMetrics?.daysInactive > 10 ? 'ESTAGNADO' : 'ENGANJAM. OK'}</span>
                      </div>
                    </div>

                    <div className="card p-6 flex flex-col justify-between h-40 bg-branddi-cyan/10 border-branddi-cyan/20">
                      <p className="text-xs font-bold text-branddi-navy uppercase tracking-wider">Interações Reais</p>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-4xl font-black text-branddi-navy">{hardMetrics?.totalActions}</span>
                        <span className="text-branddi-navy/60 text-sm font-bold ml-1">AÇÕES</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-4">
                        <Activity size={14} className="text-branddi-navy/60" />
                        <span className="text-[10px] font-bold text-branddi-navy/80">E-mails, LinkedIn, WPP e Ligs</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-8">
                      <div className="card p-8">
                        <SectionTitle title="Resumo Executivo Branddi" subtitle="Insight gerado automaticamente para o Head de Vendas." />
                        <div className="bg-slate-50 p-6 rounded-xl border-l-4 border-orange-500 italic text-slate-700 leading-relaxed relative">
                          <MessageSquare className="absolute -top-3 -right-3 text-orange-200" size={40} />
                          "{analysis.resumo}"
                        </div>
                      </div>

                      <div className="card p-8 bg-gradient-to-br from-white to-orange-50/10">
                        <SectionTitle title="Próximos Passos Sugeridos" subtitle="Ações prioritárias extraídas da inteligência de negociação." />
                        <div className="space-y-4">
                          {analysis.proximosPassos.map((step, i) => (
                            <div key={i} className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:border-orange-200 transition-colors group">
                              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm shrink-0 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                                {i + 1}
                              </div>
                              <span className="text-slate-700 font-medium text-sm">{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div className="card p-6">
                        <SectionTitle title="Métricas de Reunião" subtitle="Contagem rigorosa Branddi." />
                        <div className="space-y-4 mt-6">
                          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                            <div className="flex items-center gap-3">
                              <Mail className="text-slate-400" size={18} />
                              <span className="text-sm font-bold text-slate-600 uppercase tracking-tighter">Outbound ({outboundTag})</span>
                            </div>
                            <span className="text-2xl font-black text-slate-800">{analysis.reunioesOutbound}</span>
                          </div>
                          <div className="flex items-center justify-between p-4 bg-orange-50 rounded-xl border border-orange-100">
                            <div className="flex items-center gap-3">
                              <Users className="text-orange-500" size={18} />
                              <span className="text-sm font-bold text-orange-700 uppercase tracking-tighter">Vendas ({salesTag})</span>
                            </div>
                            <span className="text-2xl font-black text-orange-600">{analysis.reunioesVendas}</span>
                          </div>
                        </div>
                      </div>

                      <div className="card p-6">
                        <SectionTitle title="Dores do lead" subtitle="O que tira o sono do cliente." />
                        <div className="flex flex-wrap gap-2 mt-4">
                          {analysis.dores.map((dor, i) => (
                            <span key={i} className="bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-bold px-3 py-1.5 rounded-full uppercase transition-all hover:bg-white hover:border-orange-300 cursor-default">
                              {dor}
                            </span>
                          ))}
                        </div>
                        <div className="mt-8">
                          <p className="text-[11px] font-bold text-slate-400 uppercase border-b border-slate-100 pb-2 mb-4">Objeções Ativas</p>
                          <div className="space-y-3">
                            {analysis.objecoes.map((obj, i) => (
                              <div key={i} className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0"></div>
                                <span className="text-xs text-slate-600 font-medium leading-tight">{obj}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TABS REORGANIZADAS */}
              {activeTab === 'inteligencia' && (
                <div className="space-y-8 fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-8">
                      <div className="card p-8">
                        <SectionTitle title="Personas Envolvidas" subtitle="Quem manda no negócio." />
                        <div className="space-y-4">
                          {analysis.personas.map((p, i) => (
                            <div key={i} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                                  <User size={20} />
                                </div>
                                <div>
                                  <p className="font-bold text-slate-800 leading-none">{p.nome || "Não definido"}</p>
                                  <p className="text-xs text-slate-500 mt-1">{p.cargo}</p>
                                </div>
                              </div>
                              <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase ${p.engajamento === 'Alto' ? 'bg-emerald-100 text-emerald-700' : p.engajamento === 'Baixo' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-700'}`}>
                                {p.engajamento}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="card p-8 border-t-8 border-red-600">
                        <SectionTitle title="Objeções ativas" subtitle="O que o cliente disse que não foi bem resolvido." />
                        <div className="space-y-3 mt-4">
                          {analysis.objecoesMalContornadas?.length > 0 ? analysis.objecoesMalContornadas.map((item, i) => (
                            <div key={i} className="bg-red-50/50 p-4 rounded-xl border-l-4 border-red-500">
                              <p className="text-sm font-bold text-red-800">{item.objecao}</p>
                              <p className="text-xs text-red-600 mt-1">{item.motivo}</p>
                            </div>
                          )) : <div className="p-4 bg-emerald-50 rounded-xl"><p className="text-sm font-bold text-emerald-700">Nenhuma objeção ativa ou mal contornada.</p></div>}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div className="card p-8 border-t-8 border-orange-500">
                        <SectionTitle title="Negativas Fortes" subtitle="Barreiras explícitas da prospecção." />
                        <div className="space-y-3 mt-4">
                          {analysis.prospeccao?.negativasFortes?.length > 0 ? analysis.prospeccao?.negativasFortes.map((item, i) => (
                            <div key={i} className="bg-orange-50/50 p-4 rounded-xl border-l-4 border-orange-500">
                              <p className="text-sm font-bold text-orange-800">{item.nome}</p>
                              <p className="text-xs text-orange-600 mt-1">{item.motivo}</p>
                            </div>
                          )) : <div className="p-4 bg-emerald-50 rounded-xl"><p className="text-sm font-bold text-emerald-700">Nenhuma negativa forte levantada.</p></div>}
                        </div>
                        <div className="mt-8 pt-6 border-t border-slate-100">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Motivo Resumo de Estagnação</p>
                          <div className="bg-slate-900 rounded-xl p-4 text-white text-sm font-bold">
                            {analysis.prospeccao?.motivoNaoEvolucao || "Nenhum motivo claro identificado pela IA."}
                          </div>
                        </div>
                      </div>

                      <div className="card p-8">
                        <SectionTitle title="Regra da Persona" subtitle="O card está associado à pessoa certa?" />
                        <div className={`mt-4 p-6 rounded-xl border-2 flex items-start gap-4 ${analysis.regraPersonaCumprida ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                          {analysis.regraPersonaCumprida ? <CheckCircle size={24} className="text-emerald-600 shrink-0" /> : <AlertCircle size={24} className="text-red-600 shrink-0" />}
                          <div>
                            <p className={`font-bold uppercase text-xs mb-1 ${analysis.regraPersonaCumprida ? 'text-emerald-700' : 'text-red-700'}`}>{analysis.regraPersonaCumprida ? 'Regra Cumprida' : 'Falha na Regra Persona'}</p>
                            <p className="text-sm text-slate-700 leading-tight">{analysis.justificativaRegraPersona}</p>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {/* TAB PROSPECCAO */}
              {activeTab === 'prospeccao' && (
                <div className="space-y-8 fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="card p-8 border-l-8 border-emerald-500">
                      <SectionTitle title="Mapeamento de Prioridade de Contato" subtitle="Quem o vendedor deve focar agora." />
                      <div className="space-y-3 mt-4">
                        {analysis.prospeccao?.listaPrioridadeContato?.length > 0 ? analysis.prospeccao.listaPrioridadeContato.map((item, i) => (
                          <div key={i} className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex items-start gap-4">
                            <div className="bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0">{i + 1}</div>
                            <div>
                              <p className="font-bold text-emerald-900">{item.nome}</p>
                              <p className="text-xs text-emerald-700 mt-1">{item.contexto}</p>
                            </div>
                          </div>
                        )) : <div className="p-4 bg-slate-50 rounded-xl"><p className="text-sm text-slate-500">Nenhum contato prioritário identificado.</p></div>}
                      </div>
                    </div>

                    <div className="card p-8 border-l-8 border-slate-300">
                      <SectionTitle title="Contatos a Evitar (Blocklist)" subtitle="Pessoas que bloqueiam ou não devem ser contatadas." />
                      <div className="space-y-3 mt-4">
                        {analysis.prospeccao?.contatosEvitar?.length > 0 ? analysis.prospeccao.contatosEvitar.map((item, i) => (
                          <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <p className="font-bold text-slate-700">{item.nome}</p>
                            <p className="text-xs text-slate-500 mt-1">{item.motivo}</p>
                          </div>
                        )) : <div className="p-4 bg-emerald-50 rounded-xl"><p className="text-sm font-bold text-emerald-700">Nenhum bloqueador identificado no momento.</p></div>}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="card p-8 md:col-span-1">
                      <SectionTitle title="Mapeamento de Conta" subtitle="Distribuição por área." />
                      <div className="space-y-4">
                        {analysis.prospeccao?.mapeamentoConta?.map((area, i) => (
                          <div key={i} className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{area.area}</p>
                            <p className="text-sm font-bold text-slate-700 mt-1">{area.pessoas.join(', ')}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="card p-8 md:col-span-2">
                      <SectionTitle title="Histórico de Reuniões Estagnadas" subtitle="Reuniões que não moveram o ponteiro." />
                      <table className="w-full text-left mt-4">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="pb-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data</th>
                            <th className="pb-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Participantes</th>
                            <th className="pb-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Motivo de Estagnação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {analysis.prospeccao?.historicoReunioesEstagnadas?.map((re, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-4 text-xs font-bold text-slate-700">{re.data}</td>
                              <td className="py-4 text-xs text-slate-600">{re.participantes}</td>
                              <td className="py-4 text-xs text-red-600 font-medium italic">"{re.motivo}"</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="card p-8">
                    <SectionTitle title="Auditoria de Comunicação (Ortografia e Gramática)" subtitle="Foco nas notas e e-mails do vendedor." />
                    <div className="space-y-2 mt-4">
                      {analysis.errosOrtografia?.length > 0 ? analysis.errosOrtografia.map((err, i) => (
                        <div key={i} className="text-sm p-3 bg-slate-50 text-slate-700 rounded-lg flex items-center gap-2">
                          {err}
                        </div>
                      )) : <div className="text-sm p-3 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-2"><CheckCircle size={14} /> Comunicação impecável identificada.</div>}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB PARTICIPANTES */}
              {activeTab === 'participantes' && (
                <div className="space-y-8 fade-in">
                  {analysis.participantesMapa?.removerDoCard?.length > 0 && (
                    <div className="card p-8 border-l-8 border-red-500 bg-red-50/30">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center shadow-inner relative">
                          <User size={24} className="text-red-500" />
                          <span className="absolute top-1 right-2 text-xl font-black text-red-600">!</span>
                        </div>
                        <div>
                          <h2 className="text-xl font-black text-red-800">Alerta de Desvinculação</h2>
                          <p className="text-sm text-red-600">Pessoas mapeadas que não fazem mais parte da empresa e devem ser removidas.</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {analysis.participantesMapa.removerDoCard.map((item, i) => (
                          <div key={i} className="bg-white p-4 rounded-xl border border-red-200 flex flex-col md:flex-row justify-between md:items-center gap-2">
                            <span className="font-bold text-red-900 flex items-center gap-2"><AlertCircle size={16} /> {item.nome}</span>
                            <span className="text-xs text-red-700 bg-red-100 px-3 py-1 rounded-full font-medium">{item.motivo}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="card p-8 border-l-8 border-orange-500">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center shadow-inner">
                        <Zap size={24} fill="#f97316" className="text-orange-500" />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-slate-800">Alerta de Stakeholder Decisivo</h2>
                        <p className="text-sm text-slate-500">A IA detectou um tomador de decisão chave.</p>
                      </div>
                    </div>
                    <div className="bg-slate-900 rounded-2xl p-6 text-white text-lg font-bold leading-tight">
                      {analysis.participantesMapa?.alertaStakeholder?.existe ?
                        analysis.participantesMapa.alertaStakeholder.contexto :
                        "Nenhum stakeholder decisivo mapeado explicitamente."}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="card p-8">
                      <SectionTitle title="Equipe da Empresa Cliente" subtitle="Decisores e influenciadores." />
                      <div className="space-y-3">
                        {analysis.participantesMapa?.equipeEmpresa?.map((e, i) => (
                          <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-400 shadow-sm">{e.nome?.charAt(0)}</div>
                            <div>
                              <p className="text-sm font-black text-slate-800">{e.nome}</p>
                              <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">{e.cargoInferido}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="card p-8">
                      <SectionTitle title="Equipe da Agência Parceira" subtitle="Intermediários e implementadores." />
                      <div className="space-y-3">
                        {analysis.participantesMapa?.equipeAgencia?.map((e, i) => (
                          <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                            <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">{e.nomeAgencia?.charAt(0)}</div>
                            <div>
                              <p className="text-sm font-black text-slate-800">{e.nome}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{e.nomeAgencia}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default App;
