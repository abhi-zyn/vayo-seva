// Walks the interview: which field is next, given the answers so far.
// Pure functions, no React, so the order is easy to test and reason about.

import { PART_A } from "./part-a";
import { SERVICE_FIELDS } from "./service-fields";
import { isGroup, type Answers, type FieldDef, type Step } from "./types";

const MAX_GROUP_ITEMS = 15;

/** Part A for everyone, then the service's extra details. */
export function stepsFor(serviceId: string): Step[] {
  return [...PART_A, ...(SERVICE_FIELDS[serviceId] ?? [])];
}

/**
 * The next unanswered field, or null when the interview is complete.
 * Group fields get ids like "family_members.0.name"; after each item a
 * "family_members.0.more" yes/no decides whether to ask another.
 */
export function nextField(steps: Step[], a: Answers): FieldDef | null {
  for (const step of steps) {
    if (!isGroup(step)) {
      if (step.when && !step.when(a)) continue;
      if (!(step.id in a)) return step;
      continue;
    }
    for (let i = 0; i < MAX_GROUP_ITEMS; i++) {
      for (const f of step.fields) {
        const id = `${step.group}.${i}.${f.id}`;
        if (!(id in a)) return { ...f, id, label: `${step.label} ${i + 1}: ${f.label}` };
      }
      const moreId = `${step.group}.${i}.more`;
      if (!(moreId in a)) {
        return {
          id: moreId,
          label: `${step.label}: any more?`,
          ask: step.moreAsk,
          kind: "yesno",
          options: [
            { value: "yes", ml: "ഉണ്ട്" },
            { value: "no", ml: "ഇല്ല" },
          ],
        };
      }
      if (a[moreId].english_value !== "yes") break;
    }
  }
  return null;
}

export const askText = (f: FieldDef, a: Answers) => (typeof f.ask === "function" ? f.ask(a) : f.ask);

// --- yes / no / don't know from a transcript --------------------------------

// "no" is checked first: "ശരിയല്ല" contains both ശരി and അല്ല.
const NO_WORDS = ["അല്ല", "തെറ്റ്", "ഇല്ല", "വേണ്ട", "no", "alla", "illa", "thettu", "wrong", "venda"];
const YES_WORDS = ["ശരി", "അതെ", "ഉണ്ട്", "ആണ്", "ശെരി", "yes", "correct", "sheri", "shari", "athe", "undu", "ok"];
const DONT_KNOW = ["അറിയില്ല", "അറിയത്തില്ല", "ഓർമ്മയില്ല", "ഓർമയില്ല", "ariyilla", "don't know", "dont know", "not sure"];
// "None / not needed": skips an OPTIONAL question by voice (email, voter ID, ...).
const NONE_WORDS = ["ഇല്ല", "വേണ്ട", "ഒന്നുമില്ല", "no", "illa", "none", "venda", "onnumilla"];

/**
 * Malayalam words match anywhere (they carry suffixes: ശരിയാണ്, ഇല്ലല്ലോ).
 * English words must match whole words, so "know" or a name like "Noufal" isn't "no".
 */
function hasWord(text: string, words: string[]): boolean {
  const t = text.toLowerCase();
  const tokens = new Set(t.split(/[^a-z']+/).filter(Boolean));
  return words.some((w) => (/^[a-z' ]+$/.test(w) ? (w.includes(" ") ? t.includes(w) : tokens.has(w)) : t.includes(w)));
}

export function detectYesNo(text: string): "yes" | "no" | null {
  if (hasWord(text, DONT_KNOW)) return null;
  if (hasWord(text, NO_WORDS)) return "no";
  if (hasWord(text, YES_WORDS)) return "yes";
  return null;
}

export const saysDontKnow = (text: string) => hasWord(text, DONT_KNOW);
export const saysNone = (text: string) => hasWord(text, NONE_WORDS);
