import { ML } from "./messages";

export type AskResponse = {
  answer: string;
  services_used: string[];
  any_unverified: boolean;
  /** The user asked FOR this certificate: open the application for it. */
  apply_service_id: string | null;
};

/** The request never reached the server (no internet). The UI shows the offline state. */
export class OfflineError extends Error {
  constructor() {
    super(ML.networkError);
  }
}

/**
 * Calls /api/ask. Resolves to the answer, or throws: OfflineError when there's
 * no connection, an AbortError when cancelled, otherwise an Error whose message
 * is Malayalam and user-ready.
 */
export async function askQuestion(question: string, signal?: AbortSignal): Promise<AskResponse> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) throw new OfflineError();
  let res: Response;
  try {
    res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new OfflineError();
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || !body || typeof body.answer !== "string") {
    throw new Error(body?.error || ML.apiError);
  }
  return body as AskResponse;
}
