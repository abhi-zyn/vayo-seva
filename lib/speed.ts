// Reading speed for senior listeners. One setting drives both engines, but
// they need different numbers: playbackRate on Gemini audio much below 0.7
// starts to sound smeared, while speechSynthesis can go slower cleanly.

export type Speed = "verySlow" | "slow" | "normal";

export const SPEEDS: { id: Speed; label: string }[] = [
  { id: "verySlow", label: "വളരെ പതുക്കെ" },
  { id: "slow", label: "പതുക്കെ" },
  { id: "normal", label: "സാധാരണ" },
];

export const DEFAULT_SPEED: Speed = "slow";

/** speechSynthesis utterance.rate (1 = the voice's normal pace). */
export const BROWSER_RATE: Record<Speed, number> = { verySlow: 0.6, slow: 0.75, normal: 0.95 };

/** HTMLAudioElement.playbackRate for Gemini audio (pitch is preserved by the browser). */
export const AUDIO_RATE: Record<Speed, number> = { verySlow: 0.7, slow: 0.82, normal: 1 };

const KEY = "speechSpeed";

export function loadSpeed(): Speed {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "verySlow" || v === "slow" || v === "normal") return v;
  } catch {
    // storage blocked (private mode etc.): use the default
  }
  return DEFAULT_SPEED;
}

export function saveSpeed(s: Speed): void {
  try {
    localStorage.setItem(KEY, s);
  } catch {
    // not critical
  }
}
