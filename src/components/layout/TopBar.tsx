"use client";

import React from "react";
import { Note, AuthUser } from "@/types/vault";
import {
  Menu,
  Plus,
  Trash2,
  Sparkles,
  Cloud,
  CloudOff,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

interface TopBarProps {
  activeNote?: Note;
  breadcrumbs: { id?: string; label: string; type: "folder" | "note" }[];
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  isRightDrawerOpen: boolean;
  onToggleRightDrawer: () => void;
  syncStatus: "synced" | "syncing" | "offline" | "error";
  isCloudConfigured: boolean;
  currentUser: AuthUser | null;
  onManualSync: () => void;
  onCreateNote: () => void;
  onDeleteNote: (id: string, e: React.MouseEvent) => void;
  onSelectNote: (id: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeNote,
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
}) => {
  return (
    <header className="h-14 border-b border-slate-800/80 bg-[#0B0F19]/90 backdrop-blur-md px-3 sm:px-5 flex items-center justify-between z-10 shrink-0">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-white transition touch-manipulation"
          title={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
          aria-label={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Quick New Note button on mobile header */}
        <button
          type="button"
          onClick={onCreateNote}
          className="p-1.5 rounded-lg bg-sky-950/60 border border-sky-800/50 hover:bg-sky-900/60 text-sky-300 md:hidden transition touch-manipulation"
          title="New Note (Alt+N)"
          aria-label="New Note"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Hierarchical Breadcrumb Trail */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-400 min-w-0 truncate">
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
                  className="text-sky-400 hover:text-sky-300 font-medium truncate max-w-[100px] sm:max-w-[150px]"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="text-slate-400 font-medium truncate max-w-[100px] sm:max-w-[150px]">
                  {crumb.label}
                </span>
              )}
              <span className="text-slate-600">/</span>
            </React.Fragment>
          ))}

          <span className="text-slate-100 truncate max-w-[120px] sm:max-w-md font-semibold">
            {activeNote?.title?.trim() || "Untitled Note"}
          </span>
        </nav>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
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
              ? "bg-indigo-950/60 text-indigo-300 border-indigo-800/60 shadow-sm"
              : "bg-[#0E1424] text-slate-400 border-slate-800/80 hover:text-white"
          }`}
          title="Toggle AI Copilot"
          aria-label="Toggle AI Copilot"
          aria-expanded={isRightDrawerOpen}
        >
          <Sparkles className="w-4 h-4 text-sky-400" />
          <span className="hidden md:inline font-medium">AI Copilot</span>
        </button>

        {/* Delete Active Note */}
        {activeNote && (
          <button
            type="button"
            onClick={(e) => onDeleteNote(activeNote.id, e)}
            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800/80 transition touch-manipulation"
            title="Delete Current Note"
            aria-label="Delete Current Note"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
