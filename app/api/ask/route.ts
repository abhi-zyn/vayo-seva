// POST /api/ask  { question } -> { answer, services_used, any_unverified }
// Errors return { error } with a Malayalam message the UI can show and speak.

import { createCache, normalizeQuestion } from "@/lib/cache";
import { classifyError, generateWithFallback } from "@/lib/gemini";
import { ML } from "@/lib/messages";
import { buildUserPrompt, RESPONSE_SCHEMA, SYSTEM_PROMPT } from "@/lib/prompt";
import { retrieve } from "@/lib/retrieve";
import { anyUnverified, services } from "@/lib/services";

export const runtime = "nodejs";

const MAX_CHARS = 500;

type AskResult = {
  answer: string;
  services_used: string[];
  any_unverified: boolean;
  /** Set when the user asked FOR a certificate: the UI opens /apply with it selected. */
  apply_service_id: string | null;
};
const cache = createCache<AskResult>(200);

const fail = (error: string, status: number) => Response.json({ error }, { status });

export async function POST(req: Request) {
  let question: unknown;
  try {
    ({ question } = await req.json());
  } catch {
    return fail(ML.badRequest, 400);
  }
  if (typeof question !== "string") return fail(ML.badRequest, 400);
  const q = question.trim();
  if (!q) return fail(ML.emptyQuestion, 400);
  if (q.length > MAX_CHARS) return fail(ML.tooLong, 400);

  const key = normalizeQuestion(q);
  const hit = cache.get(key);
  if (hit) return Response.json(hit);

  try {
    const entries = await retrieve(q);
    const res = await generateWithFallback({
      contents: buildUserPrompt(q, entries),
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.2, // factual answers, little creativity
        responseMimeType: "application/json",
        responseJsonSchema: RESPONSE_SCHEMA,
      },
    });

    const parsed = JSON.parse(res.text ?? "{}") as { answer?: unknown; services_used?: unknown; apply_service_id?: unknown };
    if (typeof parsed.answer !== "string" || !parsed.answer.trim()) throw new Error("model returned no answer");

    // Trust only ids that exist, so the unverified flag can't be dodged by a typo.
    const ids = Array.isArray(parsed.services_used) ? parsed.services_used.filter((x) => typeof x === "string") : [];
    const used = services.filter((s) => ids.includes(s.id));
    const result: AskResult = {
      // Fixed sentences are added in code so they're there whichever model replied.
      answer: [
        cleanForSpeech(parsed.answer),
        used.some((s) => s.accepted_documents.length === 0) ? ML.listNotPublished : "",
        ML.confirmClosing,
      ]
        .filter(Boolean)
        .join(" "),
      services_used: used.map((s) => s.id),
      any_unverified: anyUnverified(used),
      apply_service_id: services.some((s) => s.id === parsed.apply_service_id) ? (parsed.apply_service_id as string) : null,
    };
    cache.set(key, result);
    return Response.json(result);
  } catch (err) {
    const kind = classifyError(err);
    console.error(`[ask] ${kind}:`, err);
    if (kind === "rate_limit") return fail(ML.rateLimit, 429);
    return fail(ML.apiError, kind === "config" ? 500 : 502);
  }
}

/** Belt and braces: strip markdown/symbols the prompt forbids, since TTS would read them aloud. */
function cleanForSpeech(text: string): string {
  return text
    .replace(/[*_#`>|~]/g, "")
    .replace(/^\s*[-•\d]+[.)]?\s+/gm, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\s*\n+\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}
