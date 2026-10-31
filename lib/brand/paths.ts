// VayoSeva brand geometry: the one source for the logo layers and the custom
// icons. React components render it inline (so each layer can animate), and
// scripts/build-brand.mjs writes the static files in public/brand and public/icons.
//
// LOGO is a hand trace of the supplied VayoSeva lockup, simplified to clean
// geometry: the short-haired helper (left) and the elder with a hair bun
// (right) clasp hands; their bodies form the V; an orange Y-circuit runs
// between their heads down through the clasp; a second trace runs down the
// left stroke; a folded-corner document with an orange tick sits lower right.
// Adjust the shapes below to refine the trace; nothing else needs to change.
//
// Kept free of imports and TS-only syntax so plain `node` can load it.

/** Colour roles; themes map them to hex (static files) or CSS vars (UI). */
export type Tone = "teal" | "orange" | "paper" | "ink";

export type Shape =
  | { kind: "path"; d: string; fill?: Tone; stroke?: Tone; width?: number; draw?: boolean }
  | { kind: "circle"; cx: number; cy: number; r: number; fill?: Tone; stroke?: Tone; width?: number }
  | { kind: "rect"; x: number; y: number; w: number; h: number; rx: number; fill?: Tone; stroke?: Tone; width?: number };

export interface Layer {
  id: string;
  shapes: Shape[];
}

/** Line width of every orange circuit line (the brief's 2.5px at 48px icon size). */
const TRACE = 2.5;

// --- logo (viewBox 0 0 120 120) --------------------------------------------------

export const LOGO_VIEWBOX = "0 0 120 120";

export const LOGO: Layer[] = [
  {
    id: "figure-helper",
    shapes: [
      { kind: "circle", cx: 17, cy: 13, r: 10, fill: "teal" },
      // Shoulder and arm reaching up-right to the clasp; the body is the V's left stroke.
      {
        kind: "path",
        d: "M4 37 C4 30 9.5 25.5 16.5 25.5 C21 25.5 24.5 27.2 27.5 30 L50 40.5 C53.6 42.2 52.6 47.4 48.6 47.2 L33 45.5 L43.5 98 L45 110 C45.6 115.8 38.6 117.6 36.4 112.6 L5.6 47.6 C4.6 44.4 4 40.8 4 37 Z",
        fill: "teal",
      },
    ],
  },
  {
    id: "figure-elder",
    shapes: [
      { kind: "circle", cx: 80, cy: 14.5, r: 10, fill: "teal" },
      { kind: "circle", cx: 88.5, cy: 5.5, r: 4.8, fill: "teal" }, // hair bun
      // Arm reaching left to the clasp, rounded back down behind the document;
      // the body continues down as the V's right stroke.
      {
        kind: "path",
        d: "M51.5 46.5 C50.8 43.3 52.6 41.2 55.4 40 L68 32.6 C71.8 30 76 28.6 80.6 28.6 C94 28.6 105.4 38.4 107 52.6 L107.6 70 H70 L48.4 112.4 C46.6 116.2 40.6 115 41.2 110.6 L52.6 59 Z",
        fill: "teal",
      },
    ],
  },
  {
    id: "circuit-traces",
    shapes: [
      // The Y between the heads, down through the clasp, with a branch to the right.
      { kind: "path", d: "M41 24 L51 35 L62 23", stroke: "orange", width: TRACE, draw: true },
      { kind: "path", d: "M51 35 V60", stroke: "orange", width: TRACE, draw: true },
      { kind: "path", d: "M51 53 L58 49 H74 L84 46", stroke: "orange", width: TRACE, draw: true },
      // Down the left stroke of the V.
      { kind: "path", d: "M21 50 L17.5 60 V70 L29 82 L40 95", stroke: "orange", width: TRACE, draw: true },
    ],
  },
  {
    id: "circuit-nodes",
    shapes: [
      { kind: "circle", cx: 41, cy: 24, r: 3.4, fill: "orange" },
      { kind: "circle", cx: 62, cy: 23, r: 3.4, fill: "orange" },
      { kind: "circle", cx: 51, cy: 60, r: 3.4, fill: "orange" },
      { kind: "circle", cx: 84, cy: 46, r: 3.4, fill: "orange" },
      { kind: "circle", cx: 21, cy: 50, r: 3.4, fill: "orange" },
      { kind: "circle", cx: 17.5, cy: 70, r: 2.6, fill: "orange" },
      { kind: "circle", cx: 40, cy: 95, r: 3.4, fill: "orange" },
    ],
  },
  {
    id: "document",
    shapes: [
      // Folded top-right corner, as in the lockup.
      {
        kind: "path",
        d: "M68.5 64.5 H96 L106 74.5 V110 C106 112.2 104.2 114 102 114 H72.5 C70.3 114 68.5 112.2 68.5 110 Z",
        fill: "paper",
        stroke: "teal",
        width: 3.6,
      },
      { kind: "path", d: "M96 64.5 V74.5 H106", stroke: "teal", width: 3.2 },
    ],
  },
  {
    id: "tick",
    // Larger than the document, crossing its right edge.
    shapes: [{ kind: "path", d: "M78.5 91 L88.5 100.5 L114.5 73", stroke: "orange", width: 4.8, draw: true }],
  },
];

// --- icons (viewBox 0 0 48 48): solid rounded teal + 2.5px orange lines ending in nodes ---

export const ICON_VIEWBOX = "0 0 48 48";

const node = (cx: number, cy: number): Shape => ({ kind: "circle", cx, cy, r: 3, fill: "orange" });
const line = (d: string): Shape => ({ kind: "path", d, stroke: "orange", width: TRACE });

export const ICONS: Record<string, Shape[]> = {
  mic: [
    { kind: "rect", x: 16, y: 4, w: 16, h: 26, rx: 8, fill: "teal" },
    { kind: "path", d: "M10 22 C10 30 16.3 35 24 35 C31.7 35 38 30 38 22", stroke: "teal", width: 4 },
    line("M24 35 V41"),
    node(24, 43),
  ],
  "document-tick": [
    { kind: "rect", x: 8, y: 4, w: 26, h: 34, rx: 6, fill: "teal" },
    { kind: "path", d: "M14 13 H28 M14 20 H24", stroke: "paper", width: 3 },
    line("M24 34 L30 40 L42 27"),
    node(42, 27),
  ],
  keyboard: [
    { kind: "rect", x: 3, y: 11, w: 42, h: 26, rx: 7, fill: "teal" },
    { kind: "rect", x: 9, y: 17, w: 5, h: 5, rx: 1.5, fill: "paper" },
    { kind: "rect", x: 17, y: 17, w: 5, h: 5, rx: 1.5, fill: "paper" },
    { kind: "rect", x: 25, y: 17, w: 5, h: 5, rx: 1.5, fill: "paper" },
    { kind: "rect", x: 33, y: 17, w: 5, h: 5, rx: 1.5, fill: "paper" },
    line("M15 30 H33"),
    node(13, 30),
    node(35, 30),
  ],
  speaker: [
    { kind: "path", d: "M7 19 C7 17.3 8.3 16 10 16 H16 L25 8.5 C26.6 7.2 29 8.3 29 10.4 V37.6 C29 39.7 26.6 40.8 25 39.5 L16 32 H10 C8.3 32 7 30.7 7 29 Z", fill: "teal" },
    line("M35 17 C38 20.5 38 27.5 35 31"),
    node(35, 17),
    node(35, 31),
  ],
  phone: [
    { kind: "path", d: "M12.5 6 C14.2 5.6 16 6.5 16.7 8.1 L20 15.7 C20.6 17.2 20.2 18.9 19 19.9 L15.8 22.5 C18 27.5 21 30.5 25.8 32.7 L28.4 29.5 C29.4 28.3 31.1 27.9 32.6 28.5 L40.2 31.8 C41.8 32.5 42.7 34.3 42.3 36 L41.2 40.4 C40.7 42.3 39 43.6 37 43.5 C20.4 42.6 6.4 28.6 5.5 12 C5.4 10 6.7 8.3 8.6 7.8 Z", fill: "teal" },
    line("M30 6 C35.5 7.5 40.5 12.5 42 18"),
    node(30, 6),
    node(42, 18),
  ],
  "cloud-off": [
    { kind: "path", d: "M14 38 C8.5 38 4 33.5 4 28 C4 23 7.7 18.9 12.6 18.1 C14.4 12.2 19.8 8 26 8 C33.2 8 39.2 13.6 39.9 20.7 C43.4 22.1 45.5 25.4 45.5 29 C45.5 33.9 41.6 38 36.7 38 Z", fill: "teal" },
    line("M9 6 L39 42"),
    node(9, 6),
    node(39, 42),
  ],
  chevron: [{ kind: "path", d: "M17 10 L31 24 L17 38", stroke: "teal", width: 5 }],
  "node-tick": [line("M8 25 L18 35 L38 13"), node(8, 25), node(38, 13)],
};

// --- static SVG rendering (used by scripts/build-brand.mjs) ------------------------

export const LIGHT: Record<Tone, string> = { teal: "#1D2C49", orange: "#F26722", paper: "#FCF4E6", ink: "#1D2C49" };
export const DARK: Record<Tone, string> = { teal: "#F9B168", orange: "#F26722", paper: "#1D2C49", ink: "#FCF4E6" };

function shapeSvg(s: Shape, c: Record<Tone, string>): string {
  const paint =
    `fill="${s.fill ? c[s.fill] : "none"}"` +
    (s.stroke ? ` stroke="${c[s.stroke]}" stroke-width="${s.width ?? 2}" stroke-linecap="round" stroke-linejoin="round"` : "");
  if (s.kind === "circle") return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" ${paint}/>`;
  if (s.kind === "rect") return `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="${s.rx}" ${paint}/>`;
  return `<path d="${s.d}" ${paint}${s.draw ? ' pathLength="1"' : ""}/>`;
}

/** The full lockup: layered mark + "VayoSeva" wordmark. */
export function logoSvg(theme: "light" | "dark"): string {
  const c = theme === "dark" ? DARK : LIGHT;
  const layers = LOGO.map((l) => `  <g id="${l.id}">\n    ${l.shapes.map((s) => shapeSvg(s, c)).join("\n    ")}\n  </g>`).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 120" role="img" aria-label="VayoSeva">
  <title>VayoSeva</title>
${layers}
  <text x="134" y="78" font-family="Outfit, 'Anek Latin', system-ui, sans-serif" font-weight="600" font-size="52" letter-spacing="-1" fill="${c.ink}">VayoSeva</text>
</svg>
`;
}

export function iconSvg(name: string): string {
  const shapes = ICONS[name];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ICON_VIEWBOX}" aria-hidden="true">
  ${shapes.map((s) => shapeSvg(s, LIGHT)).join("\n  ")}
</svg>
`;
}
