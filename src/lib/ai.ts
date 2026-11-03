export interface StoredAISettings {
  provider: "openai" | "gemini" | "local-ollama";
  endpoint: string;
  openaiKey: string;
  geminiKey: string;
  model: string;
}

export const STORAGE_KEY_BASE = "astro_ai_settings_";

export function loadAISettings(userId?: string): StoredAISettings {
  const defaults: StoredAISettings = {
    provider: "openai",
    endpoint: "http://localhost:11434",
    openaiKey: "",
    geminiKey: "",
    model: "gemini-2.5-flash",
  };
  if (typeof window === "undefined") return defaults;
  try {
    const storageKey = `${STORAGE_KEY_BASE}${userId || "local"}`;
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

export interface AIRequestOptions {
  mode: "vault" | "article-ask" | "article-write";
  messages: { role: "user" | "assistant"; content: string }[];
  articleContext?: {
    title: string;
    content: string;
  };
  vaultContext?: string;
  settings: StoredAISettings;
}

export interface AIResponse {
  text: string;
  modelUsed?: string;
}

export async function requestAI(options: AIRequestOptions): Promise<AIResponse> {
  const { mode, messages, articleContext, vaultContext, settings } = options;
  const { provider, endpoint, openaiKey, geminiKey, model } = settings;
  const activeKey = provider === "gemini" ? geminiKey : openaiKey;

  if (provider !== "local-ollama" && !activeKey.trim()) {
    throw new Error(
      `API Key Required: Please configure your ${
        provider === "gemini" ? "Google Gemini" : "OpenAI"
      } API key in AI Settings.`
    );
  }

  // 1. Local Ollama execution
  if (provider === "local-ollama") {
    const ollamaEndpoint = (endpoint || "http://localhost:11434").replace(/\/+$/, "");

    let systemPrompt = "";
    if (mode === "article-ask") {
      systemPrompt = `You are an AI assistant helping the user with the article "${articleContext?.title || "Untitled"}".
You have access ONLY to this specific article's content provided below. Do not use, reference, or assume information outside this article unless answering general questions about the concepts present in it.

=== ARTICLE TITLE ===
${articleContext?.title || "Untitled"}

=== ARTICLE CONTENT ===
${articleContext?.content || "(empty note)"}
=== END ARTICLE CONTENT ===`;
    } else if (mode === "article-write") {
      systemPrompt = `You are an expert writing assistant and content drafter.
The user is working on an article titled "${articleContext?.title || "Untitled"}".

=== CURRENT ARTICLE CONTENT ===
${articleContext?.content || "(empty note)"}
=== END ARTICLE CONTENT ===

Write a high-quality draft fulfilling the user's request. Output clean, well-formatted Markdown. Do NOT include conversational chatter or preambles like "Here is your draft:". Provide only the drafted content directly.`;
    } else {
      systemPrompt = `You are Astro AI Copilot for the user's Astro Vault.\n\nContext:\n${vaultContext || "No notes in vault yet."}`;
    }

    const res = await fetch(`${ollamaEndpoint}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model || "llama3",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
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
    return { text: reply, modelUsed: model || "Ollama" };
  }

  // 2. Cloud Providers via /api/ai/chat
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode,
      provider,
      apiKey: activeKey.trim(),
      model: model.trim() || undefined,
      messages,
      articleContext,
      vaultContext,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to reach AI provider.");
  }

  return { text: data.text, modelUsed: data.modelUsed };
}
