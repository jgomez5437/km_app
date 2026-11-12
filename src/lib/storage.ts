import { Note, Folder, AuthUser } from "@/types/vault";
import { extractTags } from "@/lib/markdown";

const VAULT_STORAGE_KEY = "nexus_vault_notes_v3";
const FOLDERS_STORAGE_KEY = "nexus_vault_folders_v3";
const DELETED_NOTES_KEY = "nexus_vault_deleted_notes_v1";
const DELETED_FOLDERS_KEY = "nexus_vault_deleted_folders_v1";
const COLLAPSED_FOLDERS_KEY = "nexus_vault_collapsed_folders_v1";
const COLLAPSED_NOTES_KEY = "nexus_vault_collapsed_notes_v1";
const ACTIVE_NOTE_KEY = "nexus_vault_active_note_v1";

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
  { id: "getting-started", name: "Getting Started", color: "#38bdf8" },
];

export const INITIAL_SAMPLE_NOTES: Note[] = [
  {
    id: "welcome-to-astro",
    title: "Welcome to Astro",
    folderId: "getting-started",
    content: `**Astro** is a cosmic, local-first knowledge base engineered for focused writing, deep research synthesis, and zero-latency capture.

### Getting Around
- **Create a Note**: Click the **+** button in the sidebar or top bar, or press **Alt+N** (or **Ctrl+N**).
- **Folders & Subpages**: Organize thoughts with folders or nest subpages under any note using the **+** icon in the sidebar tree.
- **AI Copilot**: Open the Copilot in the top right to ask questions across your vault, or use the **AI** tools in the bottom toolbar to draft and query this note.
- **Cloud Sync**: Sign in to automatically back up your notes to Neon PostgreSQL and sync seamlessly across devices.

Your edits save instantly to your browser's local storage and synchronize whenever you're connected.`,
    tags: ["welcome", "guide"],
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 3600000,
    pinned: true,
  },
];

export function isCorruptedHtmlContent(content: string): boolean {
  if (!content) return false;
  const trimmed = content.trim();
  if (/^<p>\s*(?:<br\s*\/?>)?\s*<\/p>$/i.test(trimmed)) return true;
  if (/^<ul[^>]*>\s*<li[^>]*>\s*<p>\s*<\/p>\s*<\/li>\s*<\/ul>$/i.test(trimmed)) return true;
  if (/^<ol[^>]*>\s*<li[^>]*>\s*<p>\s*<\/p>\s*<\/li>\s*<\/ol>$/i.test(trimmed)) return true;
  if (/^<blockquote[^>]*>\s*<p>\s*<\/p>\s*<\/blockquote>$/i.test(trimmed)) return true;
  return false;
}

export function sanitizeCorruptedContent(content: string): string {
  return isCorruptedHtmlContent(content) ? "" : content;
}

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
      return [];
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

export function renameFolderInVault(
  folderId: string,
  newName: string,
  folders: Folder[]
): Folder[] {
  const trimmed = newName.trim();
  if (!trimmed) return folders;
  const nextFolders = folders.map((f) =>
    f.id === folderId ? { ...f, name: trimmed } : f
  );
  saveFolders(nextFolders);
  return nextFolders;
}

// Tree Collapse Persistence
export function loadCollapsedFolders(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(COLLAPSED_FOLDERS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? new Set(parsed.filter((id) => typeof id === "string"))
      : new Set();
  } catch {
    return new Set();
  }
}

export function saveCollapsedFolders(collapsedIds: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      COLLAPSED_FOLDERS_KEY,
      JSON.stringify(Array.from(collapsedIds))
    );
  } catch (e) {
    console.error("Failed to save collapsed folders to localStorage", e);
  }
}

export function loadCollapsedNotes(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(COLLAPSED_NOTES_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? new Set(parsed.filter((id) => typeof id === "string"))
      : new Set();
  } catch {
    return new Set();
  }
}

export function saveCollapsedNotes(collapsedIds: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      COLLAPSED_NOTES_KEY,
      JSON.stringify(Array.from(collapsedIds))
    );
  } catch (e) {
    console.error("Failed to save collapsed notes to localStorage", e);
  }
}

export function loadActiveNoteId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ACTIVE_NOTE_KEY);
  } catch {
    return null;
  }
}

export function saveActiveNoteId(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id) {
      localStorage.setItem(ACTIVE_NOTE_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_NOTE_KEY);
    }
  } catch {
    // ignore
  }
}

export function clearLocalVault(): void {
  if (typeof window === "undefined") return;
  localMutationVersion++;
  try {
    localStorage.removeItem(VAULT_STORAGE_KEY);
    localStorage.removeItem(FOLDERS_STORAGE_KEY);
    localStorage.removeItem(DELETED_NOTES_KEY);
    localStorage.removeItem(DELETED_FOLDERS_KEY);
    localStorage.removeItem(COLLAPSED_FOLDERS_KEY);
    localStorage.removeItem(COLLAPSED_NOTES_KEY);
    localStorage.removeItem(ACTIVE_NOTE_KEY);
  } catch (e) {
    console.error("Failed to clear local vault from localStorage", e);
  }
  latestNotesSnapshot = [];
  latestFoldersSnapshot = [];
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
    if (!Array.isArray(parsed)) {
      return [];
    }
    // Heal any duplicate note IDs (e.g. multiple "untitled-note" entries)
    // and corrupted empty HTML content tags (e.g. "<p></p>")
    const seen = new Set<string>();
    let mutated = false;
    const healed = parsed.map((n: Note) => {
      if (!n || typeof n.id !== "string") return n;
      let note = n;
      if (seen.has(note.id)) {
        mutated = true;
        note = {
          ...note,
          id: generateUniqueId("note", note.title || "untitled"),
          updatedAt: Date.now(),
        };
      }
      seen.add(note.id);

      if (typeof note.content === "string" && isCorruptedHtmlContent(note.content)) {
        mutated = true;
        note = {
          ...note,
          content: "",
          updatedAt: Date.now(),
        };
      }

      return note;
    });
    if (mutated) {
      saveNotes(healed, false);
    }
    latestNotesSnapshot = healed;
    return healed;
  } catch (e) {
    console.error("Failed to load notes from localStorage", e);
    return [];
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
  title = "",
  folderId?: string,
  parentId?: string
): Note {
  const now = Date.now();
  const content = "";

  return {
    id: generateUniqueId("note", title || "untitled"),
    title,
    content,
    folderId,
    parentId,
    tags: extractTags(content),
    createdAt: now,
    updatedAt: now,
  };
}

export function duplicateNoteInVault(
  noteId: string,
  notes: Note[]
): { notes: Note[]; duplicatedNote: Note | null } {
  const source = notes.find((n) => n.id === noteId);
  if (!source) return { notes, duplicatedNote: null };

  const now = Date.now();
  const baseTitle = source.title.trim() || "Untitled Note";
  const copyTitle = `${baseTitle} (Copy)`;
  const duplicatedNote: Note = {
    ...source,
    id: generateUniqueId("note", copyTitle),
    title: copyTitle,
    pinned: false,
    createdAt: now,
    updatedAt: now,
  };

  const nextNotes = [duplicatedNote, ...notes];
  saveNotes(nextNotes);
  return { notes: nextNotes, duplicatedNote };
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

      if (Array.isArray(data.notes)) {
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

