// Browser-only helpers around the Web Speech API (recognition + synthesis).
// TypeScript's DOM lib doesn't ship SpeechRecognition types, so we declare
// the small subset we use.

export interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}

export interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResultLike };
}

export interface SpeechRecognitionErrorEventLike {
  error: string; // "no-speech" | "not-allowed" | "network" | "aborted" | ...
  message?: string;
}

export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onaudiostart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

type RecognitionCtor = new () => SpeechRecognitionLike;

/** Returns the SpeechRecognition constructor (Chrome uses the webkit prefix), or null. */
export function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function hasSpeechSynthesis(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function isMalayalamVoice(v: SpeechSynthesisVoice): boolean {
  return v.lang.toLowerCase().replace("_", "-").startsWith("ml");
}

/** Prefer an exact ml-IN voice, then any ml* voice. */
export function pickMalayalamVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const ml = voices.filter(isMalayalamVoice);
  return ml.find((v) => v.lang.toLowerCase().replace("_", "-") === "ml-in") ?? ml[0] ?? null;
}

/**
 * Voices load asynchronously. Chrome fires `voiceschanged`; some Android
 * builds never do, so we also poll briefly. Calls `onVoices` each time the
 * list changes and returns a cleanup function.
 */
export function watchVoices(onVoices: (voices: SpeechSynthesisVoice[]) => void): () => void {
  if (!hasSpeechSynthesis()) return () => {};
  const synth = window.speechSynthesis;
  let lastCount = -1;
  const update = () => {
    const voices = synth.getVoices();
    if (voices.length !== lastCount) {
      lastCount = voices.length;
      onVoices(voices);
    }
  };
  update();
  synth.addEventListener("voiceschanged", update);
  let tries = 0;
  const timer = window.setInterval(() => {
    update();
    if (++tries >= 20) window.clearInterval(timer); // stop after ~5s
  }, 250);
  return () => {
    synth.removeEventListener("voiceschanged", update);
    window.clearInterval(timer);
  };
}

/** Plain-English explanation of a SpeechRecognition error code. */
export function recognitionErrorHint(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access is blocked. Tap the lock icon in the address bar → Microphone → Allow, then reload. In-app browsers (Claude's preview pane, links opened inside WhatsApp/Instagram) often block the mic: open the page in Chrome instead.";
    case "no-speech":
      return "No speech was heard. Tap the button and start speaking within a few seconds.";
    case "audio-capture":
      return "No microphone was found, or another app is using it.";
    case "network":
      return "Chrome's speech service could not be reached. Check the internet connection. (Recognition runs on Google's servers.)";
    case "language-not-supported":
      return "This browser cannot recognise Malayalam (ml-IN). Use Chrome on Android.";
    case "aborted":
      return "Listening was stopped.";
    default:
      return "Speech recognition failed.";
  }
}

// Chrome can garbage-collect an utterance mid-speech, after which onend never
// fires. Keeping a module-level reference prevents that.
let currentUtterance: SpeechSynthesisUtterance | null = null;

/**
 * Speak text, using `voice` if given; otherwise just tag the utterance ml-IN.
 * `onEnd` receives how long playback lasted: an English-only voice "reads"
 * Malayalam text by skipping it, which shows up as an almost instant end.
 */
export function speak(
  text: string,
  voice: SpeechSynthesisVoice | null,
  handlers: {
    onStart?: () => void;
    onEnd?: (ms: number) => void;
    onError?: (err: string) => void;
    /** utterance.rate; slower than normal by default for senior listeners. */
    rate?: number;
  } = {},
): void {
  const synth = window.speechSynthesis;
  const wasBusy = synth.speaking || synth.pending;
  if (wasBusy) synth.cancel(); // drop anything still queued

  const u = new SpeechSynthesisUtterance(text);
  u.lang = voice?.lang ?? "ml-IN";
  if (voice) u.voice = voice;
  u.rate = handlers.rate ?? 0.75;
  let startedAt = 0;
  u.onstart = () => {
    startedAt = performance.now();
    handlers.onStart?.();
  };
  // After cancel(), Chrome can still fire the old utterance's onend late, which
  // would mark a replay as finished while it's still talking. Ignore any event
  // from an utterance that is no longer the current one.
  u.onend = () => {
    if (currentUtterance !== u) return;
    currentUtterance = null;
    handlers.onEnd?.(startedAt ? performance.now() - startedAt : 0);
  };
  u.onerror = (e) => {
    if (currentUtterance !== u) return;
    currentUtterance = null;
    // "interrupted"/"canceled" just mean a newer utterance replaced this one.
    if (e.error !== "interrupted" && e.error !== "canceled") handlers.onError?.(e.error);
  };
  currentUtterance = u;

  // Chrome sometimes silently drops a speak() issued right after cancel();
  // a short delay avoids that.
  if (wasBusy) window.setTimeout(() => synth.speak(u), 100);
  else synth.speak(u);
}

/** Current mic permission ("granted" | "denied" | "prompt"), or null if the browser won't say. */
export async function micPermission(): Promise<string | null> {
  try {
    const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
    return status.state;
  } catch {
    return null;
  }
}
