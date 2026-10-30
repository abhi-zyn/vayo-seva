// POST /api/tts  { text } -> audio/wav
// Fallback speech for devices with no Malayalam speechSynthesis voice
// (desktop Chrome, many iPhones). Uses Gemini TTS on the server.

import { createCache } from "@/lib/cache";
import { classifyError, generateWithFallback, TTS_CHAIN } from "@/lib/gemini";
import { pcmToWav, rateFromMime } from "@/lib/wav";

export const runtime = "nodejs";

const MAX_CHARS = 1200;
// Answers repeat a lot (replay button, common questions); WAVs are ~50 KB/s.
const cache = createCache<Buffer>(50);

export async function POST(req: Request) {
  let text: unknown;
  try {
    ({ text } = await req.json());
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof text !== "string" || !text.trim()) {
    return Response.json({ error: "text is required" }, { status: 400 });
  }
  text = text.trim();
  if ((text as string).length > MAX_CHARS) {
    return Response.json({ error: `text over ${MAX_CHARS} chars` }, { status: 400 });
  }

  const key = text as string;
  let wav = cache.get(key);
  if (!wav) {
    try {
      const res = await generateWithFallback(
        {
          // Send ONLY the text. A style instruction ("read slowly...") gets read
          // aloud by this model as if it were part of the answer. Slowness is
          // applied on the device with playbackRate instead (lib/speed.ts).
          contents: key,
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
          },
        },
        TTS_CHAIN,
      );
      const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
      if (!part?.inlineData?.data) throw new Error("Gemini TTS returned no audio");
      const bytes = Buffer.from(part.inlineData.data, "base64");
      const mime = part.inlineData.mimeType ?? "";
      // Newer TTS models return a finished WAV; older ones return raw PCM that needs a header.
      wav = mime.includes("wav") ? bytes : pcmToWav(bytes, rateFromMime(mime));
      cache.set(key, wav);
    } catch (err) {
      const kind = classifyError(err);
      console.error(`[tts] ${kind}:`, err);
      return Response.json({ error: kind }, { status: kind === "rate_limit" ? 429 : 502 });
    }
  }

  return new Response(new Uint8Array(wav), {
    headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" },
  });
}
