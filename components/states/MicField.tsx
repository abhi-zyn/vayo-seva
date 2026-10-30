"use client";

// The mic field (B. listening). The orange circuit trace on its bottom edge is
// a live waveform while listening, driven by the microphone level; the nodes
// ride the wave. At rest it's a flat trace, "ready to become the waveform".

import { useEffect, useRef } from "react";
import { Icon } from "@/components/brand/Logo";
import s from "./states.module.css";

const W = 300;
const H = 44;
const N = 60;
const NODES = [8, 19, 30, 41, 52]; // point indices the nodes sit on

type Props = {
  listening: boolean;
  label: string;
  sub?: string;
  onPress: () => void;
  disabled?: boolean;
  compact?: boolean;
  /** Smoothed 0..1 mic level, read every frame (see useMicLevel). */
  level: React.MutableRefObject<number>;
};

export function MicField({ listening, label, sub, onPress, disabled, compact, level }: Props) {
  const pathRef = useRef<SVGPathElement>(null);
  const nodesRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let phase = 0;
    const draw = (amp: number) => {
      const ys: number[] = [];
      for (let i = 0; i <= N; i++) {
        const env = Math.sin((Math.PI * i) / N); // calm at the edges
        const wave = Math.sin(i * 0.55 + phase) * 0.7 + Math.sin(i * 1.3 - phase * 1.7) * 0.3;
        ys.push(H / 2 + amp * env * wave);
      }
      pathRef.current?.setAttribute("d", ys.map((y, i) => `${i ? "L" : "M"}${((i / N) * W).toFixed(1)} ${y.toFixed(1)}`).join(""));
      const nodes = nodesRef.current?.children;
      if (nodes) NODES.forEach((p, k) => nodes[k]?.setAttribute("cy", ys[p].toFixed(1)));
    };
    if (!listening) {
      draw(0);
      return;
    }
    const loop = () => {
      const lvl = level.current;
      if (reduce) {
        // Motion becomes opacity: the nodes brighten with the voice instead.
        draw(0);
        nodesRef.current?.setAttribute("opacity", String(0.45 + lvl * 0.55));
      } else {
        phase += 0.12 + lvl * 0.18;
        draw(2 + lvl * 15);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      nodesRef.current?.setAttribute("opacity", "1");
    };
  }, [listening, level]);

  return (
    <button
      type="button"
      className={`${s.mic} ${listening ? s.micListening : ""} ${compact ? s.micCompact : ""}`}
      onClick={onPress}
      disabled={disabled}
      aria-pressed={listening}
    >
      <Icon name="mic" size={compact ? 64 : 88} onTeal className={s.micGlyph} />
      <span className={s.micLabel}>{label}</span>
      {sub && <span className={s.micSub}>{sub}</span>}
      <svg className={s.micWave} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
        <path ref={pathRef} d={`M0 ${H / 2}H${W}`} />
        <g ref={nodesRef}>
          {NODES.map((p) => (
            <circle key={p} cx={(p / N) * W} cy={H / 2} r={4.5} />
          ))}
        </g>
      </svg>
    </button>
  );
}
