"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Note, Folder, AuthUser } from "@/types/vault";
import { escapeRegExp } from "@/lib/markdown";
import {
  Sparkles,
  Link as LinkIcon,
  Settings2,
  ChevronRight,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  AlertCircle,
  RotateCcw,
  Bot,
  User as UserIcon,
  CheckCircle2,
} from "lucide-react";

interface NexusAIAssistantProps {
  activeNote: Note;
  allNotes: Note[];
  folders?: Folder[];
  currentUser?: AuthUser | null;
  onOpenNote: (noteId: string) => void;
  onInsertWikilink: (targetTitle: string) => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const STORAGE_KEY_BASE = "astro_ai_settings_";
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

interface StoredAISettings {
  provider: "openai" | "gemini" | "local-ollama";
  endpoint: string;
  openaiKey: string;
  geminiKey: string;
  model: string;
}

function loadInitialAISettings(storageKey: string): StoredAISettings {
  const defaults: StoredAISettings = {
    provider: "openai",
    endpoint: "http://localhost:11434",
    openaiKey: "",
    geminiKey: "",
    model: "gemini-2.5-flash",
  };
  if (typeof window === "undefined") return defaults;
  try {
    const raw =
      localStorage.getItem(storageKey) ||
      localStorage.getItem("astro_ai_settings_v1") ||
      localStorage.getItem("astro_ai_settings_local");
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    const provider: "openai" | "gemini" | "local-ollama" =
      parsed.provider || "openai";
    const endpoint: string = parsed.endpoint || "http://localhost:11434";
    let openaiKey: string = parsed.openaiKey || "";
    let geminiKey: string = parsed.geminiKey || "";
    if (parsed.apiKey) {
      if (provider === "gemini") geminiKey = parsed.apiKey;
      else openaiKey = parsed.apiKey;
    }
    const model: string =
      parsed.model === "gemini-1.5-flash" || !parsed.model
        ? provider === "gemini"
          ? "gemini-2.5-flash"
          : ""
        : parsed.model;
    return { provider, endpoint, openaiKey, geminiKey, model };
  } catch (e) {
    console.warn("Failed to load AI settings:", e);
    return defaults;
  }
}

export const NexusAIAssistant: React.FC<NexusAIAssistantProps> = ({
  activeNote,
  allNotes,
  folders = [],
  currentUser,
  onOpenNote,
  onInsertWikilink,
}) => {
  const [tab, setTab] = useState<"ask" | "suggest" | "settings">("ask");
  const [query, setQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Storage key scoped to user or guest
  const storageKey = useMemo(() => {
    return `${STORAGE_KEY_BASE}${currentUser?.id || "local"}`;
  }, [currentUser]);

  const initialSettings = useMemo(
    () => loadInitialAISettings(storageKey),
    [storageKey]
  );

  // Settings State
  const [provider, setProvider] = useState<"openai" | "gemini" | "local-ollama">(
    () => initialSettings.provider
  );
  const [endpoint, setEndpoint] = useState(() => initialSettings.endpoint);
  const [openaiKey, setOpenaiKey] = useState(() => initialSettings.openaiKey);
  const [geminiKey, setGeminiKey] = useState(() => initialSettings.geminiKey);
  const [model, setModel] = useState(() => initialSettings.model);
  const [activeModelUsed, setActiveModelUsed] = useState<string>("");
  const [showKey, setShowKey] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  // Conversation history
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Save settings helper
  const saveSettings = (override?: {
    provider?: "openai" | "gemini" | "local-ollama";
    openaiKey?: string;
    geminiKey?: string;
    endpoint?: string;
    model?: string;
  }) => {
    if (typeof window === "undefined") return;
    const payload = {
      provider: override?.provider ?? provider,
      openaiKey: override?.openaiKey ?? openaiKey,
      geminiKey: override?.geminiKey ?? geminiKey,
      endpoint: override?.endpoint ?? endpoint,
      model: override?.model ?? model,
    };
    try {
      const serialized = JSON.stringify(payload);
      localStorage.setItem(storageKey, serialized);
      localStorage.setItem("astro_ai_settings_v1", serialized);
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 2500);
    } catch (e) {
      console.error("Failed to save AI settings:", e);
    }
  };

  // Scroll to bottom of chat
  useEffect(() => {
    if (tab === "ask") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, tab, isProcessing]);

  // Active key based on provider
  const activeKey = provider === "gemini" ? geminiKey : openaiKey;

  // Automated related note recommendations
  const suggestedLinks = useMemo(() => {
    const activeTags = activeNote.tags || [];
    const suggestions: { note: Note; reason: string }[] = [];

    allNotes.forEach((candidate) => {
      if (candidate.id === activeNote.id) return;

      // Check if same folder
      if (activeNote.folderId && candidate.folderId === activeNote.folderId) {
        suggestions.push({
          note: candidate,
          reason: "Located in the same folder.",
        });
        return;
      }

      // Check if candidate title appears in active note text
      const escapedCandidateTitle = escapeRegExp(candidate.title);
      if (escapedCandidateTitle) {
        const candidateTitleRegex = new RegExp(
          `(?:^|\\W)${escapedCandidateTitle}(?:$|\\W)`,
          "i"
        );
        if (candidateTitleRegex.test(activeNote.content)) {
          suggestions.push({
            note: candidate,
            reason: `Mentioned in this note's body.`,
          });
          return;
        }
      }

      // Check shared tags
      const candidateTags = candidate.tags || [];
      const sharedTags = candidateTags.filter((t) => activeTags.includes(t));
      if (sharedTags.length > 0) {
        suggestions.push({
          note: candidate,
          reason: `Shares related tags: #${sharedTags.join(", #")}`,
        });
      }
    });

    return suggestions.slice(0, 5);
  }, [activeNote, allNotes]);

  // Build complete vault context for real LLM reasoning
  const buildVaultContext = (): string => {
    const folderMap = new Map<string, string>();
    folders.forEach((f) => folderMap.set(f.id, f.name));

    const noteSummaries = allNotes.map((n) => {
      const folderName = n.folderId ? folderMap.get(n.folderId) || "General" : "Root";
      const isSub = Boolean(n.parentId);
      // Clean preview of content
      const preview = n.content.replace(/\s+/g, " ").trim().slice(0, 800);
      return `### Note: "${n.title}"\n- Type: ${isSub ? "Subpage" : "Main Note"}\n- Folder: ${folderName}\n- Tags: ${
        n.tags && n.tags.length > 0 ? n.tags.join(", ") : "none"
      }\n- Excerpt: ${preview}`;
    });

    return (
      `Vault Overview: Total ${folders.length} folders, ${allNotes.length} notes.\n\n` +
      `Active Note Currently Viewed: "${activeNote.title}"\n\n` +
      `All Notes in Vault:\n` +
      noteSummaries.join("\n\n")
    );
  };

  // Submit chat query to real AI backend
  const handleAskVault = async (queryText?: string) => {
    const prompt = (queryText ?? query).trim();
    if (!prompt || isProcessing) return;

    // Check if key is required and missing
    if (provider !== "local-ollama" && !activeKey.trim()) {
      const userMsg = createChatMessage("user", prompt);
      const assistantMsg = createChatMessage(
        "assistant",
        `⚠️ **API Key Required**: Please configure your ${
          provider === "gemini" ? "Google Gemini" : "OpenAI"
        } API key in the **Settings** tab (⚙️) above to unlock real vault intelligence and chat.`
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

      // 1. Local Ollama execution
      if (provider === "local-ollama") {
        const ollamaEndpoint = (endpoint || "http://localhost:11434").replace(/\/+$/, "");
        const res = await fetch(`${ollamaEndpoint}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: model || "llama3",
            messages: [
              {
                role: "system",
                content: `You are Astro AI Copilot for the user's Astro Vault.\n\nContext:\n${vaultContext}`,
              },
              ...newMessages.map((m) => ({ role: m.role, content: m.content })),
            ],
            stream: false,
          }),
        });

        if (!res.ok) {
          throw new Error(
            `Ollama responded with HTTP ${res.status}. Please make sure Ollama is running ('ollama serve') and model '${
              model || "llama3"
            }' is installed.`
          );
        }

        const data = await res.json();
        const reply = data.message?.content || "No response received from local Ollama.";

        setMessages((prev) => [...prev, createChatMessage("assistant", reply)]);
        return;
      }

      // 2. Cloud Providers via /api/ai/chat
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey: activeKey.trim(),
          model: model.trim() || undefined,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          vaultContext,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reach AI provider.");
      }

      if (data.modelUsed) {
        setActiveModelUsed(data.modelUsed);
      }

      setMessages((prev) => [
        ...prev,
        createChatMessage("assistant", data.text),
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

  const handleLinkAction = (title: string) => {
    onInsertWikilink(title);
    setCopiedLink(title);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#0B0F19] border-l border-slate-800/80 text-slate-200 text-xs">
      {/* Header Tabs */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/80 bg-[#06080F]/60">
        <div className="flex items-center gap-1.5 font-medium text-slate-200">
          <Sparkles className="w-4 h-4 text-sky-400" />
          <span>Astro AI Copilot</span>
        </div>
        <div className="flex items-center gap-1 bg-[#06080F] p-0.5 rounded border border-slate-800">
          <button
            onClick={() => setTab("ask")}
            className={`px-2 py-0.5 rounded transition ${
              tab === "ask"
                ? "bg-sky-950/70 text-sky-200 border border-sky-800/60"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Vault Q&A
          </button>
          <button
            onClick={() => setTab("suggest")}
            className={`px-2 py-0.5 rounded transition ${
              tab === "suggest"
                ? "bg-sky-950/70 text-sky-200 border border-sky-800/60"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Suggestions
          </button>
          <button
            onClick={() => setTab("settings")}
            className={`p-1 rounded transition ${
              tab === "settings"
                ? "bg-sky-950/70 text-sky-200 border border-sky-800/60"
                : "text-slate-400 hover:text-white"
            }`}
            title="AI Engine Settings"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tab 1: Real Vault Q&A & Multi-turn Chat */}
      {tab === "ask" && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                <div className="w-10 h-10 rounded-xl bg-sky-950/50 border border-sky-800/50 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white tracking-tight">
                    Chat with your Astro Vault
                  </h4>
                  <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                    Ask questions across all notes, synthesize research, or uncover connections.
                  </p>
                </div>

                {!activeKey && provider !== "local-ollama" && (
                  <div className="w-full max-w-xs p-2.5 bg-sky-950/40 border border-sky-800/50 rounded-lg text-left text-[11px] text-sky-200 flex items-start gap-2 mt-2">
                    <AlertCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span>No API key saved yet. Add your OpenAI or Gemini key to enable real AI.</span>
                      <button
                        onClick={() => setTab("settings")}
                        className="block mt-1 font-semibold text-sky-300 hover:underline"
                      >
                        Open Settings →
                      </button>
                    </div>
                  </div>
                )}

                <div className="w-full max-w-xs space-y-1.5 pt-2 text-left">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider block">
                    Quick Prompts
                  </span>
                  {[
                    "What do I have in my vault?",
                    "Summarize my research topics",
                    `What relates to "${activeNote.title}"?`,
                  ].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handleAskVault(preset)}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg bg-[#06080F] hover:bg-slate-800/80 border border-slate-800 text-slate-300 hover:text-white transition text-[11px] flex items-center justify-between group"
                    >
                      <span className="truncate">{preset}</span>
                      <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-sky-400 shrink-0 ml-1" />
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
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    {m.role === "user" ? (
                      <>
                        <span className="text-[10px] text-slate-500">You</span>
                        <UserIcon className="w-3 h-3 text-slate-400" />
                      </>
                    ) : (
                      <>
                        <Bot className="w-3 h-3 text-sky-400" />
                        <span className="text-[10px] text-slate-400 font-medium">Astro AI</span>
                      </>
                    )}
                  </div>
                  <div
                    className={`max-w-[92%] px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-sky-950/70 text-sky-100 border border-sky-800/60 rounded-tr-xs"
                        : "bg-[#06080F] text-slate-200 border border-slate-800/80 rounded-tl-xs shadow-md"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}

            {isProcessing && (
              <div className="flex items-center gap-2 p-2 bg-[#06080F] rounded-lg border border-slate-800/80 text-sky-400 text-xs w-fit">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>Astro AI is reading vault notes and synthesizing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Footer Toolbar & Input */}
          <div className="p-2 border-t border-slate-800/80 bg-[#06080F]/80">
            {messages.length > 0 && (
              <div className="flex items-center justify-between pb-1.5 px-1">
                <span className="text-[10px] text-slate-500">
                  Model: {
                    provider === "gemini"
                      ? (activeModelUsed?.includes("2.5-pro") ? "Gemini 2.5 Pro" : activeModelUsed?.includes("2.0") ? "Gemini 2.0 Flash" : "Gemini 2.5 Flash")
                      : provider === "openai"
                      ? (activeModelUsed?.includes("gpt-4o") && !activeModelUsed?.includes("mini") ? "GPT-4o" : activeModelUsed?.includes("o3") ? "o3-mini" : "GPT-4o mini")
                      : (model || "Ollama")
                  }
                </span>
                <button
                  onClick={() => setMessages([])}
                  className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition"
                  title="Clear conversation"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset Chat</span>
                </button>
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-[#0B0F19] p-1.5 rounded-lg border border-slate-800 focus-within:border-sky-500/80 transition">
              <input
                type="text"
                placeholder="Ask your vault anything..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAskVault()}
                disabled={isProcessing}
                className="flex-1 bg-transparent border-none text-slate-100 text-xs px-2 focus:outline-none placeholder-slate-500 disabled:opacity-50"
              />
              <button
                onClick={() => handleAskVault()}
                disabled={!query.trim() || isProcessing}
                className="p-1.5 rounded-md bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white transition disabled:opacity-40 disabled:hover:from-sky-500 disabled:hover:to-indigo-600 shadow-xs"
                title="Send query"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Smart Backlink Suggestions */}
      {tab === "suggest" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <h4 className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider mb-2">
              Auto-Link Recommendations
            </h4>
            <p className="text-slate-400 text-[11px] mb-3">
              Unlinked concepts in your vault matching <strong>{activeNote.title}</strong>:
            </p>

            {suggestedLinks.length === 0 ? (
              <div className="bg-[#06080F] p-3 rounded-lg border border-slate-800 text-slate-400 text-center text-xs">
                All relevant references appear to be linked! Create more notes to uncover new intersections.
              </div>
            ) : (
              <div className="space-y-2">
                {suggestedLinks.map(({ note, reason }) => (
                  <div
                    key={note.id}
                    className="p-2.5 rounded-lg bg-[#06080F] border border-slate-800/80 hover:border-sky-600/50 transition flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => onOpenNote(note.id)}
                        className="font-medium text-sky-300 hover:underline flex items-center gap-1 text-left"
                      >
                        <span>[[{note.title}]]</span>
                        <ChevronRight className="w-3 h-3 text-slate-500" />
                      </button>
                      <button
                        onClick={() => handleLinkAction(note.title)}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-950/60 hover:bg-sky-900 text-sky-300 border border-sky-800/50 text-[10px] transition"
                      >
                        {copiedLink === note.title ? (
                          <>
                            <Check className="w-2.5 h-2.5 text-emerald-400" />
                            <span>Linked</span>
                          </>
                        ) : (
                          <>
                            <LinkIcon className="w-2.5 h-2.5" />
                            <span>Link</span>
                          </>
                        )}
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400">{reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Persistent AI Configuration */}
      {tab === "settings" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-slate-300 font-semibold text-xs tracking-tight">
              AI Engine Configuration
            </h4>
            {savedFeedback && (
              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Saved to Browser</span>
              </span>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              AI Provider
            </label>
            <select
              value={provider}
              onChange={(e) => {
                const nextProvider = e.target.value as
                  | "openai"
                  | "gemini"
                  | "local-ollama";
                setProvider(nextProvider);
                const defaultNextModel = nextProvider === "gemini" ? "gemini-2.5-flash" : nextProvider === "openai" ? "gpt-4o-mini" : "";
                setModel(defaultNextModel);
                saveSettings({ provider: nextProvider, model: defaultNextModel });
              }}
              className="w-full bg-[#06080F] border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 transition"
            >
              <option value="gemini">Google Gemini (Gemini 2.5 Flash / Pro)</option>
              <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
              <option value="local-ollama">Ollama (100% Local & Private)</option>
            </select>
          </div>

          {provider === "local-ollama" ? (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Ollama Endpoint
                </label>
                <input
                  type="text"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  onBlur={() => saveSettings()}
                  placeholder="http://localhost:11434"
                  className="w-full bg-[#06080F] border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 transition"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Default: http://localhost:11434 (zero telemetry, runs locally on your machine).
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Model Name
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  onBlur={() => saveSettings()}
                  placeholder="llama3, mistral, deepseek-r1"
                  className="w-full bg-[#06080F] border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 transition font-mono"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-400">
                    {provider === "gemini" ? "Google Gemini API Key" : "OpenAI API Key"}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1"
                  >
                    {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showKey ? "Hide" : "Show"}</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    placeholder={provider === "gemini" ? "AIzaSy..." : "sk-..."}
                    value={provider === "gemini" ? geminiKey : openaiKey}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (provider === "gemini") {
                        setGeminiKey(val);
                        saveSettings({ geminiKey: val });
                      } else {
                        setOpenaiKey(val);
                        saveSettings({ openaiKey: val });
                      }
                    }}
                    onBlur={() => saveSettings()}
                    className="w-full bg-[#06080F] border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 transition font-mono pr-8"
                  />
                  {(provider === "gemini" ? geminiKey : openaiKey) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (provider === "gemini") {
                          setGeminiKey("");
                          saveSettings({ geminiKey: "" });
                        } else {
                          setOpenaiKey("");
                          saveSettings({ openaiKey: "" });
                        }
                      }}
                      className="absolute right-2 top-2.5 text-slate-500 hover:text-slate-300 text-[10px]"
                      title="Clear key"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Your key is persisted securely in your local browser storage and never logged in the database.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Model
                </label>
                {provider === "gemini" ? (
                  <select
                    value={
                      ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"].includes(model || "gemini-2.5-flash")
                        ? model || "gemini-2.5-flash"
                        : "custom"
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "custom") {
                        setModel("");
                        saveSettings({ model: "" });
                      } else {
                        setModel(val);
                        saveSettings({ model: val });
                      }
                    }}
                    className="w-full bg-[#06080F] border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 transition"
                  >
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended: Fast & Intelligent)</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro (Deep Reasoning & Analysis)</option>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fast Multimodal)</option>
                    <option value="custom">Custom Model Identifier...</option>
                  </select>
                ) : (
                  <select
                    value={
                      ["gpt-4o-mini", "gpt-4o", "o3-mini"].includes(model || "gpt-4o-mini")
                        ? model || "gpt-4o-mini"
                        : "custom"
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "custom") {
                        setModel("");
                        saveSettings({ model: "" });
                      } else {
                        setModel(val);
                        saveSettings({ model: val });
                      }
                    }}
                    className="w-full bg-[#06080F] border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 transition"
                  >
                    <option value="gpt-4o-mini">GPT-4o mini (Recommended: Fast & Efficient)</option>
                    <option value="gpt-4o">GPT-4o (Flagship Omni)</option>
                    <option value="o3-mini">o3-mini (Advanced Reasoning)</option>
                    <option value="custom">Custom Model Identifier...</option>
                  </select>
                )}

                {/* Show custom text input if custom selected */}
                {(!["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash", "gpt-4o-mini", "gpt-4o", "o3-mini"].includes(model)) && (
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => {
                      setModel(e.target.value);
                      saveSettings({ model: e.target.value });
                    }}
                    onBlur={() => saveSettings()}
                    placeholder={provider === "gemini" ? "e.g. gemini-2.5-flash" : "e.g. gpt-4o-mini"}
                    className="w-full mt-2 bg-[#06080F] border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 transition font-mono"
                  />
                )}
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={() => saveSettings()}
              className="w-full py-2 px-3 rounded-lg bg-sky-950/60 hover:bg-sky-900/60 text-sky-300 border border-sky-800/60 font-medium text-xs transition flex items-center justify-center gap-1.5 active:scale-98"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save AI Settings</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
