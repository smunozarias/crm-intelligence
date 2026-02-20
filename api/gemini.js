export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { historyText, model } = req.body;
  const activeApiKey = process.env.GEMINI_API_KEY;

  if (!activeApiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
  }

  const systemPrompt = `
      És um especialista em Operações de Vendas (SalesOps) e analista de CRM de topo da Branddi.
      A tua tarefa é analisar o histórico bruto extraído via API de um negócio e extrair métricas de Estratégia e Qualidade.
      
      CONTEXTO CRÍTICO:
      O sistema calculou os dias exatos de estagnação. Se existirem muitas interações recentes nas notas ou atividades, o negócio ESTÁ QUENTE E ATIVO.
      
      ANÁLISE ESTRATÉGICA:
      1. PERSONAS ENVOLVIDAS: Nome, cargo e nível de engajamento real.
      2. PONTOS DE DOR (PAIN POINTS): O que o cliente quer resolver.
      3. OBJEÇÕES: Barreiras ativas (não resolvidas).
      4. RESUMO EXECUTIVO: Resumo claro do momento atual do deal.
      5. SENTIMENTO: Apenas responde "Positivo", "Neutro" ou "Negativo".
      6. PRÓXIMOS PASSOS SUGERIDOS: Ações práticas para fechar o negócio.
      7. SCORE (0 a 100): Se existe contato recente, o score NUNCA deve ser baixo.
      
      AUDITORIA DE QUALIDADE:
      8. REGRA DE HIGIENE: Colar histórico do WhatsApp é o procedimento PADRÃO. NUNCA aponte como erro.
      9. CONTAGEM DE REUNIÕES: Conta APENAS pelo "Tipo: [...]". (O modelo usará tags passadas ou predefinidas se omitidas).
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

  try {
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model.trim()}:generateContent?key=${activeApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `Analisa este histórico do CRM:\n\n${historyText}` }]
        }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: responseSchema
        }
      })
    });

    if (!geminiRes.ok) {
      const errorData = await geminiRes.json();
      return res.status(geminiRes.status).json({ error: errorData.error?.message || "Erro na API Gemini" });
    }

    const result = await geminiRes.json();
    return res.status(200).json(result);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor ao conectar com o Gemini.' });
  }
}
