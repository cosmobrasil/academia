import React, { useState } from 'react';
import { Award, BrainCircuit, Activity, Tag, HelpCircle, Network } from 'lucide-react';
import { ThemeExplored, ConceptLearned, KnowledgeNode, KnowledgeLink } from '../types';

interface RightSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  themes: ThemeExplored[];
  concepts: ConceptLearned[];
  nodes: KnowledgeNode[];
  links: KnowledgeLink[];
  onSelectTag: (tagName: string) => void;
  questionsCount: number;
}

export default function RightSidebar({
  isOpen,
  onToggle,
  themes,
  concepts,
  nodes,
  links,
  onSelectTag,
  questionsCount,
}: RightSidebarProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Frequency array for inquiry metric indicator dots
  const freqPips = Array.from({ length: 7 });

  const getNodeInfo = (id: string) => {
    switch (id) {
      case 'mentor':
        return 'Mentor Orientador Principal da CosmoBrasil';
      case 'eco':
        return 'Economia Circular: Fluxos biológicos e materiais sustentáveis';
      case 'marketing':
        return 'Plano de Marketing: Posicionamento estratégico e branding verde';
      case 'distritos':
        return 'Distritos Circulares: Territórios inteligentes de simbiose industrial';
      case 'cosmob':
        return 'Certificação COSMOB: Selo e governança de impacto CosmoBrasil';
      case 'sustentabilidade':
        return 'Sustentabilidade: Preservação de recursos e neutralidade ecológica';
      case 'proposta':
        return 'Proposição de Valor: Ofertas circulares focadas nas reais dores das pessoas';
      default:
        return 'Conceito explorado da jornada acadêmica';
    }
  };

  return (
    <>
      {/* Sidebar overlay for smaller screens */}
      {isOpen && (
        <div
          id="right-sidebar-overlay"
          className="fixed inset-0 bg-[#0c0e11]/80 backdrop-blur-sm z-30 lg:hidden transition-opacity duration-300"
          onClick={onToggle}
        />
      )}

      <aside
        id="right-sidebar"
        className={`fixed right-0 top-0 h-full w-80 z-40 bg-surface-container-low border-l border-white/5 pt-20 px-6 pb-6 flex flex-col transition-transform duration-300 ease-in-out overflow-y-auto custom-scrollbar ${
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <h2 className="font-serif text-xl font-bold text-[#bac9cd] mb-6">Minha Evolução</h2>

        <div className="space-y-8 flex-1">
          {/* Temas Explorados */}
          <section id="evolution-themes-sec" className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-tertiary-fixed-dim font-sans flex items-center gap-2">
                <Tag size={14} className="text-tertiary" />
                <span>Temas Explorados</span>
              </h3>
              <span className="text-xs font-semibold text-on-surface-variant font-mono bg-white/5 px-2 py-0.5 rounded-full">
                {themes.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  id={`theme-badge-${theme.id}`}
                  onClick={() => onSelectTag(theme.name)}
                  className="px-2.5 py-1 rounded-full bg-tertiary/10 text-tertiary text-xs font-sans font-medium border border-tertiary/10 hover:border-tertiary/30 hover:bg-tertiary/20 cursor-pointer transition-all duration-200"
                >
                  {theme.name}
                </button>
              ))}
            </div>
          </section>

          {/* Conceitos Aprendidos */}
          <section id="evolution-concepts-sec" className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-tertiary-fixed-dim font-sans flex items-center gap-2">
              <Award size={14} className="text-tertiary" />
              <span>Conceitos Dominados</span>
            </h3>
            <div className="space-y-3">
              {concepts.map((concept) => (
                <div key={concept.id} id={`concept-progress-${concept.id}`} className="relative group">
                  <div className="flex justify-between text-xs font-sans mb-1">
                    <span className="text-on-surface opacity-90 group-hover:text-primary transition-colors">
                      {concept.name}
                    </span>
                    <span className="text-tertiary font-medium">{concept.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-tertiary rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(193,193,255,0.4)]"
                      style={{ width: `${concept.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Perguntas Realizadas */}
          <section id="evolution-questions-sec" className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-tertiary-fixed-dim font-sans flex items-center gap-2">
              <HelpCircle size={14} className="text-tertiary" />
              <span>Investigações Socráticas</span>
            </h3>
            <div className="flex items-center gap-3 bg-[#0d1b1e]/30 border border-white/5 p-3 rounded-lg">
              <div className="flex gap-1.5 items-center">
                {freqPips.map((_, i) => {
                  const active = i < Math.min(questionsCount, 7);
                  return (
                    <div
                      key={i}
                      className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                        active
                          ? 'bg-secondary-fixed-dim shadow-[0_0_6px_#85d7b5] scale-110'
                          : 'bg-secondary-fixed-dim/20'
                      }`}
                    />
                  );
                })}
              </div>
              <span className="text-xs font-sans text-on-surface-variant font-medium ml-auto">
                {questionsCount === 0
                  ? 'Iniciando...'
                  : questionsCount > 4
                  ? 'Frequência Alta'
                  : 'Explorando'}
              </span>
            </div>
          </section>

          {/* Interactive Knowledge Graph */}
          <section id="evolution-graph-sec" className="pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-tertiary-fixed-dim font-sans flex items-center gap-2 mb-3">
              <Network size={14} className="text-tertiary" />
              <span>Grafo de Conhecimento</span>
            </h3>
            <div className="glass-panel aspect-square rounded-2xl overflow-hidden relative group cursor-crosshair flex flex-col justify-between p-3 border border-white/5">
              <div className="absolute inset-0 mentor-orb pointer-events-none opacity-40"></div>

              {/* Dynamic SVG Neural Connections Graph */}
              <svg className="w-full h-full min-h-[160px] z-10" viewBox="0 0 200 200">
                {/* Draw links first so they reside behind nodes */}
                {links.map((link, idx) => {
                  const sourceNode = nodes.find((n) => n.id === link.source);
                  const targetNode = nodes.find((n) => n.id === link.target);
                  if (!sourceNode || !targetNode) return null;

                  const isHighlighted =
                    hoveredNode === sourceNode.id || hoveredNode === targetNode.id;

                  return (
                    <line
                      key={`link-${idx}`}
                      x1={sourceNode.x}
                      y1={sourceNode.y}
                      x2={targetNode.x}
                      y2={targetNode.y}
                      stroke={isHighlighted ? '#85d7b5' : 'rgba(133, 215, 181, 0.15)'}
                      strokeWidth={isHighlighted ? 0.75 : 0.4}
                      className="transition-all duration-300"
                    />
                  );
                })}

                {/* Draw nodes */}
                {nodes.map((node) => {
                  const isHovered = hoveredNode === node.id;
                  const isMainOrb = node.id === 'mentor';
                  const highlightColor = isMainOrb
                    ? '#85d7b5'
                    : node.group === 'circular'
                    ? '#c1c1ff'
                    : '#bac9cd';

                  return (
                    <g
                      key={node.id}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                    >
                      {/* Outer reactive aura */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.size + (isHovered ? 4 : 2)}
                        fill={highlightColor}
                        opacity={isHovered ? 0.25 : 0.05}
                        className="transition-all duration-300"
                      />
                      {/* Core node spot */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={isHovered ? node.size + 1.5 : node.size}
                        fill={isHovered ? highlightColor : isMainOrb ? '#85d7b5' : 'rgba(255,255,255,0.7)'}
                        className="transition-all duration-300"
                        style={{
                          filter: isHovered || isMainOrb ? `drop-shadow(0 0 4px ${highlightColor})` : 'none',
                        }}
                      />
                      {/* Label next to node: short concept word for clarity */}
                      <text
                        x={node.x + node.size + 4}
                        y={node.y + 4}
                        fontSize={isHovered ? 7 : 6}
                        fill={isHovered ? highlightColor : 'rgba(226,226,230,0.9)'}
                        style={{ pointerEvents: 'none', opacity: isHovered || isMainOrb ? 1 : 0, fontFamily: 'sans-serif', transition: 'opacity 200ms' }}
                      >
                        {node.label.length > 14 ? node.label.slice(0, 12) + '…' : node.label}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Live tooltip */}
              <div className="z-10 text-center px-1 py-1 bg-[#111316]/90 border border-white/5 rounded-md min-h-[44px] flex items-center justify-center transition-all duration-200">
                <p className="text-[10px] font-sans text-on-surface-variant font-medium leading-normal">
                  {hoveredNode
                    ? getNodeInfo(hoveredNode)
                    : 'Passe o cursor sobre os nós para inspecionar conexões cognitivas'}
                </p>
              </div>
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}
