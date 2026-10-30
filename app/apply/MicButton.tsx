"use client";

import styles from "./apply.module.css";

type Props = {
  listening: boolean;
  busy: boolean; // waiting for the model
  speaking: boolean;
  onStart: () => void;
  onStop: () => void;
};

/** Mic for answering. Tapping while Sahayi talks interrupts it and starts listening. */
export function MicButton({ listening, busy, speaking, onStart, onStop }: Props) {
  const label = listening ? "കേൾക്കുന്നു… നിർത്താൻ അമർത്തൂ" : busy ? "ഒരു നിമിഷം..." : "🎤 ഉത്തരം പറയാൻ അമർത്തൂ";
  return (
    <button
      className={`${styles.mic} ${listening ? styles.micListening : ""}`}
      onClick={listening ? onStop : onStart}
      disabled={busy}
      aria-live="polite"
      data-speaking={speaking || undefined}
    >
      {label}
    </button>
  );
}
