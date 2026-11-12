# Astro Note 🪐

> **AI-Augmented, Local-First Knowledge Management Workspace** — built for speed, deep thought, and effortless capture. Edit notes in a focused block-markdown editor, organize with hierarchical notes and folders, sync seamlessly to the cloud with Neon PostgreSQL, and leverage integrated AI copilots (Google Gemini and OpenAI).

---

## ✨ Key Features

- ⚡ **Local-First Speed with Cloud Sync**: Instant zero-latency capture stored locally in your browser, with automatic background sync to **Neon PostgreSQL** via Drizzle ORM when signed in.
- ✍️ **Focused Block-Markdown Editor**: Powered by **TipTap / ProseMirror**, supporting headings, bullet lists, numbered lists, checklists, task items, blockquotes, code blocks with syntax highlighting, and horizontal rules.
- 🎨 **Editorial Typography**: Switch seamlessly between **Inter Variable** (modern screen sans) and **Source Serif 4** (warm reading serif) for long-form reading and writing.
- 🗂️ **Hierarchical Organization**: Organize notes inside nested folders or as parent/child document trees with intuitive drag-and-drop or click-to-move organization.
- 🧠 **Integrated AI Assistant & Copilot**:
  - **Ask AI & Chat**: Query your note collection or ask exploratory questions with safe Markdown-formatted responses.
  - **Inline Writing Copilot**: Summarize, expand, rewrite, polish, or generate draft sections directly from the editor.
  - **Privacy-Centric BYOK (Bring Your Own Key)**: Choose **Google Gemini** (Gemini 2.5 Flash / Pro) or **OpenAI** (GPT-4o / GPT-4o mini). Your API keys are strictly kept locally in your browser and used only for direct queries.
- 📱 **Mobile & Desktop Responsive**: Full responsive layout with collapsible sidebar, accessible bottom sheets on mobile, touch-friendly 40px targets, and iOS Safari viewport-zoom mitigation (`resizes-content`).
- ⌨️ **Keyboard Shortcuts**: Quick note creation with `Alt+N` or `Ctrl+N` / `Cmd+N`, and intuitive modal dismissals with `Esc`.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack, React 19, TypeScript)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Editor**: [TipTap](https://tiptap.dev/) 3.x / ProseMirror
- **Database & ORM**: [Neon PostgreSQL](https://neon.tech/) (`@neondatabase/serverless`) + [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication**: JWT authentication with Jose (`jose`) and secure HTTP-only cookies
- **Typography**: `@next/font/google` (`Inter`, `Source Serif 4`, `JetBrains Mono`)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ (tested with Node.js 24 LTS)
- npm, pnpm, or yarn
- Neon PostgreSQL database instance (optional for local-only storage, required for cloud sync & authentication)

### Environment Setup

Create a `.env.local` file in the root directory:

```env
# Neon PostgreSQL connection string (pooled recommended)
DATABASE_URL="postgres://user:password@ep-sample.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Secret key for JWT session tokens (required in production)
AUTH_SECRET="your-secure-random-auth-secret-string-at-least-32-chars"
```

> [!IMPORTANT]
> In production environments (`NODE_ENV=production`), `AUTH_SECRET` is strictly required for security and will throw an explicit initialization error if missing.

### Database Migration

Generate and apply Drizzle database migrations:

```bash
npx drizzle-kit push
```

### Development Server

Start the local development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start taking notes.

### Production Build

```bash
npm run build
npm run start
```

---

## ⌨️ Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Alt+N` or `Ctrl+N` / `Cmd+N` | Create a new note |
| `Enter` (in note title) | Jump focus to the note editor body |
| `Esc` | Close open modals and drawers |

---

## 📄 License

MIT
