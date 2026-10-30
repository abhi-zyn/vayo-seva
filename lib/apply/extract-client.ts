import { ML } from "../messages";
import type { Answer, FieldKind, Option } from "./types";

/** Asks the server to interpret one spoken answer. Throws an Error with a Malayalam message. */
export async function extractAnswer(input: {
  kind: FieldKind;
  label: string;
  question: string;
  options?: Option[];
  transcript: string;
}): Promise<Answer> {
  let res: Response;
  try {
    res = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    throw new Error(ML.networkError);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || !body || !("english_value" in body)) throw new Error(body?.error || ML.apiError);
  return body as Answer;
}
