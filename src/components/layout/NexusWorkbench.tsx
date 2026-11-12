"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  loadCollapsedFolders,
  saveCollapsedFolders,
  loadCollapsedNotes,
  saveCollapsedNotes,
  syncWithCloud,
  scheduleDebouncedSync,
  loadActiveNoteId,
  saveActiveNoteId,
  clearLocalVault,
} from "@/lib/storage";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { EmptyVault } from "@/components/layout/EmptyVault";
import { NexusEditor } from "@/components/editor/NexusEditor";
import { NexusAIAssistant } from "@/components/ai/NexusAIAssistant";
import { UserSettingsModal } from "@/components/settings/UserSettingsModal";
import { AuthModal } from "@/components/auth/AuthModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toaster";
import { X } from "lucide-react";

const EMPTY_FALLBACK_NOTE: Note = {
  id: "empty",
  title: "Empty Vault",
  content: "",
  createdAt: 0,
  updatedAt: 0,
};

export const NexusWorkbench: React.FC = () => {
  const toast = useToast();

  const [folders, setFolders] = useState<Folder[]>(() => loadFolders());
  const [notes, setNotes] = useState<Note[]>(() => loadNotes());
  const [activeNoteId, setActiveNoteId] = useState<string>(() => {
    const saved = loadActiveNoteId();
    const initial = loadNotes();
    if (saved && initial.some((n) => n.id === saved)) return saved;
    return initial[0]?.id || "";
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : false
  );
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);
  const [userSettingsTab, setUserSettingsTab] = useState<
    "profile" | "ai" | "appearance" | "vault"
  >("profile");
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [syncStatus, setSyncStatus] = useState<
    "synced" | "syncing" | "offline" | "error"
  >("offline");
  const [isCloudConfigured, setIsCloudConfigured] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Tree collapse state
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(() =>
    loadCollapsedFolders()
  );
  const [collapsedNotes, setCollapsedNotes] = useState<Set<string>>(() =>
    loadCollapsedNotes()
  );

  // In-app Confirmation Modal State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "danger" | "warning" | "info";
    showCancel?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Keep active note persisted in local storage
  useEffect(() => {
    saveActiveNoteId(activeNoteId || null);
  }, [activeNoteId]);

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
              if (res.notes.length > 0 && !res.notes.some((n) => n.id === activeNoteId)) {
                setActiveNoteId(res.notes[0].id);
              }
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
  }, [activeNoteId]);

  const handleManualSync = useCallback(async () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    setSyncStatus("syncing");
    try {
      const res = await syncWithCloud(notes, folders, { pullOnly: false });
      setIsCloudConfigured(res.isCloud);
      if (res.isCloud) {
        setNotes(res.notes);
        setFolders(res.folders);
        if (res.user) setCurrentUser(res.user);
        setSyncStatus("synced");
        toast.success("Vault synchronized successfully.");
      } else {
        setSyncStatus("offline");
      }
    } catch {
      setSyncStatus("error");
      toast.error("Sync failed. Check your network connection.");
    }
  }, [currentUser, notes, folders, toast]);

  // Sync on tab visibility change or online event
  useEffect(() => {
    let lastTabSync = Date.now();
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && currentUser) {
        const now = Date.now();
        if (now - lastTabSync > 30000) {
          lastTabSync = now;
          syncWithCloud(notes, folders, { pullOnly: false }).then((res) => {
            if (res.isCloud) {
              setNotes(res.notes);
              setFolders(res.folders);
              setSyncStatus("synced");
            }
          });
        }
      }
    };

    const handleOnline = () => {
      if (currentUser) {
        toast.info("Reconnected to network. Syncing...");
        handleManualSync();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("online", handleOnline);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", handleOnline);
    };
  }, [currentUser, notes, folders, toast, handleManualSync]);

  const activeNote = useMemo(
    () => notes.find((n) => n.id === activeNoteId) || notes[0],
    [notes, activeNoteId]
  );

  // Breadcrumb path computation
  const breadcrumbs = useMemo(() => {
    if (!activeNote) return [];
    const trail: { id?: string; label: string; type: "folder" | "note" }[] = [];

    if (activeNote.folderId) {
      const folder = folders.find((f) => f.id === activeNote.folderId);
      if (folder) trail.push({ id: folder.id, label: folder.name, type: "folder" });
    }

    const ancestors: { id: string; label: string; type: "note" }[] = [];
    const visited = new Set<string>([activeNote.id]);
    let currentParentId = activeNote.parentId;
    while (currentParentId && !visited.has(currentParentId)) {
      visited.add(currentParentId);
      const parent = notes.find((n) => n.id === currentParentId);
      if (!parent) break;
      ancestors.unshift({
        id: parent.id,
        label: parent.title.trim() || "Untitled Note",
        type: "note",
      });
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
            setNotes(syncedNotes);
            setFolders(syncedFolders);
            setSyncStatus("synced");
          } else {
            setSyncStatus("offline");
          }
        }
      );
    },
    [folders]
  );

  const handleAuthSuccess = async (user: AuthUser) => {
    setCurrentUser(user);
    setIsCloudConfigured(true);
    setSyncStatus("syncing");
    toast.success(`Welcome back, ${user.name || user.email}!`);
    const isSampleVault =
      notes.length === 0 ||
      (notes.length === 1 && notes[0].id === "note-welcome-astro");
    const res = await syncWithCloud(notes, folders, { pullOnly: isSampleVault });
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
      clearLocalVault();
      setCurrentUser(null);
      setIsCloudConfigured(false);
      setSyncStatus("offline");
      setNotes([]);
      setFolders([]);
      setActiveNoteId("");
      toast.info("Logged out. Local vault cleared.");
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const handleCreateNewNote = useCallback(
    (title?: string, folderId?: string, parentId?: string) => {
      const newNote = createNewNote(title ?? "", folderId, parentId);
      const updated = [newNote, ...notes];
      setNotes(updated);
      saveNotes(updated);
      setActiveNoteId(newNote.id);

      // On mobile viewports, close sidebar to show editor
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }

      if (parentId) {
        setCollapsedNotes((prev) => {
          const next = new Set(prev);
          next.delete(parentId);
          saveCollapsedNotes(next);
          return next;
        });
      }

      if (folderId) {
        setCollapsedFolders((prev) => {
          const next = new Set(prev);
          next.delete(folderId);
          saveCollapsedFolders(next);
          return next;
        });
      }

      triggerSync(updated, folders);
    },
    [notes, folders, triggerSync]
  );

  // Global Alt+N and Ctrl/Cmd+N shortcut listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isN = e.key.toLowerCase() === "n";
      if ((e.altKey && isN) || ((e.ctrlKey || e.metaKey) && isN)) {
        e.preventDefault();
        handleCreateNewNote();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCreateNewNote]);

  const handleCreateFolder = (name: string) => {
    const folder = createFolder(name);
    const nextFolders = [...folders, folder];
    setFolders(nextFolders);
    saveFolders(nextFolders);
    triggerSync(notes, nextFolders);
    toast.success(`Folder "${name}" created.`);
  };

  const handleDeleteFolder = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const folder = folders.find((f) => f.id === folderId);
    const folderName = folder ? `"${folder.name}"` : "this folder";

    setConfirmDialog({
      isOpen: true,
      title: "Delete Folder",
      message: `Delete ${folderName}? Any notes inside will become unfiled notes in the root list.`,
      confirmLabel: "Delete Folder",
      cancelLabel: "Cancel",
      variant: "danger",
      showCancel: true,
      onConfirm: () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        const remainingFolders = folders.filter((f) => f.id !== folderId);
        setFolders(remainingFolders);
        saveFolders(remainingFolders);
        recordDeletedFolders([folderId]);

        setCollapsedFolders((prev) => {
          const next = new Set(prev);
          next.delete(folderId);
          saveCollapsedFolders(next);
          return next;
        });

        const now = Date.now();
        const updatedNotes = notes.map((n) =>
          n.folderId === folderId
            ? { ...n, folderId: undefined, updatedAt: now }
            : n
        );
        setNotes(updatedNotes);
        saveNotes(updatedNotes);
        triggerSync(updatedNotes, remainingFolders);
        toast.info("Folder deleted.");
      },
    });
  };

  const handleDeleteNote = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const noteToDelete = notes.find((n) => n.id === id);
    const noteTitle = noteToDelete?.title.trim()
      ? `"${noteToDelete.title.trim()}"`
      : "this note";
    const subpages = notes.filter((n) => n.parentId === id);
    const warningMessage =
      subpages.length > 0
        ? `Delete ${noteTitle} and its ${subpages.length} nested ${
            subpages.length === 1 ? "subpage" : "subpages"
          }? This action cannot be undone.`
        : `Delete ${noteTitle}? This action cannot be undone.`;

    setConfirmDialog({
      isOpen: true,
      title: "Delete Note",
      message: warningMessage,
      confirmLabel: "Delete Note",
      cancelLabel: "Cancel",
      variant: "danger",
      showCancel: true,
      onConfirm: () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
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

        setCollapsedNotes((prev) => {
          const next = new Set(prev);
          deletedList.forEach((delId) => next.delete(delId));
          saveCollapsedNotes(next);
          return next;
        });

        const remaining = notes.filter((n) => !idsToDelete.has(n.id));
        setNotes(remaining);
        saveNotes(remaining);
        if (idsToDelete.has(activeNoteId)) {
          setActiveNoteId(remaining[0]?.id || "");
        }
        triggerSync(remaining, folders);
        toast.info("Note deleted.");
      },
    });
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

  const toggleFolderCollapse = (folderId: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      saveCollapsedFolders(next);
      return next;
    });
  };

  const toggleNoteCollapse = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) next.delete(noteId);
      else next.add(noteId);
      saveCollapsedNotes(next);
      return next;
    });
  };

  const handleOpenAISettings = () => {
    setUserSettingsTab("ai");
    setIsUserSettingsOpen(true);
  };

  return (
    <div className="flex h-dvh w-full bg-[#06080F] text-slate-100 overflow-hidden font-sans relative">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        notes={notes}
        folders={folders}
        activeNoteId={activeNoteId}
        onSelectNote={(id) => setActiveNoteId(id)}
        onCreateNote={handleCreateNewNote}
        onCreateFolder={handleCreateFolder}
        onDeleteNote={handleDeleteNote}
        onDeleteFolder={handleDeleteFolder}
        collapsedFolders={collapsedFolders}
        onToggleFolderCollapse={toggleFolderCollapse}
        collapsedNotes={collapsedNotes}
        onToggleNoteCollapse={toggleNoteCollapse}
        currentUser={currentUser}
        onOpenSettings={(tab) => {
          if (tab) setUserSettingsTab(tab);
          setIsUserSettingsOpen(true);
        }}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* 2. Main Workbench Canvas */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden bg-[#06080F]">
        {/* Top Header Bar */}
        <TopBar
          activeNote={activeNote}
          breadcrumbs={breadcrumbs}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isRightDrawerOpen={isRightDrawerOpen}
          onToggleRightDrawer={() => setIsRightDrawerOpen(!isRightDrawerOpen)}
          syncStatus={syncStatus}
          isCloudConfigured={isCloudConfigured}
          currentUser={currentUser}
          onManualSync={handleManualSync}
          onCreateNote={() => handleCreateNewNote()}
          onDeleteNote={handleDeleteNote}
          onSelectNote={(id) => setActiveNoteId(id)}
        />

        {/* View Container */}
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          {/* Main workspace */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
            {activeNote ? (
              <div className="flex-1 min-h-0 w-full flex flex-col overflow-hidden">
                <NexusEditor
                  noteId={activeNote.id}
                  initialContent={activeNote.content}
                  noteTitle={activeNote.title}
                  onUpdateTitle={handleUpdateTitle}
                  onUpdateContent={handleUpdateContent}
                  currentUserId={currentUser?.id}
                  onOpenAISettings={handleOpenAISettings}
                />
              </div>
            ) : (
              <EmptyVault onCreateNote={() => handleCreateNewNote()} />
            )}
          </div>

          {/* 3. AI Copilot Drawer (Responsive overlay on < 1024px, docked column on >= 1024px) */}
          {isRightDrawerOpen && (
            <>
              {/* Overlay backdrop on screens < 1024px */}
              <div
                onClick={() => setIsRightDrawerOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 lg:hidden"
              />
              <aside className="fixed lg:static inset-y-0 right-0 z-40 w-full sm:w-96 shrink-0 bg-[#0B0F19] border-l border-slate-800/80 flex flex-col h-full shadow-2xl lg:shadow-none pb-[env(safe-area-inset-bottom)]">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-[#06080F]/60 lg:hidden">
                  <span className="text-sm font-semibold text-slate-200">
                    Astro AI Copilot
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsRightDrawerOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-md"
                    aria-label="Close Copilot"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <NexusAIAssistant
                    key={currentUser?.id || "local"}
                    activeNote={activeNote || EMPTY_FALLBACK_NOTE}
                    allNotes={notes}
                    folders={folders}
                    currentUser={currentUser}
                    onOpenAISettings={handleOpenAISettings}
                  />
                </div>
              </aside>
            </>
          )}
        </div>
      </main>

      {/* 4. User Settings Modal */}
      <UserSettingsModal
        isOpen={isUserSettingsOpen}
        onClose={() => setIsUserSettingsOpen(false)}
        currentUser={currentUser}
        onUpdateUser={(updatedUser) => setCurrentUser(updatedUser)}
        onLogout={handleLogout}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        syncStatus={syncStatus === "error" ? "offline" : syncStatus}
        onManualSync={handleManualSync}
        notes={notes}
        folders={folders}
        initialTab={userSettingsTab}
      />

      {/* 5. Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* 6. Confirmation / Alert Modal */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        cancelLabel={confirmDialog.cancelLabel}
        variant={confirmDialog.variant}
        showCancel={confirmDialog.showCancel}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
