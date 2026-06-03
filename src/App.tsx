import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Send,
  Paperclip,
  CheckCircle2,
  Globe,
  Sparkles,
  ArrowRight,
  Brain,
  HelpCircle,
  Lightbulb,
  Search,
  BookOpen,
  Info,
  ChevronRight,
  X,
  FileText,
  Clock
} from 'lucide-react';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import { Message, ThemeExplored, ConceptLearned, KnowledgeNode, KnowledgeLink } from './types';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';

// Clear persisted localStorage keys at module load so the app starts fresh for a real user
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem('cosmobrasil_messages');
    window.localStorage.removeItem('cosmobrasil_themes');
    window.localStorage.removeItem('cosmobrasil_concepts');
    window.localStorage.removeItem('cosmobrasil_questions_count');
  }
} catch (e) {
  // ignore, localStorage may be unavailable in some environments
}

export default function App() {
  // Mobile drawer states
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  
  // Tab view
  const [activeTab, setActiveTab] = useState<'chats' | 'ideas' | 'researches' | 'learnings'>('chats');

  // Welcome message with initialized suggestions
  const initialWelcomeMessage: Message = {
    id: 'welcome',
    role: 'assistant',
    text: `Olá! Sou o **Mentor Circular**.\n\nMeu papel não é apenas responder às suas perguntas de antemão ou entregar soluções prontas.\n\nEstou aqui para ajudá-la a aprimorar seu pensamento crítico, desenvolver hipóteses estratégicas e dominar de forma reflexiva a **Economia Circular**, negócios inteligentes e ecossistemas sustentáveis na CosmoBrasil.\n\nO que você gostaria de investigar ou propor hoje?`,
    timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    suggestions: {
      questions: [
        "Como funciona a metodologia COSMOB?",
        "Quais as dores de estruturar um Plano de Marketing circular?",
        "Qual a diferença prática de um Distrito Circular?"
      ],
      concepts: ["Economia Circular", "Distritos Circulares"],
      hypotheses: ["Simbiose industrial reduz custos em até 30%"]
    }
  };

  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('cosmobrasil_messages');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing saved messages", e);
      }
    }
    return [initialWelcomeMessage];
  });
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
  const [showAttachModal, setShowAttachModal] = useState(false);
  
  // Student evolution state
  const [themes, setThemes] = useState<ThemeExplored[]>(() => {
    const saved = localStorage.getItem('cosmobrasil_themes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });

  const [concepts, setConcepts] = useState<ConceptLearned[]>(() => {
    const saved = localStorage.getItem('cosmobrasil_concepts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });

  // Static positions of nodes inside SVG knowledge graph chart (200x200 grid)
  const [knowledgeNodes, setKnowledgeNodes] = useState<KnowledgeNode[]>([
    { id: 'mentor', label: 'Mentor Circular', x: 100, y: 100, size: 8, group: 'other' },
    { id: 'eco', label: 'Economia Circular', x: 60, y: 70, size: 5, group: 'circular' },
    { id: 'distritos', label: 'Distritos Circulares', x: 50, y: 140, size: 4, group: 'circular' },
    { id: 'marketing', label: 'Plano de Marketing', x: 140, y: 70, size: 4, group: 'business' },
    { id: 'proposta', label: 'Proposição de Valor', x: 150, y: 135, size: 3, group: 'business' },
    { id: 'cosmob', label: 'Certificação COSMOB', x: 100, y: 40, size: 4, group: 'circular' },
    { id: 'sustentabilidade', label: 'Sustentabilidade', x: 100, y: 160, size: 4, group: 'circular' }
  ]);

  const [knowledgeLinks, setKnowledgeLinks] = useState<KnowledgeLink[]>([
    { source: 'mentor', target: 'eco' },
    { source: 'mentor', target: 'marketing' },
    { source: 'mentor', target: 'cosmob' },
    { source: 'mentor', target: 'sustentabilidade' },
    { source: 'eco', target: 'distritos' },
    { source: 'marketing', target: 'proposta' }
  ]);

  // Apply a simple force-directed layout to compute node positions (in 200x200 space)
  const applyForceLayout = (nodesInput: KnowledgeNode[], linksInput: KnowledgeLink[]) => {
    // clone nodes to avoid mutating external references
    const nodes = nodesInput.map(n => ({ ...n }));
    const links = linksInput.map(l => ({ source: l.source, target: l.target }));

    const sim = forceSimulation(nodes as any)
      .force('link', forceLink(links as any).id((d: any) => d.id).distance(28).strength(0.15))
      .force('charge', forceManyBody().strength(-40))
      .force('center', forceCenter(100, 100))
      .force('collide', forceCollide().radius((d: any) => (d.size || 4) + 6))
      .stop();

    // Run deterministic number of ticks to stabilize layout
    for (let i = 0; i < 300; i++) sim.tick();

    // Clamp positions to 10..190
    const clamped = nodes.map(n => ({
      ...n,
      x: Math.max(10, Math.min(190, n.x ?? 100)),
      y: Math.max(10, Math.min(190, n.y ?? 100)),
    }));

    sim.stop();
    return clamped;
  };

  // Count of user questions sent (to animate inquiry status)
  const [questionsCount, setQuestionsCount] = useState<number>(() => {
    const saved = localStorage.getItem('cosmobrasil_questions_count');
    if (saved) {
      const num = parseInt(saved, 10);
      if (!isNaN(num)) return num;
    }
    return 1;
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest chat node
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // Ensure persisted state is cleared on client mount.
  // Module-level clearing may not run in all bundlers/SSRs, so also clear here and force-reset UI state
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('cosmobrasil_messages');
        window.localStorage.removeItem('cosmobrasil_themes');
        window.localStorage.removeItem('cosmobrasil_concepts');
        window.localStorage.removeItem('cosmobrasil_questions_count');
      }
    } catch (e) {
      // ignore
    }

    // Force-reset React state so UI starts clean for every user
    setMessages([initialWelcomeMessage]);
    setThemes([]);
    setConcepts([]);
    setQuestionsCount(1);
  }, []);

  // Save evolution states to localStorage
  useEffect(() => {
    localStorage.setItem('cosmobrasil_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('cosmobrasil_themes', JSON.stringify(themes));
  }, [themes]);

  useEffect(() => {
    localStorage.setItem('cosmobrasil_concepts', JSON.stringify(concepts));
  }, [concepts]);

  useEffect(() => {
    localStorage.setItem('cosmobrasil_questions_count', questionsCount.toString());
  }, [questionsCount]);

  const handleResetChat = () => {
    if (window.confirm("Deseja realmente limpar seu progresso cognitivo e reiniciar a conversa?")) {
      localStorage.removeItem('cosmobrasil_messages');
      localStorage.removeItem('cosmobrasil_themes');
      localStorage.removeItem('cosmobrasil_concepts');
      localStorage.removeItem('cosmobrasil_questions_count');
      
      setMessages([initialWelcomeMessage]);
      setThemes([]);
      setConcepts([]);
      setQuestionsCount(1);
    }
  };

  // Auto-resize search bar
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  // Auto detect keywords and update cockpit values organically
  const runEvolutionEngine = (text: string) => {
    const term = text.toLowerCase();
    
    // Update concepts mastery levels
    let updatedConcepts = [...concepts];
    let shouldUpdateGraph = false;

    if (term.includes('marketing') || term.includes('plano') || term.includes('venda') || term.includes('público')) {
      updatedConcepts = updatedConcepts.map(c => 
        (c.id === 'marketing' || c.id === 'proposta') ? { ...c, progress: Math.min(c.progress + 15, 100) } : c
      );
      shouldUpdateGraph = true;
    }

    if (term.includes('distrito') || term.includes('território') || term.includes('industrial') || term.includes('simbiose')) {
      updatedConcepts = updatedConcepts.map(c => 
        (c.id === 'distritos') ? { ...c, progress: Math.min(c.progress + 20, 100) } : c
      );
      shouldUpdateGraph = true;
    }

    if (term.includes('cosmob') || term.includes('certifica')) {
      updatedConcepts = updatedConcepts.map(c => 
        (c.id === 'cosmob') ? { ...c, progress: Math.min(c.progress + 25, 100) } : c
      );
      shouldUpdateGraph = true;
    }

    if (term.includes('circular') || term.includes('economia') || term.includes('sustentável') || term.includes('recurso')) {
      updatedConcepts = updatedConcepts.map(c => 
        (c.id === 'eco') ? { ...c, progress: Math.min(c.progress + 10, 100) } : c
      );
      shouldUpdateGraph = true;
    }

    setConcepts(updatedConcepts);

    // Dynamic additions of explored tags
    const potentialTags = [
      { name: 'Planos de Negócio', keywords: ['negócio', 'empresa', 'plano', 'financeiro'] },
      { name: 'Simbiose Industrial', keywords: ['simbiose', 'distrito', 'fábrica', 'partilha'] },
      { name: 'Proposta de Valor Verde', keywords: ['valor', 'diferencial', 'green', 'propósito'] },
      { name: 'Certificação COSMOB', keywords: ['cosmob', 'selo', 'auditoria'] },
      { name: 'Ciclo Fechado', keywords: ['ciclo', 'reverso', 'resíduo', 'lixo'] }
    ];

    potentialTags.forEach(tag => {
      const match = tag.keywords.some(kw => term.includes(kw));
      if (match) {
        setThemes(prev => {
          if (prev.some(t => t.name === tag.name)) {
            return prev.map(t => t.name === tag.name ? { ...t, count: t.count + 1 } : t);
          } else {
            const newTheme = { id: Date.now().toString(), name: tag.name, count: 1 };
            return [...prev, newTheme];
          }
        });
      }
    });

    if (shouldUpdateGraph) {
      // Slightly animate nodes coordinates to show organic graph growth
      setKnowledgeNodes(prev => prev.map(node => {
        if (node.id === 'mentor') return node;
        return {
          ...node,
          x: node.x + (Math.random() * 4 - 2),
          y: node.y + (Math.random() * 4 - 2),
        };
      }));
    }
  };

  // Submit query handler
  const handleInquirySubmit = async (textToSend: string) => {
    if (!textToSend.trim() || isSending) return;

    const query = textToSend.trim();
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Append user message
    const timestampStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: attachedFileName ? `[Arquivo Anexado: ${attachedFileName}]\n\n${query}` : query,
      timestamp: timestampStr
    };

    setMessages(prev => [...prev, userMsg]);
    setIsSending(true);
    setQuestionsCount(prev => prev + 1);

    // Call dynamic evolution evaluation
    runEvolutionEngine(query);

    // Clear attachment state once sent
    setAttachedFileName(null);

    try {
      const chatPayload = [...messages, userMsg].map(m => ({
        role: m.role,
        text: m.text
      }));

      // Resolve API endpoint depending on environment:
      // - During local development (Vite + Express middleware) the endpoint is `/api/chat`.
      // - In many serverless hosting environments (Netlify) the function will be exposed at `/.netlify/functions/chat`.
      const chatEndpoint = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
        ? '/api/chat'
        : (import.meta.env.PROD ? '/.netlify/functions/chat' : '/api/chat');

      // Try streaming approach: open SSE and append tokens progressively if supported
      const useStream = true; // enable streaming by default
      if (useStream && typeof window !== 'undefined' && 'EventSource' in window) {
        // Use EventSource-compatible endpoint
        const esUrl = chatEndpoint;
        // Initiate fetch to server with stream flag; server will respond as text/event-stream
        const streamRes = await fetch(esUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream'
          },
          body: JSON.stringify({ messages: chatPayload, stream: true })
        });

        if (!streamRes.ok) throw new Error('Falha ao iniciar stream');

        const reader = streamRes.body!.getReader();
        const decoder = new TextDecoder();
        let partial = '';
        const tempId = `assistant-${Date.now()}`;
        // append a placeholder assistant message that'll be updated progressively
        setMessages(prev => [...prev, { id: tempId, role: 'assistant', text: '...', timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }]);

        // collect suggested arrays to set at end
        let suggestedQuestions: string[] = [];
        let suggestedConcepts: string[] = [];
        let suggestedHypotheses: string[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          partial += chunk;
          // data segments may contain multiple 'data: ' entries
          const parts = partial.split(/\n\n/);
          // keep last as remainder
          partial = parts.pop() || '';
          for (const part of parts) {
            const m = part.match(/^data:\s*(.*)$/s);
            if (!m) continue;
            try {
              const payload = JSON.parse(m[1]);
              if (payload.type === 'token') {
                // append token to the last assistant message
                setMessages(prev => prev.map(msg => msg.id === tempId ? { ...msg, text: (msg.text || '') + payload.text } : msg));
              } else if (payload.type === 'done') {
                suggestedQuestions = payload.meta?.suggestedQuestions || [];
                suggestedConcepts = payload.meta?.suggestedConcepts || [];
                suggestedHypotheses = payload.meta?.suggestedHypotheses || [];
              }
            } catch (e) {
              // ignore parse errors
            }
          }
        }

        // finalize: update suggestions on the last message
        setMessages(prev => prev.map(msg => msg.id === tempId ? { ...msg, suggestions: { questions: suggestedQuestions, concepts: suggestedConcepts, hypotheses: suggestedHypotheses } } : msg));
      } else {
        const res = await fetch(chatEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ messages: chatPayload })
        });
        if (!res.ok) throw new Error("Falha ao se comunicar com o backend.");
        const data = await res.json();
        const cleaned = normalizeClient(data);
        const assistantMsg: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: cleaned.mentorResponse || "Ocorreu uma pequena flutuação no meu campo integrativo de aprendizado (Sem texto retornado). Mas vamos persistir: o que você pensa a respeito?",
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          suggestions: {
            questions: cleaned.suggestedQuestions || [],
            concepts: cleaned.suggestedConcepts || [],
            hypotheses: cleaned.suggestedHypotheses || []
          }
        };
        setMessages(prev => [...prev, assistantMsg]);
      }

      // no automatic node creation here — nodes are added on user action (click on suggested concepts)

    } catch (err) {
      console.error(err);
      
      // Beautiful built-in client offline response
      const assistantFallbackMsg: Message = {
        id: `assistant-fail-${Date.now()}`,
        role: 'assistant',
        text: `Excelente reflexão! Como seu **Mentor Circular**, quero desafiá-la a analisar o que você acabou de expor.\n\nPara construirmos isso juntos sob a orientação do **CosmoBrasil Learning Lab**, o que você acha que é mais vital no momento: delimitar os canais ecológicos de distribuição física ou testar os ciclos de simbiose industrial com parceiros locais? Como você formularia essa primeira hipótese?`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        suggestions: {
          questions: [
            "Quais as principais barreiras de simbiose em cooperativas?",
            "Como mensurar a maturidade de economia circular?"
          ],
          concepts: ["Simbiose Industrial", "Ciclos Materiais"],
          hypotheses: ["O selo COSMOB melhora a percepção de marca verde em até 40%"]
        }
      };

      setMessages(prev => [...prev, assistantFallbackMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleInquirySubmit(inputText);
    }
  };

  // Add a node for a suggested concept when user clicks the concept chip
  const addNodeForConcept = (concept: string) => {
    if (!concept) return;
    // avoid duplicates
    if (knowledgeNodes.some(n => n.label === concept)) return;

    const id = `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const initialNode: KnowledgeNode = {
      id,
      label: concept,
      x: 100 + (Math.random() * 80 - 40),
      y: 100 + (Math.random() * 80 - 40),
      size: 0,
      group: /simbiose|ciclo|circular|sustentabilidade/i.test(concept) ? 'circular' : 'business'
    };

    // append with size 0 then expand and run layout
    setKnowledgeNodes(prev => {
      const merged = [...prev, initialNode];
      // add link from mentor
      setKnowledgeLinks(prevLinks => [...prevLinks, { source: 'mentor', target: id }]);
      // schedule growth
      setTimeout(() => {
        setKnowledgeNodes(current => current.map(n => n.id === id ? { ...n, size: 4 } : n));
        // apply layout
        setTimeout(() => {
          setKnowledgeNodes(curr => applyForceLayout(curr, [...knowledgeLinks, { source: 'mentor', target: id }]));
        }, 120);
      }, 40);

      return merged;
    });
  };

  // Render markdown tags preview simplified for MVP 1
  const renderMarkdownFormatted = (text: string) => {
    return text.split('\n\n').map((paragraph, index) => {
      // Very basic formatting converter for preview aesthetics
      let formatted = paragraph.replace(/\*\*(.*?)\*\*/g, '<b class="text-[#bac9cd] font-[600]">$1</b>');
      formatted = formatted.replace(/\*(.*?)\*/g, '<em class="text-[#bac9cd]/90 font-serif italic">$1</em>');
      
      // If starts with list format
      if (paragraph.trim().startsWith('1.') || paragraph.trim().startsWith('-')) {
        return (
          <div key={index} className="pl-4 my-2 text-on-surface opacity-90 leading-relaxed font-sans" dangerouslySetInnerHTML={{ __html: formatted }} />
        );
      }

      return (
        <p
          key={index}
          className="text-on-surface opacity-90 leading-relaxed font-sans text-sm md:text-base"
          dangerouslySetInnerHTML={{ __html: formatted }}
        />
      );
    });
  };

  // Simulation upload file handling
  const handleSimulateAttach = (fileName: string) => {
    setAttachedFileName(fileName);
    setShowAttachModal(false);
  };

  return (
    <div className="min-h-screen text-on-surface font-sans flex flex-col antialiased">
      {/* Top Header Navigation Bar */}
      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl border-b border-white/5 flex justify-between items-center px-gutter h-16">
        <div className="flex items-center gap-4">
          <button
            id="toggle-left-drawer-btn"
            className="text-primary hover:opacity-80 transition-opacity p-1.5 rounded-md hover:bg-white/5"
            onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
          >
            <Menu size={20} />
          </button>
          
          <div className="flex flex-col">
            <h1 className="font-serif text-lg md:text-xl font-bold text-primary leading-none tracking-tight">
              Cosmobrasil Learning Lab
            </h1>
            <p className="text-xs text-on-surface-variant font-sans opacity-70 hidden md:block mt-1">
              Aprenda, questione, construa.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Static informational metrics for high academic feel */}
              <div className="hidden lg:flex items-center gap-6 text-xs text-on-surface-variant font-medium">
            <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full">
              <Clock size={12} className="text-secondary" />
              <span>MVP1 - Versão Beta</span>
            </span>
          </div>

          {/* Collapsible evolution visual trigger on smaller media screens */}
          <button
            id="toggle-right-drawer-btn"
            className="lg:hidden text-primary hover:opacity-80 p-1.5 rounded-md hover:bg-white/5"
            onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
          >
            <Brain size={20} />
          </button>

          {/* User profile capsule with natural professional illumination */}
          <div className="w-9 h-9 rounded-full overflow-hidden border border-white/10 flex-shrink-0">
            <img
              alt="Estudante Universitária"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDbYtN4l4ipQ-cOYWZSkNGf1XMDAblDV5stICrNRneVirHpQRPzh_IWqgEcRgaYBBe844PKkKVWRMRR6wPQ-Y-Bifb1D867mPH3bFWK-xpjL9aC1iopqvZVnYJMBrAre6nGDR2l_qULgRxtHY-KR6VIf1AYisCFXwyXiKHDHRBbveADZrZkSKk9XHVdG4A8gZjou37vYnZl8XMlO--zsn8pUGXAEkNWaA9ooD0vpFBj5eXwvXhOKItOdeE11KrCs9DK8G4rfTqHXQ"
            />
          </div>
        </div>
      </header>

      {/* Primary Sidebars */}
      <LeftSidebar
        isOpen={leftSidebarOpen}
        onToggle={() => setLeftSidebarOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onResetChat={handleResetChat}
      />

      <RightSidebar
        isOpen={rightSidebarOpen}
        onToggle={() => setRightSidebarOpen(false)}
        themes={themes}
        concepts={concepts}
        nodes={knowledgeNodes}
        links={knowledgeLinks}
        onSelectTag={(tagName) => {
          setInputText(`Gostaria de investigar em detalhes o tema de: ${tagName}`);
          if (textareaRef.current) {
            textareaRef.current.focus();
          }
        }}
        questionsCount={questionsCount}
      />

      {/* Main Structural Frame container */}
      <main className="lg:pl-64 lg:pr-80 pt-16 h-screen flex flex-col overflow-hidden bg-background">
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-6 md:px-8">
          <div className="max-w-3xl mx-auto space-y-8 pt-4 pb-20">
            {activeTab === 'chats' ? (
              <>
                {/* Conversations Loop */}
                {messages.map((message) => {
                  const isAssistant = message.role === 'assistant';
                  return (
                    <div
                      key={message.id}
                      id={`msg-node-${message.id}`}
                      className={`flex gap-4 ${isAssistant ? '' : 'justify-end'}`}
                    >
                      {/* Avatar icon inside bubble layout */}
                      {isAssistant && (
                        <div className="w-8 h-8 rounded-full border border-secondary/20 bg-secondary/5 flex items-center justify-center flex-shrink-0 relative">
                          <span className="w-2 h-2 rounded-full bg-secondary-fixed-dim absolute top-0.5 right-0.5 animate-pulse" />
                          <Brain size={14} className="text-secondary" />
                        </div>
                      )}

                      <div className={`max-w-[85%] space-y-3 ${isAssistant ? '' : 'text-right'}`}>
                        {/* Bubble body with proper typography matches */}
                        <div
                          className={`rounded-2xl px-5 py-4 ${
                            isAssistant
                              ? 'bg-[#1a1c1f]/50 border border-white/5 font-serif text-[#e2e2e6] text-sm md:text-base leading-relaxed'
                              : 'bg-surface-container-high border border-white/5 inline-block text-left text-on-surface text-sm md:text-base font-sans'
                          }`}
                        >
                          <div className="markdown-body space-y-2">
                            {renderMarkdownFormatted(message.text)}
                          </div>
                          
                          <span className="block text-[10px] text-on-surface-variant font-mono text-right opacity-40 mt-3">
                            {message.timestamp}
                          </span>
                        </div>

                        {/* Expandable dynamically suggested cognitive tags */}
                        {isAssistant && message.suggestions && (
                          <div className="space-y-2 pt-2 text-left">
                            {/* Suggested Questions */}
                            {message.suggestions.questions.length > 0 && (
                              <div className="space-y-1.5" id={`sug-${message.id}-questions-box`}>
                                <span className="text-[10px] uppercase font-semibold text-secondary tracking-widest pl-1 block">
                                  Próxima Investigação recomendada
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {message.suggestions.questions.map((question, i) => (
                                    <button
                                      key={i}
                                      id={`question-chip-${message.id}-${i}`}
                                      onClick={() => handleInquirySubmit(question)}
                                      className="text-left text-xs bg-secondary/5 hover:bg-secondary/15 text-secondary border border-secondary/15 hover:border-secondary/35 py-1.5 px-3 rounded-lg transition-all duration-200 cursor-pointer font-sans"
                                    >
                                      {question}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Suggested Concepts / Hypotheses */}
                            {(message.suggestions.concepts.length > 0 || message.suggestions.hypotheses.length > 0) && (
                              <div className="flex flex-wrap gap-2 pt-2">
                                {message.suggestions.concepts.map((concept, i) => (
                                  <button
                                    key={i}
                                    id={`concept-badge-${message.id}-${i}`}
                                    onClick={() => addNodeForConcept(concept)}
                                    className="text-[10px] font-mono bg-white/5 border border-white/5 text-on-surface-variant px-2.5 py-1 rounded-md flex items-center gap-1.5 hover:bg-white/10 hover:border-secondary/30"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
                                    Pesquisa: {concept}
                                  </button>
                                ))}

                                {message.suggestions.hypotheses.map((hyp, i) => (
                                  <div
                                    key={i}
                                    id={`hypothesis-badge-${message.id}-${i}`}
                                    className="text-[10px] font-mono bg-[#0d1b1e]/60 border border-secondary/10 text-[#85d7b5] px-2.5 py-1 rounded-md flex items-center gap-1.5"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed-dim" />
                                    Hipótese: {hyp}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Response Loader */}
                {isSending && (
                  <div className="flex gap-4" id="assistant-typing-loader">
                    <div className="w-8 h-8 rounded-full border border-secondary/20 bg-secondary/5 flex items-center justify-center flex-shrink-0 animate-pulse">
                      <Brain size={14} className="text-secondary" />
                    </div>
                    <div className="glass-panel rounded-2xl px-5 py-4 w-40 flex items-center gap-1.5">
                      <div className="h-2 w-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="h-2 w-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="h-2 w-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Informational Mock sections corresponding to tabs to keep UX polished in MVP 1 */
              <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4" id="auxiliary-tab-view">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 bg-secondary/10 rounded-xl text-secondary">
                    <Sparkles size={20} />
                  </span>
                  <div>
                    <h3 className="text-lg font-serif font-semibold text-primary capitalize">
                      {activeTab === 'ideas' ? 'Banco de Ideias Circulares' : activeTab === 'researches' ? 'Biblioteca de Pesquisas' : 'Trilha de Aprendizados'}
                    </h3>
                    <p className="text-xs text-on-surface-variant font-sans opacity-70">
                      Integração exclusiva CosmoBrasil para desenvolvimento de relatórios reais.
                    </p>
                  </div>
                </div>
                <div className="h-px bg-white/5 w-full my-1"></div>
                <p className="font-sans text-sm text-on-surface opacity-85 leading-relaxed">
                  No MVP 1 do Learning Lab, os quadros de conceitos e relatórios são alimentados diretamente pelo mapeamento orientativo realizado na aba **Conversas**. À medida que você interage com o Mentor Circular, este espaço consolidará seus materiais de trabalho refinados.
                </p>
                
                {/* Visual Placeholder Cards for High Craft aesthetic */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                  <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center gap-3">
                    <div className="w-2 h-10 bg-secondary rounded-full" />
                    <div>
                      <h4 className="text-xs font-semibold text-on-surface font-sans">Simbiose Industrial Metropolitana</h4>
                      <p className="text-[10px] text-on-surface-variant">Conectado na última reflexão • Ativo</p>
                    </div>
                  </div>
                  <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center gap-3 opacity-60">
                    <div className="w-2 h-10 bg-tertiary rounded-full" />
                    <div>
                      <h4 className="text-xs font-semibold text-on-surface font-sans">Selo Verde COSMOB Métricas</h4>
                      <p className="text-[10px] text-on-surface-variant">Pesquisa de campo planejada</p>
                    </div>
                  </div>
                </div>

                <button
                  id="back-to-chat-btn"
                  onClick={() => setActiveTab('chats')}
                  className="mt-4 flex items-center gap-1 text-xs text-secondary font-semibold hover:opacity-80 cursor-pointer"
                >
                  <span>Voltar para Investigações Ativas</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Minimalist Fixed Bottom Prompt Input Control area */}
        <div className="border-t border-white/5 bg-background px-4 py-4 md:py-6 relative z-20">
          <div className="max-w-3xl mx-auto space-y-3">
            {/* Dynamic context pill showing file attached */}
            {attachedFileName && (
              <div
                id="attachment-pill-indicator"
                className="inline-flex items-center gap-2 bg-[#0d1b1e] border border-secondary/20 text-secondary text-xs px-3 py-1.5 rounded-lg font-sans"
              >
                <FileText size={14} className="text-secondary" />
                <span>Contexto: <strong className="font-semibold">{attachedFileName}</strong></span>
                <button
                  onClick={() => setAttachedFileName(null)}
                  className="p-0.5 hover:bg-white/5 rounded-md text-on-surface-variant hover:text-white"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Writing Field border styled dynamically on focus */}
            <div className="writing-space border-b border-white/10 pb-2 flex items-end gap-3 group transition-all duration-300">
              <div className="flex-1">
                <textarea
                  ref={textareaRef}
                  id="prompt-input"
                  rows={1}
                  value={inputText}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isSending 
                      ? "Processando hipóteses..." 
                      : "Escreva uma reflexão ou questionamento..."
                  }
                  disabled={isSending}
                  className="w-full bg-transparent border-none text-[#e2e2e6] placeholder-[#c3c7c9]/40 resize-none max-h-48 custom-scrollbar py-2 text-sm md:text-base font-sans outline-none focus:outline-none focus:ring-0 active:ring-0"
                  style={{ minHeight: '38px' }}
                />
              </div>

              {/* Functional inputs */}
              <div className="flex items-center gap-2 mb-1.5 flex-shrink-0">
                <button
                  id="trigger-attach-btn"
                  onClick={() => setShowAttachModal(true)}
                  className="p-1.5 text-on-surface-variant hover:text-secondary hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                  title="Anexar rascunhos para orientação"
                >
                  <Paperclip size={18} />
                </button>
                <button
                  id="submit-prompt-btn"
                  onClick={() => handleInquirySubmit(inputText)}
                  disabled={isSending || !inputText.trim()}
                  className="w-10 h-10 rounded-full bg-secondary text-on-secondary flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-secondary/10 disabled:opacity-40 disabled:hover:scale-100 cursor-pointer"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>

            {/* Meta info labels matching reference aesthetics */}
            <div className="flex justify-between items-center text-[10px] md:text-xs text-on-surface-variant pl-1">
              <div className="flex gap-4">
                <span className="flex items-center gap-1.5 opacity-60">
                  <Sparkles size={11} className="text-secondary" />
                  Modo Síntese
                </span>
                <span className="flex items-center gap-1.5 opacity-60">
                  <CheckCircle2 size={11} className="text-secondary" />
                  Fontes Acadêmicas
                </span>
              </div>
              <span className="opacity-40 select-none">Pressione Enter ou clique no envio</span>
            </div>
          </div>
        </div>
      </main>

      {/* Simulated File Attachment Modal */}
      {showAttachModal && (
        <div id="attach-modal-overlay" className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="glass-panel max-w-sm w-full rounded-2xl p-6 border border-white/10 space-y-4" id="attach-modal-box">
            <div className="flex justify-between items-center">
              <h3 className="font-serif text-lg font-bold text-primary flex items-center gap-2">
                <Paperclip size={18} className="text-secondary" />
                Anexar rascunhos
              </h3>
              <button
                onClick={() => setShowAttachModal(false)}
                className="text-on-surface-variant hover:text-white p-1 rounded-md"
              >
                <X size={16} />
              </button>
            </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
              Considere anexar um documento de apoio para subsidiar seu ciclo de pesquisa. Nós forneceremos orientações integradas de sustentabilidade.
            </p>
            <div className="space-y-2 pt-1 font-sans">
              <button
                id="attach-sim-1"
                onClick={() => handleSimulateAttach('Plano_Marketing_Rascunho_V1.pdf')}
                className="w-full text-left p-3 rounded-xl bg-white/5 border border-white/5 hover:border-secondary/30 hover:bg-white/10 transition-all flex items-center gap-3 text-xs"
              >
                <FileText size={16} className="text-secondary" />
                <div className="flex-1">
                  <div className="font-semibold text-on-surface">Plano_Marketing_Rascunho_V1.pdf</div>
                  <div className="text-[10px] text-on-surface-variant">Plano preliminar de posicionamento verde</div>
                </div>
              </button>
              <button
                id="attach-sim-2"
                onClick={() => handleSimulateAttach('Simbiose_Industrial_Distritos.pdf')}
                className="w-full text-left p-3 rounded-xl bg-white/5 border border-white/5 hover:border-secondary/30 hover:bg-white/10 transition-all flex items-center gap-3 text-xs"
              >
                <FileText size={16} className="text-secondary" />
                <div className="flex-1">
                  <div className="font-semibold text-on-surface">Simbiose_Industrial_Distritos.pdf</div>
                  <div className="text-[10px] text-on-surface-variant">Fluxogramas energéticos industriais</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
