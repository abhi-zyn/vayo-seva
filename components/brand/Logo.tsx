// The VayoSeva mark and wordmark, drawn inline from lib/brand/paths.ts so every
// layer (figures, traces, nodes, document, tick) can animate on its own.
// Layers carry class names, not ids, because the mark appears more than once
// per page; the static files in public/brand keep the #figure-elder etc. ids.

import type { CSSProperties } from "react";
import { ICON_VIEWBOX, ICONS, LOGO, LOGO_VIEWBOX, type Shape, type Tone } from "@/lib/brand/paths";
import styles from "./brand.module.css";

const COLOR: Record<Tone, string> = {
  teal: "var(--teal-glyph)",
  orange: "var(--orange)",
  paper: "var(--paper)",
  ink: "var(--ink)",
};
// Glyphs sitting on a teal field: the solid body turns white, cut-outs turn teal.
const ON_TEAL: Record<Tone, string> = { ...COLOR, teal: "var(--on-teal)", paper: "var(--teal)" };

function ShapeEl({ s, className, palette = COLOR }: { s: Shape; className?: string; palette?: Record<Tone, string> }) {
  const paint = {
    fill: s.fill ? palette[s.fill] : "none",
    ...(s.stroke
      ? { stroke: palette[s.stroke], strokeWidth: s.width ?? 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
      : {}),
  };
  if (s.kind === "circle") return <circle className={className} cx={s.cx} cy={s.cy} r={s.r} {...paint} />;
  if (s.kind === "rect") return <rect className={className} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} {...paint} />;
  return <path className={`${className ?? ""} ${s.draw ? styles.draw : ""}`} d={s.d} pathLength={s.draw ? 1 : undefined} {...paint} />;
}

type MarkProps = {
  size: number;
  /** Animation recipe applied to the layers: see brand.module.css. */
  motion?: "assemble" | "carry" | "none";
  /** Decorative copies (e.g. inside a loading state) are hidden from screen readers. */
  decorative?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function LogoMark({ size, motion = "none", decorative, className, style }: MarkProps) {
  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      width={size}
      height={size}
      className={`${styles.mark} ${motion !== "none" ? styles[motion] : ""} ${className ?? ""}`}
      style={style}
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": "VayoSeva" })}
    >
      {LOGO.map((layer) => (
        <g key={layer.id} className={styles[layer.id]} data-part={layer.id}>
          {layer.shapes.map((s, i) => (
            <ShapeEl
              key={i}
              s={s}
              className={layer.id === "circuit-nodes" ? styles.node : undefined}
            />
          ))}
        </g>
      ))}
      {motion === "carry" && (
        // Light pulses riding the traces: short dashes moved along each path.
        <g className={styles.pulses} aria-hidden>
          {LOGO.find((l) => l.id === "circuit-traces")!.shapes.map((s, i) =>
            s.kind === "path" ? (
              <path key={i} d={s.d} pathLength={1} className={styles.pulse} style={{ animationDelay: `${i * 220}ms` }} />
            ) : null,
          )}
        </g>
      )}
    </svg>
  );
}

/** "VayoSeva" in Outfit; `stagger` lets the splash raise it letter by letter. */
export function Wordmark({ className, stagger }: { className?: string; stagger?: boolean }) {
  return (
    <span className={`${styles.wordmark} ${className ?? ""}`} aria-label="VayoSeva" role="img">
      {stagger
        ? "VayoSeva".split("").map((ch, i) => (
            <span key={i} aria-hidden className={styles.letter} style={{ animationDelay: `${1400 + i * 45}ms` }}>
              {ch}
            </span>
          ))
        : <span aria-hidden>VayoSeva</span>}
    </span>
  );
}

export type IconName = keyof typeof ICONS;

/** Custom glyphs in the logo's language: rounded solid teal + orange lines ending in nodes. */
export function Icon({
  name,
  size = 40,
  className,
  onTeal,
}: {
  name: IconName;
  size?: number;
  className?: string;
  /** Use when the glyph sits on a teal fill. */
  onTeal?: boolean;
}) {
  return (
    <svg viewBox={ICON_VIEWBOX} width={size} height={size} aria-hidden className={className}>
      {ICONS[name].map((s, i) => (
        <ShapeEl key={i} s={s} palette={onTeal ? ON_TEAL : COLOR} />
      ))}
    </svg>
  );
}

/** Just the document + tick from the logo, for the success moment. */
export function DocumentTick({ size, className }: { size: number; className?: string }) {
  const parts = LOGO.filter((l) => l.id === "document" || l.id === "tick");
  return (
    <svg viewBox="64 60 54 58" width={size} height={size} aria-hidden className={`${styles.mark} ${className ?? ""}`}>
      {parts.map((layer) => (
        <g key={layer.id} className={styles[layer.id]}>
          {layer.shapes.map((s, i) => (
            <ShapeEl key={i} s={s} />
          ))}
        </g>
      ))}
    </svg>
  );
}
