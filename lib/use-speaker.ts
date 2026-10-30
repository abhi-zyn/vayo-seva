"use client";

// Speaking with the best available engine (device Malayalam voice, else Gemini
// audio), the senior-friendly speed setting, and a timeout so a dropped
// utterance can never leave the screen stuck. Shared by both screens.

import { useEffect, useRef, useState } from "react";
import { stopClip } from "./audio-clips";
import { DEFAULT_SPEED, loadSpeed, saveSpeed, type Speed } from "./speed";
import { speakText, stopSpeaking } from "./tts-client";
import { useMalayalamVoice } from "./use-ml-voice";

export type SpeakerState = "idle" | "loading" | "speaking";

const START_TIMEOUT_MS = 25_000;

export function useSpeaker() {
  const { voice: mlVoice, checked: voiceChecked } = useMalayalamVoice();
  const [state, setState] = useState<SpeakerState>("idle");
  const [speed, setSpeedState] = useState<Speed>(DEFAULT_SPEED);
  /** True when the last attempt produced no sound (show text instead). */
  const [lastFailed, setLastFailed] = useState(false);
  const sayId = useRef(0); // lets callbacks from a superseded say() know to do nothing

  useEffect(() => setSpeedState(loadSpeed()), []);

  /** Speak `text`. `onDone(true)` after it finishes; `onDone(false)` if it couldn't be spoken. */
  function say(
    text: string,
    opts: { speed?: Speed; onDone?: (spoken: boolean) => void; onProgress?: (charIndex: number) => void } = {},
  ) {
    const id = ++sayId.current;
    const live = () => sayId.current === id;
    setState("loading"); // Gemini audio can take seconds to arrive
    setLastFailed(false);

    const finish = (spoken: boolean) => {
      window.clearTimeout(timer);
      if (!live()) return;
      setState("idle");
      if (!spoken) setLastFailed(true);
      opts.onDone?.(spoken);
    };
    const timer = window.setTimeout(() => {
      if (!live()) return;
      stopSpeaking();
      finish(false);
    }, START_TIMEOUT_MS);

    speakText(text, mlVoice, {
      speed: opts.speed ?? speed,
      onStart: () => {
        window.clearTimeout(timer);
        if (live()) setState("speaking");
      },
      onEnd: () => finish(true),
      onProgress: (i) => {
        if (live()) opts.onProgress?.(i);
      },
      onFail: (reason) => {
        console.warn("speech failed:", reason);
        finish(false);
      },
    });
  }

  function stop() {
    sayId.current++;
    stopSpeaking();
    stopClip();
    setState("idle");
  }

  function setSpeed(s: Speed) {
    setSpeedState(s);
    saveSpeed(s);
  }

  return { say, stop, state, speed, setSpeed, lastFailed, mlVoice, voiceChecked };
}
