import dotenv from "dotenv";
import knowledgeData from "../../src/data/knowledge.json";

dotenv.config();

const FIREWORKS_API_URL = process.env.FIREWORKS_API_URL || 'https://api.fireworks.ai/inference/v1';
const FIREWORKS_API_KEY = process.env.FIREWORKS_API_KEY || '';
const FIREWORKS_MODEL = process.env.FIREWORKS_MODEL || 'fireworks-1';

async function callFireworksAPI(prompt: string, options?: { maxTokens?: number; timeoutMs?: number; disableThinking?: boolean }) {
  try {
    const { createFireworks } = await import('@ai-sdk/fireworks');
    const { generateText } = await import('ai');

    const fireworks = createFireworks({ apiKey: FIREWORKS_API_KEY, baseURL: FIREWORKS_API_URL });
    const model = fireworks(FIREWORKS_MODEL);

    const providerOptions: any = {};
    if (options?.disableThinking) providerOptions.fireworks = { thinking: { type: 'disabled' } };
    const generateParams: any = { model, prompt };
    if (options?.maxTokens) generateParams.max_tokens = options.maxTokens;
    if (Object.keys(providerOptions).length) generateParams.providerOptions = providerOptions;

    const result: any = await generateText(generateParams);
    const text = result?.text ?? result;
    try {
      return JSON.parse(text);
    } catch (e) {
      return { rawText: String(text) };
    }
  } catch (e) {
    const endpoint = FIREWORKS_API_URL.replace(/\/$/, '') + `/chat/completions`;
    const body: any = { model: FIREWORKS_MODEL, messages: [{ role: 'user', content: prompt }] };
    if (options?.maxTokens) body.max_tokens = options.maxTokens;
    if (options?.disableThinking) body.reasoning_effort = 'low';

    const controller = new AbortController();
    const timeout = options?.timeoutMs ?? 15000;
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(FIREWORKS_API_KEY ? { 'Authorization': `Bearer ${FIREWORKS_API_KEY}` } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(id);
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        return { rawText: text };
      }
    } catch (err: any) {
      clearTimeout(id);
      return { rawText: `Fireworks HTTP error: ${String(err.message || err)}` };
    }
  }
}

// Simple RAG context finder
function findContext(messages: any[]): { contextText: string; sourcesUsed: string[] } {
  const lastUserMsg = messages[messages.length - 1]?.text || "";
  const query = lastUserMsg.toLowerCase();
  
  const matchedDocs: string[] = [];
  const sourcesUsed: string[] = [];
  
  if (!query.trim()) return { contextText: "", sourcesUsed: [] };

  for (const doc of knowledgeData) {
    const titleMatch = doc.title.toLowerCase().includes(query);
    const idMatch = doc.id.toLowerCase().includes(query);
    const contentKeywords = doc.content.toLowerCase().includes(query);
    const categoryMatch = doc.frontmatter.categoria?.toLowerCase().includes(query);
    
    let wordMatch = false;
    const queryWords = query.split(/\s+/).filter(w => w.length > 4);
    if (queryWords.length > 0) {
      wordMatch = queryWords.some(word => 
        doc.title.toLowerCase().includes(word) || 
        doc.content.toLowerCase().includes(word)
      );
    }

    if (titleMatch || idMatch || contentKeywords || categoryMatch || wordMatch) {
      sourcesUsed.push(doc.id);
      matchedDocs.push(`---
Document ID: ${doc.id}
Title: ${doc.title}
Path: ${doc.path}
Category: ${doc.frontmatter.categoria || 'N/A'}
Content:
${doc.content}
---`);
    }
  }
  
  const limitedDocs = matchedDocs.slice(0, 4);
  const limitedSources = sourcesUsed.slice(0, 4);
  return {
    contextText: limitedDocs.join('\n\n'),
    sourcesUsed: limitedSources
  };
}

export const handler = async (event: any, context: any) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  let parsedBody: any = {};
  try {
    parsedBody = JSON.parse(event.body || '{}');
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'JSON malformado no corpo da requisição.' })
    };
  }

  const { messages } = parsedBody;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Mensagens inválidas ou vazias.' })
    };
  }

  const { contextText, sourcesUsed } = findContext(messages);

  const systemInstruction = `Você é o Mentor Circular, um mentor orientador altamente especializado para estudantes universitárias iniciando atividades na CosmoBrasil.
Seu papel não é fornecer relatórios longos ou planos prontos. Seu papel é fazer perguntas reflexivas, sugerir caminhos de pesquisa, propor hipóteses práticas e guiar as estudantes a desenvolverem pensamento crítico sobre:
- Economia Circular e Distritos Circulares (sustentabilidade, inteligência territorial, COSMOB, desenvolvimento empresarial, sustentabilidade ambiental, ciclos fechados, etc.)
- Negócios, Marketing e Planos de Negócios/Marketing (pesquisa de mercado, proposição de valor relevante, público-alvo, competitividade, etc.)

  DIRETRIZES DE COMPORTAMENTO ORIENTATIVO (MÉTODO DE QUESTIONAMENTO):
1. Nunca entregue planos prontos ou respostas prontas de imediato.
2. Quando o usuário disser algo como: "Faça um plano de marketing" ou "Monte um plano de negócios", devolva perguntas estratégicas essenciais para ajudá-lo a elaborar:
   - Qual público-alvo ou nicho de mercado prioritário?
   - Qual problema específico de desperdício ou design de produto está sendo resolvido?
   - Quem são os concorrentes diretos ou referências de mercado?
3. Estimule a curiosidade, a reflexão crítica e a criação de soluções. Seja dialógico, construtivo, empático e de leitura agradável.
4. Você deve retornar um objeto JSON estritamente estruturado para acionar recursos dinâmicos e de evolução cognitiva na interface da universitária:
    - mentorResponse: Sua mensagem principal em parágrafos simples usando formato Markdown. Mantenha o texto objetivo e conciso.
   - suggestedQuestions: 2 ou 3 perguntas reflexivas diretas estimulantes.
   - suggestedConcepts: 1 ou 2 conceitos-chave para a estudante pesquisar relacionados ao tema discutido.
   - suggestedHypotheses: 1 ou 2 hipóteses práticas que a estudante pode propor ou testar.

CONTRATO DE RESPOSTA (CONHECIMENTO ADICIONAL E REGRAS DE RIGOR):
Sempre que possível, baseie-se nas seguintes informações extraídas do acervo Foresight da CosmoBrasil:
${contextText ? `DOCUMENTOS RELEVANTES ENCONTRADOS NO ACERVO:\n${contextText}` : 'Nenhum documento específico foi pré-selecionado para esta mensagem. Use o conhecimento padrão sobre CosmoBrasil.'}

Regras obrigatórias do contrato de resposta:
- Se houver informações retiradas do acervo acima, cite a fonte usada (ex: C004, C005) em formato de tags Markdown (ex: [C004]) no corpo do texto.
- Distinga claramente Fato, Inferência e Hipótese.
- Se a pergunta for sobre circularidade de produto, use a metodologia descrita em C004 (5 dimensões de avaliação).
- Se a pergunta for sobre plataforma ou operação digital da CosmoBrasil, ancore-se na arquitetura de C005.

Sua resposta DEVE ser um objeto JSON estrito com o esquema solicitado.`;

  try {
    if (!FIREWORKS_API_KEY) throw new Error('FIREWORKS_API_KEY_NOT_CONFIGURED');

    const recentMessages = messages.slice(-4);
    const truncatedContext = contextText ? contextText.substring(0, 1500) : '';
    const conversationText = recentMessages.map((m: any) => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.text}`).join('\n');
    const promptText = `${systemInstruction}\n\nCONTEXT:\n${truncatedContext}\n\nCONVERSATION:\n${conversationText}\n\nRespond with a JSON object matching the schema: { mentorResponse: string, suggestedQuestions: string[], suggestedConcepts: string[], suggestedHypotheses: string[] }`;

    const apiResp = await callFireworksAPI(promptText, { maxTokens: 120, timeoutMs: 10000, disableThinking: true });
    try {
      const snap = typeof apiResp === 'string' ? apiResp : JSON.stringify(apiResp);
      console.debug('[Netlify Fireworks] apiResp snapshot:', snap.slice(0, 200));
    } catch (e) {
      console.debug('[Netlify Fireworks] apiResp (unserializable)');
    }

    // Normalize provider output: remove fenced code blocks and extract nested JSON if present.
    const normalizeOutput = (incoming: any) => {
      if (!incoming) return incoming;
      if (typeof incoming === 'object') {
        const out: any = { ...incoming };
        if (typeof out.mentorResponse === 'string') {
          const str = out.mentorResponse.trim();
          const fencedMatch = str.match(/```(?:\w+)?\n([\s\S]*?)```/);
          if (fencedMatch && fencedMatch[1]) {
            const inner = fencedMatch[1].trim();
            try {
              const parsed = JSON.parse(inner);
              if (parsed && typeof parsed === 'object' && (parsed.mentorResponse || parsed.suggestedQuestions || parsed.suggestedConcepts)) {
                return parsed;
              }
            } catch (e) {
              out.mentorResponse = inner;
            }
          } else {
            out.mentorResponse = str.replace(/```/g, '').trim();
          }
        }
        return out;
      }
      if (typeof incoming === 'string') {
        const s = incoming.trim();
        const fencedMatch = s.match(/```(?:\w+)?\n([\s\S]*?)```/);
        if (fencedMatch && fencedMatch[1]) {
          const inner = fencedMatch[1].trim();
          try {
            return JSON.parse(inner);
          } catch (e) {
            return { mentorResponse: inner };
          }
        }
        try {
          const parsed = JSON.parse(s);
          return parsed;
        } catch (e) {
          return { mentorResponse: s.replace(/```/g, '').trim() };
        }
      }
      return incoming;
    };

    const normalized = normalizeOutput(apiResp);

    // Try extracting inner JSON if mentorResponse still contains code fences
    const extractInnerJson = (maybe: any) => {
      // If input is not an object with mentorResponse string, return as-is
      if (!maybe || typeof maybe !== 'object' || typeof maybe.mentorResponse !== 'string') return maybe;

      let current: any = { ...maybe };
      let iterations = 0;
      // Try to iteratively unwrap fenced JSON blocks up to a safe limit
      while (iterations < 4 && typeof current.mentorResponse === 'string') {
        const s = current.mentorResponse;
        // Remove surrounding code fences if present
        const withoutFences = s.replace(/```(?:\w+)?\n?/g, '').replace(/```/g, '').trim();
        // Try to find JSON object inside
        const jsonMatch = withoutFences.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const candidate = jsonMatch[0];
          try {
            const parsed = JSON.parse(candidate);
            if (parsed && typeof parsed === 'object') {
              // If parsed looks like the expected response object, adopt it and continue unwrapping
              if (parsed.mentorResponse || parsed.suggestedQuestions || parsed.suggestedConcepts) {
                current = parsed;
                iterations++;
                continue;
              }
            }
          } catch (e) {
            // not JSON parseable, fallback to using cleaned text
            current = { ...current, mentorResponse: withoutFences };
            break;
          }
        }
        // No JSON inside; return cleaned text
        current = { ...current, mentorResponse: withoutFences };
        break;
      }
      return current;
    };

    const finalResponse = extractInnerJson(normalized);

    // Helper to shorten mentorResponse by target ratio (keep ~70% of original length)
    const shortenText = (text: string, ratio = 0.7) => {
      if (!text || typeof text !== 'string') return text;
      const words = text.split(/\s+/).filter(Boolean);
      if (words.length < 30) return text;
      const target = Math.max(10, Math.floor(words.length * ratio));
      const sentences = text.match(/[^.!?]+[.!?]?/g) || [text];
      let acc = '';
      let count = 0;
      for (const s of sentences) {
        const w = s.split(/\s+/).filter(Boolean).length;
        if (count + w <= target || acc === '') {
          acc += (acc ? ' ' : '') + s.trim();
          count += w;
        } else {
          break;
        }
      }
      const final = acc.trim();
      if (final.split(/\s+/).filter(Boolean).length >= Math.floor(target * 0.6)) return final;
      return words.slice(0, target).join(' ') + '...';
    };

    if (finalResponse && typeof finalResponse === 'object' && (finalResponse.mentorResponse || finalResponse.mentorResponse === '')) {
      try {
        const mr = finalResponse.mentorResponse;
        if (typeof mr === 'string') finalResponse.mentorResponse = shortenText(mr, 0.7);
      } catch (e) {
        console.error('Error shortening mentorResponse (netlify)', e);
      }
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalResponse)
      };
    }

    if (normalized && normalized.rawText) {
      const text = String(normalized.rawText || '');
      const bestEffort = { mentorResponse: text, suggestedQuestions: [], suggestedConcepts: [], suggestedHypotheses: [] };
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bestEffort)
      };
    }

    throw new Error('Invalid response from Fireworks API');

  } catch (error: any) {
    console.error("Erro na integração com Fireworks no Netlify Function:", error.message || error);

    const lastUserMsg = messages && messages.length > 0 ? messages[messages.length - 1]?.text?.toLowerCase() || "" : "";
    let mockResponse = {
      mentorResponse: "Olá! Sou o Mentor Circular. Percebi que nossa chave de API do provedor não está ativa ou a conexão falhou temporariamente. No entanto, o aprendizado continua! Como integrante do CosmoBrasil, o que você acha sobre o conceito de Simbiose Industrial?",
      suggestedQuestions: [
        "Quais as diferenças cruciais entre obsolescência programada e design circular?",
        "Como a reciclagem tradicional difere do upcycling no modelo CosmoBrasil?"
      ],
      suggestedConcepts: [
        "Design Circular",
        "Ciclos Reversos",
        "COSMOB"
      ],
      suggestedHypotheses: [
        "A adoção de embalagens retornáveis aumenta o engajamento local em 35%."
      ]
    };

    if (lastUserMsg.includes("marketing") || lastUserMsg.includes("plano")) {
      mockResponse = {
        mentorResponse: "Compreendo seu desejo de montar um plano de marketing circular! No ambiente da CosmoBrasil, ele deve ser sustentável e embasado em métricas de ciclo de vida. De acordo com as diretrizes do Manual Operacional (C004), qual das cinco dimensões de circularidade de produto você considera prioritária no seu negócio?",
        suggestedQuestions: [
          "Como comunicar a circularidade sem incorrer em greenwashing?",
          "Quem são as partes interessadas mais ativas no seu negócio?"
        ],
        suggestedConcepts: [
          "Análise de Ciclo de Vida (ACV)",
          "Neutralidade de Carbono",
          "Proposição de Valor Verde"
        ],
        suggestedHypotheses: [
          "Estudantes universitários pagariam uma assinatura 15% superior por serviços com impacto comprovado."
        ]
      };
    } else if (lastUserMsg.includes("distrito") || lastUserMsg.includes("cosmob")) {
      mockResponse = {
        mentorResponse: "Os Distritos Circulares e a Certificação COSMOB são pilares estruturantes descritos no Ecossistema Tecnológico (C005)! Eles conectam inteligência territorial com simbiose industrial.\n\nComo você imagina que a governança do distrito pode incentivar a simbiose de materiais entre indústrias vizinhas?",
        suggestedQuestions: [
          "Que tipo de recurso seria o mais simples de compartilhar em um distrito local?",
          "Quais critérios a certificação COSMOB deveria auditar com maior rigor?"
        ],
        suggestedConcepts: [
          "Simbiose Industrial",
          "Inteligência Territorial",
          "Certificação COSMOB"
        ],
        suggestedHypotheses: [
          "A simbiose industrial reduz custos operacionais de aquisição de matéria-prima em até 25%."
        ]
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mockResponse)
    };
  }
};
