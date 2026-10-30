"use client";

// Opens Razorpay Checkout (UPI, cards, netbanking) for an order the server
// created. The result is NOT trusted here: the server verifies the signature.

/** The key id is public by design; with it set, the UI shows fees and "pay & send". */
export const paymentsOnClient = Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);

export interface PaymentInfo {
  key_id: string;
  order_id: string;
  amount_paise: number;
  fee_inr: number;
  name: string;
  email: string;
  contact: string;
}

export interface PaymentProof {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/** The user closed Checkout without paying (not an error). */
export class PaymentCancelled extends Error {}

type Checkout = { open(): void; on(event: string, fn: (r: { error?: { description?: string } }) => void): void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => Checkout;
  }
}

function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((ok, fail) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => ok();
    s.onerror = () => fail(new Error("Could not load Razorpay Checkout"));
    document.head.appendChild(s);
  });
}

export async function payWithRazorpay(p: PaymentInfo, description: string): Promise<PaymentProof> {
  await loadCheckout();
  return new Promise((ok, fail) => {
    let settled = false;
    const rzp = new window.Razorpay!({
      key: p.key_id,
      order_id: p.order_id,
      amount: p.amount_paise,
      currency: "INR",
      name: "VayoSeva",
      description,
      prefill: { name: p.name, email: p.email, contact: p.contact },
      theme: { color: "#1F5E60" },
      handler: (r: PaymentProof) => {
        settled = true;
        ok(r);
      },
      modal: {
        ondismiss: () => {
          if (!settled) fail(new PaymentCancelled());
        },
      },
    });
    rzp.on("payment.failed", (r) => {
      settled = true;
      fail(new Error(r.error?.description || "Payment failed"));
    });
    rzp.open();
  });
}
