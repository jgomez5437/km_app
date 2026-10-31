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
  Search,
  Hash,
  Trash2,
  FolderTree,
  Cloud,
  CloudOff,
  RefreshCw,
  Menu,
  X,
} from "lucide-react";

export const NexusWorkbench: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>(INITIAL_SAMPLE_NOTES);
  const [activeNoteId, setActiveNoteId] = useState<string>("welcome-to-nexus");
  const [viewMode, setViewMode] = useState<"editor" | "split" | "graph">("editor");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"notes" | "tags">("notes");
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "offline">("offline");
  const [isCloudConfigured, setIsCloudConfigured] = useState(false);

  // Responsive default layout: open sidebar & split on desktop, clean single-pane on mobile
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
        setViewMode("split");
      } else {
        setIsSidebarOpen(false);
        setViewMode("editor");
      }
    }
  }, []);

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

  // Global Ctrl+K / Ctrl+N shortcut listener
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

  // Incoming backlinks for active note (passed cleanly into document)
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
      triggerSync(updated);
    }
  };

  const handleCreateNewNote = (title?: string) => {
    const newNote = createNewNote(title || "Untitled Note");
    const updated = [newNote, ...notes];
    setNotes(updated);
    saveNotes(updated);
    setActiveNoteId(newNote.id);
    if (viewMode === "graph") {
      setViewMode(typeof window !== "undefined" && window.innerWidth < 640 ? "editor" : "split");
    }
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
    <div className="flex h-screen w-screen bg-[#0d1117] text-gray-100 overflow-hidden font-sans relative">
      {/* 1. Mobile Backdrop for Sidebar Drawer */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden"
        />
      )}

      {/* 2. Left Sidebar: Vault Navigator */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 md:w-64 flex-shrink-0 bg-[#161b22] border-r border-gray-800 flex flex-col h-full transition-transform duration-200 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:hidden"
        }`}
      >
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
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                handleCreateNewNote();
                if (typeof window !== "undefined" && window.innerWidth < 768) {
                  setIsSidebarOpen(false);
                }
              }}
              className="p-1 rounded-md bg-purple-600/80 hover:bg-purple-600 text-white transition shadow-sm"
              title="Create new note"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 rounded-md text-gray-400 hover:text-white md:hidden"
              title="Close Menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
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
                    if (viewMode === "graph") {
                      setViewMode(typeof window !== "undefined" && window.innerWidth < 640 ? "editor" : "split");
                    }
                    if (typeof window !== "undefined" && window.innerWidth < 768) {
                      setIsSidebarOpen(false);
                    }
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
                  onClick={() => {
                    setSearchQuery(tag);
                    setSidebarTab("notes");
                  }}
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
              <span>Search / Commands</span>
            </div>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-gray-800 rounded border border-gray-700">
              Ctrl+K
            </kbd>
          </button>
        </div>
      </aside>

      {/* 3. Main Workbench Canvas */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Workbench Control Bar */}
        <header className="h-12 border-b border-gray-800 bg-[#161b22] px-3 sm:px-4 flex items-center justify-between z-10 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded-md hover:bg-gray-800 text-gray-400 hover:text-white transition touch-manipulation"
              title="Toggle Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 min-w-0">
              <span className="text-gray-500 hidden sm:inline">Vault</span>
              <span className="hidden sm:inline">/</span>
              <span className="text-gray-200 font-medium truncate max-w-[130px] sm:max-w-xs">
                {activeNote?.title || "No Note"}
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
            {/* Split view hidden on small screens */}
            <button
              onClick={() => setViewMode("split")}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition ${
                viewMode === "split"
                  ? "bg-purple-900/60 text-purple-200 font-medium"
                  : "text-gray-400 hover:text-white"
              }`}
              title="Split View"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Split</span>
            </button>
            <button
              onClick={() => setViewMode("graph")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition ${
                viewMode === "graph"
                  ? "bg-purple-900/60 text-purple-200 font-medium"
                  : "text-gray-400 hover:text-white"
              }`}
              title="Knowledge Graph View"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Graph</span>
            </button>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Minimalist Cloud Sync Icon */}
            <button
              onClick={handleManualSync}
              className={`p-1.5 sm:px-2.5 sm:py-1 rounded-md text-xs transition border flex items-center gap-1.5 ${
                syncStatus === "syncing"
                  ? "bg-amber-950/40 text-amber-300 border-amber-800/50"
                  : isCloudConfigured
                  ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/50 hover:bg-emerald-900/40"
                  : "bg-gray-800/40 text-gray-400 border-gray-800 hover:text-white"
              }`}
              title={
                isCloudConfigured
                  ? "Connected to Neon Database (Tap to force sync)"
                  : "Local storage mode."
              }
            >
              {syncStatus === "syncing" ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : isCloudConfigured ? (
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <CloudOff className="w-3.5 h-3.5 text-gray-500" />
              )}
              <span className="hidden md:inline">
                {syncStatus === "syncing" ? "Syncing" : isCloudConfigured ? "Synced" : "Local"}
              </span>
            </button>

            {/* AI Assistant Toggle */}
            <button
              onClick={() => setIsRightDrawerOpen(!isRightDrawerOpen)}
              className={`flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1 rounded-md text-xs transition border ${
                isRightDrawerOpen
                  ? "bg-purple-950/60 text-purple-300 border-purple-800/60"
                  : "bg-gray-800/40 text-gray-400 border-gray-800 hover:text-white"
              }`}
              title="Toggle AI Copilot"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden md:inline">AI Copilot</span>
            </button>
          </div>
        </header>

        {/* View Container */}
        <div className="flex-1 flex overflow-hidden relative">
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
                  incomingBacklinks={incomingBacklinks}
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
                    if (viewMode === "graph") {
                      setViewMode(typeof window !== "undefined" && window.innerWidth < 640 ? "editor" : "split");
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* 4. AI Copilot Drawer (Responsive Modal on Mobile, Side Panel on Desktop) */}
          {isRightDrawerOpen && activeNote && (
            <>
              {/* Mobile backdrop for AI Drawer */}
              <div
                onClick={() => setIsRightDrawerOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden"
              />
              <aside className="fixed md:static inset-y-0 right-0 z-50 w-full sm:w-80 flex-shrink-0 bg-[#161b22] border-l border-gray-800 flex flex-col h-full shadow-2xl md:shadow-none">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 bg-[#0d1117]/60 md:hidden">
                  <span className="text-xs font-medium text-gray-200">AI Copilot</span>
                  <button
                    onClick={() => setIsRightDrawerOpen(false)}
                    className="p-1 text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <NexusAIAssistant
                    activeNote={activeNote}
                    allNotes={notes}
                    onOpenNote={(id) => {
                      setActiveNoteId(id);
                      if (typeof window !== "undefined" && window.innerWidth < 768) {
                        setIsRightDrawerOpen(false);
                      }
                    }}
                    onInsertWikilink={handleInsertWikilink}
                  />
                </div>
              </aside>
            </>
          )}
        </div>
      </main>

      {/* 5. Mobile Floating Action Button (FAB) for Quick Note Creation */}
      <button
        onClick={() => handleCreateNewNote()}
        className="md:hidden fixed bottom-5 right-5 z-20 w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-950/50 flex items-center justify-center active:scale-95 transition"
        title="Create new note"
      >
        <Plus className="w-5 h-5" />
      </button>

      {/* 6. Global Command Palette Modal */}
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        notes={notes}
        onSelectNote={(id) => {
          setActiveNoteId(id);
          if (viewMode === "graph") {
            setViewMode(typeof window !== "undefined" && window.innerWidth < 640 ? "editor" : "split");
          }
        }}
        onCreateNote={handleCreateNewNote}
        onOpenGraph={() => setViewMode("graph")}
      />
    </div>
  );
};
