"use client";

import React from "react";
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
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  activeNoteId: string;
  onSelectNote: (id: string) => void;
  onCreateNote: (title?: string, folderId?: string, parentId?: string) => void;
  onCreateFolder: (name: string) => void;
  onDeleteNote: (id: string, e: React.MouseEvent) => void;
  onDeleteFolder: (id: string, e: React.MouseEvent) => void;
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
  onDeleteNote,
  onDeleteFolder,
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
  const [isCreatingFolder, setIsCreatingFolder] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState("");

  const handleCreateFolderAction = () => {
    if (!newFolderName.trim()) {
      setIsCreatingFolder(false);
      return;
    }
    onCreateFolder(newFolderName.trim());
    setNewFolderName("");
    setIsCreatingFolder(false);
  };

  // Filter notes across both title and content
  const filteredNotes = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => {
      const titleMatch = (n.title || "Untitled Note").toLowerCase().includes(q);
      const contentMatch = (n.content || "").toLowerCase().includes(q);
      return titleMatch || contentMatch;
    });
  }, [notes, searchQuery]);

  const validFolderIds = React.useMemo(
    () => new Set(folders.map((f) => f.id)),
    [folders]
  );
  const validNoteIds = React.useMemo(
    () => new Set(notes.map((n) => n.id)),
    [notes]
  );

  const renderNoteTreeItem = (note: Note, depth = 0) => {
    const isActive = note.id === activeNoteId;
    const childSubpages = notes.filter((n) => n.parentId === note.id);
    const hasSubpages = childSubpages.length > 0;
    const isCollapsed = collapsedNotes.has(note.id);

    return (
      <div key={note.id} className="flex flex-col">
        <div
          onClick={() => {
            onSelectNote(note.id);
            if (typeof window !== "undefined" && window.innerWidth < 768) {
              onClose();
            }
          }}
          role="treeitem"
          aria-selected={isActive}
          className={`group flex items-center justify-between py-2 px-2.5 rounded-lg cursor-pointer transition text-xs sm:text-sm min-h-[38px] ${
            isActive
              ? "bg-sky-950/60 text-sky-200 border border-sky-800/50 shadow-xs shadow-sky-950/50"
              : "text-slate-300 hover:bg-[#111827] hover:text-white"
          }`}
          style={{ paddingLeft: `${10 + depth * 14}px` }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {hasSubpages ? (
              <button
                type="button"
                onClick={(e) => onToggleNoteCollapse(note.id, e)}
                className="p-1 text-slate-500 hover:text-white rounded"
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
              className={`w-4 h-4 shrink-0 ${
                isActive ? "text-sky-400" : "text-slate-500"
              }`}
            />
            <span className="truncate">{note.title.trim() || "Untitled Note"}</span>
          </div>

          <div
            className={`flex items-center gap-1 shrink-0 transition ${
              isActive
                ? "opacity-100"
                : "opacity-75 sm:opacity-0 sm:group-hover:opacity-100 hover:opacity-100"
            }`}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCreateNote("", note.folderId, note.id);
              }}
              className={`p-1.5 rounded-md hover:bg-slate-800/80 transition touch-manipulation ${
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
              onClick={(e) => onDeleteNote(note.id, e)}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800/80 rounded-md transition touch-manipulation"
              title="Delete Note"
              aria-label="Delete Note"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Nested Subpages */}
        {hasSubpages && !isCollapsed && (
          <div className="flex flex-col" role="group">
            {childSubpages.map((sub) => renderNoteTreeItem(sub, depth + 1))}
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

      {/* Sidebar Drawer */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 sm:w-72 shrink-0 bg-[#0B0F19] border-r border-slate-800/80 flex flex-col h-full transition-transform duration-200 ease-in-out pb-[env(safe-area-inset-bottom)] ${
          isOpen ? "translate-x-0" : "-translate-x-full md:hidden"
        }`}
      >
        {/* Brand Header */}
        <div className="px-4 py-3.5 border-b border-slate-800/80 flex items-center justify-between shrink-0">
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

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onCreateNote()}
              className="p-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white transition shadow-xs shadow-sky-500/20"
              title="New Note (Alt+N)"
              aria-label="New Note"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsCreatingFolder(true)}
              className="p-1.5 rounded-lg bg-[#162032] hover:bg-[#1e2c45] text-slate-300 hover:text-white transition"
              title="New Folder"
              aria-label="New Folder"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
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
        </div>

        {/* Search Bar */}
        <div className="px-3 pt-3 pb-1.5 shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#06080F] rounded-lg border border-slate-800/80 text-xs sm:text-sm">
            <Search className="w-4 h-4 text-slate-500 shrink-0" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="bg-transparent border-none text-slate-200 focus:outline-none w-full text-base sm:text-xs placeholder-slate-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="text-slate-500 hover:text-slate-300"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
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
          {searchQuery.trim() !== "" ? (
            filteredNotes.length > 0 ? (
              filteredNotes.map((note) => renderNoteTreeItem(note))
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                <span>No notes match &ldquo;{searchQuery}&rdquo;</span>
              </div>
            )
          ) : (
            <>
              {/* 1. Folders Section */}
              {folders.map((folder) => {
                const isCollapsed = collapsedFolders.has(folder.id);
                const folderNotes = notes.filter(
                  (n) =>
                    n.folderId === folder.id &&
                    (!n.parentId || !validNoteIds.has(n.parentId))
                );

                return (
                  <div key={folder.id} className="flex flex-col mb-1" role="group">
                    {/* Folder Row */}
                    <div
                      onClick={() => onToggleFolderCollapse(folder.id)}
                      className="group flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-[#111827] cursor-pointer text-slate-400 hover:text-slate-200 transition text-xs sm:text-sm min-h-[38px]"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <button
                          type="button"
                          className="p-0.5 text-slate-500 group-hover:text-slate-300"
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
                        <span className="font-semibold truncate text-slate-200">
                          {folder.name}
                        </span>
                        <span className="text-xs text-slate-500 ml-1">
                          ({folderNotes.length})
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 opacity-75 sm:opacity-0 sm:group-hover:opacity-100 hover:opacity-100 transition">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCreateNote("", folder.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-sky-300 hover:bg-slate-800/80 rounded-md transition touch-manipulation"
                          title="Add Note in Folder"
                          aria-label="Add Note in Folder"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => onDeleteFolder(folder.id, e)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800/80 rounded-md transition touch-manipulation"
                          title="Delete Folder"
                          aria-label="Delete Folder"
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
      </aside>
    </>
  );
};
