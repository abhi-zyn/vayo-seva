// POST /api/submit -> { ref, channel }
// With accounts on:  { application_id, razorpay_order_id?, razorpay_payment_id?, razorpay_signature?, documents }
//   1. the application must belong to the signed-in user;
//   2. if payments are on, the Razorpay signature is verified (unless already paid);
//   3. the saved answers are emailed to the operator with the PDFs;
//   4. ID numbers in the stored answers are masked to the last 4 digits.
// With accounts off (demo): { application, documents }, emailed directly as before.

import type { Application } from "@/lib/apply/summary";
import { deliverApplication, maskForLogs, type SubmittedDoc } from "@/lib/delivery";
import { ML } from "@/lib/messages";
import { paymentsEnabled, verifyPaymentSignature } from "@/lib/razorpay";
import { services } from "@/lib/services";
import { authEnabled } from "@/lib/supabase/config";
import { currentUser, supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Vercel functions accept ~4.5 MB bodies. Pages are ≤100 KB each, so this fits
// a few documents of several pages; base64 adds a third.
const MAX_BYTES = 4_000_000;
const MAX_DOCS = 10;

type Body = {
  application?: Application;
  application_id?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  documents?: unknown;
};

const fail = (error: string, status: number) => Response.json({ error }, { status });
/** While developing, say WHY; users in production only get the friendly line. */
const why = (err: unknown) => (process.env.NODE_ENV !== "production" && err instanceof Error ? ` (${err.message})` : "");

export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > MAX_BYTES) return fail(ML.badRequest, 413);
  let body: Body;
  try {
    body = JSON.parse(text);
  } catch {
    return fail(ML.badRequest, 400);
  }
  const docs = parseDocs(body.documents);
  if (!docs) return fail(ML.badRequest, 400);

  return authEnabled ? submitSaved(body, docs) : submitDemo(body, docs);
}

async function submitSaved(body: Body, docs: SubmittedDoc[]) {
  const user = await currentUser();
  if (!user) return fail(ML.loginNeeded, 401);
  if (typeof body.application_id !== "string") return fail(ML.badRequest, 400);

  const db = supabaseAdmin();
  const { data: row } = await db
    .from("applications")
    .select("id, ref, status, data")
    .eq("id", body.application_id)
    .eq("user_id", user.id) // only your own application
    .maybeSingle();
  if (!row) return fail(ML.badRequest, 404);
  if (row.status === "sent") return Response.json({ ref: row.ref, channel: "already-sent" }); // safe to retry

  // Payment: verify Razorpay's signature unless the webhook already marked it paid.
  if (paymentsEnabled && row.status !== "paid") {
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: sig } = body;
    const { data: pay } = await db
      .from("payments")
      .select("id")
      .eq("application_id", row.id)
      .eq("razorpay_order_id", orderId ?? "")
      .maybeSingle();
    if (!pay || !orderId || !paymentId || !sig || !verifyPaymentSignature(orderId, paymentId, sig)) {
      console.error(`[submit] ${row.ref}: payment not verified`);
      return fail(ML.paymentNotVerified, 402);
    }
    const now = new Date().toISOString();
    await db.from("payments").update({ status: "paid", razorpay_payment_id: paymentId, paid_at: now }).eq("id", pay.id);
    await db.from("applications").update({ status: "paid" }).eq("id", row.id);
  }

  try {
    const result = await deliverApplication(row.data as Application, docs, row.ref);
    // Sent: keep the record for "My applications", but only the last 4 digits of IDs.
    await db
      .from("applications")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        data: maskForLogs(row.data as Application),
        documents: docs.map((d) => ({ name: d.name, pages: d.pages, provided: Boolean(d.pdf_base64) })),
      })
      .eq("id", row.id);
    return Response.json(result);
  } catch (err) {
    // Paid but not delivered: status stays "paid", so pressing send again retries without paying twice.
    console.error(`[submit] ${row.ref}: delivery failed:`, err);
    return fail(ML.apiError + why(err), 502);
  }
}

async function submitDemo(body: Body, docs: SubmittedDoc[]) {
  const app = body.application;
  const known = app && services.some((s) => s.id === app.service_id);
  if (!known || typeof app.applicant !== "object" || app.applicant === null) return fail(ML.badRequest, 400);
  try {
    return Response.json(await deliverApplication(app, docs));
  } catch (err) {
    console.error("[submit] delivery failed:", err);
    return fail(ML.apiError + why(err), 502);
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
