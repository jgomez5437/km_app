"use client";

import React from "react";
import { Plus, FileText, Sparkles, Search } from "lucide-react";

interface EmptyVaultProps {
  onCreateNote: () => void;
  onOpenCommandPalette?: () => void;
}

export const EmptyVault: React.FC<EmptyVaultProps> = ({
  onCreateNote,
  onOpenCommandPalette,
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-950/70 to-indigo-950/70 border border-sky-800/40 flex items-center justify-center mb-5 shadow-lg shadow-sky-950/30">
        <FileText className="w-8 h-8 text-sky-400" />
      </div>

      <h3 className="text-xl font-bold text-white tracking-tight mb-2">
        Your vault is empty
      </h3>
      <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">
        Start writing, record research, or capture thoughts with zero latency.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onCreateNote}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold text-sm shadow-md shadow-sky-500/20 transition active:scale-98 touch-manipulation"
        >
          <Plus className="w-4 h-4" />
          <span>Create First Note</span>
        </button>

        {onOpenCommandPalette && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0E1424] hover:bg-[#162032] border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-medium text-sm transition touch-manipulation"
          >
            <Search className="w-4 h-4 text-sky-400" />
            <span>Commands</span>
            <kbd className="px-1.5 py-0.5 rounded bg-[#06080F] border border-slate-800 font-mono text-[10px] text-slate-400">
              ⌘K
            </kbd>
          </button>
        )}
      </div>

      <div className="mt-5 flex items-center gap-2 text-xs text-slate-500">
        <Sparkles className="w-3.5 h-3.5 text-sky-400/70" />
        <span>
          Press{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-[#0E1424] border border-slate-800 font-mono text-[11px] text-slate-300">
            Alt+N
          </kbd>{" "}
          anywhere to create a new note
        </span>
      </div>
    </div>
  );
};
