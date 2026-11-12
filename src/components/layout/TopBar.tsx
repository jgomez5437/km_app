"use client";

import React, { useState, useRef, useEffect } from "react";
import { Note, Folder, AuthUser } from "@/types/vault";
import {
  Menu,
  Plus,
  Trash2,
  Sparkles,
  Cloud,
  CloudOff,
  RefreshCw,
  AlertCircle,
  Search,
  Pin,
  MoreHorizontal,
  FolderInput,
  Copy,
  FilePlus2,
  Check,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

interface TopBarProps {
  activeNote?: Note;
  folders: Folder[];
  breadcrumbs: { id?: string; label: string; type: "folder" | "note" }[];
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  isRightDrawerOpen: boolean;
  onToggleRightDrawer: () => void;
  syncStatus: "synced" | "syncing" | "offline" | "error";
  isCloudConfigured: boolean;
  currentUser: AuthUser | null;
  onManualSync: () => void;
  onCreateNote: (title?: string, folderId?: string, parentId?: string) => void;
  onDeleteNote: (id: string, e?: React.MouseEvent) => void;
  onSelectNote: (id: string) => void;
  onOpenCommandPalette: () => void;
  onTogglePinNote: (id: string) => void;
  onMoveNoteToFolder: (noteId: string, folderId: string | undefined) => void;
  onDuplicateNote: (noteId: string) => void;
  onCopyMarkdown: (note: Note) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeNote,
  folders,
  breadcrumbs,
  isSidebarOpen,
  onToggleSidebar,
  isRightDrawerOpen,
  onToggleRightDrawer,
  syncStatus,
  isCloudConfigured,
  currentUser,
  onManualSync,
  onCreateNote,
  onDeleteNote,
  onSelectNote,
  onOpenCommandPalette,
  onTogglePinNote,
  onMoveNoteToFolder,
  onDuplicateNote,
  onCopyMarkdown,
}) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isMoveSubmenuOpen, setIsMoveSubmenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isMoreOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreOpen(false);
        setIsMoveSubmenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMoreOpen(false);
        setIsMoveSubmenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isMoreOpen]);

  return (
    <header className="h-14 border-b border-slate-800/80 bg-[#0B0F19]/90 backdrop-blur-md px-3 sm:px-5 flex items-center justify-between gap-2 z-20 shrink-0">
      {/* Left: Sidebar Toggle + Breadcrumbs */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-white transition touch-manipulation shrink-0"
          title={isSidebarOpen ? "Hide Sidebar (⌘\\)" : "Show Sidebar (⌘\\)"}
          aria-label={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
        >
          <Menu className="w-5 h-5 md:hidden" />
          {isSidebarOpen ? (
            <PanelLeftClose className="w-4 h-4 hidden md:block" />
          ) : (
            <PanelLeftOpen className="w-4 h-4 hidden md:block" />
          )}
        </button>

        {/* Quick New Note button on mobile */}
        <button
          type="button"
          onClick={() => onCreateNote()}
          className="p-1.5 rounded-lg bg-sky-950/60 border border-sky-800/50 hover:bg-sky-900/60 text-sky-300 md:hidden transition touch-manipulation shrink-0"
          title="New Note (Alt+N)"
          aria-label="New Note"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Hierarchical Breadcrumb Trail */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-400 min-w-0 truncate"
        >
          {breadcrumbs.length > 2 && (
            <>
              <span className="text-slate-500">...</span>
              <span className="text-slate-600">/</span>
            </>
          )}

          {breadcrumbs.slice(-2).map((crumb, i) => (
            <React.Fragment key={crumb.id || i}>
              {crumb.type === "note" && crumb.id ? (
                <button
                  type="button"
                  onClick={() => onSelectNote(crumb.id!)}
                  className="text-sky-400 hover:text-sky-300 font-medium truncate max-w-[90px] sm:max-w-[140px] transition"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="text-slate-400 font-medium truncate max-w-[90px] sm:max-w-[140px]">
                  {crumb.label}
                </span>
              )}
              <span className="text-slate-600">/</span>
            </React.Fragment>
          ))}

          <span className="text-slate-100 truncate max-w-[110px] sm:max-w-xs font-semibold">
            {activeNote?.title?.trim() || "Untitled Note"}
          </span>
        </nav>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Command Palette Search Trigger */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 p-2 sm:px-3 sm:py-1.5 rounded-lg bg-[#06080F]/90 hover:bg-[#0E1424] border border-slate-800/90 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs transition touch-manipulation"
          title="Quick Search & Commands (⌘K / Ctrl+K)"
          aria-label="Quick Search"
        >
          <Search className="w-4 h-4 text-sky-400" />
          <span className="hidden lg:inline text-slate-400">Search vault...</span>
          <kbd className="hidden lg:inline-block px-1.5 py-0.2 rounded bg-[#0E1424] border border-slate-800 text-[10px] font-mono text-slate-400">
            ⌘K
          </kbd>
        </button>

        {/* Pin / Unpin Active Note */}
        {activeNote && (
          <button
            type="button"
            onClick={() => onTogglePinNote(activeNote.id)}
            className={`p-2 rounded-lg border transition touch-manipulation ${
              activeNote.pinned
                ? "bg-amber-950/40 border-amber-700/60 text-amber-300 hover:bg-amber-900/40"
                : "bg-transparent border-transparent text-slate-400 hover:text-amber-300 hover:bg-slate-800/80"
            }`}
            title={activeNote.pinned ? "Unpin Note" : "Pin Note to Top"}
            aria-label={activeNote.pinned ? "Unpin Note" : "Pin Note"}
          >
            <Pin className={`w-4 h-4 ${activeNote.pinned ? "fill-amber-400/30" : ""}`} />
          </button>
        )}

        {/* Cloud Sync Button */}
        <button
          type="button"
          onClick={onManualSync}
          className={`p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs sm:text-sm transition border flex items-center gap-2 ${
            syncStatus === "syncing"
              ? "bg-amber-950/40 text-amber-300 border-amber-800/50"
              : syncStatus === "error"
              ? "bg-red-950/40 text-red-300 border-red-800/50 hover:bg-red-900/40"
              : isCloudConfigured && currentUser
              ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/50 hover:bg-emerald-900/40"
              : "bg-[#0E1424] text-slate-400 border-slate-800/80 hover:text-white hover:border-slate-700"
          }`}
          title={
            syncStatus === "syncing"
              ? "Synchronizing with Neon..."
              : syncStatus === "error"
              ? "Sync failed. Tap to retry."
              : currentUser
              ? `Logged in as ${currentUser.email} (Tap to sync)`
              : "Local storage mode. Tap to sign in and enable cloud sync."
          }
          aria-label="Cloud Sync Status"
        >
          {syncStatus === "syncing" ? (
            <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
          ) : syncStatus === "error" ? (
            <AlertCircle className="w-4 h-4 text-red-400" />
          ) : currentUser ? (
            <Cloud className="w-4 h-4 text-emerald-400" />
          ) : (
            <CloudOff className="w-4 h-4 text-slate-500" />
          )}
          <span className="hidden md:inline font-medium">
            {syncStatus === "syncing"
              ? "Syncing"
              : syncStatus === "error"
              ? "Retry Sync"
              : currentUser
              ? "Synced"
              : "Sign In"}
          </span>
        </button>

        {/* AI Assistant Toggle */}
        <button
          type="button"
          onClick={onToggleRightDrawer}
          className={`flex items-center gap-2 p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs sm:text-sm transition border ${
            isRightDrawerOpen
              ? "bg-indigo-950/60 text-indigo-300 border-indigo-700/70 shadow-sm"
              : "bg-[#0E1424] text-slate-300 border-slate-800/80 hover:text-white hover:border-slate-700"
          }`}
          title="Toggle AI Copilot"
          aria-label="Toggle AI Copilot"
          aria-expanded={isRightDrawerOpen}
        >
          <Sparkles className="w-4 h-4 text-sky-400" />
          <span className="hidden md:inline font-medium">AI Copilot</span>
        </button>

        {/* Safe Note Actions (...) Menu */}
        {activeNote && (
          <div className="relative" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => setIsMoreOpen((prev) => !prev)}
              className={`p-2 rounded-lg transition touch-manipulation ${
                isMoreOpen
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/80"
              }`}
              title="Note Actions"
              aria-label="Note Actions"
              aria-expanded={isMoreOpen}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {isMoreOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 p-1.5 bg-[#0B0F19]/98 backdrop-blur-xl border border-slate-700/80 rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.85)] z-50 text-xs text-slate-200 animate-pop-in">
                <button
                  type="button"
                  onClick={() => {
                    onTogglePinNote(activeNote.id);
                    setIsMoreOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#162032] transition text-left"
                >
                  <Pin className="w-3.5 h-3.5 text-amber-400" />
                  <span>{activeNote.pinned ? "Unpin Note" : "Pin Note"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onCreateNote("", activeNote.folderId, activeNote.id);
                    setIsMoreOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#162032] transition text-left"
                >
                  <FilePlus2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>Add Subpage</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onDuplicateNote(activeNote.id);
                    setIsMoreOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#162032] transition text-left"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Duplicate Note</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onCopyMarkdown(activeNote);
                    setIsMoreOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#162032] transition text-left"
                >
                  <Copy className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Copy Markdown</span>
                </button>

                {/* Move to Folder Submenu Toggle */}
                <button
                  type="button"
                  onClick={() => setIsMoveSubmenuOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#162032] transition text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <FolderInput className="w-3.5 h-3.5 text-sky-400" />
                    <span>Move to Folder</span>
                  </div>
                  <ChevronRight
                    className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                      isMoveSubmenuOpen ? "rotate-90" : ""
                    }`}
                  />
                </button>

                {isMoveSubmenuOpen && (
                  <div className="mt-1 mb-1 ml-2 pl-2 border-l border-slate-800 space-y-0.5 max-h-40 overflow-y-auto custom-scrollbar">
                    <button
                      type="button"
                      onClick={() => {
                        onMoveNoteToFolder(activeNote.id, undefined);
                        setIsMoreOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-800/80 text-slate-300 text-left"
                    >
                      <span>Unfiled (Root)</span>
                      {!activeNote.folderId && (
                        <Check className="w-3 h-3 text-sky-400" />
                      )}
                    </button>
                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        type="button"
                        onClick={() => {
                          onMoveNoteToFolder(activeNote.id, folder.id);
                          setIsMoreOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-800/80 text-slate-300 text-left"
                      >
                        <span className="truncate">{folder.name}</span>
                        {activeNote.folderId === folder.id && (
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
                    setIsMoreOpen(false);
                    onDeleteNote(activeNote.id, e);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-red-950/50 text-red-400 hover:text-red-300 transition text-left"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Note</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
