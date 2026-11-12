"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Image from "next/image";
import { Note, Folder, AuthUser } from "@/types/vault";
import {
  FileText,
  Plus,
  Search,
  Trash2,
  Folder as FolderIcon,
  FolderOpen,
  FolderPlus,
  ChevronDown,
  ChevronRight,
  Cloud,
  X,
  LogOut,
  LogIn,
  Settings,
  Pin,
  MoreHorizontal,
  Edit2,
  Copy,
  FolderInput,
  ArrowUpDown,
  Hash,
  Check,
} from "lucide-react";

export type NoteSortOrder = "updated" | "created" | "title";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  activeNoteId: string;
  onSelectNote: (id: string) => void;
  onCreateNote: (title?: string, folderId?: string, parentId?: string) => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  onDeleteNote: (id: string, e?: React.MouseEvent) => void;
  onDeleteFolder: (id: string, e: React.MouseEvent) => void;
  onTogglePinNote: (id: string) => void;
  onDuplicateNote: (id: string) => void;
  onMoveNoteToFolder: (noteId: string, folderId: string | undefined) => void;
  collapsedFolders: Set<string>;
  onToggleFolderCollapse: (folderId: string) => void;
  collapsedNotes: Set<string>;
  onToggleNoteCollapse: (noteId: string, e: React.MouseEvent) => void;
  currentUser: AuthUser | null;
  onOpenSettings: (tab?: "profile" | "ai" | "appearance" | "vault") => void;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  notes,
  folders,
  activeNoteId,
  onSelectNote,
  onCreateNote,
  onCreateFolder,
  onRenameFolder,
  onDeleteNote,
  onDeleteFolder,
  onTogglePinNote,
  onDuplicateNote,
  onMoveNoteToFolder,
  collapsedFolders,
  onToggleFolderCollapse,
  collapsedNotes,
  onToggleNoteCollapse,
  currentUser,
  onOpenSettings,
  onOpenAuthModal,
  onLogout,
  searchQuery,
  onSearchChange,
}) => {
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");

  const [sortOrder, setSortOrder] = useState<NoteSortOrder>("updated");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isPinnedCollapsed, setIsPinnedCollapsed] = useState(false);

  const [openNoteMenuId, setOpenNoteMenuId] = useState<string | null>(null);
  const [isMoveSubmenuOpen, setIsMoveSubmenuOpen] = useState(false);
  const noteMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openNoteMenuId) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (noteMenuRef.current && !noteMenuRef.current.contains(e.target as Node)) {
        setOpenNoteMenuId(null);
        setIsMoveSubmenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenNoteMenuId(null);
        setIsMoveSubmenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [openNoteMenuId]);

  const handleCreateFolderAction = () => {
    if (!newFolderName.trim()) {
      setIsCreatingFolder(false);
      return;
    }
    onCreateFolder(newFolderName.trim());
    setNewFolderName("");
    setIsCreatingFolder(false);
  };

  const handleCommitRenameFolder = (folderId: string) => {
    if (editingFolderName.trim()) {
      onRenameFolder(folderId, editingFolderName.trim());
    }
    setEditingFolderId(null);
    setEditingFolderName("");
  };

  // All unique tags across vault
  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    notes.forEach((n) => {
      (n.tags || []).forEach((t) => {
        counts.set(t, (counts.get(t) || 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag]) => tag);
  }, [notes]);

  const activeTag = selectedTag && allTags.includes(selectedTag) ? selectedTag : null;

  const sortNotesList = useMemo(() => {
    const comparator = (a: Note, b: Note) => {
      if (sortOrder === "title") {
        return (a.title || "Untitled Note").localeCompare(
          b.title || "Untitled Note"
        );
      }
      if (sortOrder === "created") {
        return b.createdAt - a.createdAt;
      }
      return b.updatedAt - a.updatedAt;
    };
    return [...notes].sort(comparator);
  }, [notes, sortOrder]);

  // Filter notes across title, content, and selected tag
  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortNotesList.filter((n) => {
      if (activeTag && !(n.tags || []).includes(activeTag)) {
        return false;
      }
      if (!q) return true;
      const titleMatch = (n.title || "Untitled Note").toLowerCase().includes(q);
      const contentMatch = (n.content || "").toLowerCase().includes(q);
      const tagMatch = (n.tags || []).some((t) => t.toLowerCase().includes(q));
      return titleMatch || contentMatch || tagMatch;
    });
  }, [sortNotesList, searchQuery, activeTag]);

  const pinnedNotes = useMemo(
    () => sortNotesList.filter((n) => n.pinned),
    [sortNotesList]
  );

  const validFolderIds = useMemo(
    () => new Set(folders.map((f) => f.id)),
    [folders]
  );
  const validNoteIds = useMemo(
    () => new Set(notes.map((n) => n.id)),
    [notes]
  );

  const renderNoteTreeItem = (note: Note, depth = 0, keyPrefix = "tree") => {
    const isActive = note.id === activeNoteId;
    const childSubpages = sortNotesList.filter((n) => n.parentId === note.id);
    const hasSubpages = childSubpages.length > 0;
    const isCollapsed = collapsedNotes.has(note.id);
    const menuKey = `${keyPrefix}-${note.id}`;
    const isMenuOpen = openNoteMenuId === menuKey;

    return (
      <div key={menuKey} className="flex flex-col relative">
        <div
          onClick={() => {
            onSelectNote(note.id);
            if (typeof window !== "undefined" && window.innerWidth < 768) {
              onClose();
            }
          }}
          role="treeitem"
          aria-selected={isActive}
          className={`group flex items-center justify-between py-1.5 px-2.5 rounded-lg cursor-pointer transition text-xs sm:text-[13px] min-h-[36px] ${
            isActive
              ? "bg-sky-950/65 text-sky-100 border border-sky-700/50 shadow-xs shadow-sky-950/50"
              : "text-slate-300 border border-transparent hover:bg-[#111827] hover:text-white"
          }`}
          style={{ paddingLeft: `${10 + depth * 14}px` }}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {hasSubpages ? (
              <button
                type="button"
                onClick={(e) => onToggleNoteCollapse(note.id, e)}
                className="p-0.5 text-slate-500 hover:text-white rounded shrink-0"
                aria-label={isCollapsed ? "Expand subpages" : "Collapse subpages"}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <span className="w-4 shrink-0" />
            )}
            <FileText
              className={`w-3.5 h-3.5 shrink-0 ${
                isActive ? "text-sky-400" : "text-slate-500"
              }`}
            />
            <span className="truncate font-medium">
              {note.title.trim() || "Untitled Note"}
            </span>
            {note.pinned && keyPrefix !== "pinned" && (
              <Pin className="w-3 h-3 text-amber-400/80 shrink-0" />
            )}
            {hasSubpages && isCollapsed && (
              <span className="text-[10px] px-1 rounded bg-slate-800/80 text-slate-400 shrink-0">
                {childSubpages.length}
              </span>
            )}
          </div>

          <div
            className={`flex items-center gap-0.5 shrink-0 transition ${
              isActive || isMenuOpen
                ? "opacity-100"
                : "opacity-80 sm:opacity-0 sm:group-hover:opacity-100 hover:opacity-100"
            }`}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCreateNote("", note.folderId, note.id);
              }}
              className={`p-1 rounded-md hover:bg-slate-800/80 transition touch-manipulation ${
                isActive
                  ? "text-sky-300 hover:text-white"
                  : "text-slate-400 hover:text-sky-300"
              }`}
              title="Add Subpage"
              aria-label="Add Subpage"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMoveSubmenuOpen(false);
                setOpenNoteMenuId((prev) => (prev === menuKey ? null : menuKey));
              }}
              className={`p-1 rounded-md hover:bg-slate-800/80 transition touch-manipulation ${
                isMenuOpen
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
              title="More Actions"
              aria-label="More Note Actions"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Context Menu Popover */}
        {isMenuOpen && (
          <div
            ref={noteMenuRef}
            onClick={(e) => e.stopPropagation()}
            className="absolute right-2 top-9 w-48 p-1.5 bg-[#0B0F19]/98 backdrop-blur-xl border border-slate-700/80 rounded-xl shadow-[0_14px_36px_rgba(0,0,0,0.85)] z-50 text-xs text-slate-200 animate-pop-in"
          >
            <button
              type="button"
              onClick={() => {
                onTogglePinNote(note.id);
                setOpenNoteMenuId(null);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[#162032] transition text-left"
            >
              <Pin className="w-3.5 h-3.5 text-amber-400" />
              <span>{note.pinned ? "Unpin Note" : "Pin Note"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onDuplicateNote(note.id);
                setOpenNoteMenuId(null);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[#162032] transition text-left"
            >
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Duplicate</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMoveSubmenuOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#162032] transition text-left"
            >
              <span className="flex items-center gap-2">
                <FolderInput className="w-3.5 h-3.5 text-sky-400" />
                <span>Move to Folder</span>
              </span>
              <ChevronRight
                className={`w-3 h-3 text-slate-500 transition-transform ${
                  isMoveSubmenuOpen ? "rotate-90" : ""
                }`}
              />
            </button>

            {isMoveSubmenuOpen && (
              <div className="my-1 ml-2 pl-2 border-l border-slate-800 space-y-0.5 max-h-32 overflow-y-auto custom-scrollbar">
                <button
                  type="button"
                  onClick={() => {
                    onMoveNoteToFolder(note.id, undefined);
                    setOpenNoteMenuId(null);
                  }}
                  className="w-full flex items-center justify-between px-2 py-1 rounded hover:bg-slate-800/80 text-slate-300 text-left"
                >
                  <span>Unfiled</span>
                  {!note.folderId && <Check className="w-3 h-3 text-sky-400" />}
                </button>
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => {
                      onMoveNoteToFolder(note.id, folder.id);
                      setOpenNoteMenuId(null);
                    }}
                    className="w-full flex items-center justify-between px-2 py-1 rounded hover:bg-slate-800/80 text-slate-300 text-left"
                  >
                    <span className="truncate">{folder.name}</span>
                    {note.folderId === folder.id && (
                      <Check className="w-3 h-3 text-sky-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="my-1 border-t border-slate-800/80" />

            <button
              type="button"
              onClick={(e) => {
                setOpenNoteMenuId(null);
                onDeleteNote(note.id, e);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-red-950/50 text-red-400 hover:text-red-300 transition text-left"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Note</span>
            </button>
          </div>
        )}

        {/* Nested Subpages */}
        {hasSubpages && !isCollapsed && keyPrefix === "tree" && (
          <div className="flex flex-col" role="group">
            {childSubpages.map((sub) => renderNoteTreeItem(sub, depth + 1, keyPrefix))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-30 md:hidden"
        />
      )}

      {/* Sidebar Drawer with smooth desktop collapse */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 shrink-0 bg-[#0B0F19] border-r border-slate-800/80 flex flex-col h-full transition-all duration-200 ease-out pb-[env(safe-area-inset-bottom)] ${
          isOpen
            ? "w-72 translate-x-0 opacity-100"
            : "w-72 -translate-x-full md:translate-x-0 md:w-0 md:opacity-0 md:border-r-0 md:overflow-hidden pointer-events-none md:pointer-events-none"
        }`}
        aria-hidden={!isOpen}
      >
        <div className="w-72 flex flex-col h-full">
          {/* Brand Header */}
          <div className="px-4 h-14 border-b border-slate-800/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <Image
                src="/astro-logo.png"
                alt="Astro Logo"
                width={26}
                height={26}
                className="h-6 w-auto object-contain filter drop-shadow-[0_0_8px_rgba(56,189,248,0.45)]"
              />
              <span className="font-bold text-base tracking-tight text-white font-sans">
                Astro
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white md:hidden"
              title="Close Menu"
              aria-label="Close Menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Primary Creation Action Row */}
          <div className="px-3 pt-3 flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onCreateNote()}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold transition shadow-sm shadow-sky-500/20 active:scale-[0.99] touch-manipulation"
              title="New Note (Alt+N)"
            >
              <Plus className="w-4 h-4" />
              <span>New Note</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCreatingFolder(true)}
              className="p-2 rounded-xl bg-[#111827] hover:bg-[#1a2438] border border-slate-800 text-slate-300 hover:text-white transition touch-manipulation"
              title="New Folder"
              aria-label="New Folder"
            >
              <FolderPlus className="w-4 h-4 text-sky-400" />
            </button>
          </div>

          {/* Search & Sort Controls */}
          <div className="px-3 pt-2.5 pb-1.5 space-y-2 shrink-0">
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#06080F] rounded-lg border border-slate-800/80 focus-within:border-sky-500/70 transition text-xs">
              <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <input
                type="text"
                placeholder="Filter notes..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="bg-transparent border-none text-slate-200 focus:outline-none w-full text-base sm:text-xs placeholder-slate-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="text-slate-500 hover:text-slate-300"
                  aria-label="Clear filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort & Tag Filter Strip */}
            <div className="flex items-center justify-between gap-2 px-0.5">
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <ArrowUpDown className="w-3 h-3 text-slate-500" />
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as NoteSortOrder)}
                  aria-label="Sort notes"
                  className="bg-transparent text-slate-300 focus:outline-none cursor-pointer hover:text-white text-[11px] font-medium"
                >
                  <option value="updated" className="bg-[#0B0F19]">
                    Last Edited
                  </option>
                  <option value="created" className="bg-[#0B0F19]">
                    Newest Created
                  </option>
                  <option value="title" className="bg-[#0B0F19]">
                    Title A–Z
                  </option>
                </select>
              </div>
              <span className="text-[11px] text-slate-500">
                {notes.length} {notes.length === 1 ? "note" : "notes"}
              </span>
            </div>

            {/* Tag Filter Pills */}
            {allTags.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                {activeTag && (
                  <button
                    type="button"
                    onClick={() => setSelectedTag(null)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 hover:text-white text-[11px] shrink-0 transition"
                  >
                    <X className="w-2.5 h-2.5" />
                    <span>Clear</span>
                  </button>
                )}
                {allTags.map((tag) => {
                  const isSelected = activeTag === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSelectedTag(isSelected ? null : tag)}
                      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 transition border ${
                        isSelected
                          ? "bg-sky-950/80 border-sky-600/80 text-sky-200"
                          : "bg-[#06080F] border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                      }`}
                    >
                      <Hash className="w-2.5 h-2.5 text-sky-400/80" />
                      <span>{tag}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Inline Folder Creation Form */}
          {isCreatingFolder && (
            <div className="px-3.5 py-2.5 bg-[#06080F] border-y border-slate-800/80 flex items-center gap-2 shrink-0">
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
                className="flex-1 bg-transparent text-base sm:text-xs text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCreateFolderAction}
                className="px-2.5 py-1 rounded bg-sky-600 text-white text-xs hover:bg-sky-500 font-semibold"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingFolder(false)}
                className="p-1 text-slate-500 hover:text-slate-300"
                aria-label="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Tree Navigator */}
          <div
            role="tree"
            className="flex-1 overflow-y-auto p-2.5 space-y-1 text-sm custom-scrollbar"
          >
            {searchQuery.trim() !== "" || selectedTag !== null ? (
              filteredNotes.length > 0 ? (
                <div className="space-y-0.5">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {filteredNotes.length}{" "}
                    {filteredNotes.length === 1 ? "Match" : "Matches"}
                  </div>
                  {filteredNotes.map((note) =>
                    renderNoteTreeItem(note, 0, "search")
                  )}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-500 px-3">
                  <span>
                    No notes match{" "}
                    {selectedTag ? `#${selectedTag}` : `"${searchQuery}"`}
                  </span>
                </div>
              )
            ) : (
              <>
                {/* 0. Pinned Notes Section */}
                {pinnedNotes.length > 0 && (
                  <div className="mb-2 pb-2 border-b border-slate-800/60">
                    <button
                      type="button"
                      onClick={() => setIsPinnedCollapsed((prev) => !prev)}
                      className="w-full px-2 py-1 flex items-center justify-between text-[11px] font-bold text-amber-300/90 uppercase tracking-wider hover:text-amber-200 transition"
                    >
                      <span className="flex items-center gap-1.5">
                        <Pin className="w-3 h-3 text-amber-400" />
                        <span>Pinned ({pinnedNotes.length})</span>
                      </span>
                      {isPinnedCollapsed ? (
                        <ChevronRight className="w-3 h-3 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-slate-500" />
                      )}
                    </button>
                    {!isPinnedCollapsed && (
                      <div className="mt-0.5 space-y-0.5">
                        {pinnedNotes.map((note) =>
                          renderNoteTreeItem(note, 0, "pinned")
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 1. Folders Section */}
                {folders.map((folder) => {
                  const isCollapsed = collapsedFolders.has(folder.id);
                  const folderNotes = sortNotesList.filter(
                    (n) =>
                      n.folderId === folder.id &&
                      (!n.parentId || !validNoteIds.has(n.parentId))
                  );
                  const isEditingThis = editingFolderId === folder.id;

                  return (
                    <div key={folder.id} className="flex flex-col mb-1" role="group">
                      {/* Folder Row */}
                      <div
                        onClick={() => {
                          if (!isEditingThis) onToggleFolderCollapse(folder.id);
                        }}
                        className="group flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-[#111827] cursor-pointer text-slate-400 hover:text-slate-200 transition text-xs sm:text-[13px] min-h-[36px]"
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <button
                            type="button"
                            className="p-0.5 text-slate-500 group-hover:text-slate-300 shrink-0"
                            aria-label={isCollapsed ? "Expand folder" : "Collapse folder"}
                          >
                            {isCollapsed ? (
                              <ChevronRight className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                          {isCollapsed ? (
                            <FolderIcon className="w-4 h-4 text-sky-400 shrink-0" />
                          ) : (
                            <FolderOpen className="w-4 h-4 text-sky-400 shrink-0" />
                          )}
                          {isEditingThis ? (
                            <input
                              type="text"
                              value={editingFolderName}
                              onChange={(e) => setEditingFolderName(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleCommitRenameFolder(folder.id);
                                } else if (e.key === "Escape") {
                                  setEditingFolderId(null);
                                }
                              }}
                              onBlur={() => handleCommitRenameFolder(folder.id)}
                              autoFocus
                              className="flex-1 min-w-0 bg-[#06080F] border border-sky-500/70 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                            />
                          ) : (
                            <>
                              <span className="font-semibold truncate text-slate-200">
                                {folder.name}
                              </span>
                              <span className="text-[11px] text-slate-500 ml-0.5 shrink-0">
                                ({folderNotes.length})
                              </span>
                            </>
                          )}
                        </div>

                        {!isEditingThis && (
                          <div className="flex items-center gap-0.5 shrink-0 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 hover:opacity-100 transition">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onCreateNote("", folder.id);
                              }}
                              className="p-1 text-slate-400 hover:text-sky-300 hover:bg-slate-800/80 rounded-md transition touch-manipulation"
                              title="Add Note in Folder"
                              aria-label="Add Note in Folder"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingFolderId(folder.id);
                                setEditingFolderName(folder.name);
                              }}
                              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-md transition touch-manipulation"
                              title="Rename Folder"
                              aria-label="Rename Folder"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => onDeleteFolder(folder.id, e)}
                              className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800/80 rounded-md transition touch-manipulation"
                              title="Delete Folder"
                              aria-label="Delete Folder"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Notes Inside Folder */}
                      {!isCollapsed && (
                        <div className="flex flex-col">
                          {folderNotes.length > 0 ? (
                            folderNotes.map((note) =>
                              renderNoteTreeItem(note, 1, "tree")
                            )
                          ) : (
                            <button
                              type="button"
                              onClick={() => onCreateNote("", folder.id)}
                              className="flex items-center gap-2 pl-9 py-2 text-xs text-slate-500 hover:text-sky-300 transition text-left w-full touch-manipulation"
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
                  <div className="px-2.5 py-1.5 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Notes</span>
                    <button
                      type="button"
                      onClick={() => onCreateNote()}
                      className="p-1 text-slate-400 hover:text-sky-300 rounded hover:bg-slate-800/80 transition touch-manipulation"
                      title="New Note (Alt+N)"
                      aria-label="New Note"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {sortNotesList
                    .filter(
                      (n) =>
                        (!n.folderId || !validFolderIds.has(n.folderId)) &&
                        (!n.parentId || !validNoteIds.has(n.parentId))
                    )
                    .map((note) => renderNoteTreeItem(note, 0, "tree"))}
                </div>
              </>
            )}
          </div>

          {/* User Account / Footer */}
          <div className="p-3 border-t border-slate-800/80 bg-[#06080F]/80 shrink-0">
            {currentUser ? (
              <div
                onClick={() => onOpenSettings("profile")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenSettings("profile");
                  }
                }}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#0E1424] hover:bg-[#162032] border border-slate-800/80 hover:border-sky-800/60 text-xs sm:text-sm cursor-pointer transition group"
                title="Open Settings"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                    {currentUser.name ? currentUser.name[0].toUpperCase() : "U"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-slate-200 group-hover:text-white font-medium truncate leading-tight">
                      {currentUser.name || currentUser.email.split("@")[0]}
                    </div>
                    <div className="text-slate-500 text-[11px] truncate leading-tight mt-0.5">
                      {currentUser.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="p-1 text-slate-500 group-hover:text-sky-400 rounded transition">
                    <Settings className="w-3.5 h-3.5" />
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLogout();
                    }}
                    className="p-1 text-slate-500 hover:text-red-400 rounded transition"
                    title="Log Out"
                    aria-label="Log Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onOpenAuthModal}
                  className="flex-1 flex items-center justify-between px-3 py-2.5 rounded-lg bg-sky-950/40 border border-sky-800/50 text-sky-300 hover:bg-sky-900/40 hover:text-white transition text-xs sm:text-sm font-medium group touch-manipulation shadow-xs"
                >
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-sky-400" />
                    <span>Sign In to Sync</span>
                  </div>
                  <LogIn className="w-4 h-4 opacity-60 group-hover:opacity-100" />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenSettings("profile")}
                  className="p-2.5 rounded-lg bg-[#0E1424] hover:bg-[#162032] border border-slate-800/80 text-slate-400 hover:text-white transition touch-manipulation"
                  title="Open Settings"
                  aria-label="Open Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
