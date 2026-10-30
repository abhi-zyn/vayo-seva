// Spoken commands while scanning documents. Matched in code, no AI call.
// Order matters: "വീണ്ടും എടുക്കൂ" is a retake, not a capture.

export type DocCommand = "skipAll" | "skip" | "done" | "more" | "retake" | "capture" | "accept";

const WORDS: [DocCommand, string[]][] = [
  ["skipAll", ["എല്ലാം ഒഴിവാക്ക", "എല്ലാ രേഖകളും ഒഴിവാക്ക", "skip all"]],
  ["skip", ["ഒഴിവാക്ക", "പിന്നീട്", "ഇല്ല", "skip", "later"]],
  ["done", ["കഴിഞ്ഞു", "മതി", "തീർന്നു", "done", "finish", "finished"]],
  ["more", ["അടുത്ത", "ഇനിയും", "ഒന്നുകൂടി ഉണ്ട്", "next", "more", "another"]],
  ["retake", ["വീണ്ടും", "മാറ്റ", "again", "retake"]],
  ["capture", ["എടുക്ക", "ഫോട്ടോ", "ക്ലിക്ക്", "സ്കാൻ", "take", "capture", "photo", "click", "scan"]],
  ["accept", ["ശരി", "അതെ", "കൊള്ളാം", "ok", "okay", "yes", "correct", "good"]],
];

/** English words must match whole words ("ok" isn't in "book"); Malayalam stems match anywhere. */
export function parseDocCommand(text: string): DocCommand | null {
  const t = text.toLowerCase();
  const tokens = new Set(t.split(/[^a-z]+/).filter(Boolean));
  for (const [cmd, words] of WORDS) {
    if (words.some((w) => (/^[a-z]+$/.test(w) ? tokens.has(w) : t.includes(w)))) return cmd; // "skip all" (has a space) matches as a phrase
  }
  return null;
}
