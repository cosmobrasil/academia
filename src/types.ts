export interface Suggestion {
  type: 'question' | 'concept' | 'hypothesis';
  label: string;
}

export interface MessageSuggestions {
  questions: string[];
  concepts: string[];
  hypotheses: string[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestions?: MessageSuggestions;
}

export interface ThemeExplored {
  id: string;
  name: string;
  count: number;
}

export interface ConceptLearned {
  id: string;
  name: string;
  progress: number; // percentage 0-100
}

export interface KnowledgeNode {
  id: string;
  label: string;
  x: number;
  y: number;
  size: number;
  group: 'circular' | 'business' | 'other';
}

export interface KnowledgeLink {
  source: string;
  target: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
}
