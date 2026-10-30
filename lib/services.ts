// The knowledge base, validated once when the server module loads.
// Imported as JSON (not read with fs) so it's bundled into the Vercel function.

import raw from "@/data/services.json";
import general from "@/data/general.json";
import { validateServices, type Service } from "./service-schema";

export type { Service };
export { anyUnverified } from "./service-schema";

export const services: Service[] = validateServices(raw);

/** Facts that apply to every service, and services the app can't help with. */
export const generalInfo: {
  facts: string[];
  not_available: { name_en: string; name_ml: string; reason: string }[];
} = general;
