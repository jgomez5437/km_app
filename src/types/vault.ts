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

export interface AISettings {
  provider: 'local-ollama' | 'openai' | 'gemini' | 'anthropic';
  apiKey?: string;
  endpoint?: string;
  model: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}
