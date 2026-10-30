"use client";

// A. Splash: the logo assembles itself (figures meet, circuit draws, nodes pop,
// document rises, tick draws, wordmark rises letter by letter, tagline phrase
// by phrase). About 2.2s; a tap or key anywhere skips it.

import { useEffect, useState } from "react";
import { Icon, LogoMark, Wordmark } from "@/components/brand/Logo";
import type { STRINGS } from "@/lib/ui-strings";
import s from "./states.module.css";

type T = (typeof STRINGS)["ml"];

export function Splash({ t, onDone }: { t: T; onDone: () => void }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const a = window.setTimeout(() => setReady(true), 2200);
    const b = window.setTimeout(onDone, 2900);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [onDone]);

  return (
    <button type="button" className={s.splash} onClick={onDone} aria-label={`VayoSeva. ${t.skip}`}>
      <LogoMark size={184} motion="assemble" decorative />
      <Wordmark stagger className={s.splashWord} />
      <span className={s.splashTagline}>
        {t.taglinePhrases.map((p, i) => (
          <span key={p} style={{ animationDelay: `${1750 + i * 220}ms` }}>
            {p}{" "}
          </span>
        ))}
      </span>
      <span className={s.splashStatus} aria-live="polite">
        {ready ? (
          <>
            <Icon name="node-tick" size={30} /> {t.ready}
          </>
        ) : (
          t.preparing
        )}
      </span>
    </button>
  );
}
