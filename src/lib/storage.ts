import { Note, Folder, AuthUser } from "@/types/vault";

const VAULT_STORAGE_KEY = "nexus_vault_notes_v3";
const FOLDERS_STORAGE_KEY = "nexus_vault_folders_v3";

export const INITIAL_SAMPLE_FOLDERS: Folder[] = [
  { id: "getting-started", name: "Getting Started", color: "#a855f7" },
  { id: "architecture", name: "Architecture", color: "#3b82f6" },
  { id: "ai-research", name: "AI & Research", color: "#10b981" },
];

export const INITIAL_SAMPLE_NOTES: Note[] = [
  {
    id: "welcome-to-nexus",
    title: "Welcome to Nexus",
    folderId: "getting-started",
    content: `**Nexus** is an AI-native, local-first knowledge management system engineered to combine the speed of block-based editors with deep intelligence and cloud sync.

### Core Superpowers
- **Folders & Subpages**: Organize your knowledge with clean, nested hierarchies.
- **Local-First & Offline**: Notes are stored directly in your browser's local storage and synced with Neon PostgreSQL.
- **Interactive Knowledge Graph**: Visualize your folders, notes, and subpages as an interconnected universe.
- **AI Intelligence Layer**: Vault-wide semantic retrieval and automated synthesis.

### Quick Navigation
- Use the sidebar on the left to explore folders and create subpages.
- Use the **AI Copilot** in the top right to ask questions across your notes.`,
    tags: ["overview", "guide"],
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 3,
    pinned: true,
  },
  {
    id: "quick-tips",
    title: "Quick Tips & Shortcuts",
    folderId: "getting-started",
    parentId: "welcome-to-nexus",
    content: `Here are 3 quick actions to take right now:

1. **Create a Note**: Click the **+** button in the sidebar header or use the floating button.
2. **Create a Subpage**: Click the **+** icon next to any note in the sidebar or at the bottom of this page.
3. **Explore the Graph**: Switch to the **Graph View** tab in the top bar to inspect your visual mind map.`,
    tags: ["tips", "shortcuts"],
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: "local-first-software",
    title: "Local-First Software",
    folderId: "architecture",
    content: `Local-first software represents a paradigm shift from traditional cloud-only SaaS architectures.

### Principles:
1. **Zero-Latency Edits**: Read and write immediately to local storage without waiting on server roundtrips.
2. **Offline-Capable**: Full functionality even during network drops or in airplane mode.
3. **User Data Ownership**: Data belongs to you, never locked inside proprietary formats.
4. **Seamless Synchronization**: Synchronizes with Neon serverless PostgreSQL when connected.`,
    tags: ["architecture", "local-first"],
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: "neon-cloud-sync",
    title: "Neon Cloud Sync",
    folderId: "architecture",
    parentId: "local-first-software",
    content: `Nexus connects to **Neon Serverless PostgreSQL** for automatic multi-device synchronization.

- Powered by Drizzle ORM and the \`@neondatabase/serverless\` driver.
- Serverless architecture scales to zero when idle and wakes up with zero cold starts.
- Optimistic Last-Write-Wins conflict resolution ensures your latest edits are always preserved.`,
    tags: ["neon", "database", "postgres"],
    createdAt: Date.now() - 86400000 * 1,
    updatedAt: Date.now() - 86400000 * 1,
  },
  {
    id: "ai-knowledge-assistant",
    title: "AI Knowledge Assistant",
    folderId: "ai-research",
    content: `Your personal copilot for synthesizing research across your entire vault.

### Capabilities:
- Ask natural language questions across all your notes.
- Summarize complex conceptual clusters.
- Connects with **Ollama** for 100% private local execution, or OpenAI / Gemini via BYOK (Bring Your Own Key).`,
    tags: ["ai", "assistant"],
    createdAt: Date.now() - 3600000 * 12,
    updatedAt: Date.now() - 3600000 * 12,
  },
];

// Folders Management
export function loadFolders(): Folder[] {
  if (typeof window === "undefined") return INITIAL_SAMPLE_FOLDERS;
  try {
    const raw = localStorage.getItem(FOLDERS_STORAGE_KEY);
    if (!raw) {
      saveFolders(INITIAL_SAMPLE_FOLDERS);
      return INITIAL_SAMPLE_FOLDERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_SAMPLE_FOLDERS;
  } catch (e) {
    console.error("Failed to load folders from localStorage", e);
    return INITIAL_SAMPLE_FOLDERS;
  }
}

export function saveFolders(folders: Folder[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
  } catch (e) {
    console.error("Failed to save folders to localStorage", e);
  }
}

export function createFolder(name: string): Folder {
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `folder-${Date.now()}`;
  return {
    id,
    name,
    createdAt: Date.now(),
  };
}

// Notes Management
export function loadNotes(): Note[] {
  if (typeof window === "undefined") return INITIAL_SAMPLE_NOTES;

  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (!raw) {
      saveNotes(INITIAL_SAMPLE_NOTES);
      return INITIAL_SAMPLE_NOTES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_SAMPLE_NOTES;
  } catch (e) {
    console.error("Failed to load notes from localStorage", e);
    return INITIAL_SAMPLE_NOTES;
  }
}

export function saveNotes(notes: Note[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(notes));
  } catch (e) {
    console.error("Failed to save notes to localStorage", e);
  }
}

export function updateNoteInVault(
  updated: Partial<Note> & { id: string },
  notes: Note[]
): Note[] {
  const nextNotes = notes.map((note) => {
    if (note.id === updated.id) {
      return { ...note, ...updated, updatedAt: Date.now() };
    }
    return note;
  });
  saveNotes(nextNotes);
  return nextNotes;
}

export function createNewNote(
  title = "Untitled Note",
  folderId?: string,
  parentId?: string
): Note {
  const id =
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") ||
    `note-${Date.now()}`;

  return {
    id,
    title,
    content: "Start typing your thoughts here...",
    folderId,
    parentId,
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// Cloud Sync
export async function syncWithCloud(
  currentNotes: Note[],
  currentFolders: Folder[] = []
): Promise<{ notes: Note[]; folders: Folder[]; isCloud: boolean; user?: AuthUser | null }> {
  if (typeof window === "undefined") {
    return { notes: currentNotes, folders: currentFolders, isCloud: false };
  }

  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: currentNotes, folders: currentFolders }),
    });

    if (!res.ok) {
      return { notes: currentNotes, folders: currentFolders, isCloud: false };
    }

    const data = await res.json();
    let updatedNotes = currentNotes;
    let updatedFolders = currentFolders;

    if (data.isCloud) {
      if (Array.isArray(data.notes) && data.notes.length > 0) {
        saveNotes(data.notes);
        updatedNotes = data.notes;
      }
      if (Array.isArray(data.folders) && data.folders.length > 0) {
        saveFolders(data.folders);
        updatedFolders = data.folders;
      }
      return {
        notes: updatedNotes,
        folders: updatedFolders,
        isCloud: true,
        user: data.user,
      };
    }

    return {
      notes: currentNotes,
      folders: currentFolders,
      isCloud: false,
    };
  } catch (error) {
    return { notes: currentNotes, folders: currentFolders, isCloud: false };
  }
}

let syncTimeout: any = null;
export function scheduleDebouncedSync(
  notes: Note[],
  folders: Folder[] = [],
  onComplete?: (updatedNotes: Note[], updatedFolders: Folder[], isCloud: boolean) => void
) {
  if (typeof window === "undefined") return;
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    const res = await syncWithCloud(notes, folders);
    if (onComplete) onComplete(res.notes, res.folders, res.isCloud);
  }, 1200);
}
