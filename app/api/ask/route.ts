// POST /api/ask  { question } -> { answer, services_used, any_unverified, apply_service_id }
// Errors return { error } with a Malayalam message the UI can show and speak.

import { answerQuestion } from "@/lib/ask-core";
import { ML } from "@/lib/messages";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let question: unknown;
  try {
    ({ question } = await req.json());
  } catch {
    return Response.json({ error: ML.badRequest }, { status: 400 });
  }
  const out = await answerQuestion(question);
  return out.ok ? Response.json(out.result) : Response.json({ error: out.error }, { status: out.status });
}
