// POST /api/extract  { kind, label, question, options?, transcript }
//   -> { field, malayalam_raw, english_value, confidence, note_for_operator, items? }
// Interprets ONE spoken interview answer. Flow control stays in the browser.

import type { Answer, FieldKind, IncomeItem, Option } from "@/lib/apply/types";
import { EXTRACT_SCHEMA, EXTRACT_SYSTEM } from "@/lib/apply/extract-prompt";
import { createCache, normalizeQuestion } from "@/lib/cache";
import { classifyError, generateWithFallback } from "@/lib/gemini";
import { ML } from "@/lib/messages";

export const runtime = "nodejs";

const MODEL_KINDS: FieldKind[] = ["choice", "yesno", "name", "place", "translate", "income", "digits", "date", "typed"];
const SOURCES = ["salary", "pension", "agriculture", "daily wages", "business", "rent", "abroad", "other"];
const cache = createCache<Answer>(500);
const fail = (error: string, status: number) => Response.json({ error }, { status });

type Body = { kind?: unknown; label?: unknown; question?: unknown; options?: unknown; transcript?: unknown };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return fail(ML.badRequest, 400);
  }
  const { kind, label, question, transcript } = body;
  if (typeof kind !== "string" || !MODEL_KINDS.includes(kind as FieldKind)) return fail(ML.badRequest, 400);
  if (typeof label !== "string" || label.length > 100) return fail(ML.badRequest, 400);
  if (typeof question !== "string" || question.length > 300) return fail(ML.badRequest, 400);
  if (typeof transcript !== "string" || !transcript.trim()) return fail(ML.emptyQuestion, 400);
  if (transcript.length > 300) return fail(ML.tooLong, 400);
  const options = parseOptions(body.options);
  if (options === undefined) return fail(ML.badRequest, 400);

  // Typed in English letters (a family member helping): no model needed.
  if ((kind === "name" || kind === "place") && /^[A-Za-z .'-]+$/.test(transcript.trim())) {
    const v = cleanName(transcript);
    return Response.json({ field: label, malayalam_raw: "", english_value: v || null, confidence: v ? 1 : 0, note_for_operator: "" });
  }
  // Speech recognition often returns numerals already ("9876 543 210"): no model needed.
  const numeral = numeralFastPath(kind as FieldKind, transcript);
  if (numeral) return Response.json({ field: label, malayalam_raw: transcript.trim(), english_value: numeral, confidence: 1, note_for_operator: "" });

  // The field label is part of the key: the same spoken word means different
  // things for different questions (e.g. "മകൻ" for relation vs occupation).
  const key = `${kind}|${label}|${options.map((o) => o.value).join(",")}|${normalizeQuestion(transcript)}`;
  const hit = cache.get(key);
  if (hit) return Response.json({ ...hit, field: label });

  try {
    const res = await generateWithFallback({
      contents: JSON.stringify({ field: label, kind, question_asked: question, options, answer: transcript.trim() }),
      config: {
        systemInstruction: EXTRACT_SYSTEM,
        temperature: 0,
        responseMimeType: "application/json",
        responseJsonSchema: EXTRACT_SCHEMA,
      },
    });
    const out = clean(kind as FieldKind, options, JSON.parse(res.text ?? "{}"), label);
    cache.set(key, out);
    return Response.json(out);
  } catch (err) {
    const k = classifyError(err);
    console.error(`[extract] ${k}:`, err);
    return fail(k === "rate_limit" ? ML.rateLimit : ML.apiError, k === "rate_limit" ? 429 : 502);
  }
}

/** undefined = invalid input; [] = no options. */
function parseOptions(raw: unknown): Option[] | undefined {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.length > 20) return undefined;
  const ok = raw.every(
    // ml can be a longer description (e.g. the list of services the app can't do).
    (o) => o && typeof o.value === "string" && typeof o.ml === "string" && o.value.length <= 60 && o.ml.length <= 200,
  );
  return ok ? (raw as Option[]).map(({ value, ml }) => ({ value, ml })) : undefined;
}

/** Digits-only answers (and dd mm yyyy dates) given as numerals, or null if words are involved. */
function numeralFastPath(kind: FieldKind, t: string): string | null {
  const s = t.trim();
  if (kind === "digits" && /^[\d\s-]+$/.test(s)) return s.replace(/\D/g, "") || null;
  if (kind === "date") {
    const m = s.match(/^(\d{1,2})[\s/.-]+(\d{1,2})[\s/.-]+(\d{4})$/) ?? s.replace(/\s/g, "").match(/^(\d{2})(\d{2})(\d{4})$/);
    if (m) return `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}/${m[3]}`;
  }
  return null;
}

const cleanName = (v: string) =>
  v
    .toUpperCase()
    .replace(/\./g, " ")
    .replace(/[^A-Z '-]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Never trust the model's shape: enforce the rules for each kind in code. */
function clean(kind: FieldKind, options: Option[], o: Record<string, unknown>, label: string): Answer {
  let value = typeof o.english_value === "string" && o.english_value.trim() ? o.english_value.trim() : null;
  let confidence = typeof o.confidence === "number" ? Math.min(1, Math.max(0, o.confidence)) : 0;
  const note = typeof o.note_for_operator === "string" ? o.note_for_operator.slice(0, 200) : "";
  let items: IncomeItem[] | undefined;

  if (kind === "name" || kind === "place") value = value ? cleanName(value) || null : null;
  if (kind === "digits") value = value ? value.replace(/\D/g, "") || null : null;
  if (kind === "date" && value && !/^\d{2}\/\d{2}\/\d{4}$/.test(value)) value = null;
  if (kind === "typed" && value) value = value.replace(/\s+/g, value.includes("@") ? "" : " ").trim().slice(0, 80) || null;
  if (kind === "choice" || kind === "yesno") {
    if (value && !options.some((op) => op.value === value)) {
      value = null;
      confidence = Math.min(confidence, 0.3);
    }
  }
  if (kind === "income") {
    items = (Array.isArray(o.items) ? o.items : [])
      .filter((i) => i && typeof i.amount === "number" && i.amount > 0)
      .map((i) => ({
        source: SOURCES.includes(i.source) ? i.source : "other",
        amount: Math.round(i.amount),
        period: i.period === "month" ? "month" : "year",
      }));
    if (!items.length) value = null;
  }

  return {
    field: label,
    malayalam_raw: typeof o.malayalam_raw === "string" ? o.malayalam_raw.slice(0, 200) : "",
    english_value: value,
    confidence,
    note_for_operator: note,
    ...(items ? { items } : {}),
  };
}
