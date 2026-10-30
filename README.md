# അക്ഷയ സഹായി: Malayalam voice assistant

> [!WARNING]
> **Check the knowledge base before any demo.** [`data/services.json`](data/services.json) holds
> 10 e-District services taken from the official e-District FAQ (checked 2026-10-31). Fees are
> **not confirmed** (`"fee": "VERIFY"`), and the app never says an amount. The **Residence
> Certificate** is still `"verified": false`: its official document list isn't published and the
> building tax receipt is a placeholder, so answers using it show a "not yet verified" badge. Re-check
> every entry against edistrict.kerala.gov.in or with an Akshaya operator, and update `last_verified`.

Two modes for senior citizens, both in simple spoken Malayalam:

1. **Ask** (`/`): speak or type a question; the app answers only from the knowledge base and reads
   the answer aloud.
2. **Apply** (`/apply`, "Sahayi"): pick one of 10 certificates; the app asks for the applicant's
   details one question at a time, reads each answer back ("ശരിയാണോ?"), then sends a summary to
   the Akshaya operator, who files it on edistrict.kerala.gov.in.

No database, no login, no analytics. Free tiers only.

## How the application interview works

- **The order is fixed in code**, not decided by the model: Part A personal details
  ([`lib/apply/part-a.ts`](lib/apply/part-a.ts)), then each service's extra details
  ([`lib/apply/service-fields.ts`](lib/apply/service-fields.ts)). Family members repeat until
  "ഇനിയും ആരെങ്കിലും ഉണ്ടോ?" is answered no.
- **Spoken answers** (names, places, purpose, occupation, income) go to `POST /api/extract`, which
  returns `{ field, malayalam_raw, english_value, confidence, note_for_operator }`. Names and places
  are transliterated to UPPERCASE ("രാമൻ നായർ" → RAMAN NAIR), and purposes are translated. One small
  lite-model call per spoken answer: about 12 for a whole application.
- **Voice-first, hands-free.** On the home screen, "എനിക്ക് വരുമാന സർട്ടിഫിക്കറ്റ് വേണം" opens that
  application directly (`/apply?service=…`). Every screen is read aloud in Malayalam, then
  listens by itself (once the mic is allowed). The info screen moves on to the questions after
  reading, and the review screen sends when you say "അയയ്ക്കൂ". Silence gets one automatic re-ask.
  Every step can also be tapped or typed.
- **Numbers and dates can be spoken or typed.** Spoken words become digits ("ഒമ്പത് എട്ട്…" →
  98…, "അഞ്ച് ഓഗസ്റ്റ് …" → 05/08/…; numerals skip the model), then the same checks run in code:
  Aadhaar 12 digits, mobile starts 6–9, PIN starts 67/68/69, real past dates. Read back digit by
  digit. Saying "ഇല്ല" skips an optional question.
- **Every answer is read back** with "ശരിയാണോ?". After two misses the app asks them to type or get a
  family member's help. "അറിയില്ല" records `null` and moves on. Option taps don't need confirming.
- **Caste → SC/ST?** Yes switches to the Community Certificate. Legal heir, possession, solvency,
  valuation and birth/death/marriage registration are refused with the reason.
- **Monthly income × 12 is done in code**, never by the model.
- **Sending** goes through [`lib/delivery.ts`](lib/delivery.ts). `DELIVERY_MODE=dummy` (default)
  logs the application on the server with Aadhaar, mobile and ration numbers masked, and shows a
  reference like `AKS-261031-4629`. `DELIVERY_MODE=resend` emails the operator instead (see
  "Email delivery" below). Real delivery carries full Aadhaar numbers: send only to operators.
- Answers aren't saved in the browser: closing the tab loses an unfinished application. Scanned
  PDFs are kept temporarily in the browser (IndexedDB) and cleared after sending or restarting.

## Accounts and payments (Supabase + Google + Razorpay)

Optional. With these keys empty the app works as before: no login, no fee, nothing saved.
When on: asking questions stays open; **applying** asks for Google sign-in once; the review
screen charges the certificate's VayoSeva service fee with Razorpay; the application is saved to
the user's account and listed on **എന്റെ അപേക്ഷകൾ** (`/my-applications`). Scanned PDFs are
not stored, only which documents were sent and their page counts. After the email goes out,
Aadhaar, mobile, ration card, voter ID and email in the saved answers are cut to the last 4 digits.

**1. Supabase** (free): create a project at https://supabase.com.
- SQL Editor → New query → paste [`supabase/schema.sql`](supabase/schema.sql) → Run.
- Project Settings → API: copy the URL, the anon/publishable key and the service_role key into
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Authentication → URL Configuration: Site URL = your Vercel URL; add
  `http://localhost:3000/auth/callback` and `https://<your-app>.vercel.app/auth/callback` to
  Redirect URLs.

**2. Google sign-in**: Google Cloud Console → APIs & Services → Credentials → Create OAuth client
ID (Web application). Authorized redirect URI: the callback shown in Supabase → Authentication →
Sign In / Providers → Google (`https://<project>.supabase.co/auth/v1/callback`). Paste the
client ID and secret into that Supabase Google provider and enable it.

**3. Razorpay** (Test Mode first): Dashboard → API Keys → generate. Set `RAZORPAY_KEY_ID`,
`RAZORPAY_KEY_SECRET`, and `NEXT_PUBLIC_RAZORPAY_KEY_ID` (same as the key id). Webhooks → Add:
URL `https://<your-app>.vercel.app/api/razorpay/webhook`, events `payment.captured` and
`order.paid`, a secret of your choice → `RAZORPAY_WEBHOOK_SECRET`. (Webhooks need a public URL;
locally the payment is still verified by signature on submit.) Test cards and UPI ids:
https://razorpay.com/docs/payments/payments/test-card-upi-details/

**4. Fees**: set `service_fee_inr` (whole rupees) for each certificate in `data/services.json`.
They are **placeholders (₹30) now**. This is VayoSeva's own service fee; the government fee is
separate and still not quoted ("ഫീസ് അക്ഷയ കേന്ദ്രം അറിയിക്കും").

**How a paid application flows:** review → `POST /api/applications` (saves it, creates the
Razorpay order from the server-side fee) → Razorpay Checkout → `POST /api/submit` (verifies the
payment signature, emails the operator with PDFs, masks IDs, status `sent`). If the email fails
after payment, the status stays `paid` and pressing send again retries without charging twice.

## Email delivery (Resend)

Finished applications can be emailed to the Akshaya operator: a readable summary, the scanned
PDFs as attachments, and the full answers as a JSON attachment.

1. Create a free account at https://resend.com and an API key at https://resend.com/api-keys.
2. In `.env.local` (and in Vercel → Project Settings → Environment Variables):
   ```
   DELIVERY_MODE=resend
   RESEND_API_KEY=re_...
   OPERATOR_EMAIL=operator@example.com          # several: a@x.in,b@y.in
   DELIVERY_FROM=                                # optional, see below
   ```
3. Restart `npm run dev`, finish an application, and check the operator's inbox.

**Sender address:** with `DELIVERY_FROM` empty, emails come from Resend's test sender
`onboarding@resend.dev`, which **only delivers to the email address you signed up to Resend
with**. That's fine for a demo: set `OPERATOR_EMAIL` to that address. To send to any other
address, verify a domain in Resend (Domains → Add) and set e.g.
`DELIVERY_FROM=VayoSeva <applications@yourdomain.in>`. The sender must use the **exact**
verified domain: if you verified a subdomain like `vayoseva.zenvx.in`, send from
`applications@vayoseva.zenvx.in`, not `@zenvx.in`. The sender address needs no inbox;
`OPERATOR_EMAIL` is the real inbox that receives applications.

If sending fails (wrong key, unverified sender), the user hears the friendly "try again" message
and the server log shows Resend's reason. Each email uses the reference number as Resend's
idempotency key, so a retried submit doesn't send a duplicate.

## Setup

Needs Node.js 22.18 or newer (24 LTS recommended).

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env.local` from the example and paste your free Gemini key from
   https://aistudio.google.com/apikey:
   ```bash
   copy .env.example .env.local
   ```

   | Variable | Default | Purpose |
   | --- | --- | --- |
   | `GEMINI_API_KEY` | (required) | Server-side only. Never prefix it with `NEXT_PUBLIC_`. |
   | `GEMINI_MODEL` | `gemini-3.5-flash-lite` | Model that writes the answers |
   | `GEMINI_FALLBACK_MODELS` | `gemini-3.1-flash-lite,gemini-3.5-flash` | Tried in order when the main model is overloaded (503), rate-limited (429) or times out. Free-tier quotas are per model. |
   | `GEMINI_TTS_MODEL` | `gemini-3.8-flash-lite-tts` | Fallback voice when the device has no Malayalam voice |
   | `GEMINI_TTS_FALLBACK_MODELS` | `gemini-3.8-flash-tts` | Tried when the voice model is busy or out of quota |
   | `GEMINI_EMBED_MODEL` | `gemini-embedding-001` | Only used when `RETRIEVAL_MODE=embed` |
   | `RETRIEVAL_MODE` | `all` | `all` sends the whole KB; `embed` sends the top 3 matches |

   **Model names change often. Verify they are current before a demo** at
   https://ai.google.dev/gemini-api/docs/models. The brief's original default, `gemini-2.5-flash`,
   is already closed to new API keys. On 2026-10-30 the 3.6/3.7/3.8 flash chat models were timing
   out, and `gemini-3.5-flash` allows only **20 requests per day** on the free tier, so the default is
   the lite model, with 3.5-flash kept as the last fallback. Don't use `gemini-embedding-2` for
   retrieval: it merges a list of inputs into one vector.

   **Free-tier quotas are per model, per day.** Check yours at https://ai.dev/rate-limit before a
   demo. The in-memory answer cache and the fallback chain stretch them, but a busy demo day can
   still run out.
3. Run it:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000 (main app) or http://localhost:3000/voice-test (device check).

## Deploy to Vercel

Voice APIs need HTTPS, so test phones against a deployment, not your PC's LAN address.

1. Push the folder to a GitHub repo and import it at https://vercel.com/new (framework: Next.js).
2. In Project Settings → Environment Variables, add `GEMINI_API_KEY` (and any of the other variables you want to change).
3. Deploy, then open `https://<your-app>.vercel.app/voice-test` on the phone first.

## How it works

- **Speech to text:** the browser's Web Speech API with `lang = "ml-IN"`.
- **Answer:** `POST /api/ask` (`app/api/ask/route.ts`) picks service entries (`lib/retrieve.ts`),
  sends them with a strict system prompt (`lib/prompt.ts`) to Gemini, and returns
  `{ answer, services_used, any_unverified }`. Answers are cached in memory by normalised question.
- **Text to speech:** the device's Malayalam `speechSynthesis` voice if it has one. If not, the app
  fetches audio from `POST /api/tts` (Gemini TTS, cached in memory). If that fails too, the answer is
  shown as text only.
- **Recorded clips (optional):** put `greeting.mp3` and `one-moment.mp3` in `public/audio/` and the
  app plays them instead of a TTS voice. See `public/audio/README.txt`.

## Adding a service

Add an object to the array in `data/services.json`. All fields are required:

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | string | Unique, kebab-case, e.g. `income-certificate` |
| `name_en` / `name_ml` | string | Service name in English / Malayalam |
| `used_for` | string | What the certificate or service is used for |
| `documents` | string[] | What the app asks the applicant to keep ready ("Ask for") |
| `edistrict_name` | string | Exact service name on edistrict.kerala.gov.in |
| `validity` / `processing_time` | string | e.g. `1 year`, `6 working days`, `Not listed` |
| `accepted_documents` | string[] | Official list of alternatives the officer may accept; `[]` if not published |
| `documents_ml` | string[] | Malayalam for each `documents` item, spoken as-is by the interview |
| `fee` | string | Fee as text; `"VERIFY"` until confirmed |
| `notes` | string | Anything else worth saying |
| `source` | string | Official URL or "Akshaya operator, <place>, <date>" |
| `last_verified` | string | Date you last checked it, e.g. `2026-11-02` (`"never"` for placeholders) |
| `verified` | boolean | `true` only after checking against an official source |

The file is checked when the server starts (`lib/service-schema.ts`). A missing field, wrong type
or duplicate `id` stops the server with an error naming the bad entry. With more than ~30 entries,
switch to `RETRIEVAL_MODE=embed` to keep prompts small.

## Testing answer quality

With `npm run dev` running, in a second terminal:

```bash
npm run questions
```

This sends the 20 messy questions in `tests/questions.md` (Manglish, vague, off-topic, not in the KB,
prompt-injection) and prints each answer next to what to expect. Questions are spaced 6 seconds apart
for the free-tier rate limit (`DELAY_MS` to change it). Edit `lib/prompt.ts` and re-run to compare.
Restart the dev server between runs, or the in-memory cache returns the old answers.

## Testing voice on Android Chrome

1. Open `https://<your-app>.vercel.app/voice-test` in **Chrome** (not inside WhatsApp or another app's browser).
2. Tap **Start listening**, allow the microphone, and speak Malayalam. The transcript should appear.
3. Check the voice list for a green **ml** voice. If there is none: Settings → Speech Services by
   Google (or Google TTS) → Install voice data → Malayalam, then reload.
4. Tap **Speak sample sentence** (device voice) and **Speak with Gemini** (server fallback).
5. Then try the main page and ask a real question.

On Windows, Microsoft Edge has online Malayalam voices; desktop Chrome has none, so it uses the
Gemini fallback.

## Known limitations

- **Web Speech API is Chrome-centric.** Speech recognition works in Chrome (Android and desktop) and
  Edge. Firefox has none. iOS Safari support is patchy. Users without it can type.
- **Malayalam TTS voices are often missing** on desktop and iOS. The app then uses Gemini TTS, which
  costs API quota (preview TTS free-tier limits are low) and adds a second or two of delay.
  Gemini TTS Malayalam quality and support should be checked on the model you configure.
- **Browser speech recognition sends audio to Google's servers** (that's how Chrome implements it).
  Mention this to users; it needs an internet connection.
- **In-app browsers and embedded previews block the microphone** (including the Claude desktop app's
  preview pane). Open the page in a real browser.
- **Caches are in memory**: per server instance, cleared on restart or redeploy.
- **The knowledge base is placeholder data** until you verify it (see the warning at the top).
