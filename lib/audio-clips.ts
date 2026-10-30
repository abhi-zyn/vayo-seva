// Optional pre-recorded clips in public/audio/ (e.g. greeting.mp3, one-moment.mp3).
// A human recording sounds better than any TTS voice; if a file is missing we
// return false and the caller falls back to TTS or text.

const exists = new Map<string, boolean>();
let current: HTMLAudioElement | null = null;

async function clipExists(url: string): Promise<boolean> {
  if (!exists.has(url)) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      exists.set(url, res.ok && (res.headers.get("content-type") ?? "").startsWith("audio"));
    } catch {
      exists.set(url, false);
    }
  }
  return exists.get(url)!;
}

/** Plays /audio/<name>.mp3 if it exists. Resolves true if playback started. */
export async function playClip(name: string, onEnd?: () => void): Promise<boolean> {
  const url = `/audio/${name}.mp3`;
  if (!(await clipExists(url))) return false;
  stopClip();
  const a = new Audio(url);
  current = a;
  a.onended = () => onEnd?.();
  try {
    await a.play();
    return true;
  } catch {
    return false; // autoplay blocked before the first tap
  }
}

export function stopClip(): void {
  current?.pause();
  current = null;
}
