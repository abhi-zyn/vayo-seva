// Types for the application interview. The interview is driven by code
// (fixed order, conditions, read-back); the model only interprets answers.

export type FieldKind =
  | "choice" // one of `options` (buttons, or voice mapped by the model)
  | "yesno" // options are yes/no
  | "name" // spoken name -> TRANSLITERATED to UPPERCASE English
  | "place" // spoken place/house name -> TRANSLITERATED to UPPERCASE English
  | "translate" // spoken purpose/occupation/relation -> TRANSLATED to short English
  | "income" // spoken list of income sources -> items with yearly amounts
  | "digits" // keypad only, validated in code
  | "date" // keypad DD/MM/YYYY
  | "typed"; // free text typed by a family member (email, voter ID, house number)

export interface Option {
  value: string; // what goes on the form, in English
  ml: string; // what the button says / read-back speaks
}

export interface FieldDef {
  id: string;
  /** English label for the operator. */
  label: string;
  /** Malayalam question, spoken aloud. A function when the wording depends on earlier answers. */
  ask: string | ((a: Answers) => string);
  kind: FieldKind;
  optional?: boolean;
  options?: Option[];
  /** For digits/date/typed: returns a Malayalam error, or null if valid. */
  validate?: (v: string) => string | null;
  placeholder?: string;
  maxLength?: number;
  /** Only asked when this returns true. */
  when?: (a: Answers) => boolean;
}

/** A repeated block, e.g. one per family member, until "any more?" is answered no. */
export interface GroupDef {
  group: string;
  label: string;
  fields: FieldDef[];
  moreAsk: string;
}

export type Step = FieldDef | GroupDef;

export interface IncomeItem {
  source: string;
  amount: number;
  period: "month" | "year";
}

/** One answer, in the JSON shape from the Sahayi spec. */
export interface Answer {
  field: string;
  malayalam_raw: string;
  english_value: string | null;
  confidence: number;
  note_for_operator: string;
  items?: IncomeItem[];
}

export type Answers = Record<string, Answer>;

export const isGroup = (s: Step): s is GroupDef => "group" in s;
