export interface StoredAISettings {
  provider: "openai" | "gemini";
  openaiKey: string;
  geminiKey: string;
  model: string;
}

export const STORAGE_KEY_BASE = "astro_ai_settings_";

export function loadAISettings(userId?: string): StoredAISettings {
  const defaults: StoredAISettings = {
    provider: "gemini",
    openaiKey: "",
    geminiKey: "",
    model: "gemini-2.5-flash",
  };
  if (typeof window === "undefined") return defaults;
  try {
    const storageKey = `${STORAGE_KEY_BASE}${userId || "local"}`;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    const provider: "openai" | "gemini" =
      parsed.provider === "openai" ? "openai" : "gemini";
    let openaiKey: string = typeof parsed.openaiKey === "string" ? parsed.openaiKey : "";
    let geminiKey: string = typeof parsed.geminiKey === "string" ? parsed.geminiKey : "";
    if (parsed.apiKey) {
      if (provider === "gemini" && !geminiKey) geminiKey = parsed.apiKey;
      else if (provider === "openai" && !openaiKey) openaiKey = parsed.apiKey;
    }
    const model: string =
      parsed.model === "gemini-1.5-flash" || !parsed.model
        ? provider === "gemini"
          ? "gemini-2.5-flash"
          : "gpt-4o-mini"
        : parsed.model;
    return { provider, openaiKey, geminiKey, model };
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
  const { provider, openaiKey, geminiKey, model } = settings;
  const activeKey = provider === "gemini" ? geminiKey : openaiKey;

  if (!activeKey || !activeKey.trim()) {
    throw new Error(
      `API Key Required: Please configure your ${
        provider === "gemini" ? "Google Gemini" : "OpenAI"
      } API key in AI Settings.`
    );
  }

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
