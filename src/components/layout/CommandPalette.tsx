"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Note, Folder } from "@/types/vault";
import {
  Search,
  FileText,
  Plus,
  Sparkles,
  Pin,
  Settings,
  RefreshCw,
  PanelLeft,
  Hash,
  Folder as FolderIcon,
  CornerDownLeft,
  X,
} from "lucide-react";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  activeNote?: Note;
  onSelectNote: (id: string) => void;
  onCreateNote: (title?: string) => void;
  onTogglePinNote: (id: string) => void;
  onToggleRightDrawer: () => void;
  onToggleSidebar: () => void;
  onOpenSettings: (tab?: "profile" | "ai" | "appearance" | "vault") => void;
  onManualSync: () => void;
}

type PaletteItem =
  | {
      kind: "note";
      id: string;
      note: Note;
      folderName?: string;
      excerpt?: string;
    }
  | {
      kind: "action";
      id: string;
      label: string;
      description: string;
      shortcut?: string;
      icon: React.ReactNode;
      run: () => void;
    };

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  notes,
  folders,
  activeNote,
  onSelectNote,
  onCreateNote,
  onTogglePinNote,
  onToggleRightDrawer,
  onToggleSidebar,
  onOpenSettings,
  onManualSync,
}) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const folderMap = useMemo(() => {
    const map = new Map<string, string>();
    folders.forEach((f) => map.set(f.id, f.name));
    return map;
  }, [folders]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const items: PaletteItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();

    const quickActions: PaletteItem[] = [
      {
        kind: "action",
        id: "action-new-note",
        label: q ? `Create note "${query.trim()}"` : "Create New Note",
        description: "Start a fresh note in your vault",
        shortcut: "Alt+N",
        icon: <Plus className="w-4 h-4 text-sky-400" />,
        run: () => onCreateNote(q ? query.trim() : ""),
      },
      ...(activeNote
        ? [
            {
              kind: "action" as const,
              id: "action-toggle-pin",
              label: activeNote.pinned
                ? "Unpin Current Note"
                : "Pin Current Note",
              description: activeNote.title.trim() || "Untitled Note",
              icon: <Pin className="w-4 h-4 text-amber-400" />,
              run: () => onTogglePinNote(activeNote.id),
            },
          ]
        : []),
      {
        kind: "action",
        id: "action-ai-copilot",
        label: "Toggle AI Copilot",
        description: "Chat with your entire vault",
        icon: <Sparkles className="w-4 h-4 text-indigo-400" />,
        run: onToggleRightDrawer,
      },
      {
        kind: "action",
        id: "action-toggle-sidebar",
        label: "Toggle Sidebar",
        description: "Show or hide the navigation tree",
        shortcut: "⌘\\",
        icon: <PanelLeft className="w-4 h-4 text-slate-300" />,
        run: onToggleSidebar,
      },
      {
        kind: "action",
        id: "action-sync",
        label: "Sync Vault Now",
        description: "Synchronize notes with cloud storage",
        icon: <RefreshCw className="w-4 h-4 text-emerald-400" />,
        run: onManualSync,
      },
      {
        kind: "action",
        id: "action-settings",
        label: "Open Settings",
        description: "Account, AI engine, appearance, and backups",
        icon: <Settings className="w-4 h-4 text-slate-300" />,
        run: () => onOpenSettings("profile"),
      },
    ];

    const sortedNotes = [...notes].sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });

    const matchedNotes: PaletteItem[] = sortedNotes
      .filter((n) => {
        if (!q) return true;
        const title = (n.title || "Untitled Note").toLowerCase();
        const content = (n.content || "").toLowerCase();
        const folderName = n.folderId
          ? (folderMap.get(n.folderId) || "").toLowerCase()
          : "";
        const tags = (n.tags || []).join(" ").toLowerCase();
        return (
          title.includes(q) ||
          content.includes(q) ||
          folderName.includes(q) ||
          tags.includes(q)
        );
      })
      .slice(0, q ? 12 : 8)
      .map((n) => {
        let excerpt: string | undefined;
        if (q && n.content) {
          const plain = n.content.replace(/[#*_`>\[\]]/g, " ").replace(/\s+/g, " ").trim();
          const idx = plain.toLowerCase().indexOf(q);
          if (idx >= 0) {
            const start = Math.max(0, idx - 24);
            const end = Math.min(plain.length, idx + 64);
            excerpt = `${start > 0 ? "..." : ""}${plain.slice(start, end)}${
              end < plain.length ? "..." : ""
            }`;
          } else if (plain) {
            excerpt = plain.slice(0, 72) + (plain.length > 72 ? "..." : "");
          }
        }
        return {
          kind: "note",
          id: `note-${n.id}`,
          note: n,
          folderName: n.folderId ? folderMap.get(n.folderId) : undefined,
          excerpt,
        };
      });

    const filteredActions = q
      ? quickActions.filter(
          (a) =>
            a.kind === "action" &&
            (a.id === "action-new-note" ||
              a.label.toLowerCase().includes(q) ||
              a.description.toLowerCase().includes(q))
        )
      : quickActions;

    return [...matchedNotes, ...filteredActions];
  }, [
    query,
    notes,
    folderMap,
    activeNote,
    onCreateNote,
    onTogglePinNote,
    onToggleRightDrawer,
    onToggleSidebar,
    onManualSync,
    onOpenSettings,
  ]);

  const activeIndex = items.length
    ? Math.min(selectedIndex, items.length - 1)
    : 0;

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-palette-index="${activeIndex}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!isOpen) return null;

  const handleClose = () => {
    setQuery("");
    setSelectedIndex(0);
    onClose();
  };

  const executeItem = (item: PaletteItem) => {
    if (item.kind === "note") {
      onSelectNote(item.note.id);
    } else {
      item.run();
    }
    handleClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (items.length ? (prev + 1) % items.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        items.length ? (prev - 1 + items.length) % items.length : 0
      );
    } else if (e.key === "Enter" && items[activeIndex]) {
      e.preventDefault();
      executeItem(items[activeIndex]);
    }
  };

  const noteItems = items.filter((i) => i.kind === "note");
  const actionItems = items.filter((i) => i.kind === "action");

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] sm:pt-[14vh] px-3 sm:px-4 bg-black/75 backdrop-blur-xs animate-fade-in"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        className="w-full max-w-xl bg-[#0B0F19]/98 border border-slate-700/80 rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.85)] overflow-hidden animate-pop-in"
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800/80 bg-[#06080F]/70">
          <Search className="w-4 h-4 text-sky-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search notes, #tags, folders, or type a command..."
            className="flex-1 bg-transparent text-sm sm:text-[15px] text-white placeholder-slate-500 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="p-1 text-slate-500 hover:text-slate-300 rounded"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-[#0E1424] border border-slate-800 text-[10px] font-mono text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="max-h-[55vh] overflow-y-auto p-2 space-y-3 custom-scrollbar"
        >
          {noteItems.length > 0 && (
            <div className="space-y-0.5">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {query.trim() ? "Matching Notes" : "Recent & Pinned Notes"}
              </div>
              {noteItems.map((item) => {
                if (item.kind !== "note") return null;
                const globalIdx = items.indexOf(item);
                const isSelected = globalIdx === activeIndex;
                const isActive = item.note.id === activeNote?.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    data-palette-index={globalIdx}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                    onClick={() => executeItem(item)}
                    className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition ${
                      isSelected
                        ? "bg-sky-950/70 border border-sky-700/60 text-white"
                        : "border border-transparent text-slate-300 hover:bg-slate-800/50"
                    }`}
                  >
                    <FileText
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        isSelected ? "text-sky-400" : "text-slate-500"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {item.note.title.trim() || "Untitled Note"}
                        </span>
                        {item.note.pinned && (
                          <Pin className="w-3 h-3 text-amber-400 shrink-0" />
                        )}
                        {isActive && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-900/60 text-sky-300 font-medium">
                            Open
                          </span>
                        )}
                      </div>
                      {item.excerpt && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {item.excerpt}
                        </p>
                      )}
                      {(item.folderName || (item.note.tags && item.note.tags.length > 0)) && (
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                          {item.folderName && (
                            <span className="inline-flex items-center gap-1">
                              <FolderIcon className="w-3 h-3 text-sky-400/70" />
                              <span>{item.folderName}</span>
                            </span>
                          )}
                          {item.note.tags?.slice(0, 3).map((tag) => (
                            <span key={tag} className="inline-flex items-center gap-0.5 text-sky-400/80">
                              <Hash className="w-2.5 h-2.5" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-1" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {actionItems.length > 0 && (
            <div className="space-y-0.5">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Quick Actions
              </div>
              {actionItems.map((item) => {
                if (item.kind !== "action") return null;
                const globalIdx = items.indexOf(item);
                const isSelected = globalIdx === activeIndex;

                return (
                  <button
                    key={item.id}
                    type="button"
                    data-palette-index={globalIdx}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                    onClick={() => executeItem(item)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-left transition ${
                      isSelected
                        ? "bg-sky-950/70 border border-sky-700/60 text-white"
                        : "border border-transparent text-slate-300 hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-[#0E1424] border border-slate-800 flex items-center justify-center shrink-0">
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{item.label}</div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {item.description}
                        </div>
                      </div>
                    </div>
                    {item.shortcut && (
                      <kbd className="px-1.5 py-0.5 rounded bg-[#0E1424] border border-slate-800 text-[10px] font-mono text-slate-400 shrink-0">
                        {item.shortcut}
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Hints */}
        <div className="px-4 py-2 border-t border-slate-800/80 bg-[#06080F]/70 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span>{notes.length} {notes.length === 1 ? "note" : "notes"} in vault</span>
        </div>
      </div>
    </div>
  );
};
