// What Sahayi says back after each answer, before "ശരിയാണോ?" (rule 8).

import type { Answer, FieldDef, IncomeItem } from "./types";

const DIGIT_ML = ["പൂജ്യം", "ഒന്ന്", "രണ്ട്", "മൂന്ന്", "നാല്", "അഞ്ച്", "ആറ്", "ഏഴ്", "എട്ട്", "ഒമ്പത്"];

/** "9876" -> "ഒമ്പത്, എട്ട്, ഏഴ്, ആറ്": digit by digit (rule 7), groups of 4 separated by a pause. */
export function digitsMl(value: string): string {
  const digits = value.replace(/\D/g, "").split("");
  const groups: string[] = [];
  for (let i = 0; i < digits.length; i += 4) {
    groups.push(digits.slice(i, i + 4).map((d) => DIGIT_ML[Number(d)]).join(" "));
  }
  return groups.join(". ");
}

const SOURCE_ML: Record<string, string> = {
  salary: "ശമ്പളം",
  pension: "പെൻഷൻ",
  agriculture: "കൃഷി",
  "daily wages": "കൂലിപ്പണി",
  business: "കച്ചവടം",
  rent: "വാടക",
  abroad: "വിദേശത്തു നിന്ന്",
  other: "മറ്റു വരുമാനം",
};

// Number words as they're said before a noun ("ഒരു വർഷം", not "ഒന്ന് വർഷം").
const NUM_ML: Record<string, string> = { "1": "ഒരു", "3": "മൂന്ന്", "5": "അഞ്ച്", "6": "ആറ്", "7": "ഏഴ്" };

/** "1 year" / "Lifelong" / "Special purpose" -> spoken Malayalam. Unknown text is returned unchanged. */
export function validityMl(v: string): string {
  if (/^lifelong$/i.test(v)) return "ആജീവനാന്തം";
  if (/^special purpose$/i.test(v)) return "പ്രത്യേക ആവശ്യത്തിന് മാത്രം";
  const m = v.match(/^(\d+) years?$/i);
  return m ? `${NUM_ML[m[1]] ?? m[1]} വർഷം` : v;
}

/** "6 working days" / "Not listed" -> spoken Malayalam. */
export function processingMl(v: string): string {
  if (/^not listed$/i.test(v)) return "ഔദ്യോഗികമായി പറഞ്ഞിട്ടില്ല";
  const m = v.match(/^(\d+) working days?$/i);
  return m ? `${NUM_ML[m[1]] ?? m[1]} പ്രവൃത്തി ദിവസം` : v;
}

/** Monthly amounts become yearly (x12) in code, never by the model. */
export const yearly = (i: IncomeItem) => (i.period === "month" ? i.amount * 12 : i.amount);
export const totalYearly = (items: IncomeItem[]) => items.reduce((sum, i) => sum + yearly(i), 0);
const rupees = (n: number) => `${n.toLocaleString("en-IN")} രൂപ`;

export function readBack(field: FieldDef, ans: Answer): string {
  const v = ans.english_value ?? "";
  let said: string;
  switch (field.kind) {
    // Answers may be spoken or typed, so the wording doesn't say which.
    case "digits":
      said = `നമ്പർ: ${digitsMl(v)}`;
      break;
    case "date": {
      const [d, m, y] = v.split("/");
      said = `തീയതി: ദിവസം ${digitsMl(d)}. മാസം ${digitsMl(m)}. വർഷം ${digitsMl(y)}`;
      break;
    }
    case "typed":
      said = `കിട്ടിയത്: ${v}`;
      break;
    case "choice":
    case "yesno":
      said = field.options?.find((o) => o.value === v)?.ml ?? ans.malayalam_raw;
      break;
    case "income": {
      const items = ans.items ?? [];
      const parts = items.map((i) => `${SOURCE_ML[i.source] ?? i.source}, വർഷം ${rupees(yearly(i))}`);
      said = `${parts.join(". ")}. ആകെ വാർഷിക വരുമാനം ${rupees(totalYearly(items))}`;
      break;
    }
    default:
      // Names, places, translations: repeat what they said in Malayalam; the
      // English spelling is shown on screen for a family member to check.
      said = `നിങ്ങൾ പറഞ്ഞത്: ${ans.malayalam_raw || v}`;
  }
  return `${said}. ശരിയാണോ?`;
}
