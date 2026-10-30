// POST /api/submit  { application, documents? } -> { ref, channel }
// Hands a finished interview (and its scanned PDFs) to the operator via lib/delivery.ts.

import type { Application } from "@/lib/apply/summary";
import { deliverApplication, type SubmittedDoc } from "@/lib/delivery";
import { ML } from "@/lib/messages";
import { services } from "@/lib/services";

export const runtime = "nodejs";

// Vercel functions accept ~4.5 MB bodies. Pages are ≤100 KB each, so this fits
// a few documents of several pages; base64 adds a third.
const MAX_BYTES = 4_000_000;
const MAX_DOCS = 10;

export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > MAX_BYTES) return Response.json({ error: ML.badRequest }, { status: 413 });

  let app: Application;
  let documents: unknown;
  try {
    ({ application: app, documents } = JSON.parse(text));
  } catch {
    return Response.json({ error: ML.badRequest }, { status: 400 });
  }
  const known = app && services.some((s) => s.id === app.service_id);
  if (!known || typeof app.applicant !== "object" || app.applicant === null) {
    return Response.json({ error: ML.badRequest }, { status: 400 });
  }
  const docs = parseDocs(documents);
  if (!docs) return Response.json({ error: ML.badRequest }, { status: 400 });

  try {
    return Response.json(await deliverApplication(app, docs));
  } catch (err) {
    console.error("[submit] delivery failed:", err);
    // While developing, say WHY (e.g. a missing setting); users in production only get the friendly line.
    const detail = process.env.NODE_ENV !== "production" && err instanceof Error ? ` (${err.message})` : "";
    return Response.json({ error: ML.apiError + detail }, { status: 502 });
  }
}

function parseDocs(raw: unknown): SubmittedDoc[] | null {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.length > MAX_DOCS) return null;
  const ok = raw.every(
    (d) =>
      d &&
      typeof d.name === "string" &&
      d.name.length <= 200 &&
      typeof d.pages === "number" &&
      (d.pdf_base64 === null || (typeof d.pdf_base64 === "string" && /^[A-Za-z0-9+/=]*$/.test(d.pdf_base64))),
  );
  return ok ? (raw as SubmittedDoc[]) : null;
}
