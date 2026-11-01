"use client";

import React, { useState, useEffect } from "react";
import { Note, Folder, AuthUser } from "@/types/vault";
import {
  loadNotes,
  saveNotes,
  createNewNote,
  updateNoteInVault,
  loadFolders,
  saveFolders,
  createFolder,
  INITIAL_SAMPLE_NOTES,
  INITIAL_SAMPLE_FOLDERS,
  syncWithCloud,
  scheduleDebouncedSync,
} from "@/lib/storage";
import { NexusEditor } from "@/components/editor/NexusEditor";
import { NexusGraph } from "@/components/graph/NexusGraph";
import { NexusAIAssistant } from "@/components/ai/NexusAIAssistant";
import { CommandPalette } from "@/components/palette/CommandPalette";
import { AuthModal } from "@/components/auth/AuthModal";
import {
  FileText,
  Plus,
  Share2,
  Columns,
  Sparkles,
  Search,
  Trash2,
  Folder as FolderIcon,
  FolderOpen,
  FolderPlus,
  ChevronDown,
  ChevronRight,
  Cloud,
  CloudOff,
  RefreshCw,
  Menu,
  X,
  LogOut,
  LogIn,
  User as UserIcon,
} from "lucide-react";

export const NexusWorkbench: React.FC = () => {
  const [folders, setFolders] = useState<Folder[]>(INITIAL_SAMPLE_FOLDERS);
  const [notes, setNotes] = useState<Note[]>(INITIAL_SAMPLE_NOTES);
  const [activeNoteId, setActiveNoteId] = useState<string>("welcome-to-nexus");
  const [viewMode, setViewMode] = useState<"editor" | "split" | "graph">("editor");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "offline">("offline");
  const [isCloudConfigured, setIsCloudConfigured] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Tree collapse state
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [collapsedNotes, setCollapsedNotes] = useState<Set<string>>(new Set());

  // Inline folder creation
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

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

  // Load from local storage and check auth session
  useEffect(() => {
    const loadedFolders = loadFolders();
    setFolders(loadedFolders);

    const loadedNotes = loadNotes();
    setNotes(loadedNotes);
    if (loadedNotes.length > 0 && !loadedNotes.some((n) => n.id === activeNoteId)) {
      setActiveNoteId(loadedNotes[0].id);
    }

    // Check if user is logged in
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setCurrentUser(data.user);
          setIsCloudConfigured(true);
          setSyncStatus("syncing");
          syncWithCloud(loadedNotes, loadedFolders).then((res) => {
            if (res.isCloud) {
              setNotes(res.notes);
              setFolders(res.folders);
              setSyncStatus("synced");
            } else {
              setSyncStatus("offline");
            }
          });
        } else {
          setIsCloudConfigured(false);
          setSyncStatus("offline");
        }
      })
      .catch(() => {
        setSyncStatus("offline");
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

  // Direct subpages of active note
  const activeSubpages = React.useMemo(() => {
    if (!activeNote) return [];
    return notes.filter((n) => n.parentId === activeNote.id);
  }, [activeNote, notes]);

  // Breadcrumb path computation
  const breadcrumbs = React.useMemo(() => {
    if (!activeNote) return [];
    const trail: { id?: string; label: string; type: "folder" | "note" }[] = [];

    // Check Folder
    if (activeNote.folderId) {
      const folder = folders.find((f) => f.id === activeNote.folderId);
      if (folder) trail.push({ id: folder.id, label: folder.name, type: "folder" });
    }

    // Check Parent Note
    if (activeNote.parentId) {
      const parent = notes.find((n) => n.id === activeNote.parentId);
      if (parent) trail.push({ id: parent.id, label: parent.title, type: "note" });
    }

    return trail;
  }, [activeNote, folders, notes]);

  const triggerSync = (currentNotes: Note[], currentFolders?: Folder[]) => {
    setSyncStatus("syncing");
    scheduleDebouncedSync(
      currentNotes,
      currentFolders || folders,
      (syncedNotes, syncedFolders, isCloud) => {
        setIsCloudConfigured(isCloud);
        if (isCloud) {
          if (syncedNotes.length > 0) setNotes(syncedNotes);
          if (syncedFolders.length > 0) setFolders(syncedFolders);
        }
        setSyncStatus(isCloud ? "synced" : "offline");
      }
    );
  };

  const handleManualSync = async () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    setSyncStatus("syncing");
    const res = await syncWithCloud(notes, folders);
    setIsCloudConfigured(res.isCloud);
    if (res.isCloud) {
      setNotes(res.notes);
      setFolders(res.folders);
      if (res.user) setCurrentUser(res.user);
      setSyncStatus("synced");
    } else {
      setSyncStatus("offline");
    }
  };

  const handleAuthSuccess = async (user: AuthUser) => {
    setCurrentUser(user);
    setIsCloudConfigured(true);
    setSyncStatus("syncing");
    const res = await syncWithCloud(notes, folders);
    if (res.isCloud) {
      setNotes(res.notes);
      setFolders(res.folders);
      setSyncStatus("synced");
      if (res.notes.length > 0) {
        setActiveNoteId(res.notes[0].id);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setCurrentUser(null);
      setIsCloudConfigured(false);
      setSyncStatus("offline");
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const handleCreateNewNote = (
    title?: string,
    folderId?: string,
    parentId?: string
  ) => {
    const newNote = createNewNote(title || "Untitled Note", folderId, parentId);
    const updated = [newNote, ...notes];
    setNotes(updated);
    saveNotes(updated);
    setActiveNoteId(newNote.id);

    // If subpage, ensure parent note is expanded in sidebar
    if (parentId) {
      setCollapsedNotes((prev) => {
        const next = new Set(prev);
        next.delete(parentId);
        return next;
      });
    }

    // If in folder, ensure folder is expanded
    if (folderId) {
      setCollapsedFolders((prev) => {
        const next = new Set(prev);
        next.delete(folderId);
        return next;
      });
    }

    if (viewMode === "graph") {
      setViewMode(
        typeof window !== "undefined" && window.innerWidth < 640
          ? "editor"
          : "split"
      );
    }
    triggerSync(updated);
  };

  const handleCreateSubpage = (parentNoteId: string, folderId?: string) => {
    handleCreateNewNote("Untitled Subpage", folderId, parentNoteId);
  };

  const handleCreateFolderAction = () => {
    if (!newFolderName.trim()) {
      setIsCreatingFolder(false);
      return;
    }
    const folder = createFolder(newFolderName.trim());
    const nextFolders = [...folders, folder];
    setFolders(nextFolders);
    saveFolders(nextFolders);
    setNewFolderName("");
    setIsCreatingFolder(false);
    triggerSync(notes, nextFolders);
  };

  const handleDeleteFolder = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this folder? Notes inside will become unfiled.")) {
      const remainingFolders = folders.filter((f) => f.id !== folderId);
      setFolders(remainingFolders);
      saveFolders(remainingFolders);

      // Unfile notes that were in this folder
      const updatedNotes = notes.map((n) =>
        n.folderId === folderId ? { ...n, folderId: undefined } : n
      );
      setNotes(updatedNotes);
      saveNotes(updatedNotes);
      triggerSync(updatedNotes, remainingFolders);
    }
  };

  const handleDeleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (notes.length <= 1) {
      alert("Cannot delete the last remaining note in the vault.");
      return;
    }
    if (confirm("Delete this note and its subpages?")) {
      // Find all descendant note IDs recursively
      const idsToDelete = new Set<string>([id]);
      let added = true;
      while (added) {
        added = false;
        notes.forEach((n) => {
          if (n.parentId && idsToDelete.has(n.parentId) && !idsToDelete.has(n.id)) {
            idsToDelete.add(n.id);
            added = true;
          }
        });
      }

      const remaining = notes.filter((n) => !idsToDelete.has(n.id));
      setNotes(remaining);
      saveNotes(remaining);
      if (idsToDelete.has(activeNoteId)) {
        setActiveNoteId(remaining[0].id);
      }
      triggerSync(remaining);
      idsToDelete.forEach((delId) => {
        fetch(`/api/notes/${delId}`, { method: "DELETE" }).catch(() => {});
      });
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

  const toggleFolderCollapse = (folderId: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const toggleNoteCollapse = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) next.delete(noteId);
      else next.add(noteId);
      return next;
    });
  };

  // Helper to render a note item with its nested subpages
  const renderNoteTreeItem = (note: Note, depth = 0) => {
    const isActive = note.id === activeNoteId;
    const childSubpages = notes.filter((n) => n.parentId === note.id);
    const hasSubpages = childSubpages.length > 0;
    const isCollapsed = collapsedNotes.has(note.id);

    return (
      <div key={note.id} className="flex flex-col">
        <div
          onClick={() => {
            setActiveNoteId(note.id);
            if (viewMode === "graph") {
              setViewMode(
                typeof window !== "undefined" && window.innerWidth < 640
                  ? "editor"
                  : "split"
              );
            }
            if (typeof window !== "undefined" && window.innerWidth < 768) {
              setIsSidebarOpen(false);
            }
          }}
          className={`group flex items-center justify-between py-1.5 px-2 rounded-md cursor-pointer transition text-xs ${
            isActive
              ? "bg-purple-950/60 text-purple-200 border border-purple-800/40"
              : "text-gray-300 hover:bg-[#1f242c]"
          }`}
          style={{ paddingLeft: `${8 + depth * 14}px` }}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {hasSubpages ? (
              <button
                onClick={(e) => toggleNoteCollapse(note.id, e)}
                className="p-0.5 text-gray-500 hover:text-white"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            ) : (
              <span className="w-4" />
            )}
            <FileText
              className={`w-3.5 h-3.5 flex-shrink-0 ${
                isActive ? "text-purple-400" : "text-gray-500"
              }`}
            />
            <span className="truncate">{note.title}</span>
          </div>

          <div
            className={`flex items-center gap-0.5 shrink-0 transition ${
              isActive
                ? "opacity-100"
                : "opacity-70 sm:opacity-0 sm:group-hover:opacity-100 hover:opacity-100"
            }`}
          >
            {/* Add Subpage button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCreateSubpage(note.id, note.folderId);
              }}
              className={`p-1 rounded hover:bg-gray-700/60 transition touch-manipulation ${
                isActive
                  ? "text-purple-300 hover:text-white"
                  : "text-gray-400 hover:text-purple-300"
              }`}
              title="Add Subpage"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => handleDeleteNote(note.id, e)}
              className="p-1 text-gray-400 hover:text-red-400 hover:bg-gray-700/60 rounded transition touch-manipulation"
              title="Delete Note"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Nested Subpages */}
        {hasSubpages && !isCollapsed && (
          <div className="flex flex-col">
            {childSubpages.map((sub) => renderNoteTreeItem(sub, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Filter notes for search
  const filteredNotes = notes.filter((n) =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase())
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

      {/* 2. Left Sidebar: Folder & Subpage Tree Navigator */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 md:w-64 flex-shrink-0 bg-[#161b22] border-r border-gray-800 flex flex-col h-full transition-transform duration-200 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:hidden"
        }`}
      >
        {/* Vault Header & Create Actions */}
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
              onClick={() => handleCreateNewNote()}
              className="p-1 rounded-md bg-purple-600/80 hover:bg-purple-600 text-white transition shadow-sm"
              title="New Note"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsCreatingFolder(true)}
              className="p-1 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition"
              title="New Folder"
            >
              <FolderPlus className="w-4 h-4" />
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
              placeholder="Filter notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-gray-200 focus:outline-none w-full text-xs placeholder-gray-500"
            />
          </div>
        </div>

        {/* Inline Folder Creation Form */}
        {isCreatingFolder && (
          <div className="px-3 py-2 bg-[#0d1117] border-y border-gray-800 flex items-center gap-1.5">
            <FolderIcon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <input
              type="text"
              placeholder="Folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolderAction();
                if (e.key === "Escape") setIsCreatingFolder(false);
              }}
              autoFocus
              className="flex-1 bg-transparent text-xs text-white focus:outline-none"
            />
            <button
              onClick={handleCreateFolderAction}
              className="px-2 py-0.5 rounded bg-purple-600 text-white text-[10px] hover:bg-purple-500"
            >
              Add
            </button>
            <button
              onClick={() => setIsCreatingFolder(false)}
              className="p-0.5 text-gray-500 hover:text-gray-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tree Navigator */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs custom-scrollbar">
          {searchQuery.trim() !== "" ? (
            /* Search Results */
            filteredNotes.map((note) => renderNoteTreeItem(note))
          ) : (
            <>
              {/* 1. Folders Section */}
              {folders.map((folder) => {
                const isCollapsed = collapsedFolders.has(folder.id);
                // Top-level notes directly inside this folder
                const folderNotes = notes.filter(
                  (n) => n.folderId === folder.id && !n.parentId
                );

                return (
                  <div key={folder.id} className="flex flex-col mb-1">
                    {/* Folder Row */}
                    <div
                      onClick={() => toggleFolderCollapse(folder.id)}
                      className="group flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[#1f242c] cursor-pointer text-gray-400 hover:text-gray-200 transition"
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <button className="p-0.5 text-gray-500 group-hover:text-gray-300">
                          {isCollapsed ? (
                            <ChevronRight className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {isCollapsed ? (
                          <FolderIcon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        ) : (
                          <FolderOpen className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        )}
                        <span className="font-semibold text-xs truncate text-gray-300">
                          {folder.name}
                        </span>
                        <span className="text-[10px] text-gray-600 ml-1">
                          ({folderNotes.length})
                        </span>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 hover:opacity-100 transition">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreateNewNote("Untitled Note", folder.id);
                          }}
                          className="p-1 text-gray-400 hover:text-purple-300 hover:bg-gray-700/60 rounded transition touch-manipulation"
                          title="Add Note in Folder"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteFolder(folder.id, e)}
                          className="p-1 text-gray-400 hover:text-red-400 hover:bg-gray-700/60 rounded transition touch-manipulation"
                          title="Delete Folder"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Notes Inside Folder */}
                    {!isCollapsed && (
                      <div className="flex flex-col">
                        {folderNotes.length > 0 ? (
                          folderNotes.map((note) => renderNoteTreeItem(note, 1))
                        ) : (
                          <button
                            onClick={() => handleCreateNewNote("Untitled Note", folder.id)}
                            className="flex items-center gap-1.5 pl-7 py-1.5 text-[11px] text-gray-500 hover:text-purple-300 transition text-left w-full touch-manipulation"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add note to this folder</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* 2. Unfiled Root Notes */}
              <div className="pt-2">
                <div className="px-2 py-1 flex items-center justify-between text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  <span>Notes</span>
                  <button
                    onClick={() => handleCreateNewNote()}
                    className="p-1 text-gray-500 hover:text-purple-300 rounded hover:bg-gray-800 transition touch-manipulation"
                    title="New Note"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {notes
                  .filter((n) => !n.folderId && !n.parentId)
                  .map((note) => renderNoteTreeItem(note, 0))}
              </div>
            </>
          )}
        </div>

        {/* User Account & Quick Search Footer */}
        <div className="p-3 border-t border-gray-800 bg-[#0d1117]/60 space-y-2">
          {currentUser ? (
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#161b22] border border-gray-800 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                  {currentUser.name ? currentUser.name[0].toUpperCase() : "U"}
                </div>
                <div className="min-w-0">
                  <div className="text-gray-200 font-medium truncate text-xs leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="text-gray-500 text-[10px] truncate leading-tight">
                    {currentUser.email}
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded transition touch-manipulation"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-purple-950/40 border border-purple-800/50 text-purple-300 hover:bg-purple-900/40 hover:text-white transition text-xs group touch-manipulation"
            >
              <div className="flex items-center gap-2">
                <Cloud className="w-3.5 h-3.5 text-purple-400" />
                <span className="font-medium">Sign In to Cloud Sync</span>
              </div>
              <LogIn className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
            </button>
          )}

          <button
            onClick={() => setIsPaletteOpen(true)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#161b22] border border-gray-800 text-gray-400 hover:text-white transition text-xs"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5" />
              <span>Search Notes</span>
            </div>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-gray-800 rounded border border-gray-700">
              Ctrl+K
            </kbd>
          </button>
        </div>
      </aside>

      {/* 3. Main Workbench Canvas */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header Bar with Hierarchical Breadcrumbs */}
        <header className="h-12 border-b border-gray-800 bg-[#161b22] px-3 sm:px-4 flex items-center justify-between z-10 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded-md hover:bg-gray-800 text-gray-400 hover:text-white transition touch-manipulation"
              title="Toggle Menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Hierarchical Breadcrumb Trail */}
            <div className="flex items-center gap-1.5 text-xs text-gray-400 min-w-0 truncate">
              {breadcrumbs.map((crumb, i) => (
                <React.Fragment key={crumb.id || i}>
                  {crumb.type === "note" && crumb.id ? (
                    <button
                      onClick={() => setActiveNoteId(crumb.id!)}
                      className="text-purple-400 hover:text-purple-300 font-medium truncate max-w-[90px]"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span className="text-gray-400 font-medium truncate max-w-[90px]">
                      {crumb.label}
                    </span>
                  )}
                  <span className="text-gray-600">/</span>
                </React.Fragment>
              ))}

              <span className="text-gray-400 truncate max-w-[120px] sm:max-w-xs">
                {activeNote?.title || "No Note"}
              </span>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-[#0d1117] p-1 rounded-lg border border-gray-800 mr-2">
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
              title="Hierarchy Graph View"
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
                currentUser
                  ? `Logged in as ${currentUser.email} (Tap to sync)`
                  : "Running in local storage mode. Tap to sign in and enable cloud sync."
              }
            >
              {syncStatus === "syncing" ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : currentUser ? (
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <CloudOff className="w-3.5 h-3.5 text-gray-500" />
              )}
              <span className="hidden md:inline">
                {syncStatus === "syncing"
                  ? "Syncing"
                  : currentUser
                  ? "Synced"
                  : "Sign In"}
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

            {/* Delete Active Note */}
            {activeNote && (
              <button
                onClick={(e) => handleDeleteNote(activeNote.id, e)}
                className="p-1.5 rounded-md text-gray-400 hover:text-red-400 hover:bg-gray-800 transition touch-manipulation"
                title="Delete Current Note"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
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
                  subpages={activeSubpages}
                  onCreateSubpage={() =>
                    handleCreateSubpage(activeNote.id, activeNote.folderId)
                  }
                  onSelectNote={(id) => setActiveNoteId(id)}
                />
              </div>
            )}

            {/* Right Pane (Hierarchical Graph) */}
            {(viewMode === "graph" || viewMode === "split") && (
              <div
                className={`h-full flex flex-col ${
                  viewMode === "split" ? "w-1/2" : "w-full"
                }`}
              >
                <NexusGraph
                  notes={notes}
                  folders={folders}
                  activeNoteId={activeNoteId}
                  onSelectNote={(id) => {
                    setActiveNoteId(id);
                    if (viewMode === "graph") {
                      setViewMode(
                        typeof window !== "undefined" && window.innerWidth < 640
                          ? "editor"
                          : "split"
                      );
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* 4. AI Copilot Drawer */}
          {isRightDrawerOpen && activeNote && (
            <>
              {/* Mobile backdrop for AI Drawer */}
              <div
                onClick={() => setIsRightDrawerOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden"
              />
              <aside className="fixed md:static inset-y-0 right-0 z-50 w-full sm:w-80 flex-shrink-0 bg-[#161b22] border-l border-gray-800 flex flex-col h-full shadow-2xl md:shadow-none">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 bg-[#0d1117]/60 md:hidden">
                  <span className="text-xs font-medium text-gray-200">
                    AI Copilot
                  </span>
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
                    onInsertWikilink={() => {}}
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
            setViewMode(
              typeof window !== "undefined" && window.innerWidth < 640
                ? "editor"
                : "split"
            );
          }
        }}
        onCreateNote={(title) => handleCreateNewNote(title)}
        onOpenGraph={() => setViewMode("graph")}
      />

      {/* 7. Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
};
