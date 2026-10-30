"use client";

// F. Error / offline: a circuit trace draws, then breaks: a gap, and the node
// after the gap dims. A cloud-with-slash glyph, plain words, one big retry, and
// the helpline. Never signalled by colour alone.

import { Icon } from "@/components/brand/Logo";
import { HELPLINE, type STRINGS } from "@/lib/ui-strings";
import s from "./states.module.css";

type T = (typeof STRINGS)["ml"];

export function ErrorState({ t, message, onRetry }: { t: T; message: string; onRetry: () => void }) {
  return (
    <section className={`${s.stage} ${s.error} vs-enter`} role="alert">
      <svg className={s.broken} viewBox="0 0 300 40" aria-hidden>
        <path className={s.brokenA} d="M14 20 H128" pathLength={1} />
        <circle cx={14} cy={20} r={6} className={s.brokenNode} />
        <circle cx={128} cy={20} r={6} className={s.brokenNode} />
        <path className={s.brokenB} d="M172 20 H286" />
        <circle cx={172} cy={20} r={6} className={s.brokenDim} />
        <circle cx={286} cy={20} r={6} className={s.brokenDim} />
      </svg>
      <div className={s.errorRow}>
        <Icon name="cloud-off" size={72} />
        <p className={s.stateHead}>{message}</p>
      </div>
      <button type="button" className={s.primaryBtn} onClick={onRetry}>
        {t.retry}
      </button>
      <CallLink t={t} />
    </section>
  );
}

export function CallLink({ t }: { t: T }) {
  return (
    <a className={`${s.callBtn} vs-btn`} href={`tel:${HELPLINE.tel}`}>
      <Icon name="phone" size={48} />
      <span>
        {t.call}
        <span className={s.callNumber}>{HELPLINE.display}</span>
      </span>
    </a>
  );
}
