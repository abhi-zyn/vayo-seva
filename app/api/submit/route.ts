// POST /api/submit  { application } -> { ref, channel }
// Hands a finished interview to the operator via lib/delivery.ts.

import type { Application } from "@/lib/apply/summary";
import { deliverApplication } from "@/lib/delivery";
import { ML } from "@/lib/messages";
import { services } from "@/lib/services";

export const runtime = "nodejs";

const MAX_BYTES = 30_000;

export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > MAX_BYTES) return Response.json({ error: ML.badRequest }, { status: 413 });

  let app: Application;
  try {
    ({ application: app } = JSON.parse(text));
  } catch {
    return Response.json({ error: ML.badRequest }, { status: 400 });
  }
  const known = app && services.some((s) => s.id === app.service_id);
  if (!known || typeof app.applicant !== "object" || app.applicant === null) {
    return Response.json({ error: ML.badRequest }, { status: 400 });
  }

  try {
    return Response.json(await deliverApplication(app));
  } catch (err) {
    console.error("[submit] delivery failed:", err);
    return Response.json({ error: ML.apiError }, { status: 502 });
  }
}
