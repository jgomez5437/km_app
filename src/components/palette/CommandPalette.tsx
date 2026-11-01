"use client";

import React, { useState, useEffect, useRef } from "react";
import { Note } from "@/types/vault";
import {
  Search,
  FileText,
  Plus,
  Share2,
  Sparkles,
  Command,
  ArrowRight,
} from "lucide-react";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onSelectNote: (noteId: string) => void;
  onCreateNote: (title: string) => void;
  onOpenGraph: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  notes,
  onSelectNote,
  onCreateNote,
  onOpenGraph,
}) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  // Global keydown for Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(query.toLowerCase()) ||
      (n.tags || []).some((t) => t.toLowerCase().includes(query.toLowerCase()))
  );

  const exactMatch = notes.some(
    (n) => n.title.toLowerCase() === query.trim().toLowerCase()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-[#0B0F19] border border-slate-800/80 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-slate-800 bg-[#06080F]">
          <Search className="w-4 h-4 text-slate-400 mr-2.5" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search notes in Astro Vault..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (filteredNotes.length > 0) {
                  onSelectNote(filteredNotes[0].id);
                  onClose();
                } else if (query.trim()) {
                  onCreateNote(query.trim());
                  onClose();
                }
              }
            }}
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] text-slate-400 bg-slate-800 rounded border border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1 text-xs">
          {query.trim() && !exactMatch && (
            <button
              onClick={() => {
                onCreateNote(query.trim());
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sky-300 hover:bg-sky-950/40 hover:border hover:border-sky-800/40 transition group"
            >
              <Plus className="w-4 h-4 text-sky-400" />
              <div className="flex-1">
                <span>Create new note: </span>
                <span className="font-semibold text-white">"{query.trim()}"</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition" />
            </button>
          )}

          <button
            onClick={() => {
              onOpenGraph();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-slate-300 hover:bg-slate-800/70 transition"
          >
            <Share2 className="w-4 h-4 text-indigo-400" />
            <div className="flex-1">
              <span className="font-medium text-white">Open Knowledge Graph View</span>
              <span className="text-slate-400 text-[11px] block">
                Visualize all note connections and clusters
              </span>
            </div>
          </button>

          {filteredNotes.length > 0 ? (
            filteredNotes.map((note) => (
              <button
                key={note.id}
                onClick={() => {
                  onSelectNote(note.id);
                  onClose();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-slate-300 hover:bg-slate-800/70 transition group"
              >
                <FileText className="w-4 h-4 text-slate-400 group-hover:text-sky-400" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-200 truncate group-hover:text-white">{note.title}</div>
                  <div className="text-slate-400 text-[11px] flex items-center gap-2">
                    {note.parentId && <span className="text-emerald-400">Subpage</span>}
                    {note.tags && note.tags.length > 0 && (
                      <span>#{note.tags.join(" #")}</span>
                    )}
                  </div>
                </div>
              </button>
            ))
          ) : query.trim() ? (
            <div className="p-4 text-center text-slate-400 text-xs">
              No existing notes found. Press <strong>Enter</strong> to create "{query}".
            </div>
          ) : null}
        </div>

        {/* Footer shortcuts */}
        <div className="px-3 py-2 bg-[#06080F] border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span><strong>↑↓</strong> navigate</span>
            <span><strong>↵</strong> select</span>
            <span><strong>esc</strong> close</span>
          </div>
          <span className="font-medium text-slate-400">Astro Vault</span>
        </div>
      </div>
    </div>
  );
};
