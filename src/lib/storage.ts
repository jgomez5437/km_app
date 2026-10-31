import { Note } from "@/types/vault";
import { extractWikilinks, extractTags } from "./markdown";

const VAULT_STORAGE_KEY = "nexus_vault_notes_v2";

export const INITIAL_SAMPLE_NOTES: Note[] = [
  {
    id: "welcome-to-nexus",
    title: "Welcome to Nexus",
    content: `# Welcome to Nexus 🪐

**Nexus** is an AI-native, local-first knowledge management system engineered to combine the best of **Obsidian** and modern block-based collaborative tools.

### Core Superpowers
- **Local-First & Offline**: Notes are stored directly in your browser's IndexedDB and managed via [[CRDTs]] (Conflict-Free Replicated Data Types) for instantaneous edits and zero sync conflicts.
- **Bidirectional Thought**: Effortlessly create links using [[Wikilinks]] syntax (e.g. [[Local-First Software]], [[AI Knowledge Assistant]], or [[Graph Visualization]]).
- **Interactive Knowledge Graph**: Visualize your second brain as an evolving topological universe with physics-based force simulation.
- **AI Intelligence Layer**: Vault-wide semantic retrieval and automated backlink synthesis powered by [[Hybrid AI]].

### Quick Navigation
- Press **Ctrl+K** (or **Cmd+K**) to trigger the Quick Command Palette.
- Click the **Graph View** button in the top bar to inspect note clusters.
- Open the right sidebar to view **Backlinks** and query the **AI Assistant**.

Check out [[Getting Started Guide]] to start building your second brain.`,
    tags: ["nexus", "overview", "second-brain"],
    links: ["CRDTs", "Wikilinks", "Local-First Software", "AI Knowledge Assistant", "Graph Visualization", "Hybrid AI", "Getting Started Guide"],
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 3,
    pinned: true,
  },
  {
    id: "local-first-software",
    title: "Local-First Software",
    content: `# Local-First Software ⚡

Local-first software represents a paradigm shift from traditional cloud-first SaaS architectures.

### Principles:
1. **Zero-Latency Edits**: Read and write immediately to local storage without waiting on server roundtrips.
2. **Offline-Capable**: Full functionality even during network drops or in airplane mode.
3. **User Data Ownership**: Data belongs to the user, not locked inside proprietary databases.
4. **Seamless Synchronization**: Powered by [[CRDTs]] (such as Yjs and Automerge) to merge multi-device edits deterministically.

Nexus implements this via IndexedDB and [[CRDTs]], guaranteeing that your knowledge remains permanently accessible and private.`,
    tags: ["architecture", "local-first", "crdt"],
    links: ["CRDTs"],
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: "crdts",
    title: "CRDTs",
    content: `# CRDTs (Conflict-Free Replicated Data Types) 🔄

A **CRDT** is a mathematical data structure that replicates across multiple nodes without requiring central coordination.

### Key Benefits:
- Any replica can be updated independently and concurrently.
- Replicas automatically converge to identical states once updates propagate.
- Guarantees eventual consistency without complex manual merge conflicts.

In Nexus, CRDTs underwrite [[Local-First Software]], ensuring seamless sync across your laptop, desktop, and mobile devices without creating duplicate conflict files.`,
    tags: ["math", "distributed-systems", "algorithms"],
    links: ["Local-First Software"],
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: "graph-visualization",
    title: "Graph Visualization",
    content: `# Graph Visualization 🕸️

Visualizing relationships between thoughts is one of the most transformative elements of networked thought.

### Features in Nexus:
- **Interactive Force-Directed Layout**: Nodes attract or repel based on link topology.
- **Node Clustering**: Sized proportionally to backlink density.
- **Neighbor Highlighting**: Hover over [[Welcome to Nexus]] or [[Hybrid AI]] to highlight connected knowledge paths.
- **Direct Navigation**: Click any node to open the document immediately.`,
    tags: ["ui", "dataviz", "graph"],
    links: ["Welcome to Nexus", "Hybrid AI"],
    createdAt: Date.now() - 86400000 * 1,
    updatedAt: Date.now() - 86400000 * 1,
  },
  {
    id: "hybrid-ai",
    title: "Hybrid AI",
    content: `# Hybrid AI Intelligence 🤖

Modern knowledge bases should not force you to compromise between **privacy** and **intelligence**.

### The Nexus Approach:
- **Local AI**: Connect to local Ollama endpoints for on-device embeddings and LLM inference with 100% privacy.
- **Cloud BYOK (Bring Your Own Key)**: Connect OpenAI, Gemini, or Anthropic models for high-capacity synthesis and deep research.
- **Semantic Link Discovery**: Automatically identifies serendipitous connections between notes that haven't been manually linked yet.

Works together with [[AI Knowledge Assistant]] and [[Graph Visualization]].`,
    tags: ["ai", "privacy", "llm"],
    links: ["AI Knowledge Assistant", "Graph Visualization"],
    createdAt: Date.now() - 86400000 * 1,
    updatedAt: Date.now() - 86400000 * 1,
  },
  {
    id: "ai-knowledge-assistant",
    title: "AI Knowledge Assistant",
    content: `# AI Knowledge Assistant 🧠

Your personal copilot for synthesizing research across your entire vault.

### Capabilities:
- Ask natural language questions across all your notes.
- Summarize complex conceptual clusters.
- Auto-generate suggested [[Wikilinks]] for new notes based on semantic context.
- Bridge ideas between [[Local-First Software]] and [[Hybrid AI]].`,
    tags: ["ai", "assistant", "productivity"],
    links: ["Wikilinks", "Local-First Software", "Hybrid AI"],
    createdAt: Date.now() - 3600000 * 12,
    updatedAt: Date.now() - 3600000 * 12,
  },
  {
    id: "wikilinks",
    title: "Wikilinks",
    content: `# Wikilinks 🔗

Wikilinks are the foundation of non-linear writing and the Zettelkasten method.

### How to use:
- Wrap any target note title in double brackets: \`[[Note Name]]\`
- Create forward links before the note even exists (Nexus will create it on demand).
- See [[Welcome to Nexus]] for real-world usage.`,
    tags: ["zettelkasten", "writing"],
    links: ["Welcome to Nexus"],
    createdAt: Date.now() - 3600000 * 8,
    updatedAt: Date.now() - 3600000 * 8,
  },
  {
    id: "getting-started-guide",
    title: "Getting Started Guide",
    content: `# Getting Started with Nexus 🚀

Welcome aboard! Here are 3 quick actions to take right now:

1. **Create a Note**: Click the **+ New Note** button in the sidebar or press \`Ctrl+N\`.
2. **Link Notes**: Type \`[[\` inside any note to link to [[Welcome to Nexus]] or create a new concept.
3. **Explore the Graph**: Switch to the **Graph View** tab to see your notes organize themselves.

Enjoy the freedom of [[Local-First Software]] with the power of [[Hybrid AI]]!`,
    tags: ["guide", "tutorial"],
    links: ["Welcome to Nexus", "Local-First Software", "Hybrid AI"],
    createdAt: Date.now() - 3600000 * 4,
    updatedAt: Date.now() - 3600000 * 4,
  },
];

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

export function updateNoteInVault(updated: Partial<Note> & { id: string }, notes: Note[]): Note[] {
  const nextNotes = notes.map((note) => {
    if (note.id === updated.id) {
      const merged = { ...note, ...updated, updatedAt: Date.now() };
      // Keep links and tags up to date if content changed
      if (updated.content !== undefined) {
        merged.links = extractWikilinks(updated.content);
        merged.tags = extractTags(updated.content);
      }
      return merged;
    }
    return note;
  });
  saveNotes(nextNotes);
  return nextNotes;
}

export function createNewNote(title = "Untitled Note", folder?: string): Note {
  const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `note-${Date.now()}`;
  return {
    id,
    title,
    content: `# ${title}\n\nStart writing your note here... Use [[wikilinks]] to connect with other notes.`,
    folder,
    tags: [],
    links: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export async function syncWithCloud(
  currentNotes: Note[]
): Promise<{ notes: Note[]; isCloud: boolean }> {
  if (typeof window === "undefined") {
    return { notes: currentNotes, isCloud: false };
  }

  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: currentNotes }),
    });

    if (!res.ok) {
      return { notes: currentNotes, isCloud: false };
    }

    const data = await res.json();
    if (data.isCloud && Array.isArray(data.notes) && data.notes.length > 0) {
      saveNotes(data.notes);
      return { notes: data.notes, isCloud: true };
    }

    return { notes: currentNotes, isCloud: Boolean(data.isCloud) };
  } catch (error) {
    return { notes: currentNotes, isCloud: false };
  }
}

let syncTimeout: any = null;
export function scheduleDebouncedSync(
  notes: Note[],
  onComplete?: (updated: Note[], isCloud: boolean) => void
) {
  if (typeof window === "undefined") return;
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    const res = await syncWithCloud(notes);
    if (onComplete) onComplete(res.notes, res.isCloud);
  }, 1200);
}

