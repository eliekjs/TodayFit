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

export type LlmCallResult = { ok: true; text: string } | { ok: false; error: string; httpStatus?: number };

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

export function getLlmMaxRetriesFromEnv(): number {
  const v = process.env.LLM_MAX_RETRIES?.trim();
  if (!v) return 5;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : 5;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function backoffMs(attempt: number): number {
  const base = 1000 * 2 ** attempt;
  const cap = 60_000;
  const jitter = Math.floor(Math.random() * 250);
  return Math.min(cap, base) + jitter;
}

function shouldRetryHttp(status: number): boolean {
  if (status === 429) return true;
  return status >= 500 && status <= 599;
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
      return { ok: false, error: `HTTP ${res.status}: ${raw.slice(0, 500)}`, httpStatus: res.status };
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

export type LlmRetryLogReason = "rate_limit" | "server_error" | "network";

/**
 * Retries on HTTP 429 and 5xx after exponential backoff. LLM_MAX_RETRIES = max attempts total (initial try + retries).
 */
export async function callOpenAiCompatibleChatJsonWithRetry(
  config: LlmProviderConfig,
  system: string,
  user: string,
  maxRetries: number
): Promise<LlmCallResult> {
  const attempts = Math.max(1, maxRetries + 1);
  let last: LlmCallResult = { ok: false, error: "No attempts" };

  for (let attempt = 0; attempt < attempts; attempt++) {
    const res = await callOpenAiCompatibleChatJson(config, system, user);
    last = res;
    if (res.ok) return res;

    const status = res.httpStatus;
    const isLast = attempt >= attempts - 1;
    const canRetry = !isLast && status !== undefined && shouldRetryHttp(status);

    if (!canRetry) return res;

    const delay = backoffMs(attempt);
    if (status === 429) {
      console.warn(
        `[llm] Rate limited (HTTP 429). Retry ${attempt + 1}/${attempts - 1} after ${delay}ms.`
      );
    } else {
      console.warn(
        `[llm] Transient server error (HTTP ${status}). Retry ${attempt + 1}/${attempts - 1} after ${delay}ms.`
      );
    }
    await sleep(delay);
  }

  return last;
}
