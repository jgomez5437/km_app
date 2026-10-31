export interface Note {
  id: string;
  title: string;
  content: string; // Markdown representation
  folderId?: string; // Optional parent folder ID
  parentId?: string; // Optional parent note ID for nested subpages
  tags?: string[];
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
}

export interface Folder {
  id: string;
  name: string;
  color?: string;
  createdAt?: number;
}

export interface GraphNode {
  id: string;
  title: string;
  val: number; // Node size
  group: string;
  nodeType?: 'folder' | 'note' | 'subpage';
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphLink {
  source: string;
  target: string;
}

export interface AISettings {
  provider: 'local-ollama' | 'openai' | 'gemini' | 'anthropic';
  apiKey?: string;
  endpoint?: string;
  model: string;
}
