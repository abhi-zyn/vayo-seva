"use client";

import { useEffect, useState } from "react";
import { pickMalayalamVoice, watchVoices } from "./speech";

/**
 * The device's best Malayalam voice, or null. `checked` turns true once we've
 * waited long enough for voices to load, so the UI doesn't flash a
 * "no Malayalam voice" notice while the list is still arriving.
 */
export function useMalayalamVoice(): { voice: SpeechSynthesisVoice | null; checked: boolean } {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const stop = watchVoices((voices) => setVoice(pickMalayalamVoice(voices)));
    const t = window.setTimeout(() => setChecked(true), 1500);
    return () => {
      stop();
      window.clearTimeout(t);
    };
  }, []);

  return { voice, checked };
}
