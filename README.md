# അക്ഷയ സഹായി: Malayalam voice assistant (Stage 1)

> [!WARNING]
> **The knowledge base contains placeholders, not real requirements.**
> Every entry in [`data/services.json`](data/services.json) is a made-up placeholder with
> `"verified": false`, `"fee": "VERIFY"` and no source. Before **any** demo, replace each entry
> with details verified from official Kerala e-District / Akshaya sources or confirmed by an
> Akshaya operator. Then fill in `source`, set `last_verified` to the date you checked, and set
> `"verified": true`. Until then the app shows a "not yet verified" badge on answers that use them.

A senior citizen speaks (or types) a question in Malayalam. The app answers in short, simple
spoken Malayalam, grounded only in the local knowledge base, and reads the answer aloud.
No database, no login, no analytics. Free tiers only.

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
| `documents` | string[] | Documents the applicant must bring |
| `fee` | string | Fee as text; `"VERIFY"` until confirmed |
| `issued_by` | string | Issuing office |
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
