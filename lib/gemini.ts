// Server-only Gemini client. Never import this from a "use client" file:
// it reads GEMINI_API_KEY, which must not reach the browser.

import { ApiError, GoogleGenAI } from "@google/genai";

// Defaults checked against a new free-tier key on 2026-10-30: gemini-2.5-flash
// is closed to new keys, the 3.6+ flash models were timing out (504), and
// gemini-3.5-flash allows only 20 requests/day on the free tier. Lite models
// are the main ones (for answers and voice) so a demo isn't capped; the full
// models are kept only as fallbacks.
export const MODELS = {
  chat: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
  tts: process.env.GEMINI_TTS_MODEL || "gemini-3.8-flash-lite-tts",
  // Not gemini-embedding-2: it merges a list of inputs into a single vector.
  embed: process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001",
};

const list = (v: string) =>
  v
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

// Tried in order when the main model is overloaded (503), rate-limited (429) or
// times out. Free-tier quotas are per model, so a fallback often still has room.
export const CHAT_FALLBACKS = list(process.env.GEMINI_FALLBACK_MODELS || "gemini-3.1-flash-lite,gemini-3.5-flash");
export const TTS_FALLBACKS = list(process.env.GEMINI_TTS_FALLBACK_MODELS || "gemini-3.8-flash-tts");

export const CHAT_CHAIN = [MODELS.chat, ...CHAT_FALLBACKS.filter((m) => m !== MODELS.chat)];
export const TTS_CHAIN = [MODELS.tts, ...TTS_FALLBACKS.filter((m) => m !== MODELS.tts)];

// A stuck model should fail fast with the friendly message, not hang the user.
const TIMEOUT_MS = 30_000;

export class MissingKeyError extends Error {
  constructor() {
    super("GEMINI_API_KEY is not set. Add it to .env.local (local) or the Vercel project settings.");
  }
}

let client: GoogleGenAI | null = null;

export function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new MissingKeyError();
  client ??= new GoogleGenAI({ apiKey, httpOptions: { timeout: TIMEOUT_MS } });
  return client;
}

/** True for errors worth retrying on another model: overload, rate limit, timeout, or a retired model name. */
function isTransient(err: unknown): boolean {
  // 404 = the model id no longer exists (model names change often). Try the next one.
  if (err instanceof ApiError) return [404, 429, 500, 503, 504].includes(err.status);
  // The SDK's client-side timeout surfaces as an AbortError.
  return err instanceof Error && (err.name === "AbortError" || /abort|timeout/i.test(err.message));
}

type GenerateParams = Parameters<GoogleGenAI["models"]["generateContent"]>[0];

/** generateContent on the first model of `models`, moving down the list on transient errors. */
export async function generateWithFallback(params: Omit<GenerateParams, "model">, models: string[] = CHAT_CHAIN) {
  let lastErr: unknown;
  for (const model of models) {
    try {
      return await getGenAI().models.generateContent({ ...params, model });
    } catch (err) {
      lastErr = err;
      if (!isTransient(err)) throw err;
      console.warn(`[gemini] ${model} unavailable (${err instanceof ApiError ? err.status : "timeout"}), trying next`);
    }
  }
  throw lastErr;
}

/** Buckets an error from a Gemini call so routes can pick a friendly message and HTTP status. */
export function classifyError(err: unknown): "rate_limit" | "config" | "other" {
  if (err instanceof MissingKeyError) return "config";
  if (err instanceof ApiError) {
    // Rate limit and "model overloaded" both mean: busy, try again in a minute.
    if (err.status === 429 || err.status === 503) return "rate_limit";
    // Bad key or unknown model name: a setup problem, not the user's fault.
    if (err.status === 400 || err.status === 401 || err.status === 403 || err.status === 404) return "config";
  }
  return "other";
}
