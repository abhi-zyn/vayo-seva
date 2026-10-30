"use client";

// A smoothed 0..1 "how loud is the speaker" value for the listening waveform.
//
// Desktop/kiosk: the real microphone amplitude from a Web Audio AnalyserNode.
// Android: Chrome often can't share the mic between getUserMedia and speech
// recognition (recognition then hears nothing), so there the level is driven
// by recognition events instead (bump() on sound and on each partial result).
// Add ?wave=mic to the URL to force the analyser on any device.

import { useRef } from "react";

type Mode = "analyser" | "events";

function pickMode(): Mode {
  if (typeof window === "undefined") return "events";
  if (new URLSearchParams(window.location.search).get("wave") === "mic") return "analyser";
  return /Android/i.test(navigator.userAgent) ? "events" : "analyser";
}

export function useMicLevel() {
  const level = useRef(0); // what the waveform draws
  const target = useRef(0);
  const stopRef = useRef<(() => void) | null>(null);

  async function start() {
    stop();
    let mode = pickMode();
    let read: () => number = () => 0;
    let release = () => {};
    // stop() must work even while getUserMedia is still waiting for permission.
    const run = { on: true };
    stopRef.current = () => {
      run.on = false;
      release();
      target.current = 0;
      level.current = 0;
    };

    if (mode === "analyser" && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const buf = new Float32Array(analyser.fftSize);
        read = () => {
          analyser.getFloatTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
          return Math.min(1, Math.sqrt(sum / buf.length) * 7); // speech RMS is ~0.02–0.15
        };
        release = () => {
          stream.getTracks().forEach((t) => t.stop());
          ctx.close().catch(() => {});
        };
      } catch {
        mode = "events"; // permission refused or mic busy: fall back quietly
      }
    }
    if (!run.on) return release(); // stopped while waiting

    const loop = () => {
      if (!run.on) return;
      if (mode === "analyser") target.current = read();
      else target.current *= 0.93; // events decay between bumps
      // Smooth: rise quickly, fall slowly.
      const k = target.current > level.current ? 0.35 : 0.12;
      level.current += (target.current - level.current) * k;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  function stop() {
    stopRef.current?.();
    stopRef.current = null;
  }

  /** Event-driven nudge (sound started, words arrived). Harmless in analyser mode. */
  function bump(amount = 0.7) {
    target.current = Math.max(target.current, amount);
  }

  return { level, start, stop, bump };
}
