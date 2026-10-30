// Shape of one entry in data/services.json, plus a runtime check so a
// hand-edited JSON file fails loudly instead of silently feeding bad data
// to the model. Kept free of imports so plain `node` can run it too.

export interface Service {
  id: string;
  name_en: string;
  name_ml: string;
  used_for: string;
  documents: string[];
  fee: string;
  issued_by: string;
  notes: string;
  source: string;
  last_verified: string;
  verified: boolean;
}

const STRING_FIELDS = [
  "id",
  "name_en",
  "name_ml",
  "used_for",
  "fee",
  "issued_by",
  "notes",
  "source",
  "last_verified",
] as const;

/** Throws with a readable message (entry index + field) if `raw` is malformed. */
export function validateServices(raw: unknown): Service[] {
  if (!Array.isArray(raw)) throw new Error("services.json must be an array");
  const seen = new Set<string>();

  raw.forEach((entry, i) => {
    const where = `services.json entry ${i}`;
    if (typeof entry !== "object" || entry === null) throw new Error(`${where} is not an object`);
    const e = entry as Record<string, unknown>;

    for (const f of STRING_FIELDS) {
      if (typeof e[f] !== "string" || (e[f] as string).trim() === "") {
        throw new Error(`${where}: "${f}" must be a non-empty string`);
      }
    }
    if (!Array.isArray(e.documents) || !e.documents.every((d) => typeof d === "string" && d.trim() !== "")) {
      throw new Error(`${where}: "documents" must be an array of non-empty strings`);
    }
    if (typeof e.verified !== "boolean") throw new Error(`${where}: "verified" must be true or false`);
    if (seen.has(e.id as string)) throw new Error(`${where}: duplicate id "${e.id}"`);
    seen.add(e.id as string);
  });

  return raw as Service[];
}

/** True if any of the given services is not yet verified (drives the UI badge). */
export function anyUnverified(services: Service[]): boolean {
  return services.some((s) => !s.verified);
}
