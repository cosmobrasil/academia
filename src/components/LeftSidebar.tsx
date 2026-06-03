import { Menu, Lightbulb, Search, BookOpen, MessageSquare, GraduationCap, Star, RefreshCw } from 'lucide-react';

interface LeftSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onResetChat: () => void;
}

export default function LeftSidebar({ isOpen, onToggle, activeTab, setActiveTab, onResetChat }: LeftSidebarProps) {
  const menuItems = [
    { id: 'chats', label: 'Conversas', icon: MessageSquare },
    { id: 'ideas', label: 'Ideias', icon: Lightbulb },
    { id: 'researches', label: 'Pesquisas', icon: Search },
    { id: 'learnings', label: 'Aprendizados', icon: BookOpen },
  ];

  return (
    <>
      {/* Sidebar overlay for smaller screens when open */}
      {isOpen && (
        <div
          id="left-sidebar-overlay"
          className="fixed inset-0 bg-[#0c0e11]/80 backdrop-blur-sm z-30 lg:hidden transition-opacity duration-300"
          onClick={onToggle}
        />
      )}

      <aside
        id="left-sidebar"
        className={`fixed left-0 top-0 h-full w-64 z-40 bg-surface-container border-r border-white/5 pt-20 pb-4 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="px-6 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold text-primary">Navegação</h2>
            <button
              id="close-left-sidebar-btn"
              onClick={onToggle}
              className="lg:hidden text-on-surface-variant hover:text-white transition-colors"
            >
              <Menu size={18} />
            </button>
          </div>
          <div className="h-px w-full bg-white/5 mt-3"></div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-tab-${item.id}`}
                onClick={() => {
                  setActiveTab(item.id);
                  // Close on mobile
                  if (window.innerWidth < 1024) {
                    onToggle();
                  }
                }}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg font-sans text-sm transition-all duration-200 group text-left ${
                  isActive
                    ? 'text-secondary font-semibold bg-secondary/5 border-l-2 border-secondary'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                <Icon
                  size={18}
                  className={`transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? 'text-secondary' : 'text-on-surface-variant group-hover:text-primary'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto px-4 py-3 space-y-3 pb-6">
          <button
            id="reset-chat-btn"
            onClick={onResetChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-500/20 hover:border-red-500/40 bg-red-500/5 hover:bg-red-500/10 text-red-400 hover:text-red-300 font-sans text-xs font-semibold transition-all duration-200 cursor-pointer"
          >
            <RefreshCw size={12} />
            <span>Reiniciar Investigação</span>
          </button>

          <div className="glass-panel p-4 rounded-xl flex items-center gap-3">
            <div className="relative flex h-3.5 w-3.5">
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-secondary-fixed-dim"></span>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary-fixed-dim opacity-75"></span>
            </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-secondary-fixed-dim leading-none">Mentor Ativo</span>
                <span className="text-[10px] text-on-surface-variant leading-tight mt-0.5">Orientador (CosmoBrasil)</span>
              </div>
          </div>
        </div>
      </aside>
    </>
  );
}
