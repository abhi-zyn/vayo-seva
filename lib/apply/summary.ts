// Builds the final JSON for the operator, in the shape from the Sahayi spec:
// { service, applicant, service_details, documents_to_upload, missing_or_unsure }

import type { Service } from "../service-schema";
import { nextField, stepsFor } from "./engine";
import { PART_A } from "./part-a";
import { totalYearly, yearly } from "./readback";
import { isGroup, type Answers, type FieldDef } from "./types";

export interface Application {
  service: string;
  service_id: string;
  applicant: Record<string, string | null>;
  service_details: Record<string, unknown>;
  documents_to_upload: string[];
  missing_or_unsure: string[];
}

const LOW_CONFIDENCE = 0.7;

export function buildApplication(service: Service, a: Answers): Application {
  const steps = stepsFor(service.id);
  const missing: string[] = [];

  const note = (label: string, id: string, optional?: boolean) => {
    const ans = a[id];
    if (!ans) return;
    if (ans.english_value === null && !optional) missing.push(`${label}: not known`);
    else if (ans.english_value !== null && ans.confidence < LOW_CONFIDENCE)
      missing.push(`${label}: unsure${ans.note_for_operator ? ` (${ans.note_for_operator})` : ""}`);
    else if (ans.note_for_operator && ans.english_value !== null) missing.push(`${label}: ${ans.note_for_operator}`);
  };
  const value = (f: FieldDef) => {
    note(f.label, f.id, f.optional);
    return a[f.id]?.english_value ?? null;
  };

  const applicant: Record<string, string | null> = {};
  const details: Record<string, unknown> = {};

  for (const [i, step] of steps.entries()) {
    // Part A comes first in stepsFor(); everything after it is service detail.
    const target = i < PART_A.length ? applicant : details;
    if (!isGroup(step)) {
      if (!(step.id in a)) continue; // skipped by a `when` condition
      if (step.kind === "income") {
        const items = a[step.id]?.items ?? [];
        note(step.label, step.id, step.optional);
        details.income_sources = items.map((it) => ({ source: it.source, yearly_amount: yearly(it) }));
        details.total_annual_income = totalYearly(items);
        continue;
      }
      target[step.id] = value(step);
      if (step.id === "full_name") applicant.name_malayalam = a.full_name?.malayalam_raw || null;
      continue;
    }
    const items: Record<string, string | null>[] = [];
    for (let n = 0; `${step.group}.${n}.${step.fields[0].id}` in a; n++) {
      const item: Record<string, string | null> = {};
      for (const f of step.fields) {
        const id = `${step.group}.${n}.${f.id}`;
        item[f.id] = value({ ...f, id, label: `${step.label} ${n + 1}: ${f.label}` });
      }
      items.push(item);
    }
    details[step.group] = items;
  }

  return {
    service: service.edistrict_name,
    service_id: service.id,
    applicant,
    service_details: details,
    documents_to_upload: service.documents,
    missing_or_unsure: missing,
  };
}

/** True when every field that applies has an answer (null counts: rule 9). */
export const isComplete = (serviceId: string, a: Answers) => nextField(stepsFor(serviceId), a) === null;
