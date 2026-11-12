"use client";

import React, { useState, useEffect, useRef } from "react";
import { Note, Folder, AuthUser } from "@/types/vault";
import { loadAISettings, requestAI, StoredAISettings } from "@/lib/ai";
import { Markdown } from "@/components/ui/Markdown";
import {
  Sparkles,
  Settings2,
  ArrowRight,
  AlertCircle,
  RotateCcw,
  Bot,
  User as UserIcon,
  Copy,
  Check,
} from "lucide-react";

interface NexusAIAssistantProps {
  activeNote: Note;
  allNotes: Note[];
  folders?: Folder[];
  currentUser?: AuthUser | null;
  onOpenAISettings: () => void;
  onOpenNote?: (noteId: string) => void;
  onInsertWikilink?: (targetTitle: string) => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

let chatMessageCounter = 0;

function createChatMessage(
  role: "user" | "assistant",
  content: string
): ChatMessage {
  chatMessageCounter += 1;
  return {
    id: `msg_${chatMessageCounter}_${role[0]}`,
    role,
    content,
  };
}

export const NexusAIAssistant: React.FC<NexusAIAssistantProps> = ({
  activeNote,
  allNotes,
  folders = [],
  currentUser,
  onOpenAISettings,
}) => {
  const [query, setQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeModelUsed, setActiveModelUsed] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // AI settings synced from browser storage
  const [aiSettings, setAiSettings] = useState<StoredAISettings>(() =>
    loadAISettings(currentUser?.id)
  );

  useEffect(() => {
    const syncSettings = () => {
      setAiSettings(loadAISettings(currentUser?.id));
    };
    syncSettings();
    window.addEventListener("astro_ai_settings_updated", syncSettings);
    window.addEventListener("storage", syncSettings);
    return () => {
      window.removeEventListener("astro_ai_settings_updated", syncSettings);
      window.removeEventListener("storage", syncSettings);
    };
  }, [currentUser]);

  const activeKey =
    aiSettings.provider === "gemini"
      ? aiSettings.geminiKey
      : aiSettings.openaiKey;

  // Conversation history
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  const handleCopyMessage = async (msgId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(msgId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.warn("Failed to copy to clipboard", e);
    }
  };

  // Build complete vault context for real LLM reasoning
  const buildVaultContext = (): string => {
    const folderMap = new Map<string, string>();
    folders.forEach((f) => folderMap.set(f.id, f.name));

    const noteSummaries = allNotes.map((n) => {
      const folderName = n.folderId ? folderMap.get(n.folderId) || "General" : "Root";
      const isSub = Boolean(n.parentId);
      const preview = n.content.replace(/\s+/g, " ").trim().slice(0, 800);
      return `### Note: "${n.title || "Untitled"}"\n- Type: ${isSub ? "Subpage" : "Main Note"}\n- Folder: ${folderName}\n- Tags: ${
        n.tags && n.tags.length > 0 ? n.tags.join(", ") : "none"
      }\n- Excerpt: ${preview}`;
    });

    return (
      `Vault Overview: Total ${folders.length} folders, ${allNotes.length} notes.\n\n` +
      `Active Note Currently Viewed: "${activeNote?.title || "Untitled"}"\n\n` +
      `All Notes in Vault:\n` +
      noteSummaries.join("\n\n")
    );
  };

  // Submit chat query to real AI backend
  const handleAskVault = async (queryText?: string) => {
    const prompt = (queryText ?? query).trim();
    if (!prompt || isProcessing) return;

    const currentSettings = loadAISettings(currentUser?.id);
    const currentActiveKey =
      currentSettings.provider === "gemini"
        ? currentSettings.geminiKey
        : currentSettings.openaiKey;

    if (!currentActiveKey || !currentActiveKey.trim()) {
      const userMsg = createChatMessage("user", prompt);
      const assistantMsg = createChatMessage(
        "assistant",
        `⚠️ **API Key Required**: Please configure your ${
          currentSettings.provider === "gemini" ? "Google Gemini" : "OpenAI"
        } API key in **AI Settings** to unlock real vault intelligence and chat.`
      );
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setQuery("");
      return;
    }

    const userMessage = createChatMessage("user", prompt);
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setQuery("");
    setIsProcessing(true);

    try {
      const vaultContext = buildVaultContext();

      const response = await requestAI({
        mode: "vault",
        messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        vaultContext,
        settings: currentSettings,
      });

      if (response.modelUsed) {
        setActiveModelUsed(response.modelUsed);
      }

      setMessages((prev) => [
        ...prev,
        createChatMessage("assistant", response.text),
      ]);
    } catch (err: unknown) {
      console.error("AI Query Error:", err);
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while communicating with the AI service.";
      setMessages((prev) => [
        ...prev,
        createChatMessage("assistant", `⚠️ **AI Query Error**: ${message}`),
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const modelDisplayName =
    activeModelUsed ||
    aiSettings.model ||
    (aiSettings.provider === "gemini" ? "Gemini 2.5 Flash" : "GPT-4o mini");

  return (
    <div className="flex flex-col h-full bg-[#0B0F19] border-l border-slate-800/80 text-slate-200 text-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800/80 bg-[#06080F]/60 shrink-0">
        <div className="flex items-center gap-2 font-medium text-slate-200">
          <Sparkles className="w-4 h-4 text-sky-400" />
          <span className="text-sm font-semibold">Astro AI Copilot</span>
        </div>
        <button
          type="button"
          onClick={onOpenAISettings}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#06080F] hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition"
          title="Configure AI Engine in User Settings"
        >
          <Settings2 className="w-3.5 h-3.5 text-sky-400" />
          <span>Settings</span>
        </button>
      </div>

      {/* Messages Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-3.5">
              <div className="w-11 h-11 rounded-xl bg-sky-950/50 border border-sky-800/50 flex items-center justify-center">
                <Bot className="w-5.5 h-5.5 text-sky-400" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-white tracking-tight">
                  Chat with your Astro Vault
                </h4>
                <p className="text-xs text-slate-400 max-w-xs mt-1 leading-relaxed">
                  Ask questions across all notes, synthesize research, or uncover connections.
                </p>
              </div>

              {!activeKey && (
                <div className="w-full max-w-xs p-3 bg-sky-950/40 border border-sky-800/50 rounded-lg text-left text-xs text-sky-200 flex items-start gap-2.5 mt-2">
                  <AlertCircle className="w-4.5 h-4.5 text-sky-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span>
                      Add your {aiSettings.provider === "gemini" ? "Google Gemini" : "OpenAI"} API key in Settings to unlock real AI.
                    </span>
                    <button
                      type="button"
                      onClick={onOpenAISettings}
                      className="block mt-1 font-semibold text-sky-300 hover:underline"
                    >
                      Open AI Settings →
                    </button>
                  </div>
                </div>
              )}

              <div className="w-full max-w-xs space-y-2 pt-2 text-left">
                <span className="text-[11px] uppercase font-semibold text-slate-400 tracking-wider block">
                  Quick Prompts
                </span>
                {[
                  "What do I have in my vault?",
                  "Summarize my research topics",
                  `What relates to "${activeNote?.title || "Untitled"}"?`,
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleAskVault(preset)}
                    className="w-full text-left px-3 py-2 rounded-lg bg-[#06080F] hover:bg-slate-800/80 border border-slate-800 text-slate-300 hover:text-white transition text-xs flex items-center justify-between group"
                  >
                    <span className="truncate">{preset}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 shrink-0 ml-1.5" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${
                  m.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div className="flex items-center gap-2 mb-1 px-1">
                  {m.role === "user" ? (
                    <>
                      <span className="text-xs text-slate-400">You</span>
                      <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                    </>
                  ) : (
                    <div className="flex items-center justify-between w-full gap-2">
                      <div className="flex items-center gap-1.5">
                        <Bot className="w-3.5 h-3.5 text-sky-400" />
                        <span className="text-xs text-slate-300 font-medium">Astro AI</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(m.id, m.content)}
                        className="text-slate-500 hover:text-slate-300 transition p-0.5"
                        title="Copy response"
                        aria-label="Copy response"
                      >
                        {copiedId === m.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
                <div
                  className={`max-w-[94%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-sky-950/70 text-sky-100 border border-sky-800/60 rounded-tr-xs whitespace-pre-wrap"
                      : "bg-[#06080F] text-slate-200 border border-slate-800/80 rounded-tl-xs shadow-md"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <Markdown content={m.content} />
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))
          )}

          {isProcessing && (
            <div className="flex items-center gap-2.5 p-2.5 bg-[#06080F] rounded-lg border border-slate-800/80 text-sky-400 text-xs w-fit">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Astro AI is reading vault notes and synthesizing...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Footer Toolbar & Input */}
        <div className="p-2.5 border-t border-slate-800/80 bg-[#06080F]/80 shrink-0">
          {messages.length > 0 && (
            <div className="flex items-center justify-between pb-2 px-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="truncate max-w-[180px]">Model: {modelDisplayName}</span>
                <button
                  type="button"
                  onClick={onOpenAISettings}
                  className="text-slate-500 hover:text-sky-300 transition"
                  title="Configure AI Engine in Settings"
                >
                  <Settings2 className="w-3 h-3" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setMessages([])}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition"
                title="Clear conversation"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Chat</span>
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 bg-[#0B0F19] p-1.5 rounded-xl border border-slate-800 focus-within:border-sky-500/80 transition">
            <input
              type="text"
              placeholder="Ask your vault anything..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAskVault()}
              disabled={isProcessing}
              className="flex-1 bg-transparent border-none text-slate-100 text-base sm:text-sm px-2 focus:outline-none placeholder-slate-500 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => handleAskVault()}
              disabled={!query.trim() || isProcessing}
              className="p-2 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white transition disabled:opacity-40 disabled:hover:from-sky-500 disabled:hover:to-indigo-600 shadow-xs"
              title="Send query"
              aria-label="Send query"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
