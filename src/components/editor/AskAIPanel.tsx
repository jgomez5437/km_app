"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { loadAISettings, requestAI } from "@/lib/ai";
import {
  Sparkles,
  X,
  Send,
  RotateCcw,
  Bot,
  User as UserIcon,
  AlertCircle,
  Settings,
  ArrowRight,
} from "lucide-react";

interface AskAIPanelProps {
  noteId: string;
  noteTitle: string;
  getCurrentContent: () => string;
  currentUserId?: string;
  onClose: () => void;
  onOpenSettings?: () => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

let askPanelMessageCounter = 0;
function createMessageId(role: "user" | "assistant"): string {
  askPanelMessageCounter += 1;
  return `msg_${askPanelMessageCounter}_${role}`;
}

export const AskAIPanel: React.FC<AskAIPanelProps> = ({
  noteTitle,
  getCurrentContent,
  currentUserId,
  onClose,
  onOpenSettings,
}) => {
  const displayTitle = noteTitle.trim() || "Untitled Note";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Initial greeting dynamically computed with current article title
  const initialGreetingMessage: ChatMessage = useMemo(() => ({
    id: "greeting",
    role: "assistant",
    content: `How can I help with **${displayTitle}**?`,
  }), [displayTitle]);

  const allDisplayMessages: ChatMessage[] = useMemo(() => [
    initialGreetingMessage,
    ...messages,
  ], [initialGreetingMessage, messages]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = async (queryText?: string) => {
    const prompt = (queryText ?? inputQuery).trim();
    if (!prompt || isProcessing) return;

    setErrorMessage(null);
    const userMessage: ChatMessage = {
      id: createMessageId("user"),
      role: "user",
      content: prompt,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInputQuery("");
    setIsProcessing(true);

    try {
      const settings = loadAISettings(currentUserId);
      const content = getCurrentContent();

      const formattedHistory = [
        initialGreetingMessage,
        ...nextMessages,
      ].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await requestAI({
        mode: "article-ask",
        messages: formattedHistory,
        articleContext: {
          title: displayTitle,
          content,
        },
        settings,
      });

      const assistantReply: ChatMessage = {
        id: createMessageId("assistant"),
        role: "assistant",
        content: res.text,
      };

      setMessages((prev) => [...prev, assistantReply]);
    } catch (err: unknown) {
      console.error("Ask AI error:", err);
      const msg =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while processing your request.";
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetChat = () => {
    setMessages([]);
    setInputQuery("");
    setErrorMessage(null);
  };

  return (
    <div className="absolute bottom-16 left-3 sm:left-8 z-30 w-[calc(100vw-1.5rem)] sm:w-[420px] max-h-[500px] flex flex-col bg-[#0B0F19]/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.7)] text-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
      {/* Header */}
      <div className="px-4 py-3 bg-[#0E1525]/90 border-b border-slate-700/70 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-sky-950/80 border border-sky-700/60 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-sky-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-white truncate">
                Ask AI
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950/60 border border-sky-800/60 text-sky-300 font-medium shrink-0">
                This article only
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[240px]">
              {displayTitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleResetChat}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition"
            title="Reset conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 custom-scrollbar min-h-[220px] max-h-[340px]">
        {allDisplayMessages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${
              m.role === "user" ? "items-end" : "items-start"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400">
              {m.role === "user" ? (
                <>
                  <span>You</span>
                  <UserIcon className="w-3 h-3 text-slate-400" />
                </>
              ) : (
                <>
                  <Bot className="w-3.5 h-3.5 text-sky-400" />
                  <span className="font-medium text-slate-300">Astro AI</span>
                </>
              )}
            </div>
            <div
              className={`max-w-[92%] px-3 py-2 rounded-xl text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-sky-950/80 text-sky-100 border border-sky-800/60 rounded-tr-xs shadow-xs"
                  : "bg-[#06080F] text-slate-200 border border-slate-800/90 rounded-tl-xs shadow-md"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex items-center gap-2 p-2 bg-[#06080F] rounded-lg border border-slate-800/80 text-sky-400 text-xs w-fit">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            <span>Analyzing this article...</span>
          </div>
        )}

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

        {/* Quick prompt suggestions if only greeting is present */}
        {messages.length === 0 && !isProcessing && (
          <div className="pt-1.5 space-y-1.5">
            <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider block px-1">
              Suggestions
            </span>
            {[
              "Summarize this article",
              "What are the main takeaways?",
              "Explain key concepts in simple terms",
            ].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleSendMessage(preset)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg bg-[#06080F]/80 hover:bg-slate-800/80 border border-slate-800/80 text-slate-300 hover:text-white transition text-xs flex items-center justify-between group"
              >
                <span className="truncate">{preset}</span>
                <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-sky-400 shrink-0 ml-1.5" />
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-2.5 border-t border-slate-700/70 bg-[#0E1525]/70 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-1.5 bg-[#06080F] p-1.5 rounded-xl border border-slate-700/80 focus-within:border-sky-500/80 transition"
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask anything about this article..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            disabled={isProcessing}
            className="flex-1 bg-transparent border-none text-slate-100 text-xs sm:text-sm px-2 focus:outline-none placeholder-slate-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isProcessing}
            className="p-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white transition disabled:hover:bg-sky-600"
            title="Send"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
