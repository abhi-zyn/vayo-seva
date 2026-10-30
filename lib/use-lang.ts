"use client";

import { useEffect, useState } from "react";
import { STRINGS, type Lang } from "./ui-strings";

const KEY = "vayoseva-lang";

/**
 * Which language leads on screen. `t` is the leading language, `alt` the other
 * (shown smaller, for an operator). Remembered per device.
 */
export function useLang() {
  const [lang, setLang] = useState<Lang>("ml");
  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v === "ml" || v === "en") setLang(v);
    } catch {
      // storage blocked: default to Malayalam
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const toggle = () =>
    setLang((l) => {
      const next = l === "ml" ? "en" : "ml";
      try {
        localStorage.setItem(KEY, next);
      } catch {
        // not critical
      }
      return next;
    });

  return { lang, toggle, t: STRINGS[lang], alt: STRINGS[lang === "ml" ? "en" : "ml"], ml: STRINGS.ml };
}
