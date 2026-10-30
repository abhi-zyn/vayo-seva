// Picks which knowledge-base entries go into the prompt.
// RETRIEVAL_MODE=all (default): every entry. Simple and best while the KB is small.
// RETRIEVAL_MODE=embed: top-3 entries by embedding similarity to the question.

import { getGenAI, MODELS } from "./gemini";
import { services, type Service } from "./services";

const TOP_K = 3;
const mode = process.env.RETRIEVAL_MODE === "embed" ? "embed" : "all";

export async function retrieve(question: string): Promise<Service[]> {
  if (mode === "all") return services;
  try {
    return await topByEmbedding(question);
  } catch (err) {
    // Embeddings are an optimisation; never fail a question because of them.
    console.error("[retrieve] embedding failed, falling back to all entries:", err);
    return services;
  }
}

function entryText(s: Service): string {
  return [s.name_en, s.name_ml, s.used_for, s.documents.join("; "), s.issued_by].join("\n");
}

async function embed(texts: string[], taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"): Promise<number[][]> {
  const res = await getGenAI().models.embedContent({
    model: MODELS.embed,
    contents: texts,
    config: { taskType },
  });
  const vectors = res.embeddings?.map((e) => e.values ?? []) ?? [];
  if (vectors.length !== texts.length) throw new Error("embedding count mismatch");
  return vectors;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

// Entry embeddings are computed once per server instance and reused.
// Started at module load ("startup"); reset on failure so the next request retries.
let entryVectors: Promise<number[][]> | null = null;
function getEntryVectors(): Promise<number[][]> {
  entryVectors ??= embed(services.map(entryText), "RETRIEVAL_DOCUMENT").catch((err) => {
    entryVectors = null;
    throw err;
  });
  return entryVectors;
}
if (mode === "embed" && process.env.GEMINI_API_KEY) getEntryVectors().catch(() => {});

async function topByEmbedding(question: string): Promise<Service[]> {
  const [docs, [q]] = await Promise.all([getEntryVectors(), embed([question], "RETRIEVAL_QUERY")]);
  return services
    .map((s, i) => ({ s, score: cosine(q, docs[i]) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K)
    .map((x) => x.s);
}
