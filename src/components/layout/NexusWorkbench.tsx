"use client";

import React, { useState, useEffect } from "react";
import { Note } from "@/types/vault";
import {
  loadNotes,
  saveNotes,
  createNewNote,
  updateNoteInVault,
  INITIAL_SAMPLE_NOTES,
  syncWithCloud,
  scheduleDebouncedSync,
} from "@/lib/storage";
import { getIncomingBacklinks } from "@/lib/markdown";
import { NexusEditor } from "@/components/editor/NexusEditor";
import { NexusGraph } from "@/components/graph/NexusGraph";
import { NexusAIAssistant } from "@/components/ai/NexusAIAssistant";
import { CommandPalette } from "@/components/palette/CommandPalette";
import {
  FileText,
  Plus,
  Share2,
  Columns,
  Sparkles,
  Link as LinkIcon,
  Search,
  Hash,
  ChevronLeft,
  ChevronRight,
  Pin,
  Trash2,
  Maximize2,
  FolderTree,
  BookOpen,
  Cloud,
  CloudOff,
  RefreshCw,
} from "lucide-react";

export const NexusWorkbench: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>(INITIAL_SAMPLE_NOTES);
  const [activeNoteId, setActiveNoteId] = useState<string>("welcome-to-nexus");
  const [viewMode, setViewMode] = useState<"editor" | "split" | "graph">("split");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(true);
  const [rightTab, setRightTab] = useState<"backlinks" | "ai">("ai");
  const [sidebarTab, setSidebarTab] = useState<"notes" | "tags">("notes");
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "offline">("offline");
  const [isCloudConfigured, setIsCloudConfigured] = useState(false);

  // Load from local storage and sync with Neon on mount
  useEffect(() => {
    const loaded = loadNotes();
    setNotes(loaded);
    if (loaded.length > 0 && !loaded.some((n) => n.id === activeNoteId)) {
      setActiveNoteId(loaded[0].id);
    }

    setSyncStatus("syncing");
    syncWithCloud(loaded).then((res) => {
      setIsCloudConfigured(res.isCloud);
      if (res.isCloud) {
        setNotes(res.notes);
        setSyncStatus("synced");
      } else {
        setSyncStatus("offline");
      }
    });
  }, []);

  // Global Ctrl+K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleCreateNewNote();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [notes]);

  const activeNote = notes.find((n) => n.id === activeNoteId) || notes[0];

  // Incoming backlinks for active note
  const incomingBacklinks = React.useMemo(() => {
    if (!activeNote) return [];
    return getIncomingBacklinks(activeNote, notes);
  }, [activeNote, notes]);

  // All tags with counts
  const tagCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    notes.forEach((n) => {
      n.tags.forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1));
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [notes]);

  // Handle note selection (or create if target doesn't exist)
  const handleSelectNoteByTitle = (title: string) => {
    const found = notes.find((n) => n.title.toLowerCase() === title.toLowerCase());
    if (found) {
      setActiveNoteId(found.id);
    } else {
      const newNote = createNewNote(title);
      const updated = [newNote, ...notes];
      setNotes(updated);
      saveNotes(updated);
      setActiveNoteId(newNote.id);
    }
  };

  const triggerSync = (currentNotes: Note[]) => {
    setSyncStatus("syncing");
    scheduleDebouncedSync(currentNotes, (syncedNotes, isCloud) => {
      setIsCloudConfigured(isCloud);
      if (isCloud && syncedNotes.length > 0) {
        setNotes(syncedNotes);
      }
      setSyncStatus(isCloud ? "synced" : "offline");
    });
  };

  const handleManualSync = async () => {
    setSyncStatus("syncing");
    const res = await syncWithCloud(notes);
    setIsCloudConfigured(res.isCloud);
    if (res.isCloud) {
      setNotes(res.notes);
      setSyncStatus("synced");
    } else {
      setSyncStatus("offline");
    }
  };

  const handleCreateNewNote = (title?: string) => {
    const newNote = createNewNote(title || "Untitled Note");
    const updated = [newNote, ...notes];
    setNotes(updated);
    saveNotes(updated);
    setActiveNoteId(newNote.id);
    if (viewMode === "graph") setViewMode("editor");
    triggerSync(updated);
  };

  const handleDeleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (notes.length <= 1) {
      alert("Cannot delete the last remaining note in the vault.");
      return;
    }
    if (confirm("Delete this note from the vault?")) {
      const remaining = notes.filter((n) => n.id !== id);
      setNotes(remaining);
      saveNotes(remaining);
      if (activeNoteId === id) {
        setActiveNoteId(remaining[0].id);
      }
      triggerSync(remaining);
      // Also delete from remote if cloud is active
      fetch(`/api/notes/${id}`, { method: "DELETE" }).catch(() => {});
    }
  };

  const handleUpdateTitle = (newTitle: string) => {
    if (!activeNote) return;
    const updated = updateNoteInVault({ id: activeNote.id, title: newTitle }, notes);
    setNotes(updated);
    triggerSync(updated);
  };

  const handleUpdateContent = (newContent: string) => {
    if (!activeNote) return;
    const updated = updateNoteInVault({ id: activeNote.id, content: newContent }, notes);
    setNotes(updated);
    triggerSync(updated);
  };

  const handleInsertWikilink = (targetTitle: string) => {
    if (!activeNote) return;
    const addition = `\n\n- Connected to [[${targetTitle}]]`;
    handleUpdateContent(activeNote.content + addition);
  };

  // Filtered notes in sidebar
  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex h-screen w-screen bg-[#0d1117] text-gray-100 overflow-hidden font-sans">
      {/* 1. Left Sidebar: Vault Navigator */}
      {isSidebarOpen && (
        <aside className="w-64 flex-shrink-0 bg-[#161b22] border-r border-gray-800 flex flex-col h-full z-20">
          {/* Vault Header */}
          <div className="px-4 py-3.5 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-bold text-xs text-white shadow-md">
                N
              </div>
              <span className="font-semibold text-sm tracking-tight text-gray-100">
                Nexus Vault
              </span>
            </div>
            <button
              onClick={() => handleCreateNewNote()}
              className="p-1 rounded-md bg-purple-600/80 hover:bg-purple-600 text-white transition shadow-sm"
              title="Create new note (Ctrl+N)"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Search bar inside sidebar */}
          <div className="px-3 pt-2.5 pb-1">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0d1117] rounded-lg border border-gray-800 text-xs">
              <Search className="w-3.5 h-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="Search notes or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none text-gray-200 focus:outline-none w-full text-xs placeholder-gray-500"
              />
            </div>
          </div>

          {/* Sidebar Tab Selector */}
          <div className="flex items-center px-3 py-1.5 gap-2 border-b border-gray-800/80 text-[11px] text-gray-400">
            <button
              onClick={() => setSidebarTab("notes")}
              className={`flex items-center gap-1 pb-0.5 border-b-2 transition ${
                sidebarTab === "notes"
                  ? "border-purple-500 text-purple-300 font-medium"
                  : "border-transparent hover:text-gray-200"
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>Notes ({notes.length})</span>
            </button>
            <button
              onClick={() => setSidebarTab("tags")}
              className={`flex items-center gap-1 pb-0.5 border-b-2 transition ${
                sidebarTab === "tags"
                  ? "border-purple-500 text-purple-300 font-medium"
                  : "border-transparent hover:text-gray-200"
              }`}
            >
              <Hash className="w-3.5 h-3.5" />
              <span>Tags ({tagCounts.length})</span>
            </button>
          </div>

          {/* Notes or Tags List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5 text-xs custom-scrollbar">
            {sidebarTab === "notes" ? (
              filteredNotes.map((note) => {
                const isActive = note.id === activeNoteId;
                return (
                  <div
                    key={note.id}
                    onClick={() => {
                      setActiveNoteId(note.id);
                      if (viewMode === "graph") setViewMode("split");
                    }}
                    className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition ${
                      isActive
                        ? "bg-purple-950/60 text-purple-200 border border-purple-800/40"
                        : "text-gray-300 hover:bg-[#1f242c]"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileText
                        className={`w-3.5 h-3.5 flex-shrink-0 ${
                          isActive ? "text-purple-400" : "text-gray-500"
                        }`}
                      />
                      <span className="truncate">{note.title}</span>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      {note.links.length > 0 && (
                        <span className="text-[10px] text-gray-500 px-1 rounded bg-gray-800/60">
                          {note.links.length}
                        </span>
                      )}
                      <button
                        onClick={(e) => handleDeleteNote(note.id, e)}
                        className="p-0.5 text-gray-500 hover:text-red-400 rounded"
                        title="Delete note"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="space-y-1 p-1">
                {tagCounts.map(([tag, count]) => (
                  <button
                    key={tag}
                    onClick={() => setSearchQuery(tag)}
                    className="w-full flex items-center justify-between px-2 py-1 rounded text-gray-300 hover:bg-gray-800 transition text-left"
                  >
                    <div className="flex items-center gap-1.5 text-purple-400">
                      <Hash className="w-3 h-3" />
                      <span className="text-gray-200">{tag}</span>
                    </div>
                    <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded-full">
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Command Palette Button */}
          <div className="p-3 border-t border-gray-800 bg-[#0d1117]/60">
            <button
              onClick={() => setIsPaletteOpen(true)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#161b22] border border-gray-800 text-gray-400 hover:text-white transition text-xs"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5" />
                <span>Command Palette</span>
              </div>
              <kbd className="px-1.5 py-0.5 text-[10px] bg-gray-800 rounded border border-gray-700">
                Ctrl+K
              </kbd>
            </button>
          </div>
        </aside>
      )}

      {/* 2. Main Workbench Canvas */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Workbench Control Bar */}
        <header className="h-12 border-b border-gray-800 bg-[#161b22] px-4 flex items-center justify-between z-10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition"
              title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              {isSidebarOpen ? (
                <ChevronLeft className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="text-gray-500">Vault</span>
              <span>/</span>
              <span className="text-gray-200 font-medium truncate max-w-xs">
                {activeNote?.title || "No Note Selected"}
              </span>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-[#0d1117] p-1 rounded-lg border border-gray-800">
            <button
              onClick={() => setViewMode("editor")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition ${
                viewMode === "editor"
                  ? "bg-purple-900/60 text-purple-200 font-medium"
                  : "text-gray-400 hover:text-white"
              }`}
              title="Editor View"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Editor</span>
            </button>
            <button
              onClick={() => setViewMode("split")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition ${
                viewMode === "split"
                  ? "bg-purple-900/60 text-purple-200 font-medium"
                  : "text-gray-400 hover:text-white"
              }`}
              title="Split View (Editor + Live Graph)"
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Split</span>
            </button>
            <button
              onClick={() => setViewMode("graph")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition ${
                viewMode === "graph"
                  ? "bg-purple-900/60 text-purple-200 font-medium"
                  : "text-gray-400 hover:text-white"
              }`}
              title="Full Knowledge Graph View"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Graph</span>
            </button>
          </div>

          {/* Right Drawer Toggle Controls & Sync Status */}
          <div className="flex items-center gap-1.5">
            {/* Cloud Sync Status Indicator */}
            <button
              onClick={handleManualSync}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition border ${
                syncStatus === "syncing"
                  ? "bg-amber-950/40 text-amber-300 border-amber-800/50"
                  : isCloudConfigured
                  ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/50 hover:bg-emerald-900/40"
                  : "bg-gray-800/40 text-gray-400 border-gray-800 hover:text-white"
              }`}
              title={
                isCloudConfigured
                  ? "Connected to Neon Database (Click to force sync)"
                  : "Local-only mode. Set DATABASE_URL in Vercel to activate Neon sync."
              }
            >
              {syncStatus === "syncing" ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span className="hidden lg:inline">Syncing...</span>
                </>
              ) : isCloudConfigured ? (
                <>
                  <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden lg:inline">Cloud Synced</span>
                </>
              ) : (
                <>
                  <CloudOff className="w-3.5 h-3.5 text-gray-500" />
                  <span className="hidden lg:inline">Local Vault</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                if (isRightDrawerOpen && rightTab === "ai") {
                  setIsRightDrawerOpen(false);
                } else {
                  setIsRightDrawerOpen(true);
                  setRightTab("ai");
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition border ${
                isRightDrawerOpen && rightTab === "ai"
                  ? "bg-purple-950/60 text-purple-300 border-purple-800/60"
                  : "bg-gray-800/40 text-gray-400 border-gray-800 hover:text-white"
              }`}
              title="Toggle AI Copilot"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden md:inline">AI Copilot</span>
            </button>

            <button
              onClick={() => {
                if (isRightDrawerOpen && rightTab === "backlinks") {
                  setIsRightDrawerOpen(false);
                } else {
                  setIsRightDrawerOpen(true);
                  setRightTab("backlinks");
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition border ${
                isRightDrawerOpen && rightTab === "backlinks"
                  ? "bg-purple-950/60 text-purple-300 border-purple-800/60"
                  : "bg-gray-800/40 text-gray-400 border-gray-800 hover:text-white"
              }`}
              title="Toggle Backlinks"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">
                Backlinks ({incomingBacklinks.length})
              </span>
            </button>
          </div>
        </header>

        {/* View Container */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main workspace panes */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Pane (Editor) */}
            {(viewMode === "editor" || viewMode === "split") && activeNote && (
              <div
                className={`h-full flex flex-col ${
                  viewMode === "split" ? "w-1/2 border-r border-gray-800" : "w-full"
                }`}
              >
                <NexusEditor
                  initialContent={activeNote.content}
                  noteTitle={activeNote.title}
                  onUpdateTitle={handleUpdateTitle}
                  onUpdateContent={handleUpdateContent}
                  onOpenWikilink={handleSelectNoteByTitle}
                />
              </div>
            )}

            {/* Right Pane (Graph) */}
            {(viewMode === "graph" || viewMode === "split") && (
              <div
                className={`h-full flex flex-col ${
                  viewMode === "split" ? "w-1/2" : "w-full"
                }`}
              >
                <NexusGraph
                  notes={notes}
                  activeNoteId={activeNoteId}
                  onSelectNote={(id) => {
                    setActiveNoteId(id);
                    if (viewMode === "graph") setViewMode("split");
                  }}
                />
              </div>
            )}
          </div>

          {/* 3. Right Inspector Drawer */}
          {isRightDrawerOpen && activeNote && (
            <aside className="w-80 flex-shrink-0 bg-[#161b22] border-l border-gray-800 flex flex-col h-full z-20">
              {rightTab === "ai" ? (
                <NexusAIAssistant
                  activeNote={activeNote}
                  allNotes={notes}
                  onOpenNote={(id) => setActiveNoteId(id)}
                  onInsertWikilink={handleInsertWikilink}
                />
              ) : (
                <div className="flex flex-col h-full text-xs">
                  {/* Backlinks Header */}
                  <div className="px-4 py-3 border-b border-gray-800 bg-[#0d1117]/60 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-200 font-medium">
                      <LinkIcon className="w-4 h-4 text-purple-400" />
                      <span>Incoming Backlinks ({incomingBacklinks.length})</span>
                    </div>
                  </div>

                  {/* Backlinks List */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {incomingBacklinks.length === 0 ? (
                      <div className="text-gray-500 text-center py-6">
                        No incoming backlinks yet. Reference this note with{" "}
                        <code className="text-purple-400">[[{activeNote.title}]]</code> in other notes.
                      </div>
                    ) : (
                      incomingBacklinks.map((bl) => (
                        <div
                          key={bl.noteId}
                          onClick={() => setActiveNoteId(bl.noteId)}
                          className="p-2.5 rounded bg-[#0d1117] border border-gray-800 hover:border-purple-600/50 cursor-pointer transition space-y-1"
                        >
                          <div className="font-medium text-purple-300">
                            [[{bl.noteTitle}]]
                          </div>
                          <div className="text-[11px] text-gray-400 line-clamp-2">
                            {bl.contextSnippet}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </aside>
          )}
        </div>
      </main>

      {/* Global Command Palette Modal */}
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        notes={notes}
        onSelectNote={(id) => {
          setActiveNoteId(id);
          if (viewMode === "graph") setViewMode("split");
        }}
        onCreateNote={handleCreateNewNote}
        onOpenGraph={() => setViewMode("graph")}
      />
    </div>
  );
};
