// Sends every question in tests/questions.md to the local /api/ask and prints the answers.
// Usage: npm run dev   (in one terminal)
//        npm run questions   (in another)
// Override the endpoint with ASK_URL=https://your-app.vercel.app/api/ask
// Runs with Node's built-in TypeScript support (Node 22.18+ / 24), no extra tools.

import { readFileSync } from "node:fs";

const ASK_URL = process.env.ASK_URL || "http://localhost:3000/api/ask";
// Gemini free tier allows only a few requests per minute; space them out.
const DELAY_MS = Number(process.env.DELAY_MS || 6000);

// ONLY=3,14 runs just those question numbers.
const only = process.env.ONLY ? new Set(process.env.ONLY.split(",").map(Number)) : null;

const questions = readFileSync(new URL("../tests/questions.md", import.meta.url), "utf8")
  .split("\n")
  .map((line) => line.match(/^(\d+)\.\s+(.*?)\s*(<!--.*-->)?\s*$/))
  .filter((m): m is RegExpMatchArray => m !== null)
  .map((m) => ({ n: Number(m[1]), q: m[2], expect: (m[3] ?? "").replace(/<!--\s*expect:\s*|\s*-->/g, "") }))
  .filter(({ n }) => !only || only.has(n));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

console.log(`Sending ${questions.length} questions to ${ASK_URL}\n`);

for (const [i, { n, q, expect }] of questions.entries()) {
  console.log(`#${n}  Q: ${q}`);
  if (expect) console.log(`    expect: ${expect}`);
  try {
    const res = await fetch(ASK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q }),
    });
    const body = await res.json();
    if (res.ok) {
      console.log(`    A: ${body.answer}`);
      console.log(`    services_used: [${body.services_used.join(", ")}]  any_unverified: ${body.any_unverified}`);
    } else {
      console.log(`    HTTP ${res.status}: ${body.error}`);
    }
  } catch (err) {
    console.log(`    request failed: ${err instanceof Error ? err.message : err} (is "npm run dev" running?)`);
  }
  console.log();
  if (i < questions.length - 1) await sleep(DELAY_MS);
}
