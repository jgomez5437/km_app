"use client";

import React, { useState, useRef, useEffect } from "react";
import { loadAISettings, requestAI } from "@/lib/ai";
import { Markdown } from "@/components/ui/Markdown";
import {
  Wand2,
  X,
  Check,
  Edit3,
  RotateCcw,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Settings,
  ArrowRight,
  Eye,
} from "lucide-react";

interface WriteWithAIPanelProps {
  noteTitle: string;
  getCurrentContent: () => string;
  currentUserId?: string;
  onApprove: (draftMarkdown: string) => void;
  onDecline: () => void;
  onOpenSettings?: () => void;
}

export const WriteWithAIPanel: React.FC<WriteWithAIPanelProps> = ({
  noteTitle,
  getCurrentContent,
  currentUserId,
  onApprove,
  onDecline,
  onOpenSettings,
}) => {
  const displayTitle = noteTitle.trim() || "Untitled Note";

  const [step, setStep] = useState<"input" | "review">("input");
  const [userPrompt, setUserPrompt] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [refinePrompt, setRefinePrompt] = useState("");
  const [isEditingDirectly, setIsEditingDirectly] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const promptInputRef = useRef<HTMLTextAreaElement | null>(null);
  const draftEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const refineInputRef = useRef<HTMLInputElement | null>(null);

  // Focus prompt input when opening
  useEffect(() => {
    if (step === "input") {
      promptInputRef.current?.focus();
    }
  }, [step]);

  // Focus direct editor when toggled
  useEffect(() => {
    if (isEditingDirectly && step === "review") {
      draftEditorRef.current?.focus();
    }
  }, [isEditingDirectly, step]);

  const handleGenerateDraft = async (overridePrompt?: string) => {
    const prompt = (overridePrompt ?? userPrompt).trim();
    if (!prompt || isGenerating) return;

    setErrorMessage(null);
    setIsGenerating(true);

    try {
      const settings = loadAISettings(currentUserId);
      const res = await requestAI({
        mode: "article-write",
        messages: [{ role: "user", content: prompt }],
        articleContext: {
          title: displayTitle,
          content: getCurrentContent(),
        },
        settings,
      });

      setDraftContent(res.text.trim());
      setStep("review");
      setIsEditingDirectly(false);
    } catch (err: unknown) {
      console.error("Write with AI error:", err);
      const msg =
        err instanceof Error
          ? err.message
          : "An error occurred while generating the draft.";
      setErrorMessage(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefineDraft = async () => {
    const instruction = refinePrompt.trim();
    if (!instruction || isRefining || !draftContent) return;

    setErrorMessage(null);
    setIsRefining(true);

    try {
      const settings = loadAISettings(currentUserId);
      const messages = [
        {
          role: "user" as const,
          content: `Initial Request: ${userPrompt}\n\nCurrent Draft:\n${draftContent}\n\nPlease revise and update the draft according to these instructions: ${instruction}`,
        },
      ];

      const res = await requestAI({
        mode: "article-write",
        messages,
        articleContext: {
          title: displayTitle,
          content: getCurrentContent(),
        },
        settings,
      });

      setDraftContent(res.text.trim());
      setRefinePrompt("");
    } catch (err: unknown) {
      console.error("Refine draft error:", err);
      const msg =
        err instanceof Error
          ? err.message
          : "An error occurred while refining the draft.";
      setErrorMessage(msg);
    } finally {
      setIsRefining(false);
    }
  };

  const handleResetToInput = () => {
    setStep("input");
    setDraftContent("");
    setRefinePrompt("");
    setIsEditingDirectly(false);
    setErrorMessage(null);
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-30 sm:hidden"
        onClick={onDecline}
      />
      <div className="fixed sm:absolute bottom-0 sm:bottom-20 inset-x-0 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-30 w-full sm:w-[540px] max-h-[82dvh] sm:max-h-[580px] flex flex-col bg-[#0B0F19]/98 sm:bg-[#0B0F19]/95 backdrop-blur-xl border-t sm:border border-slate-700/80 rounded-t-2xl sm:rounded-2xl shadow-2xl text-slate-100 overflow-hidden animate-in fade-in sm:zoom-in-95 duration-150 pb-[env(safe-area-inset-bottom)] sm:pb-0">
        {/* Header */}
      <div className="px-4 py-3 bg-[#0E1525]/90 border-b border-slate-700/70 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-950/80 border border-indigo-700/60 flex items-center justify-center shrink-0">
            <Wand2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-white truncate">
                Write with AI
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 font-medium shrink-0">
                {step === "input" ? "Request" : "Review Draft"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[280px]">
              {displayTitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {step === "review" && (
            <button
              type="button"
              onClick={handleResetToInput}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition"
              title="New draft request"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onDecline}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition"
            title="Decline / Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar min-h-[200px]">
        {errorMessage && (
          <div className="p-2.5 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{errorMessage}</span>
              {errorMessage.includes("API Key") && onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="mt-1 flex items-center gap-1 text-sky-300 hover:underline font-semibold"
                >
                  <Settings className="w-3 h-3" />
                  <span>Open AI Settings</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 1: INPUT REQUEST */}
        {step === "input" && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                What would you like AI to draft?
              </label>
              <textarea
                ref={promptInputRef}
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleGenerateDraft();
                  }
                }}
                placeholder="e.g. Draft a 3-step guide explaining how local-first syncing works, with code snippets and architecture principles..."
                rows={4}
                disabled={isGenerating}
                className="w-full bg-[#06080F] border border-slate-700/80 rounded-xl p-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition resize-none disabled:opacity-50"
              />
              <span className="text-[11px] text-slate-500 block text-right mt-1">
                Press Ctrl+Enter or Cmd+Enter to draft
              </span>
            </div>

            {/* Quick Inspiration Prompts */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider block">
                Quick Prompts
              </span>
              {[
                "Draft an executive introduction for this note",
                "Create a clear summary with key bullet points",
                "Draft an FAQ section addressing common questions",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setUserPrompt(suggestion);
                    handleGenerateDraft(suggestion);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg bg-[#06080F]/80 hover:bg-slate-800/80 border border-slate-800/80 text-slate-300 hover:text-white transition text-xs flex items-center justify-between group"
                >
                  <span className="truncate">{suggestion}</span>
                  <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-indigo-400 shrink-0 ml-1.5" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: REVIEW & MODIFY DRAFT */}
        {step === "review" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                AI Draft Content
              </span>
              <button
                type="button"
                onClick={() => setIsEditingDirectly(!isEditingDirectly)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition ${
                  isEditingDirectly
                    ? "bg-indigo-950/80 text-indigo-300 border border-indigo-700/60"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
                title="Toggle direct text editing"
              >
                {isEditingDirectly ? (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Formatted</span>
                  </>
                ) : (
                  <>
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Text Directly</span>
                  </>
                )}
              </button>
            </div>

            {/* Draft Display (Direct Editing OR Markdown Preview) */}
            {isEditingDirectly ? (
              <textarea
                ref={draftEditorRef}
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                rows={9}
                className="w-full bg-[#06080F] border border-indigo-600/60 rounded-xl p-3 text-xs sm:text-[13px] text-slate-100 font-mono leading-relaxed focus:outline-none focus:border-indigo-400 transition custom-scrollbar"
                placeholder="Edit draft markdown..."
              />
            ) : (
              <div className="w-full bg-[#06080F] border border-slate-700/80 rounded-xl p-3 max-h-[220px] overflow-y-auto text-xs sm:text-[13px] text-slate-200 leading-relaxed custom-scrollbar font-sans shadow-inner">
                {draftContent ? (
                  <Markdown content={draftContent} />
                ) : (
                  <span className="text-slate-500 italic">(Draft is empty)</span>
                )}
              </div>
            )}

            {/* Follow-up Refine Prompt with AI */}
            <div className="pt-1">
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Refine with AI (optional)
              </label>
              <div className="flex items-center gap-1.5 bg-[#06080F] p-1.5 rounded-xl border border-slate-700/80 focus-within:border-indigo-500/80 transition">
                <input
                  ref={refineInputRef}
                  type="text"
                  placeholder="e.g. Make it more concise, add headers..."
                  value={refinePrompt}
                  onChange={(e) => setRefinePrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleRefineDraft();
                    }
                  }}
                  disabled={isRefining}
                  className="flex-1 bg-transparent border-none text-slate-100 text-xs px-2 focus:outline-none placeholder-slate-500 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={handleRefineDraft}
                  disabled={!refinePrompt.trim() || isRefining}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1 transition"
                >
                  {isRefining ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  <span>Refine</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-3 bg-[#0E1525]/90 border-t border-slate-700/70 flex items-center justify-between gap-2 shrink-0">
        {step === "input" ? (
          <>
            <button
              type="button"
              onClick={onDecline}
              className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleGenerateDraft()}
              disabled={!userPrompt.trim() || isGenerating}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 disabled:opacity-40 text-white text-xs font-semibold shadow-xs transition"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Drafting...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Generate Draft</span>
                </>
              )}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onDecline}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition text-xs font-medium"
            >
              <X className="w-3.5 h-3.5" />
              <span>Decline / Exit</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditingDirectly(true);
                  draftEditorRef.current?.focus();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#162032] hover:bg-[#1e2c45] text-slate-200 text-xs font-medium transition"
              >
                <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Modify</span>
              </button>

              <button
                type="button"
                onClick={() => onApprove(draftContent)}
                disabled={!draftContent.trim()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white text-xs font-semibold shadow-xs transition"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Approve & Insert</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  </>
);
};
