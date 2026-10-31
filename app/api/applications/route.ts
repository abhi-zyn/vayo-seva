// POST /api/applications  { application } -> { application_id, ref, payment }
// Saves a finished interview for the signed-in user and, when payments are on,
// creates the Razorpay order for that certificate's service fee. The amount
// always comes from data/services.json on the server, never from the browser.

import type { Application } from "@/lib/apply/summary";
import { makeRef } from "@/lib/delivery";
import { ML } from "@/lib/messages";
import { assertRazorpayConfig, createOrder, paymentsEnabled, razorpayKeyId } from "@/lib/razorpay";
import { services } from "@/lib/services";
import { authEnabled } from "@/lib/supabase/config";
import { currentUser, supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_BYTES = 40_000;

export async function POST(req: Request) {
  if (!authEnabled) return Response.json({ error: "Accounts are not set up" }, { status: 404 });
  const user = await currentUser();
  if (!user) return Response.json({ error: ML.loginNeeded }, { status: 401 });

  const text = await req.text();
  if (text.length > MAX_BYTES) return Response.json({ error: ML.badRequest }, { status: 413 });
  let app: Application;
  try {
    ({ application: app } = JSON.parse(text));
  } catch {
    return Response.json({ error: ML.badRequest }, { status: 400 });
  }
  const service = services.find((s) => s.id === app?.service_id);
  if (!service || typeof app.applicant !== "object" || app.applicant === null) {
    return Response.json({ error: ML.badRequest }, { status: 400 });
  }

  try {
    // Check the keys before saving, so a setup mistake doesn't leave a
    // "pending_payment" row behind on every retry.
    if (paymentsEnabled) assertRazorpayConfig();
    const db = supabaseAdmin();
    const ref = makeRef();
    const fee = paymentsEnabled ? service.service_fee_inr : 0;
    const { data: row, error } = await db
      .from("applications")
      .insert({
        user_id: user.id,
        ref,
        service_id: service.id,
        service_name: service.edistrict_name,
        // Without payments there's nothing to wait for.
        status: paymentsEnabled ? "pending_payment" : "paid",
        fee_inr: fee,
        data: app,
      })
      .select("id")
      .single();
    if (error) throw error;

    if (!paymentsEnabled) return Response.json({ application_id: row.id, ref, payment: null });

    const order = await createOrder(fee * 100, ref, { application_id: row.id, ref });
    const { error: payErr } = await db.from("payments").insert({
      application_id: row.id,
      user_id: user.id,
      razorpay_order_id: order.id,
      amount_paise: order.amount,
    });
    if (payErr) throw payErr;

    return Response.json({
      application_id: row.id,
      ref,
      payment: {
        key_id: razorpayKeyId,
        order_id: order.id,
        amount_paise: order.amount,
        fee_inr: fee,
        // Prefill Checkout so seniors type less.
        name: (user.user_metadata?.full_name as string | undefined) ?? "",
        email: user.email ?? "",
        contact: app.applicant.mobile ?? "",
      },
    });
  } catch (err) {
    console.error("[applications] create failed:", err);
    const detail = process.env.NODE_ENV !== "production" && err instanceof Error ? ` (${err.message})` : "";
    return Response.json({ error: ML.apiError + detail }, { status: 502 });
  }
}
