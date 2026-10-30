// The knowledge base, validated once when the server module loads.
// Imported as JSON (not read with fs) so it's bundled into the Vercel function.

import raw from "@/data/services.json";
import { validateServices, type Service } from "./service-schema";

export type { Service };
export { anyUnverified } from "./service-schema";

export const services: Service[] = validateServices(raw);
