// Every home-screen and loading-state string, Malayalam and English, in one object.
// The toggle picks which language leads on screen; the other shows as the smaller
// second line where it helps an Akshaya operator. Speech is always Malayalam.

const ML_STRINGS = {
    brandTagline: "കുറവ് യാത്ര. കുറവ് ടെൻഷൻ. എളുപ്പമുള്ള സേവനങ്ങൾ.",
    taglinePhrases: ["കുറവ് യാത്ര.", "കുറവ് ടെൻഷൻ.", "എളുപ്പമുള്ള സേവനങ്ങൾ."],
    assistantName: "അക്ഷയ സഹായി",
    langToggle: "English",
    help: "സഹായം",
    greetingMorning: "സുപ്രഭാതം",
    greetingDay: "നമസ്കാരം",
    greetingEvening: "ശുഭ സായാഹ്നം",
    prompt: "മൈക്കിൽ തൊട്ട് നിങ്ങളുടെ ചോദ്യം പറയൂ.",
    micIdle: "സംസാരിക്കാൻ തൊടൂ",
    micListening: "കേൾക്കുന്നു… പറഞ്ഞു കഴിഞ്ഞാൽ വീണ്ടും തൊടൂ",
    micAgain: "വീണ്ടും ചോദിക്കാൻ തൊടൂ",
    heard: "കേട്ടത്",
    apply: "സർട്ടിഫിക്കറ്റിന് അപേക്ഷിക്കാം",
    type: "ടൈപ്പ് ചെയ്ത് ചോദിക്കുക",
    typeLabel: "ചോദ്യം ഇവിടെ എഴുതൂ",
    typePlaceholder: "ഉദാ: വരുമാന സർട്ടിഫിക്കറ്റിന് എന്തൊക്കെ വേണം?",
    typeSend: "ചോദിക്കുക",
    commonServices: "പതിവ് സേവനങ്ങൾ",
    voiceOnline: "ഓൺലൈൻ മലയാളം ശബ്ദം ഉപയോഗിക്കുന്നു",
    voiceDevice: "ഫോണിലെ മലയാളം ശബ്ദം ഉപയോഗിക്കുന്നു",
    voiceNone: "ശബ്ദം കേൾപ്പിക്കാൻ കഴിഞ്ഞില്ല. സ്ക്രീനിൽ വായിക്കൂ.",
    disclaimer: "വിവരങ്ങൾ മാറാം. ദയവായി നിങ്ങളുടെ അക്ഷയ കേന്ദ്രത്തിൽ ഉറപ്പാക്കുക.",
    call: "ഇ-ഡിസ്ട്രിക്റ്റ് സഹായം വിളിക്കുക",
    // A. splash
    preparing: "തയ്യാറാകുന്നു…",
    ready: "തയ്യാറായി",
    skip: "തുടരാൻ തൊടൂ",
    // C. thinking
    thinking: ["ഉത്തരം തിരയുന്നു…", "ഒരു നിമിഷം…", "വിവരങ്ങൾ ശേഖരിക്കുന്നു…"],
    slow: "കുറച്ചു സമയം കൂടി എടുക്കുന്നു",
    cancel: "റദ്ദാക്കുക",
    cancelled: "റദ്ദാക്കി. വീണ്ടും ചോദിക്കാം.",
    // D. speaking
    answer: "ഉത്തരം",
    replay: "വീണ്ടും കേൾക്കുക",
    stop: "നിർത്തുക",
    slower: "പതുക്കെ",
    normalSpeed: "സാധാരണ വേഗം",
    unverified: "ഇതുവരെ ഉറപ്പാക്കിയിട്ടില്ല",
    // E. success
    submitted: "അപേക്ഷ സമർപ്പിച്ചു",
    reference: "റഫറൻസ് നമ്പർ",
    readAloud: "വായിച്ചു കേൾപ്പിക്കുക",
    // F. error
    offline: "ഇന്റർനെറ്റ് ഇല്ല. വീണ്ടും ശ്രമിക്കാം.",
    retry: "വീണ്ടും ശ്രമിക്കുക",
    // Help panel
    helpTitle: "എങ്ങനെ ഉപയോഗിക്കാം",
    helpSteps: [
      "നീല മൈക്കിൽ ഒരു തവണ തൊടൂ.",
      "നിങ്ങളുടെ ചോദ്യം മലയാളത്തിൽ പറയൂ. പറഞ്ഞു കഴിഞ്ഞാൽ വീണ്ടും തൊടൂ.",
      "ഉത്തരം വായിച്ചു കേൾപ്പിക്കും. വീണ്ടും കേൾക്കാൻ വീണ്ടും കേൾക്കുക അമർത്തൂ.",
      "സർട്ടിഫിക്കറ്റിന് അപേക്ഷിക്കാൻ താഴെയുള്ള ബട്ടൺ അമർത്തൂ.",
    ],
    helpClose: "ശരി, മനസ്സിലായി",
};

/** Same keys in every language; values are plain strings (or string lists). */
export type UIStrings = { [K in keyof typeof ML_STRINGS]: (typeof ML_STRINGS)[K] extends string[] ? readonly string[] : string };

const EN_STRINGS: UIStrings = {
    brandTagline: "Fewer Trips. Less Stress. Easier Services.",
    taglinePhrases: ["Fewer Trips.", "Less Stress.", "Easier Services."],
    assistantName: "Akshaya Sahayi",
    langToggle: "മലയാളം",
    help: "Help",
    greetingMorning: "Good morning",
    greetingDay: "Namaskaram",
    greetingEvening: "Good evening",
    prompt: "Touch the mic and say your question.",
    micIdle: "Touch to speak",
    micListening: "Listening… touch again when you're done",
    micAgain: "Touch to ask again",
    heard: "Heard",
    apply: "Apply for a certificate",
    type: "Type your question",
    typeLabel: "Write your question here",
    typePlaceholder: "e.g. What do I need for an income certificate?",
    typeSend: "Ask",
    commonServices: "Common services",
    voiceOnline: "Using the online Malayalam voice",
    voiceDevice: "Using this phone's Malayalam voice",
    voiceNone: "Couldn't play the voice. Please read the screen.",
    disclaimer: "Information may change. Please confirm with your Akshaya center.",
    call: "Call the e-District helpline",
    preparing: "Getting ready…",
    ready: "Ready",
    skip: "Touch to continue",
    thinking: ["Looking for the answer…", "One moment…", "Gathering the details…"],
    slow: "This is taking a little longer",
    cancel: "Cancel",
    cancelled: "Cancelled. You can ask again.",
    answer: "Answer",
    replay: "Hear again",
    stop: "Stop",
    slower: "Slower",
    normalSpeed: "Normal speed",
    unverified: "Not yet verified",
    submitted: "Application submitted",
    reference: "Reference number",
    readAloud: "Read it aloud",
    offline: "No internet. Let's try again.",
    retry: "Try again",
    helpTitle: "How to use",
    helpSteps: [
      "Touch the blue mic once.",
      "Say your question in Malayalam. Touch again when you've finished.",
      "The answer is read aloud. Press Hear again to repeat it.",
      "To apply for a certificate, press the button below.",
    ],
    helpClose: "OK, got it",
};

export type Lang = "ml" | "en";
export const STRINGS: Record<Lang, UIStrings> = { ml: ML_STRINGS, en: EN_STRINGS };

/** e-District helpline from the official FAQ. Override with NEXT_PUBLIC_HELPLINE. */
export const HELPLINE = {
  tel: process.env.NEXT_PUBLIC_HELPLINE_TEL || "04712525444",
  display: process.env.NEXT_PUBLIC_HELPLINE_DISPLAY || "0471 2525444",
};

/** Common-service chips: label plus the question asked when tapped. */
export const CHIPS = [
  { ml: "വരുമാന സർട്ടിഫിക്കറ്റ്", en: "Income certificate", ask: "വരുമാന സർട്ടിഫിക്കറ്റിന് എന്തൊക്കെ വേണം?" },
  { ml: "ആധാർ", en: "Aadhaar", ask: "ആധാർ സേവനങ്ങൾക്ക് എന്തു ചെയ്യണം?" },
  { ml: "പെൻഷൻ", en: "Pension", ask: "പെൻഷൻ സേവനങ്ങൾക്ക് എന്തു ചെയ്യണം?" },
  { ml: "റേഷൻ കാർഡ്", en: "Ration card", ask: "റേഷൻ കാർഡ് സേവനങ്ങൾക്ക് എന്തു ചെയ്യണം?" },
];

export function greetingKey(hour: number): "greetingMorning" | "greetingDay" | "greetingEvening" {
  if (hour >= 4 && hour < 12) return "greetingMorning";
  if (hour >= 17 || hour < 4) return "greetingEvening";
  return "greetingDay";
}
