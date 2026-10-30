// POST /api/razorpay/webhook  (set this URL in Razorpay → Webhooks; events:
// payment.captured, order.paid). Marks a payment paid even if the user closed
// the app before the success screen. Verified with RAZORPAY_WEBHOOK_SECRET.

import { verifyWebhookSignature } from "@/lib/razorpay";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const raw = await req.text(); // the signature covers the exact raw body
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature") ?? "")) {
    return new Response("bad signature", { status: 400 });
  }

  let event: { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string } } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("bad json", { status: 400 });
  }
  if (event.event !== "payment.captured" && event.event !== "order.paid") return new Response("ignored");

  const payment = event.payload?.payment?.entity;
  if (!payment?.order_id || !payment.id) return new Response("no payment");

  try {
    const db = supabaseAdmin();
    const { data: pay } = await db
      .from("payments")
      .update({ status: "paid", razorpay_payment_id: payment.id, paid_at: new Date().toISOString() })
      .eq("razorpay_order_id", payment.order_id)
      .neq("status", "paid")
      .select("application_id")
      .maybeSingle();
    if (pay) {
      await db.from("applications").update({ status: "paid" }).eq("id", pay.application_id).eq("status", "pending_payment");
    }
    return new Response("ok");
  } catch (err) {
    console.error("[webhook] update failed:", err);
    return new Response("error", { status: 500 }); // Razorpay retries
  }
}
