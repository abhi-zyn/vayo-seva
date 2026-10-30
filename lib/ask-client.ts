import { ML } from "./messages";

export type AskResponse = { answer: string; services_used: string[]; any_unverified: boolean };

/** Calls /api/ask. Resolves to the answer, or throws an Error whose message is Malayalam and user-ready. */
export async function askQuestion(question: string): Promise<AskResponse> {
  let res: Response;
  try {
    res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
  } catch {
    throw new Error(ML.networkError);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || !body || typeof body.answer !== "string") {
    throw new Error(body?.error || ML.apiError);
  }
  return body as AskResponse;
}
