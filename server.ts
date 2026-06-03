import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import knowledgeData from "./src/data/knowledge.json";

// Load environment variables
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Fireworks HTTP client configuration (generic POST-based LLM)
const FIREWORKS_API_URL = process.env.FIREWORKS_API_URL || 'https://api.fireworks.ai/v1/generate';
const FIREWORKS_API_KEY = process.env.FIREWORKS_API_KEY || '';
const FIREWORKS_MODEL = process.env.FIREWORKS_MODEL || 'fireworks-1';

async function callFireworksAPI(prompt: string, options?: { maxTokens?: number; timeoutMs?: number; disableThinking?: boolean }) {
  // Prefer using the official ai-sdk provider if installed. We dynamically import to
  // avoid hard dependency at runtime in environments where the package isn't installed yet.
  try {
    const { createFireworks } = await import('@ai-sdk/fireworks');
    const { generateText } = await import('ai');

    const fireworks = createFireworks({ apiKey: FIREWORKS_API_KEY, baseURL: FIREWORKS_API_URL });
    const model = fireworks(FIREWORKS_MODEL);

    // Prepare providerOptions to favor speed
    const providerOptions: any = {};
    if (options?.disableThinking) providerOptions.fireworks = { thinking: { type: 'disabled' } };

    const generateParams: any = { model, prompt };
    if (options?.maxTokens) generateParams.max_tokens = options.maxTokens;
    if (Object.keys(providerOptions).length) generateParams.providerOptions = providerOptions;

    const result: any = await generateText(generateParams);
    // `generateText` should return an object with `text` property. If so, try parse.
    const text = result?.text ?? result;
    try {
      return JSON.parse(text);
    } catch (e) {
      return { rawText: String(text) };
    }
  } catch (e) {
    // If SDK is not present or fails, fall back to the HTTP endpoint.
    const endpoint = FIREWORKS_API_URL.replace(/\/$/, '') + `/chat/completions`;

    // Build body with conservative defaults to reduce tokens and latency
    const body: any = { model: FIREWORKS_MODEL, messages: [{ role: 'user', content: prompt }] };
    if (options?.maxTokens) body.max_tokens = options.maxTokens;
    if (options?.disableThinking) body.reasoning_effort = 'low';

    // Use AbortController to enforce timeout
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

// API Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Advisor chat route
app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Mensagens inválidas ou vazias." });
  }

  const { contextText, sourcesUsed } = findContext(messages);

  // System instruction defining guiding behavior and the CosmoBrasil circular theme
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
    // If Fireworks key is not configured, throw to use the local mock fallback below
    if (!FIREWORKS_API_KEY) {
      throw new Error("FIREWORKS_API_KEY_NOT_CONFIGURED");
    }

    // Map conversation history safely and limit to last 4 messages (smaller context -> faster)
    const recentMessages = messages.slice(-4);
    // Truncate RAG context to limit prompt size (keep first 1500 chars)
    const truncatedContext = contextText ? contextText.substring(0, 1500) : '';
    // Compose a single prompt that includes the system instruction, truncated RAG context and the recent conversation.
    const conversationText = recentMessages.map((m: any) => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.text}`).join('\n');
    const promptText = `${systemInstruction}\n\nCONTEXT:\n${truncatedContext}\n\nCONVERSATION:\n${conversationText}\n\nRespond with a JSON object matching the schema: { mentorResponse: string, suggestedQuestions: string[], suggestedConcepts: string[], suggestedHypotheses: string[] }`;

    // If the client requests streaming, attempt to stream tokens back via SSE
    const wantsStream = req.headers['accept']?.includes('text/event-stream') || req.body?.stream === true;
    if (wantsStream) {
      // Stream path: use SDK stream if available
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        const { streamText } = await import('ai');
        const { createFireworks } = await import('@ai-sdk/fireworks');
        const fireworks = createFireworks({ apiKey: FIREWORKS_API_KEY, baseURL: FIREWORKS_API_URL });
        const model = fireworks(FIREWORKS_MODEL);

        // Start streaming from provider
        const stream = streamText({ model, prompt: promptText, providerOptions: { fireworks: { thinking: { type: 'disabled' } } }, max_tokens: 120 });

        // stream is an async iterable of chunks
        for await (const chunk of stream) {
          // chunk may contain text or reasoning; we send token text pieces
          const token = (chunk?.text ?? chunk) || '';
          const payload = JSON.stringify({ type: 'token', text: token });
          res.write(`data: ${payload}\n\n`);
        }

        // After stream ends, request a non-streamed final parse to extract suggestions (best-effort)
        const final = await callFireworksAPI(promptText, { maxTokens: 120, timeoutMs: 10000, disableThinking: true });
        const normalizedFinal = normalizeOutput(final);
        const donePayload = JSON.stringify({ type: 'done', meta: { suggestedQuestions: normalizedFinal.suggestedQuestions || [], suggestedConcepts: normalizedFinal.suggestedConcepts || [], suggestedHypotheses: normalizedFinal.suggestedHypotheses || [] } });
        res.write(`data: ${donePayload}\n\n`);
        res.end();
        return;
      } catch (streamErr) {
        console.error('Streaming failed, falling back to non-stream path:', streamErr);
        // fall through to non-streamed path
      }
    }

    // Call the provider with constraints to reduce latency: lower max tokens and disable heavy reasoning
    const apiResp = await callFireworksAPI(promptText, { maxTokens: 120, timeoutMs: 10000, disableThinking: true });
    // Log a truncated view of the provider response for debugging (avoid logging secrets)
    try {
      const snapshot = typeof apiResp === 'string' ? apiResp : JSON.stringify(apiResp);
      console.debug('[Fireworks] apiResp snapshot:', snapshot.slice(0, 200));
    } catch (e) {
      console.debug('[Fireworks] apiResp (unserializable)');
    }

    // Normalize provider output: remove fenced code blocks and extract nested JSON if present.
    const normalizeOutput = (incoming: any) => {
      if (!incoming) return incoming;
      // If returned object already has mentorResponse, clean its value
      if (typeof incoming === 'object') {
        const out: any = { ...incoming };
        if (typeof out.mentorResponse === 'string') {
          const str = out.mentorResponse.trim();
          const fencedMatch = str.match(/```(?:\w+)?\n([\s\S]*?)```/);
          if (fencedMatch && fencedMatch[1]) {
            const inner = fencedMatch[1].trim();
            try {
              const parsed = JSON.parse(inner);
              // If parsed is an object with the expected keys, return it
              if (parsed && typeof parsed === 'object' && (parsed.mentorResponse || parsed.suggestedQuestions || parsed.suggestedConcepts)) {
                return parsed;
              }
            } catch (e) {
              // not JSON, just replace mentorResponse with inner text
              out.mentorResponse = inner;
            }
          } else {
            // remove any raw backticks if present
            out.mentorResponse = str.replace(/```/g, '').trim();
          }
        }
        return out;
      }

      // If incoming is string, clean fences and try JSON parse
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

    // If normalized.mentorResponse still contains embedded JSON fences, attempt a robust extraction
    const extractInnerJson = (maybe: any) => {
      if (!maybe || typeof maybe !== 'object') return maybe;
      if (typeof maybe.mentorResponse !== 'string') return maybe;
      const s = maybe.mentorResponse;
      // Remove triple backticks if present
      const withoutFences = s.replace(/```(?:\w+)?\n?/g, '').replace(/```/g, '').trim();
      // Try to find a JSON substring
      const jsonMatch = withoutFences.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const candidate = jsonMatch[0];
        try {
          const parsed = JSON.parse(candidate);
          if (parsed && typeof parsed === 'object' && (parsed.mentorResponse || parsed.suggestedQuestions || parsed.suggestedConcepts)) {
            return parsed;
          }
        } catch (e) {
          // ignore parse error
        }
      }
      // fallback to cleaned text
      return { ...maybe, mentorResponse: withoutFences };
    };

    const finalResponse = extractInnerJson(normalized);
    // Helper to shorten mentorResponse by target ratio (keep ~70% of original length)
    const shortenText = (text: string, ratio = 0.7) => {
      if (!text || typeof text !== 'string') return text;
      const words = text.split(/\s+/).filter(Boolean);
      if (words.length < 30) return text; // don't shorten very short texts
      const target = Math.max(10, Math.floor(words.length * ratio));
      // Prefer whole-sentence truncation: accumulate sentences until reaching target words
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
      // If sentences accumulation gave too little, fallback to word truncation
      const final = acc.trim();
      if (final.split(/\s+/).filter(Boolean).length >= Math.floor(target * 0.6)) return final;
      return words.slice(0, target).join(' ') + '...';
    };

    if (finalResponse && typeof finalResponse === 'object' && (finalResponse.mentorResponse || finalResponse.mentorResponse === '')) {
      // Shorten mentorResponse by ~30% to produce more concise replies
      try {
        const mr = finalResponse.mentorResponse;
        if (typeof mr === 'string') finalResponse.mentorResponse = shortenText(mr, 0.7);
      } catch (e) {
        console.error('Error shortening mentorResponse', e);
      }
      return res.json(finalResponse);
    }

    // If provider returned rawText, wrap it
    if (normalized && normalized.rawText) {
      const text = String(normalized.rawText || '');
      return res.json({ mentorResponse: text, suggestedQuestions: [], suggestedConcepts: [], suggestedHypotheses: [] });
    }

    throw new Error('Invalid response from Fireworks API');

  } catch (error: any) {
    console.error("Erro na integração com Fireworks ou chave não configurada:", error.message || error);

    // Dynamic Mock Fallback tailored to what the user sent
    const lastUserMsg = messages[messages.length - 1]?.text?.toLowerCase() || "";
    let mockResponse = {
      mentorResponse: "Olá! Sou o Mentor Circular. Percebi que estamos operando em modo offline ou nossa conexão de IA com o provedor está inativa temporariamente. No entanto, o aprendizado nunca para! Como integrante do CosmoBrasil Learning Lab, o que você acha pioneiramente sobre os conceitos de Economia Circular?",
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
        mentorResponse: "Compreendo seu desejo de montar um plano estratégico! No ambiente da CosmoBrasil, um plano de marketing ou de negócios circular deve ser sustentável e reflexivo. Em vez de darmos uma resposta pronta, gostaria de desafiá-la:\n\n1. Qual é o público-alvo exato do seu projeto?\n2. Que desperdício ou recurso você pretende valorizar?\n3. Como sua proposta se diferencia dos competidores lineares?",
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
        mentorResponse: "Os Distritos Circulares e a Certificação COSMOB são pilares estruturantes da CosmoBrasil! Eles conectam inteligência territorial com simbiose industrial e desenvolvimento empresarial.\n\nPara aprofundar seu entendimento, como você imagina que indústrias adjacentes poderiam compartilhar resíduos e energia de forma colaborativa?",
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

    return res.json(mockResponse);
  }
});

// Configure Vite middleware or production build output
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[CosmoBrasil Backend] Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();
