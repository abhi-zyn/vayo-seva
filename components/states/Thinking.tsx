"use client";

// C. Thinking: the two figures, with light carried along the circuit from
// helper to elder. Reassurance lines change every 2.5s. After 8s a calm note
// and a cancel button appear; waiting is never treated as an error.

import { useEffect, useState } from "react";
import { LogoMark } from "@/components/brand/Logo";
import type { STRINGS } from "@/lib/ui-strings";
import s from "./states.module.css";

type T = (typeof STRINGS)["ml"];

export function Thinking({ t, alt, onCancel }: { t: T; alt: T; onCancel: () => void }) {
  const [i, setI] = useState(0);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const cycle = window.setInterval(() => setI((x) => (x + 1) % t.thinking.length), 2500);
    const late = window.setTimeout(() => setSlow(true), 8000);
    return () => {
      window.clearInterval(cycle);
      window.clearTimeout(late);
    };
  }, [t.thinking.length]);

  return (
    <section className={`${s.stage} ${s.thinking} vs-enter`} aria-busy="true">
      <LogoMark size={140} motion="carry" decorative />
      <p className={s.stateLine} aria-live="polite">
        {/* key forces the cross-fade on each change */}
        <span key={i} className={s.crossfade}>
          {t.thinking[i]}
        </span>
        <span className={s.altLine}>{alt.thinking[i]}</span>
      </p>
      {slow && (
        <div className={`${s.slowNote} vs-enter`}>
          <p aria-live="polite">{t.slow}</p>
          <button type="button" className={s.secondaryBtn} onClick={onCancel}>
            {t.cancel}
          </button>
        </div>
      )}
    </section>
  );
}
