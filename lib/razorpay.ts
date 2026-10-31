// Razorpay (server only). No SDK: two REST calls and HMAC checks.
// Payments are on when RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set.

import { createHmac, timingSafeEqual } from "node:crypto";

const KEY_ID = process.env.RAZORPAY_KEY_ID ?? "";
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? "";

export const paymentsEnabled = Boolean(KEY_ID && KEY_SECRET);
/** Public key id, sent to the browser to open Checkout. */
export const razorpayKeyId = KEY_ID;

/**
 * Catches the common copy-paste mistake of putting the Supabase service-role
 * key (sb_secret_…) into RAZORPAY_KEY_SECRET. Razorpay then answers 401 and the
 * user only sees a generic "try again", so fail with a clear setup message.
 */
export function assertRazorpayConfig(): void {
  if (!KEY_ID || !KEY_SECRET) throw new Error("Razorpay is not configured: set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET");
  if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
    throw new Error("NEXT_PUBLIC_RAZORPAY_KEY_ID is not set (use the same value as RAZORPAY_KEY_ID)");
  }
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (KEY_SECRET.startsWith("sb_secret_") || (serviceRole && KEY_SECRET === serviceRole)) {
    throw new Error("RAZORPAY_KEY_SECRET is a Supabase secret key, not the Razorpay Key Secret");
  }
}

export async function createOrder(amountPaise: number, receipt: string, notes: Record<string, string>) {
  assertRazorpayConfig();
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt, notes }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Razorpay order failed: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as { id: string; amount: number; currency: string };
}

const sameHex = (a: string, b: string) => {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
};

/** Checkout's success callback: signature = HMAC_SHA256(order_id|payment_id, key_secret). */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  if (!/^[0-9a-f]+$/i.test(signature)) return false;
  const expected = createHmac("sha256", KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
  return sameHex(expected, signature);
}

/** Webhooks: signature = HMAC_SHA256(raw body, webhook secret). */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";
  if (!secret || !/^[0-9a-f]+$/i.test(signature)) return false;
  return sameHex(createHmac("sha256", secret).update(rawBody).digest("hex"), signature);
}
