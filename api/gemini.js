export const config = {
  runtime: 'edge', // Using Edge Runtime to bypass normal serverless function timeouts
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  const { historyText, model } = await req.json();
  const activeApiKey = process.env.GEMINI_API_KEY;

  if (!activeApiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not configured on the server.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const systemPrompt = `
        És um especialista em Operações de Vendas (SalesOps) e analista de CRM de topo da Branddi.
        A tua tarefa é analisar o histórico bruto extraído via API de um negócio e extrair métricas de Estratégia e Qualidade.
        
        CONTEXTO CRÍTICO:
        O sistema calculou os dias exatos de estagnação. Se existirem muitas interações recentes nas notas ou atividades, o negócio ESTÁ QUENTE E ATIVO.
        
        ANÁLISE ESTRATÉGICA:
        1. PERSONAS ENVOLVIDAS: Nome, cargo e nível de engajamento real.
        2. REGRA DE PERSONA: A validação só é cumprida se a "Persona Principal" do negócio for EXATAMENTE o contato que respondeu pela última vez ou que concentra o maior volume de comunicação recente. O vendedor precisa falar com quem interage.
        3. PONTOS DE DOR (PAIN POINTS) / DORES DO LEAD: O que o cliente quer resolver.
        4. OBJEÇÕES ATIVAS: Barreiras relatadas (não resolvidas).
        5. RESUMO EXECUTIVO: Resumo claro do momento atual do deal.
        6. SENTIMENTO: Apenas responde "Positivo", "Neutro" ou "Negativo".
        7. PRÓXIMOS PASSOS SUGERIDOS: Ações práticas para fechar o negócio.
        8. SCORE (0 a 100): Se existe contato recente, o score NUNCA deve ser baixo.
        
        AUDITORIA DE QUALIDADE DE VENDAS E PROSPECÇÃO:
        9. REGRA DE HIGIENE: Colar histórico do WhatsApp é o procedimento PADRÃO. NUNCA aponte como erro.
        10. ORTOGRAFIA E GRAMÁTICA: Audite os textos escritos pelo vendedor nas notas, apontando erros ortográficos ou gramaticais estruturais.
        11. PRIORIDADE DE CONTATO: Liste pessoas fundamentais para o vendedor retomar o engajamento rápido, em ordem de importância.
        12. CONTATOS A EVITAR: Pessoas que devem ser ignoradas (detratores, ex-funcionários, bloqueadores não engajados).
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
          listaPrioridadeContato: { type: "ARRAY", items: { type: "OBJECT", properties: { nome: { type: "STRING" }, contexto: { type: "STRING" } } } },
          contatosEvitar: { type: "ARRAY", items: { type: "OBJECT", properties: { nome: { type: "STRING" }, motivo: { type: "STRING" } } } },
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
      return new Response(JSON.stringify({ error: errorData.error?.message || "Erro na API Gemini" }), { status: geminiRes.status, headers: { 'Content-Type': 'application/json' } });
    }

    const result = await geminiRes.json();
    return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor ao conectar com o Gemini.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
