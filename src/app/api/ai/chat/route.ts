import { NextResponse } from "next/server";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      provider = "openai",
      apiKey,
      model,
      messages = [],
      vaultContext = "",
    } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "No messages provided for chat." },
        { status: 400 }
      );
    }

    if (provider !== "local-ollama" && (!apiKey || typeof apiKey !== "string" || !apiKey.trim())) {
      return NextResponse.json(
        {
          error: `Please provide an API key for ${provider === "gemini" ? "Google Gemini" : "OpenAI"} in Settings.`,
        },
        { status: 400 }
      );
    }

    const cleanKey = apiKey ? apiKey.trim() : "";

    const systemPrompt = `You are Astro AI Copilot, the intelligent research assistant for the user's Astro Knowledge Base vault.
You have direct access to the user's private notes, folders, and subpages provided in the context below.

=== VAULT CONTEXT ===
${vaultContext || "No notes in vault yet."}
=== END VAULT CONTEXT ===

Instructions:
- When asked broad questions such as "What do I have?" or "What notes are in my vault?", provide a clear, beautifully structured overview categorized by folder, highlighting note titles, subpages, and key concepts.
- When answering questions about specific topics, synthesize information directly from their vault notes.
- If citing notes, use bold titles or bracket syntax (e.g. **Welcome to Astro**).
- If the requested information is not in the vault, state that clearly and offer helpful related insights.
- Use clean Markdown with headers, bullet points, and code blocks where helpful.`;

    // 1. Google Gemini Provider
    if (provider === "gemini") {
      let targetModel = model?.trim() || "gemini-2.5-flash";

      // Format messages for Gemini (roles: 'user' | 'model')
      const contents = messages
        .filter((m: ChatMessage) => m.role === "user" || m.role === "assistant")
        .map((m: ChatMessage) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));

      // Ensure first message has role user
      if (contents.length > 0 && contents[0].role !== "user") {
        contents.unshift({ role: "user", parts: [{ text: "Hello" }] });
      }

      const geminiPayload = {
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        },
      };

      const tryGenerate = async (mName: string) => {
        const cleanModel = mName.replace(/^models\//, "");
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${cleanKey}`;
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(geminiPayload),
        });
        const data = await res.json();
        return { res, data, cleanModel };
      };

      let attempt = await tryGenerate(targetModel);

      // If model not found (404), auto-detect available models via ModelService.ListModels
      if (!attempt.res.ok && (attempt.res.status === 404 || attempt.data?.error?.message?.includes("not found"))) {
        console.warn(`Gemini model ${targetModel} not found. Querying available models from Gemini API...`);
        try {
          const listRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`
          );
          if (listRes.ok) {
            const listData = await listRes.json();
            const availableModels: string[] = (listData.models || [])
              .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
              .map((m: any) => m.name.replace(/^models\//, ""));

            // Preferred priority order
            const priorityList = [
              "gemini-2.5-flash",
              "gemini-2.0-flash",
              "gemini-2.5-pro",
              "gemini-2.0-flash-exp",
              "gemini-flash-latest",
            ];

            const bestModel =
              priorityList.find((p) => availableModels.includes(p)) ||
              availableModels.find((name) => name.includes("gemini") && name.includes("flash")) ||
              availableModels.find((name) => name.includes("gemini")) ||
              availableModels[0];

            if (bestModel) {
              console.log(`Auto-discovered active Gemini model: ${bestModel}`);
              attempt = await tryGenerate(bestModel);
              targetModel = bestModel;
            }
          }
        } catch (listErr) {
          console.warn("ModelService list query failed, trying standard fallback:", listErr);
        }

        // If still not ok, try 2.0-flash fallback
        if (!attempt.res.ok && targetModel !== "gemini-2.0-flash") {
          attempt = await tryGenerate("gemini-2.0-flash");
          if (attempt.res.ok) targetModel = "gemini-2.0-flash";
        }
      }

      if (!attempt.res.ok) {
        const errorMsg =
          attempt.data?.error?.message ||
          `Gemini API returned status ${attempt.res.status} (${attempt.res.statusText})`;
        return NextResponse.json({ error: errorMsg }, { status: attempt.res.status });
      }

      const candidate = attempt.data.candidates?.[0];
      const reply = candidate?.content?.parts?.[0]?.text;

      if (!reply) {
        return NextResponse.json(
          { error: "No response text received from Google Gemini." },
          { status: 502 }
        );
      }

      return NextResponse.json({ text: reply, modelUsed: targetModel });
    }

    // 2. OpenAI Provider (default)
    const selectedModel = model?.trim() || "gpt-4o-mini";
    const endpoint = "https://api.openai.com/v1/chat/completions";

    const formattedMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: ChatMessage) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    ];

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cleanKey}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: formattedMessages,
        temperature: 0.3,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const errorMsg =
        data?.error?.message ||
        `OpenAI API returned status ${res.status} (${res.statusText})`;
      return NextResponse.json({ error: errorMsg }, { status: res.status });
    }

    const reply = data.choices?.[0]?.message?.content;
    if (!reply) {
      return NextResponse.json(
        { error: "No response text received from OpenAI." },
        { status: 502 }
      );
    }

    return NextResponse.json({ text: reply, modelUsed: selectedModel });
  } catch (err: any) {
    console.error("AI chat error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process AI chat request." },
      { status: 500 }
    );
  }
}
