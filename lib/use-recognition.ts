"use client";

// Malayalam speech recognition as a React hook, shared by the Q&A screen and
// the application interview.

import { useEffect, useRef, useState } from "react";
import { getRecognitionCtor, micPermission, type SpeechRecognitionLike } from "./speech";

// Module-level, so it survives moving from the home screen to the application:
// once the mic is known to work, every screen may listen automatically
// (starting the mic without a tap before permission would pop up a prompt).
let micGranted = false;

type Options = {
  /** Called once with the final transcript, if anything was heard. */
  onFinal: (text: string) => void;
  /** Called with the error code ("no-speech", "not-allowed", ...). "aborted" is not reported. */
  onError?: (code: string) => void;
  /** Called when listening stops for any reason. */
  onEnd?: () => void;
};

export function useRecognition(opts: Options) {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  // Always call the latest callbacks, even from handlers created earlier.
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
    micPermission().then((state) => {
      if (state === "granted") micGranted = true;
    });
    return () => recRef.current?.abort();
  }, []);

  function start() {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    recRef.current?.abort();

    const rec = new Ctor();
    rec.lang = "ml-IN";
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    let finalText = "";
    let failed = false;

    rec.onaudiostart = () => {
      micGranted = true;
    };
    rec.onresult = (e) => {
      let fin = "";
      let mid = "";
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) fin += e.results[i][0].transcript;
        else mid += e.results[i][0].transcript;
      }
      finalText = fin;
      setInterim(fin + mid);
    };
    rec.onerror = (e) => {
      failed = true;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") micGranted = false;
      if (e.error !== "aborted") optsRef.current.onError?.(e.error);
    };
    rec.onend = () => {
      if (recRef.current === rec) recRef.current = null;
      setListening(false);
      setInterim("");
      optsRef.current.onEnd?.();
      if (!failed && finalText.trim()) optsRef.current.onFinal(finalText.trim());
    };

    recRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  }

  return {
    supported,
    listening,
    interim,
    /** True when the mic is allowed, so listening can start without a tap. */
    canAutoListen: () => micGranted,
    start,
    /** Stop and use what was heard so far. */
    stop: () => recRef.current?.stop(),
    /** Stop and discard. */
    abort: () => {
      recRef.current?.abort();
      recRef.current = null;
      setListening(false);
    },
  };
}
