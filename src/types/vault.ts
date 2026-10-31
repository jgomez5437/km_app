export interface Note {
  id: string;
  title: string;
  content: string; // Markdown or HTML representation
  folder?: string;
  tags: string[];
  links: string[]; // IDs or titles of referenced notes
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
}

export interface Folder {
  id: string;
  name: string;
  parentId?: string;
}

export interface GraphNode {
  id: string;
  title: string;
  val: number; // Node size based on link connections
  group: string; // e.g. folder or primary tag
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphLink {
  source: string;
  target: string;
}

export interface BacklinkItem {
  noteId: string;
  noteTitle: string;
  contextSnippet: string;
}

export interface AISettings {
  provider: 'local-ollama' | 'openai' | 'gemini' | 'anthropic';
  apiKey?: string;
  endpoint?: string;
  model: string;
}
