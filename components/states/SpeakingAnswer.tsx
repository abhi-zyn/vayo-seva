"use client";

// D. Speaking: the answer in large type, with an orange trace underline (node at
// its leading end) that moves from word to word as the words are spoken.

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { STRINGS } from "@/lib/ui-strings";
import s from "./states.module.css";

type T = (typeof STRINGS)["ml"];

type Props = {
  t: T;
  text: string;
  /** Character currently being spoken, or -1 when not speaking. */
  charIndex: number;
  speaking: boolean;
  unverified: boolean;
  slower: boolean;
  onReplay: () => void;
  onStop: () => void;
  onSlower: () => void;
};

export function SpeakingAnswer({ t, text, charIndex, speaking, unverified, slower, onReplay, onStop, onSlower }: Props) {
  // Words with their start offsets in the text, to match charIndex.
  const words = useMemo(() => {
    const out: { w: string; start: number }[] = [];
    const re = /\S+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) out.push({ w: m[0], start: m.index });
    return out;
  }, [text]);
  let current = -1;
  if (charIndex >= 0) for (let i = 0; i < words.length && words[i].start <= charIndex; i++) current = i;

  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const boxRef = useRef<HTMLParagraphElement>(null);
  const [ul, setUl] = useState<{ x: number; y: number; w: number } | null>(null);

  useLayoutEffect(() => {
    const el = current >= 0 ? wordRefs.current[current] : null;
    const box = boxRef.current;
    if (!el || !box) return setUl(null);
    const r = el.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    setUl({ x: r.left - b.left, y: r.bottom - b.top + 2, w: r.width });
  }, [current, text]);

  return (
    <section className={`${s.stage} ${s.answerStage} vs-enter`}>
      <h2 className={s.answerHead}>
        {t.answer}
        {unverified && <span className={s.badge}>{t.unverified}</span>}
      </h2>
      <p ref={boxRef} className={s.answerText} aria-live="polite">
        {words.map((w, i) => (
          <span key={i} ref={(el) => void (wordRefs.current[i] = el)} className={i === current ? s.wordNow : undefined}>
            {w.w}{" "}
          </span>
        ))}
        {/* The underline is drawn with transforms only: a line scaled to the word, a node at its end. */}
        <span
          aria-hidden
          className={s.underline}
          style={{
            opacity: ul ? 1 : 0, // shown whenever a word is current; parent resets charIndex when speech ends
            transform: ul ? `translate(${ul.x}px, ${ul.y}px) scaleX(${ul.w / 100})` : undefined,
          }}
        />
        <span
          aria-hidden
          className={s.underlineNode}
          style={{ opacity: ul ? 1 : 0, transform: ul ? `translate(${ul.x + ul.w}px, ${ul.y}px)` : undefined }}
        />
      </p>
      <div className={s.controls}>
        <button type="button" className={s.primaryBtn} onClick={onReplay}>
          {t.replay}
        </button>
        <button type="button" className={s.secondaryBtn} onClick={onStop} disabled={!speaking}>
          {t.stop}
        </button>
        <button type="button" className={s.secondaryBtn} onClick={onSlower} aria-pressed={slower}>
          {slower ? t.normalSpeed : t.slower}
        </button>
      </div>
    </section>
  );
}
