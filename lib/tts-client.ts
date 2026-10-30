// Browser-side "say this in Malayalam" with a fallback chain:
//   1. the device's Malayalam speechSynthesis voice (free, instant, offline-ish)
//   2. Gemini TTS via /api/tts (works everywhere, uses API quota)
//   3. nothing: caller shows the text only

import { speak } from "./speech";
import { AUDIO_RATE, BROWSER_RATE, DEFAULT_SPEED, type Speed } from "./speed";

export type SpeechEngine = "browser" | "gemini";

type Handlers = {
  onStart?: (engine: SpeechEngine) => void;
  onEnd?: () => void;
  /** Called when no engine could speak; the caller should fall back to text. */
  onFail?: (reason: string) => void;
  /** Roughly which character is being spoken now (drives the word underline). */
  onProgress?: (charIndex: number) => void;
  speed?: Speed;
};

let audio: HTMLAudioElement | null = null;
// Object URLs for audio we already fetched, so "replay" costs no quota.
const audioUrls = new Map<string, string>();
let requestId = 0; // drops results of a fetch that a newer speakText/stop superseded

export function stopSpeaking(): void {
  requestId++;
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  audio?.pause();
  audio = null;
}

/** Fetches Gemini audio for `text` (cached per page), or throws. */
async function geminiAudioUrl(text: string): Promise<string> {
  const cached = audioUrls.get(text);
  if (cached) return cached;
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  const url = URL.createObjectURL(await res.blob());
  audioUrls.set(text, url);
  return url;
}

export async function speakText(
  text: string,
  mlVoice: SpeechSynthesisVoice | null,
  h: Handlers = {},
): Promise<void> {
  stopSpeaking();
  const id = requestId;
  const speed = h.speed ?? DEFAULT_SPEED;

  if (mlVoice) {
    speak(text, mlVoice, {
      rate: BROWSER_RATE[speed],
      onStart: () => h.onStart?.("browser"),
      onEnd: () => h.onEnd?.(),
      onError: (err) => h.onFail?.(`speechSynthesis: ${err}`),
      onBoundary: (i) => h.onProgress?.(i), // exact word timing from the voice
    });
    return;
  }

  try {
    const url = await geminiAudioUrl(text);
    if (id !== requestId) return; // stopped or replaced while fetching
    const a = new Audio(url);
    a.playbackRate = AUDIO_RATE[speed];
    a.preservesPitch = true; // slower, not deeper
    audio = a;
    // Events from an audio element that a replay already replaced are ignored.
    a.onplaying = () => {
      if (audio !== a) return;
      h.onStart?.("gemini");
      // Audio files carry no word timings, so estimate: position in the
      // recording maps to position in the text. Close enough for an underline.
      const tick = () => {
        if (audio !== a || a.paused || !a.duration) return;
        h.onProgress?.(Math.floor((a.currentTime / a.duration) * text.length));
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    a.onended = () => {
      if (audio !== a) return;
      audio = null;
      h.onEnd?.();
    };
    a.onerror = () => {
      if (audio === a) h.onFail?.("audio playback failed");
    };
    await a.play();
  } catch (err) {
    if (id !== requestId) return;
    // play() rejects with NotAllowedError when autoplay is blocked (no recent tap).
    h.onFail?.(err instanceof Error ? err.message : String(err));
  }
}
