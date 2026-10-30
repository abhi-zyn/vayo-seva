"use client";

import { useEffect } from "react";

/** A short buzz on every button press, on phones that support it. */
export function Haptics() {
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      if ((e.target as Element | null)?.closest("button, [role=button], a.vs-btn")) navigator.vibrate?.(15);
    };
    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);
  return null;
}
