import { Note, Folder, AuthUser } from "@/types/vault";
import { extractTags } from "@/lib/markdown";

const VAULT_STORAGE_KEY = "nexus_vault_notes_v3";
const FOLDERS_STORAGE_KEY = "nexus_vault_folders_v3";
const DELETED_NOTES_KEY = "nexus_vault_deleted_notes_v1";
const DELETED_FOLDERS_KEY = "nexus_vault_deleted_folders_v1";

let localMutationVersion = 0;
let latestNotesSnapshot: Note[] = [];
let latestFoldersSnapshot: Folder[] = [];

export function getLocalMutationVersion(): number {
  return localMutationVersion;
}

function generateUniqueId(prefix: string, label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 28);
  const uniqueSuffix = `${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 7)}`;
  return slug ? `${prefix}_${slug}_${uniqueSuffix}` : `${prefix}_${uniqueSuffix}`;
}


export const INITIAL_SAMPLE_FOLDERS: Folder[] = [
  { id: "getting-started", name: "Getting Started", color: "#6366f1" },
  { id: "architecture", name: "Architecture", color: "#38bdf8" },
  { id: "ai-research", name: "AI & Research", color: "#10b981" },
];

export const INITIAL_SAMPLE_NOTES: Note[] = [
  {
    id: "welcome-to-astro",
    title: "Welcome to Astro",
    folderId: "getting-started",
    content: `**Astro** is a space-grade, local-first knowledge management vault engineered to combine the speed of block-based editors with deep intelligence and cloud sync.

### Core Superpowers
- **Folders & Subpages**: Organize your knowledge with clean, nested hierarchies.
- **Local-First & Offline**: Notes are stored directly in your browser's local storage and synced with Neon PostgreSQL.
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
    parentId: "welcome-to-astro",
    content: `Here are 3 quick actions to take right now:

1. **Create a Note**: Click the **+** button in the sidebar or use the Command Palette.
2. **Create a Subpage**: Click the **+** icon next to any note in the sidebar or at the bottom of this page.
3. **Command Palette**: Press **Cmd+K** or **Ctrl+K** to search and navigate instantly.`,
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
    content: `Astro connects to **Neon Serverless PostgreSQL** for automatic multi-device synchronization.

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
    if (raw === null) {
      saveFolders(INITIAL_SAMPLE_FOLDERS, false);
      return INITIAL_SAMPLE_FOLDERS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return INITIAL_SAMPLE_FOLDERS;
    }
    // Heal any duplicate folder IDs
    const seen = new Set<string>();
    let mutated = false;
    const healed = parsed.map((f: Folder) => {
      if (!f || typeof f.id !== "string") return f;
      if (seen.has(f.id)) {
        mutated = true;
        return { ...f, id: generateUniqueId("fld", f.name || "folder") };
      }
      seen.add(f.id);
      return f;
    });
    if (mutated) {
      saveFolders(healed, false);
    }
    latestFoldersSnapshot = healed;
    return healed;
  } catch (e) {
    console.error("Failed to load folders from localStorage", e);
    return INITIAL_SAMPLE_FOLDERS;
  }
}

export function saveFolders(folders: Folder[], bumpVersion = true): void {
  if (typeof window === "undefined") return;
  if (bumpVersion) localMutationVersion++;
  latestFoldersSnapshot = folders;
  try {
    localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
  } catch (e) {
    console.error("Failed to save folders to localStorage", e);
  }
}

export function createFolder(name: string): Folder {
  return {
    id: generateUniqueId("fld", name),
    name,
    createdAt: Date.now(),
  };
}

// Notes Management
export function loadNotes(): Note[] {
  if (typeof window === "undefined") return INITIAL_SAMPLE_NOTES;

  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (raw === null) {
      saveNotes(INITIAL_SAMPLE_NOTES, false);
      return INITIAL_SAMPLE_NOTES;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return INITIAL_SAMPLE_NOTES;
    }
    // Heal any duplicate note IDs (e.g. multiple "untitled-note" entries)
    const seen = new Set<string>();
    let mutated = false;
    const healed = parsed.map((n: Note) => {
      if (!n || typeof n.id !== "string") return n;
      if (seen.has(n.id)) {
        mutated = true;
        return {
          ...n,
          id: generateUniqueId("note", n.title || "untitled"),
          updatedAt: Date.now(),
        };
      }
      seen.add(n.id);
      return n;
    });
    if (mutated) {
      saveNotes(healed, false);
    }
    latestNotesSnapshot = healed;
    return healed;
  } catch (e) {
    console.error("Failed to load notes from localStorage", e);
    return INITIAL_SAMPLE_NOTES;
  }
}

export function saveNotes(notes: Note[], bumpVersion = true): void {
  if (typeof window === "undefined") return;
  if (bumpVersion) localMutationVersion++;
  latestNotesSnapshot = notes;
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
      const nextContent =
        updated.content !== undefined ? updated.content : note.content;
      const nextTags =
        updated.tags !== undefined
          ? updated.tags
          : updated.content !== undefined
          ? extractTags(nextContent)
          : note.tags || [];
      return {
        ...note,
        ...updated,
        tags: nextTags,
        updatedAt: Date.now(),
      };
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
  const now = Date.now();
  const content = "Start typing your thoughts here...";

  return {
    id: generateUniqueId("note", title),
    title,
    content,
    folderId,
    parentId,
    tags: extractTags(content),
    createdAt: now,
    updatedAt: now,
  };
}

// Pending Deletions Queue for Cloud Sync
function getPendingIds(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setPendingIds(key: string, ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    if (ids.length === 0) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(Array.from(new Set(ids))));
    }
  } catch {
    // ignore storage errors
  }
}

export function recordDeletedNotes(ids: string[]): void {
  if (typeof window === "undefined" || ids.length === 0) return;
  localMutationVersion++;
  const current = getPendingIds(DELETED_NOTES_KEY);
  setPendingIds(DELETED_NOTES_KEY, [...current, ...ids]);
}

export function recordDeletedFolders(ids: string[]): void {
  if (typeof window === "undefined" || ids.length === 0) return;
  localMutationVersion++;
  const current = getPendingIds(DELETED_FOLDERS_KEY);
  setPendingIds(DELETED_FOLDERS_KEY, [...current, ...ids]);
}

export function isUnmodifiedSampleVault(
  notes: Note[],
  folders: Folder[]
): boolean {
  const sampleNoteIds = new Set(INITIAL_SAMPLE_NOTES.map((n) => n.id));
  const sampleFolderIds = new Set(INITIAL_SAMPLE_FOLDERS.map((f) => f.id));
  if (
    notes.length !== INITIAL_SAMPLE_NOTES.length ||
    folders.length !== INITIAL_SAMPLE_FOLDERS.length
  ) {
    return false;
  }
  const allNotesMatch = notes.every((n) => {
    const sample = INITIAL_SAMPLE_NOTES.find((s) => s.id === n.id);
    return (
      sample &&
      sampleNoteIds.has(n.id) &&
      n.title === sample.title &&
      n.content === sample.content &&
      n.folderId === sample.folderId
    );
  });
  const allFoldersMatch = folders.every((f) => sampleFolderIds.has(f.id));
  return allNotesMatch && allFoldersMatch;
}

// Cloud Sync
export async function syncWithCloud(
  currentNotes: Note[],
  currentFolders: Folder[] = [],
  options?: { pullOnly?: boolean }
): Promise<{
  notes: Note[];
  folders: Folder[];
  isCloud: boolean;
  user?: AuthUser | null;
  discardedStaleResponse?: boolean;
}> {
  if (typeof window === "undefined") {
    return { notes: currentNotes, folders: currentFolders, isCloud: false };
  }

  const versionBeforeRequest = localMutationVersion;
  const deletedNoteIds = getPendingIds(DELETED_NOTES_KEY);
  const deletedFolderIds = getPendingIds(DELETED_FOLDERS_KEY);
  const pullOnly =
    options?.pullOnly ??
    (deletedNoteIds.length === 0 &&
      deletedFolderIds.length === 0 &&
      isUnmodifiedSampleVault(currentNotes, currentFolders));

  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes: pullOnly ? [] : currentNotes,
        folders: pullOnly ? [] : currentFolders,
        deletedNoteIds,
        deletedFolderIds,
      }),
    });

    if (!res.ok) {
      return { notes: currentNotes, folders: currentFolders, isCloud: false };
    }

    const data = await res.json();

    if (data.isCloud) {
      // Clear deleted IDs that were processed in this request
      if (deletedNoteIds.length > 0) {
        const remainingNotes = getPendingIds(DELETED_NOTES_KEY).filter(
          (id) => !deletedNoteIds.includes(id)
        );
        setPendingIds(DELETED_NOTES_KEY, remainingNotes);
      }
      if (deletedFolderIds.length > 0) {
        const remainingFolders = getPendingIds(DELETED_FOLDERS_KEY).filter(
          (id) => !deletedFolderIds.includes(id)
        );
        setPendingIds(DELETED_FOLDERS_KEY, remainingFolders);
      }

      // If local state was mutated while the HTTP request was in flight,
      // do not overwrite newer local state with the older server snapshot.
      if (localMutationVersion !== versionBeforeRequest) {
        return {
          notes: latestNotesSnapshot.length > 0 ? latestNotesSnapshot : currentNotes,
          folders: latestFoldersSnapshot,
          isCloud: true,
          user: data.user,
          discardedStaleResponse: true,
        };
      }

      let updatedNotes = currentNotes;
      let updatedFolders = currentFolders;

      if (Array.isArray(data.notes) && data.notes.length > 0) {
        saveNotes(data.notes, false);
        updatedNotes = data.notes;
      }
      if (Array.isArray(data.folders)) {
        saveFolders(data.folders, false);
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
  } catch {
    return { notes: currentNotes, folders: currentFolders, isCloud: false };
  }
}

let syncTimeout: ReturnType<typeof setTimeout> | null = null;
export function scheduleDebouncedSync(
  notes: Note[],
  folders: Folder[] = [],
  onComplete?: (
    updatedNotes: Note[],
    updatedFolders: Folder[],
    isCloud: boolean
  ) => void
) {
  if (typeof window === "undefined") return;
  latestNotesSnapshot = notes;
  latestFoldersSnapshot = folders;
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    const res = await syncWithCloud(latestNotesSnapshot, latestFoldersSnapshot);
    if (res.discardedStaleResponse) {
      // User typed or mutated state while sync was in-flight; re-schedule sync
      scheduleDebouncedSync(latestNotesSnapshot, latestFoldersSnapshot, onComplete);
      return;
    }
    if (onComplete) onComplete(res.notes, res.folders, res.isCloud);
  }, 1200);
}

