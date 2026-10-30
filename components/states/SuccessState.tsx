"use client";

// E. Success: the logo's document grows, its tick draws itself, and three
// orange nodes ease out and settle (calm, not confetti). The reference number
// is set large in tabular figures.

import { DocumentTick } from "@/components/brand/Logo";
import type { STRINGS } from "@/lib/ui-strings";
import s from "./states.module.css";

type T = (typeof STRINGS)["ml"];

export function SuccessState({
  t,
  alt,
  refNo,
  onReadAloud,
  children,
}: {
  t: T;
  alt: T;
  refNo: string;
  onReadAloud: () => void;
  children?: React.ReactNode;
}) {
  return (
    <section className={`${s.stage} ${s.success} vs-enter`}>
      <div className={s.successArt} aria-hidden>
        <DocumentTick size={168} className={s.successDoc} />
        <span className={`${s.burst} ${s.b1}`} />
        <span className={`${s.burst} ${s.b2}`} />
        <span className={`${s.burst} ${s.b3}`} />
      </div>
      <h2 className={s.stateHead} aria-live="polite">
        {t.submitted}
        <span className={s.altLine}>{alt.submitted}</span>
      </h2>
      <p className={s.refLabel}>{t.reference}</p>
      <p className={s.refNo}>{refNo}</p>
      {children}
      <button type="button" className={s.primaryBtn} onClick={onReadAloud}>
        {t.readAloud}
      </button>
    </section>
  );
}
