"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Note, Folder, AuthUser } from "@/types/vault";
import {
  loadNotes,
  saveNotes,
  createNewNote,
  updateNoteInVault,
  loadFolders,
  saveFolders,
  createFolder,
  recordDeletedNotes,
  recordDeletedFolders,
  syncWithCloud,
  scheduleDebouncedSync,
} from "@/lib/storage";
import { NexusEditor } from "@/components/editor/NexusEditor";
import { NexusAIAssistant } from "@/components/ai/NexusAIAssistant";
import { CommandPalette } from "@/components/palette/CommandPalette";
import { AuthModal } from "@/components/auth/AuthModal";
import {
  FileText,
  Plus,
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
} from "lucide-react";

export const NexusWorkbench: React.FC = () => {
  const [folders, setFolders] = useState<Folder[]>(() => loadFolders());
  const [notes, setNotes] = useState<Note[]>(() => loadNotes());
  const [activeNoteId, setActiveNoteId] = useState<string>(() => {
    const initial = loadNotes();
    return initial[0]?.id || "welcome-to-astro";
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : false
  );
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

  // Check auth session and sync with cloud on mount
  useEffect(() => {
    const initialFolders = loadFolders();
    const initialNotes = loadNotes();

    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setCurrentUser(data.user);
          setIsCloudConfigured(true);
          setSyncStatus("syncing");
          syncWithCloud(initialNotes, initialFolders).then((res) => {
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

  const activeNote = notes.find((n) => n.id === activeNoteId) || notes[0];

  // Breadcrumb path computation (supports multi-level nested subpages)
  const breadcrumbs = React.useMemo(() => {
    if (!activeNote) return [];
    const trail: { id?: string; label: string; type: "folder" | "note" }[] = [];

    // Check Folder
    if (activeNote.folderId) {
      const folder = folders.find((f) => f.id === activeNote.folderId);
      if (folder) trail.push({ id: folder.id, label: folder.name, type: "folder" });
    }

    // Walk up ancestor notes chain with cycle protection
    const ancestors: { id: string; label: string; type: "note" }[] = [];
    const visited = new Set<string>([activeNote.id]);
    let currentParentId = activeNote.parentId;
    while (currentParentId && !visited.has(currentParentId)) {
      visited.add(currentParentId);
      const parent = notes.find((n) => n.id === currentParentId);
      if (!parent) break;
      ancestors.unshift({ id: parent.id, label: parent.title, type: "note" });
      currentParentId = parent.parentId;
    }

    trail.push(...ancestors);
    return trail;
  }, [activeNote, folders, notes]);

  const triggerSync = useCallback(
    (currentNotes: Note[], currentFolders?: Folder[]) => {
      setSyncStatus("syncing");
      scheduleDebouncedSync(
        currentNotes,
        currentFolders ?? folders,
        (syncedNotes, syncedFolders, isCloud) => {
          setIsCloudConfigured(isCloud);
          if (isCloud) {
            if (syncedNotes.length > 0) {
              setNotes(syncedNotes);
            }
            setFolders(syncedFolders);
          }
          setSyncStatus(isCloud ? "synced" : "offline");
        }
      );
    },
    [folders]
  );

  const handleManualSync = async () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    setSyncStatus("syncing");
    const res = await syncWithCloud(notes, folders, { pullOnly: false });
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

  const handleCreateNewNote = useCallback(
    (title?: string, folderId?: string, parentId?: string) => {
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

      triggerSync(updated, folders);
    },
    [notes, folders, triggerSync]
  );

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
  }, [handleCreateNewNote]);

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
      recordDeletedFolders([folderId]);

      // Unfile notes that were in this folder and bump updatedAt so cloud sync saves the change
      const now = Date.now();
      const updatedNotes = notes.map((n) =>
        n.folderId === folderId
          ? { ...n, folderId: undefined, updatedAt: now }
          : n
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

      const deletedList = Array.from(idsToDelete);
      recordDeletedNotes(deletedList);

      const remaining = notes.filter((n) => !idsToDelete.has(n.id));
      setNotes(remaining);
      saveNotes(remaining);
      if (idsToDelete.has(activeNoteId)) {
        setActiveNoteId(remaining[0].id);
      }
      triggerSync(remaining, folders);
      deletedList.forEach((delId) => {
        fetch(`/api/notes/${delId}`, { method: "DELETE" }).catch(() => {});
      });
    }
  };

  const handleUpdateTitle = (newTitle: string) => {
    if (!activeNote) return;
    const updated = updateNoteInVault({ id: activeNote.id, title: newTitle }, notes);
    setNotes(updated);
    triggerSync(updated, folders);
  };

  const handleUpdateContent = (newContent: string) => {
    if (!activeNote) return;
    const updated = updateNoteInVault({ id: activeNote.id, content: newContent }, notes);
    setNotes(updated);
    triggerSync(updated, folders);
  };

  const handleInsertWikilink = (targetTitle: string) => {
    if (!activeNote) return;
    const wikilink = `[[${targetTitle}]]`;
    if (activeNote.content.includes(wikilink)) return;
    const nextContent = `${activeNote.content.trimEnd()}\n\n${wikilink}`;
    handleUpdateContent(nextContent);
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
            if (typeof window !== "undefined" && window.innerWidth < 768) {
              setIsSidebarOpen(false);
            }
          }}
          className={`group flex items-center justify-between py-2 px-2.5 rounded-lg cursor-pointer transition text-sm ${
            isActive
              ? "bg-sky-950/60 text-sky-200 border border-sky-800/50 shadow-sm shadow-sky-950/50"
              : "text-slate-300 hover:bg-[#111827] hover:text-white"
          }`}
          style={{ paddingLeft: `${10 + depth * 16}px` }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {hasSubpages ? (
              <button
                onClick={(e) => toggleNoteCollapse(note.id, e)}
                className="p-0.5 text-slate-500 hover:text-white"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <span className="w-4.5" />
            )}
            <FileText
              className={`w-4 h-4 flex-shrink-0 ${
                isActive ? "text-sky-400" : "text-slate-500"
              }`}
            />
            <span className="truncate">{note.title}</span>
          </div>

          <div
            className={`flex items-center gap-1 shrink-0 transition ${
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
              className={`p-1.5 rounded-md hover:bg-slate-800/80 transition touch-manipulation ${
                isActive
                  ? "text-sky-300 hover:text-white"
                  : "text-slate-400 hover:text-sky-300"
              }`}
              title="Add Subpage"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => handleDeleteNote(note.id, e)}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800/80 rounded-md transition touch-manipulation"
              title="Delete Note"
            >
              <Trash2 className="w-4 h-4" />
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

  // Valid folder and note ID sets so notes with orphaned folderId/parentId never disappear from UI
  const validFolderIds = React.useMemo(
    () => new Set(folders.map((f) => f.id)),
    [folders]
  );
  const validNoteIds = React.useMemo(
    () => new Set(notes.map((n) => n.id)),
    [notes]
  );

  return (
    <div className="flex h-screen w-screen bg-[#06080F] text-slate-100 overflow-hidden font-sans relative">
      {/* 1. Mobile Backdrop for Sidebar Drawer */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-30 md:hidden"
        />
      )}

      {/* 2. Left Sidebar: Folder & Subpage Tree Navigator */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-80 md:w-72 flex-shrink-0 bg-[#0B0F19] border-r border-slate-800/80 flex flex-col h-full transition-transform duration-200 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:hidden"
        }`}
      >
        {/* Astro Brand Header & Create Actions */}
        <div className="px-4 py-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/astro-logo.png"
              alt="Astro"
              className="h-7 w-auto object-contain filter drop-shadow-[0_0_8px_rgba(56,189,248,0.45)]"
            />
            <span className="font-bold text-lg tracking-tight text-white font-sans">
              Astro
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleCreateNewNote()}
              className="p-2 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white transition shadow-sm shadow-sky-500/20"
              title="New Note"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsCreatingFolder(true)}
              className="p-2 rounded-lg bg-[#162032] hover:bg-[#1e2c45] text-slate-300 hover:text-white transition"
              title="New Folder"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 rounded-lg text-slate-400 hover:text-white md:hidden"
              title="Close Menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search bar inside sidebar */}
        <div className="px-3 pt-3 pb-1.5">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#06080F] rounded-lg border border-slate-800/80 text-sm">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Filter notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-gray-200 focus:outline-none w-full text-sm placeholder-gray-400"
            />
          </div>
        </div>

        {/* Inline Folder Creation Form */}
        {isCreatingFolder && (
          <div className="px-3.5 py-2.5 bg-[#06080F] border-y border-slate-800/80 flex items-center gap-2">
            <FolderIcon className="w-4 h-4 text-sky-400 shrink-0" />
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
              className="flex-1 bg-transparent text-sm text-white focus:outline-none"
            />
            <button
              onClick={handleCreateFolderAction}
              className="px-2.5 py-1 rounded bg-sky-600 text-white text-xs hover:bg-sky-500 font-semibold"
            >
              Add
            </button>
            <button
              onClick={() => setIsCreatingFolder(false)}
              className="p-1 text-slate-500 hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tree Navigator */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1 text-sm custom-scrollbar">
          {searchQuery.trim() !== "" ? (
            /* Search Results */
            filteredNotes.map((note) => renderNoteTreeItem(note))
          ) : (
            <>
              {/* 1. Folders Section */}
              {folders.map((folder) => {
                const isCollapsed = collapsedFolders.has(folder.id);
                // Top-level notes directly inside this folder (including subpages whose parent no longer exists)
                const folderNotes = notes.filter(
                  (n) =>
                    n.folderId === folder.id &&
                    (!n.parentId || !validNoteIds.has(n.parentId))
                );

                return (
                  <div key={folder.id} className="flex flex-col mb-1.5">
                    {/* Folder Row */}
                    <div
                      onClick={() => toggleFolderCollapse(folder.id)}
                      className="group flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-[#111827] cursor-pointer text-slate-400 hover:text-slate-200 transition"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <button className="p-0.5 text-slate-500 group-hover:text-slate-300">
                          {isCollapsed ? (
                            <ChevronRight className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        {isCollapsed ? (
                          <FolderIcon className="w-4 h-4 text-sky-400 shrink-0" />
                        ) : (
                          <FolderOpen className="w-4 h-4 text-sky-400 shrink-0" />
                        )}
                        <span className="font-semibold text-sm truncate text-slate-200">
                          {folder.name}
                        </span>
                        <span className="text-xs text-slate-500 ml-1">
                          ({folderNotes.length})
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 hover:opacity-100 transition">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreateNewNote("Untitled Note", folder.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-sky-300 hover:bg-slate-800/80 rounded-md transition touch-manipulation"
                          title="Add Note in Folder"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteFolder(folder.id, e)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800/80 rounded-md transition touch-manipulation"
                          title="Delete Folder"
                        >
                          <Trash2 className="w-4 h-4" />
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
                            className="flex items-center gap-2 pl-9 py-2 text-xs sm:text-sm text-slate-500 hover:text-sky-300 transition text-left w-full touch-manipulation"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add note to this folder</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* 2. Unfiled Root Notes (including any note whose folderId/parentId no longer exists) */}
              <div className="pt-2">
                <div className="px-2.5 py-1.5 flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <span>Notes</span>
                  <button
                    onClick={() => handleCreateNewNote()}
                    className="p-1.5 text-slate-400 hover:text-sky-300 rounded-md hover:bg-slate-800/80 transition touch-manipulation"
                    title="New Note"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {notes
                  .filter(
                    (n) =>
                      (!n.folderId || !validFolderIds.has(n.folderId)) &&
                      (!n.parentId || !validNoteIds.has(n.parentId))
                  )
                  .map((note) => renderNoteTreeItem(note, 0))}
              </div>
            </>
          )}
        </div>

        {/* User Account & Quick Search Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-[#06080F]/80 space-y-2">
          {currentUser ? (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#0E1424] border border-slate-800/80 text-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                  {currentUser.name ? currentUser.name[0].toUpperCase() : "U"}
                </div>
                <div className="min-w-0">
                  <div className="text-slate-200 font-medium truncate text-sm leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="text-slate-500 text-xs truncate leading-tight">
                    {currentUser.email}
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800/80 rounded-md transition touch-manipulation"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-sky-950/40 border border-sky-800/50 text-sky-300 hover:bg-sky-900/40 hover:text-white transition text-sm font-medium group touch-manipulation shadow-sm shadow-sky-950/30"
            >
              <div className="flex items-center gap-2.5">
                <Cloud className="w-4 h-4 text-sky-400" />
                <span>Sign In to Cloud Sync</span>
              </div>
              <LogIn className="w-4 h-4 opacity-60 group-hover:opacity-100" />
            </button>
          )}

          <button
            onClick={() => setIsPaletteOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#0E1424] border border-slate-800/80 text-slate-400 hover:text-white transition text-sm"
          >
            <div className="flex items-center gap-2.5">
              <Search className="w-4 h-4 text-slate-500" />
              <span>Search Notes</span>
            </div>
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs bg-slate-800/80 rounded border border-slate-700/60 text-slate-400">
              Ctrl+K
            </kbd>
          </button>
        </div>
      </aside>

      {/* 3. Main Workbench Canvas */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#06080F]">
        {/* Top Header Bar with Hierarchical Breadcrumbs */}
        <header className="h-14 border-b border-slate-800/80 bg-[#0B0F19]/90 backdrop-blur-md px-3 sm:px-5 flex items-center justify-between z-10 flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-white transition touch-manipulation"
              title="Toggle Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Hierarchical Breadcrumb Trail */}
            <div className="flex items-center gap-2 text-sm text-slate-400 min-w-0 truncate">
              {breadcrumbs.map((crumb, i) => (
                <React.Fragment key={crumb.id || i}>
                  {crumb.type === "note" && crumb.id ? (
                    <button
                      onClick={() => setActiveNoteId(crumb.id!)}
                      className="text-sky-400 hover:text-sky-300 font-medium truncate max-w-[120px] sm:max-w-[160px]"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span className="text-slate-400 font-medium truncate max-w-[120px] sm:max-w-[160px]">
                      {crumb.label}
                    </span>
                  )}
                  <span className="text-slate-600">/</span>
                </React.Fragment>
              ))}

              <span className="text-slate-200 truncate max-w-[140px] sm:max-w-md font-semibold">
                {activeNote?.title || "No Note"}
              </span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Minimalist Cloud Sync Icon */}
            <button
              onClick={handleManualSync}
              className={`p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs sm:text-sm transition border flex items-center gap-2 ${
                syncStatus === "syncing"
                  ? "bg-amber-950/40 text-amber-300 border-amber-800/50"
                  : isCloudConfigured
                  ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/50 hover:bg-emerald-900/40"
                  : "bg-[#0E1424] text-slate-400 border-slate-800/80 hover:text-white hover:border-slate-700"
              }`}
              title={
                currentUser
                  ? `Logged in as ${currentUser.email} (Tap to sync)`
                  : "Running in local storage mode. Tap to sign in and enable cloud sync."
              }
            >
              {syncStatus === "syncing" ? (
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
              ) : currentUser ? (
                <Cloud className="w-4 h-4 text-emerald-400" />
              ) : (
                <CloudOff className="w-4 h-4 text-slate-500" />
              )}
              <span className="hidden md:inline font-medium">
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
              className={`flex items-center gap-2 p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs sm:text-sm transition border ${
                isRightDrawerOpen
                  ? "bg-indigo-950/60 text-indigo-300 border-indigo-800/60 shadow-sm"
                  : "bg-[#0E1424] text-slate-400 border-slate-800/80 hover:text-white"
              }`}
              title="Toggle AI Copilot"
            >
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span className="hidden md:inline font-medium">AI Copilot</span>
            </button>

            {/* Delete Active Note */}
            {activeNote && (
              <button
                onClick={(e) => handleDeleteNote(activeNote.id, e)}
                className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800/80 transition touch-manipulation"
                title="Delete Current Note"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* View Container */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Main workspace panes */}
          <div className="flex-1 flex overflow-hidden">
            {/* Full-width Editor Canvas */}
            {activeNote ? (
              <div className="h-full w-full flex flex-col">
                <NexusEditor
                  initialContent={activeNote.content}
                  noteTitle={activeNote.title}
                  onUpdateTitle={handleUpdateTitle}
                  onUpdateContent={handleUpdateContent}
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-base">
                <span>Select a note from the sidebar or create a new one to begin.</span>
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
              <aside className="fixed md:static inset-y-0 right-0 z-50 w-full sm:w-96 flex-shrink-0 bg-[#0B0F19] border-l border-slate-800/80 flex flex-col h-full shadow-2xl md:shadow-none">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-[#06080F]/60 md:hidden">
                  <span className="text-sm font-semibold text-slate-200">
                    Astro AI Copilot
                  </span>
                  <button
                    onClick={() => setIsRightDrawerOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-md"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <NexusAIAssistant
                    key={currentUser?.id || "local"}
                    activeNote={activeNote}
                    allNotes={notes}
                    folders={folders}
                    currentUser={currentUser}
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

      {/* 5. Global Command Palette Modal */}
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        notes={notes}
        onSelectNote={(id) => setActiveNoteId(id)}
        onCreateNote={(title) => handleCreateNewNote(title)}
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
