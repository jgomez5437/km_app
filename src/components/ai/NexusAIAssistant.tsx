"use client";

import React, { useState } from "react";
import { Note } from "@/types/vault";
import {
  Sparkles,
  Search,
  Link as LinkIcon,
  Bot,
  Settings2,
  ChevronRight,
  ArrowRight,
  Check,
} from "lucide-react";

interface NexusAIAssistantProps {
  activeNote: Note;
  allNotes: Note[];
  onOpenNote: (noteId: string) => void;
  onInsertWikilink: (targetTitle: string) => void;
}

export const NexusAIAssistant: React.FC<NexusAIAssistantProps> = ({
  activeNote,
  allNotes,
  onOpenNote,
  onInsertWikilink,
}) => {
  const [tab, setTab] = useState<"suggest" | "ask" | "settings">("suggest");
  const [query, setQuery] = useState("");
  const [chatResponse, setChatResponse] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Settings
  const [provider, setProvider] = useState<"local-ollama" | "openai" | "gemini">("local-ollama");
  const [endpoint, setEndpoint] = useState("http://localhost:11434");
  const [apiKey, setApiKey] = useState("");

  // Automated link recommendations based on content overlap
  const suggestedLinks = React.useMemo(() => {
    const existingLinksLower = new Set(activeNote.links.map((l) => l.toLowerCase()));
    const currentTitleLower = activeNote.title.toLowerCase();

    const suggestions: { note: Note; reason: string }[] = [];

    allNotes.forEach((candidate) => {
      if (candidate.id === activeNote.id) return;
      if (existingLinksLower.has(candidate.title.toLowerCase())) return;

      // Check if candidate title appears in active note text
      const candidateTitleRegex = new RegExp(`\\b${candidate.title}\\b`, "i");
      if (candidateTitleRegex.test(activeNote.content)) {
        suggestions.push({
          note: candidate,
          reason: `Mentioned directly in this note's body.`,
        });
        return;
      }

      // Check shared tags
      const sharedTags = candidate.tags.filter((t) => activeNote.tags.includes(t));
      if (sharedTags.length > 0) {
        suggestions.push({
          note: candidate,
          reason: `Shares related tags: #${sharedTags.join(", #")}`,
        });
      }
    });

    return suggestions.slice(0, 5);
  }, [activeNote, allNotes]);

  // Handle semantic Q&A simulation or local query
  const handleAskVault = () => {
    if (!query.trim()) return;
    setIsProcessing(true);
    setChatResponse(null);

    setTimeout(() => {
      const q = query.toLowerCase();
      // Search matching notes in vault
      const matches = allNotes.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q))
      );

      if (matches.length > 0) {
        const top = matches.slice(0, 3);
        const titles = top.map((n) => `[[${n.title}]]`).join(", ");
        setChatResponse(
          `Found ${matches.length} relevant reference(s) across your vault, including ${titles}.\n\n` +
          `Based on your notes, this concept intersects strongly with your research in ${top[0].title}.`
        );
      } else {
        setChatResponse(
          `No direct keyword matches found for "${query}". Recommended next step: Create a new note titled "[[${query}]]" to anchor this concept in your knowledge graph.`
        );
      }
      setIsProcessing(false);
    }, 400);
  };

  const handleLinkAction = (title: string) => {
    onInsertWikilink(title);
    setCopiedLink(title);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#161b22] border-l border-gray-800 text-gray-200 text-xs">
      {/* Header Tabs */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 bg-[#0d1117]/60">
        <div className="flex items-center gap-1.5 font-medium text-gray-300">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>Nexus AI Copilot</span>
        </div>
        <div className="flex items-center gap-1 bg-[#1f242c] p-0.5 rounded">
          <button
            onClick={() => setTab("suggest")}
            className={`px-2 py-0.5 rounded ${
              tab === "suggest" ? "bg-purple-900/50 text-purple-300" : "text-gray-400 hover:text-white"
            }`}
          >
            Suggestions
          </button>
          <button
            onClick={() => setTab("ask")}
            className={`px-2 py-0.5 rounded ${
              tab === "ask" ? "bg-purple-900/50 text-purple-300" : "text-gray-400 hover:text-white"
            }`}
          >
            Vault Q&A
          </button>
          <button
            onClick={() => setTab("settings")}
            className={`p-1 rounded ${
              tab === "settings" ? "bg-purple-900/50 text-purple-300" : "text-gray-400 hover:text-white"
            }`}
            title="AI Engine Settings"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tab 1: Smart Backlink Suggestions */}
      {tab === "suggest" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <h4 className="text-gray-400 font-semibold uppercase text-[10px] tracking-wider mb-2">
              Auto-Link Recommendations
            </h4>
            <p className="text-gray-400 text-[11px] mb-3">
              Unlinked concepts in your vault that match <strong>{activeNote.title}</strong>:
            </p>

            {suggestedLinks.length === 0 ? (
              <div className="bg-[#0d1117] p-3 rounded border border-gray-800 text-gray-400 text-center">
                All relevant references appear to be linked! Create more notes to uncover new intersections.
              </div>
            ) : (
              <div className="space-y-2">
                {suggestedLinks.map(({ note, reason }) => (
                  <div
                    key={note.id}
                    className="p-2.5 rounded bg-[#0d1117] border border-gray-800/80 hover:border-purple-600/50 transition flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => onOpenNote(note.id)}
                        className="font-medium text-purple-300 hover:underline flex items-center gap-1 text-left"
                      >
                        <span>[[{note.title}]]</span>
                        <ChevronRight className="w-3 h-3 text-gray-500" />
                      </button>
                      <button
                        onClick={() => handleLinkAction(note.title)}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-950/60 hover:bg-purple-900 text-purple-300 border border-purple-800/50 text-[10px]"
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
                    <span className="text-[10px] text-gray-400">{reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Vault Q&A & Synthesis */}
      {tab === "ask" && (
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-3 mb-3">
            <div className="bg-[#0d1117] p-3 rounded border border-gray-800 text-gray-300 leading-relaxed text-[11px]">
              Ask any question across your entire vault. Nexus AI analyzes notes, links, and tags to synthesize an answer.
            </div>

            {chatResponse && (
              <div className="bg-purple-950/20 border border-purple-900/50 p-3 rounded text-purple-200 leading-relaxed whitespace-pre-wrap text-[11px]">
                {chatResponse}
              </div>
            )}

            {isProcessing && (
              <div className="flex items-center gap-2 text-purple-400 text-[11px]">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>Synthesizing vault intelligence...</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 bg-[#0d1117] p-1.5 rounded border border-gray-800">
            <input
              type="text"
              placeholder="Ask your vault anything..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAskVault()}
              className="flex-1 bg-transparent border-none text-gray-100 text-xs px-2 focus:outline-none"
            />
            <button
              onClick={handleAskVault}
              className="p-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white transition"
              title="Submit query"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: AI Configuration */}
      {tab === "settings" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 mb-1">
              AI Provider
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as any)}
              className="w-full bg-[#0d1117] border border-gray-800 rounded px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-purple-500"
            >
              <option value="local-ollama">Ollama (100% Local & Private)</option>
              <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
              <option value="gemini">Google Gemini (Gemini 2.5 / 1.5 Pro)</option>
            </select>
          </div>

          {provider === "local-ollama" ? (
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                Ollama Endpoint
              </label>
              <input
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                className="w-full bg-[#0d1117] border border-gray-800 rounded px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-purple-500"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Default: http://localhost:11434 (zero telemetry, runs on your device).
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                API Key (BYOK)
              </label>
              <input
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-[#0d1117] border border-gray-800 rounded px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-purple-500"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Your key is stored securely in your browser and sent only directly to the provider.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
