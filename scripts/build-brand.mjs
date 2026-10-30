// Writes the static brand files from lib/brand/paths.ts:
//   public/brand/vayoseva-logo.svg, public/brand/vayoseva-logo-dark.svg
//   public/icons/<name>.svg
// Usage: npm run brand   (re-run after changing the logo or icon shapes)

import { mkdirSync, writeFileSync } from "node:fs";
import { ICONS, iconSvg, logoSvg } from "../lib/brand/paths.ts";

const root = new URL("../public/", import.meta.url);
mkdirSync(new URL("brand/", root), { recursive: true });
mkdirSync(new URL("icons/", root), { recursive: true });

writeFileSync(new URL("brand/vayoseva-logo.svg", root), logoSvg("light"));
writeFileSync(new URL("brand/vayoseva-logo-dark.svg", root), logoSvg("dark"));
for (const name of Object.keys(ICONS)) writeFileSync(new URL(`icons/${name}.svg`, root), iconSvg(name));

console.log(`Wrote 2 logo files and ${Object.keys(ICONS).length} icons to public/`);
