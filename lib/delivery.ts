// Sends a finished application to the Akshaya operator.
// DELIVERY_MODE=dummy (default): logs a masked copy on the server and returns a reference.
// DELIVERY_MODE=resend: emails the operator via Resend, with the scanned PDFs attached.

import type { Application } from "./apply/summary";

export interface DeliveryResult {
  ref: string;
  channel: "dummy" | "resend";
}

/** A scanned document as sent by the app: a PDF (base64), or null if skipped. */
export interface SubmittedDoc {
  name: string;
  pages: number;
  bytes: number;
  pdf_base64: string | null;
}

export async function deliverApplication(app: Application, docs: SubmittedDoc[] = [], ref = makeRef()): Promise<DeliveryResult> {
  const mode = process.env.DELIVERY_MODE || "dummy";
  if (mode === "resend") {
    await sendWithResend(app, ref, docs);
    return { ref, channel: "resend" };
  }
  // Dummy: nothing leaves the server and nothing is stored. Mask IDs, and log
  // only document names and sizes (never their contents).
  console.log(`[delivery:dummy] ${ref}`, JSON.stringify(maskForLogs(app), null, 2));
  for (const d of docs) {
    const size = d.pdf_base64 ? Math.round((d.pdf_base64.length * 3) / 4 / 1024) : 0;
    console.log(`[delivery:dummy] ${ref} document: ${d.name} — ${d.pdf_base64 ? `${d.pages} page(s), ${size} KB PDF` : "skipped"}`);
  }
  return { ref, channel: "dummy" };
}

/** Short reference the family can read out to the operator, e.g. "AKS-261031-4827". */
export function makeRef(): string {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `AKS-${ymd}-${Math.floor(1000 + Math.random() * 9000)}`;
}

const SENSITIVE = ["aadhaar", "ration_card", "mobile", "voter_id", "email"];

export function maskForLogs(app: Application): Application {
  const applicant = { ...app.applicant };
  for (const k of SENSITIVE) {
    const v = applicant[k];
    if (v) applicant[k] = `${"x".repeat(Math.max(0, v.length - 4))}${v.slice(-4)}`;
  }
  return { ...app, applicant };
}

// --- Resend (https://resend.com) ------------------------------------------------
// Env: RESEND_API_KEY, OPERATOR_EMAIL (comma-separated for several),
//      DELIVERY_FROM (default Resend's test sender, which can only mail your own
//      Resend account address until you verify a domain).
// This email carries full Aadhaar and phone numbers: send only to operators.

const RESEND_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "VayoSeva <onboarding@resend.dev>";
const TIMEOUT_MS = 20_000;

/** Fails fast with a setup message if a variable is missing. */
function resendConfig() {
  const key = process.env.RESEND_API_KEY;
  const to = (process.env.OPERATOR_EMAIL ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!key) throw new Error("DELIVERY_MODE=resend but RESEND_API_KEY is not set");
  if (!to.length) throw new Error("DELIVERY_MODE=resend but OPERATOR_EMAIL is not set");
  return { key, to, from: process.env.DELIVERY_FROM || DEFAULT_FROM };
}

/** The request body for Resend; exported so it can be checked without sending. */
export function buildEmail(app: Application, ref: string, docs: SubmittedDoc[], from: string, to: string[]) {
  const name = app.applicant.full_name ?? "Applicant";
  const files = docs.filter((d) => d.pdf_base64);
  return {
    from,
    to,
    subject: `e-District application ${ref}: ${app.service} — ${name}`,
    html: emailHtml(app, ref, docs),
    text: emailText(app, ref, docs),
    attachments: [
      ...files.map((d, i) => ({ filename: `${ref}-${i + 1}-${slug(d.name)}.pdf`, content: d.pdf_base64! })),
      // The full answers as JSON, for copying or future automation.
      { filename: `${ref}-application.json`, content: Buffer.from(JSON.stringify({ ref, ...app }, null, 2)).toString("base64") },
    ],
    tags: [{ name: "app", value: "vayoseva" }],
  };
}

async function sendWithResend(app: Application, ref: string, docs: SubmittedDoc[]): Promise<void> {
  const { key, to, from } = resendConfig();
  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      // A retried submit with the same reference won't send a second email.
      "Idempotency-Key": ref,
    },
    body: JSON.stringify(buildEmail(app, ref, docs, from, to)),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    // Resend explains failures (bad key, unverified sender, …) in the body; log it, not the email.
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend failed: HTTP ${res.status} ${detail.slice(0, 300)}`);
  }
  const { id } = (await res.json().catch(() => ({}))) as { id?: string };
  console.log(`[delivery:resend] ${ref} sent to ${to.length} operator(s), ${docs.filter((d) => d.pdf_base64).length} PDF(s), id ${id ?? "?"}`);
}

// --- email body -------------------------------------------------------------------

const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 40) || "document";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const label = (k: string) => k.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

function show(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) {
    return v.map((x) => (typeof x === "object" && x ? Object.entries(x).map(([k, y]) => `${label(k)}: ${y ?? "—"}`).join(", ") : String(x))).join("; ");
  }
  return String(v);
}

function rows(data: Record<string, unknown>): string {
  return Object.entries(data)
    .map(([k, v]) => `<tr><td style="padding:6px 12px;color:#4A5670">${esc(label(k))}</td><td style="padding:6px 12px;font-weight:600">${esc(show(v))}</td></tr>`)
    .join("");
}

function emailHtml(app: Application, ref: string, docs: SubmittedDoc[]): string {
  const docRows = docs.length
    ? docs.map((d) => `<li>${esc(d.name)}: ${d.pdf_base64 ? `attached, ${d.pages} page(s)` : "<b>not provided</b>"}</li>`).join("")
    : "<li>No documents were scanned.</li>";
  const missing = app.missing_or_unsure.length
    ? `<h3 style="color:#A54A3D">Missing or unsure</h3><ul>${app.missing_or_unsure.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>`
    : "";
  return `<div style="font-family:Arial,sans-serif;color:#1D2C49;max-width:680px">
<h2 style="margin:0 0 4px">New e-District application · ${esc(ref)}</h2>
<p style="margin:0 0 16px">Service on e-District: <b>${esc(app.service)}</b>. Collected by voice through VayoSeva (അക്ഷയ സഹായി).
The applicant expects a call for the OTP (best time: <b>${esc(show(app.applicant.otp_call_time))}</b>).</p>
<h3>Applicant</h3><table style="border-collapse:collapse;background:#F7E6CB">${rows(app.applicant)}</table>
<h3>Service details</h3><table style="border-collapse:collapse;background:#F7E6CB">${rows(app.service_details)}</table>
<h3>Documents to upload on e-District</h3><ul>${app.documents_to_upload.map((d) => `<li>${esc(d)}</li>`).join("")}</ul>
<h3>Scanned documents</h3><ul>${docRows}</ul>
${missing}
<p style="color:#4A5670;font-size:13px">Names are transliterated from speech; check spellings against the Aadhaar card. Fees were not quoted to the applicant.</p>
</div>`;
}

function emailText(app: Application, ref: string, docs: SubmittedDoc[]): string {
  const lines = (data: Record<string, unknown>) => Object.entries(data).map(([k, v]) => `  ${label(k)}: ${show(v)}`).join("\n");
  return [
    `New e-District application ${ref}`,
    `Service: ${app.service}`,
    "",
    "Applicant:",
    lines(app.applicant),
    "",
    "Service details:",
    lines(app.service_details),
    "",
    `Documents to upload: ${app.documents_to_upload.join("; ")}`,
    `Scanned: ${docs.map((d) => `${d.name} (${d.pdf_base64 ? `${d.pages} page(s) attached` : "not provided"})`).join("; ") || "none"}`,
    app.missing_or_unsure.length ? `\nMissing or unsure:\n  ${app.missing_or_unsure.join("\n  ")}` : "",
  ].join("\n");
}
