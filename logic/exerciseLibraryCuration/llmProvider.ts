/**
 * OpenAI-compatible chat completions (JSON mode) — isolated from prompts and validation.
 * Uses native fetch; no extra npm dependencies.
 */

export type LlmProviderConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
};

export type LlmCallResult = { ok: true; text: string } | { ok: false; error: string };

const DEFAULT_BASE = "https://api.openai.com/v1";

export function getLlmProviderConfigFromEnv(): LlmProviderConfig | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim() || process.env.LLM_API_KEY?.trim();
  if (!apiKey) return null;
  const baseUrl = (process.env.OPENAI_BASE_URL?.trim() || process.env.LLM_BASE_URL?.trim() || DEFAULT_BASE).replace(
    /\/$/,
    ""
  );
  const model = process.env.LLM_MODEL?.trim() || "gpt-4o-mini";
  const temperature = Math.min(1, Math.max(0, Number(process.env.LLM_TEMPERATURE ?? "0.2") || 0.2));
  return { baseUrl, apiKey, model, temperature };
}

/**
 * Single-turn chat completion with response_format json_object.
 */
export async function callOpenAiCompatibleChatJson(
  config: LlmProviderConfig,
  system: string,
  user: string
): Promise<LlmCallResult> {
  const url = `${config.baseUrl}/chat/completions`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: config.temperature,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    const raw = await res.text();
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}: ${raw.slice(0, 500)}` };
    }
    const parsed = JSON.parse(raw) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = parsed.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) {
      return { ok: false, error: "Empty model content in response" };
    }
    return { ok: true, text: text.trim() };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
