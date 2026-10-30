// Keypad/typed answer checks. Each returns a Malayalam message, or null if OK.

const onlyDigits = (v: string) => v.replace(/\D/g, "");

export const validators = {
  aadhaar: (v: string) => (/^\d{12}$/.test(onlyDigits(v)) ? null : "ആധാർ നമ്പറിൽ 12 അക്കങ്ങൾ വേണം."),
  mobile: (v: string) =>
    /^[6-9]\d{9}$/.test(onlyDigits(v)) ? null : "മൊബൈൽ നമ്പറിൽ 10 അക്കങ്ങൾ വേണം. 6, 7, 8, 9 ഇവയിൽ ഒന്നിൽ തുടങ്ങണം.",
  ration: (v: string) => (/^\d{10}$/.test(onlyDigits(v)) ? null : "റേഷൻ കാർഡ് നമ്പറിൽ 10 അക്കങ്ങൾ വേണം."),
  pin: (v: string) =>
    /^6[789]\d{4}$/.test(onlyDigits(v)) ? null : "പിൻ കോഡിൽ 6 അക്കങ്ങൾ വേണം. 67, 68, 69 ഇവയിൽ ഒന്നിൽ തുടങ്ങണം.",
  ward: (v: string) => (/^\d{1,3}$/.test(onlyDigits(v)) ? null : "വാർഡ് നമ്പർ ശരിയല്ല."),
  age: (v: string) => {
    const n = Number(onlyDigits(v));
    return onlyDigits(v) && n <= 120 ? null : "ശരിയായ വയസ്സ് ടൈപ്പ് ചെയ്യൂ.";
  },
  years: (v: string) => {
    const n = Number(onlyDigits(v));
    return onlyDigits(v) && n <= 120 ? null : "ശരിയായ വർഷങ്ങളുടെ എണ്ണം ടൈപ്പ് ചെയ്യൂ.";
  },
  count: (v: string) => {
    const n = Number(onlyDigits(v));
    return onlyDigits(v) && n >= 1 && n <= 50 ? null : "ശരിയായ എണ്ണം ടൈപ്പ് ചെയ്യൂ.";
  },
  amount: (v: string) => (/^\d{1,10}$/.test(onlyDigits(v)) ? null : "തുക രൂപയിൽ അക്കങ്ങളായി ടൈപ്പ് ചെയ്യൂ."),
  /** Past date in DD/MM/YYYY (8 digits typed). */
  pastDate: (v: string) => {
    const d = onlyDigits(v);
    const bad = "തീയതി ശരിയല്ല. ദിവസം, മാസം, വർഷം എന്ന ക്രമത്തിൽ 8 അക്കങ്ങൾ ടൈപ്പ് ചെയ്യൂ.";
    if (d.length !== 8) return bad;
    const day = Number(d.slice(0, 2));
    const month = Number(d.slice(2, 4));
    const year = Number(d.slice(4));
    const date = new Date(year, month - 1, day);
    const real = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
    if (!real || year < 1900 || date > new Date()) return bad;
    return null;
  },
  email: (v: string) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : "ഇമെയിൽ വിലാസം ശരിയല്ല."),
  // Lenient on purpose: we don't know every ID format, the operator checks.
  voterId: (v: string) => (/^[A-Za-z0-9/]{5,15}$/.test(v.trim()) ? null : "വോട്ടർ ഐഡി നമ്പർ ശരിയല്ല."),
  houseNumber: (v: string) => (v.trim().length >= 1 && v.trim().length <= 20 ? null : "വീട്ടു നമ്പർ ശരിയല്ല."),
};

/** Value to store for a keypad/typed answer: digits only, or DD/MM/YYYY for dates. */
export function normalizeKeyed(kind: "digits" | "date" | "typed", v: string): string {
  if (kind === "digits") return onlyDigits(v);
  if (kind === "date") {
    const d = onlyDigits(v);
    return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4, 8)}`;
  }
  // Emails are case-insensitive by convention; IDs and house numbers go in uppercase.
  return v.includes("@") ? v.trim().toLowerCase() : v.trim().toUpperCase();
}
