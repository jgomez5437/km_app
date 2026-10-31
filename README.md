# Nexus 🪐

> **AI-Native, Local-First Knowledge Management System** — engineered to deliver the speed, privacy, and networked thought of Obsidian, enhanced with modern block-markdown editing, real-time CRDT synchronization, an interactive knowledge graph, and deep AI copilot intelligence.

---

## ✨ Key Features

- ⚡ **Local-First & Offline Engine**: Powered by **IndexedDB** and **Yjs CRDTs** for instantaneous, zero-latency note editing with conflict-free multi-device sync.
- 🔗 **Bidirectional [[Wikilinks]]**: Connect notes seamlessly with `[[Note Title]]` syntax, automatic link discovery, and real-time incoming backlink detection with contextual snippets.
- 🕸️ **Interactive Knowledge Graph**: High-performance canvas-based force simulation visualizing note clusters, neighbor connectivity, and knowledge topologies.
- ✍️ **Hybrid Block-Markdown Editor**: Powered by **TipTap / ProseMirror**, supporting headings, tasks, checklists, code blocks, blockquotes, and Markdown shorthand.
- 🧠 **AI Knowledge Copilot**:
  - **Vault Q&A**: Ask natural language questions and synthesize insights across your notes.
  - **Auto-Backlink Suggestions**: Surfaces unlinked concepts in your vault and enables 1-click linking.
  - **Hybrid AI Architecture**: Connect to **Ollama** for 100% private, on-device local inference, or connect **OpenAI**, **Google Gemini**, or **Anthropic** via BYOK (Bring Your Own Key).
- ⌨️ **Keyboard-First Navigation**: Global `Ctrl+K` (or `Cmd+K`) command palette to quickly open or create notes, switch views, and search across your entire vault.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, React 19, TypeScript)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Editor**: [TipTap](https://tiptap.dev/) / ProseMirror
- **Local-First CRDTs**: [Yjs](https://yjs.dev/) & `y-indexeddb`
- **Icons**: [Lucide React](https://lucide.dev/)
- **Graph Engine**: HTML5 Canvas Force-Directed Physics Simulation

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (tested with Node.js 24+)
- npm or yarn

### Installation

```bash
git clone <your-repo-url>
cd nexus
npm install
```

### Development Server

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to launch your Nexus vault.

### Production Build

```bash
npm run build
npm run start
```

---

## ⌨️ Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl+K` / `Cmd+K` | Open Quick Command Palette |
| `Ctrl+N` / `Cmd+N` | Create a New Note |
| `[[` | Insert Wikilink to another note |
| `Esc` | Close Command Palette / Modals |

---

## 📄 License

MIT
