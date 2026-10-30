// User-facing Malayalam strings shared by the API routes and the UI.

export const ML = {
  oneMoment: "ഒരു നിമിഷം...",
  // Appended by the server to every answer, so it's there whichever model replied.
  confirmClosing: "അവസാന വിവരങ്ങൾ അക്ഷയ കേന്ദ്രം ഉറപ്പിച്ചു പറയും.",
  feeLine: "ഫീസ് അക്ഷയ കേന്ദ്രം അറിയിക്കും.",
  // Appended when an answer uses a service whose official document list isn't published.
  listNotPublished: "ഈ സർട്ടിഫിക്കറ്റിന്റെ ഔദ്യോഗിക രേഖാ പട്ടിക പ്രസിദ്ധീകരിച്ചിട്ടില്ല.",
  greeting: "നമസ്കാരം! മൈക്ക് അമർത്തി നിങ്ങളുടെ ചോദ്യം ചോദിക്കൂ.",
  emptyQuestion: "ദയവായി നിങ്ങളുടെ ചോദ്യം പറയൂ.",
  tooLong: "ചോദ്യം വളരെ നീളമുള്ളതാണ്. ചുരുക്കി ചോദിക്കൂ.",
  badRequest: "ചോദ്യം മനസ്സിലായില്ല. വീണ്ടും ശ്രമിക്കൂ.",
  rateLimit: "ക്ഷമിക്കണം, ഇപ്പോൾ ഒരുപാട് ചോദ്യങ്ങൾ വരുന്നുണ്ട്. ഒരു മിനിറ്റ് കഴിഞ്ഞ് വീണ്ടും ചോദിക്കൂ.",
  apiError:
    "ക്ഷമിക്കണം, ഇപ്പോൾ ഉത്തരം കിട്ടുന്നില്ല. കുറച്ചു കഴിഞ്ഞ് വീണ്ടും ശ്രമിക്കൂ, അല്ലെങ്കിൽ അക്ഷയ കേന്ദ്രത്തിൽ ചോദിക്കൂ.",
  networkError: "ഇന്റർനെറ്റ് കണക്ഷൻ നോക്കി വീണ്ടും ശ്രമിക്കൂ.",
  loginNeeded: "അപേക്ഷിക്കാൻ ആദ്യം Google ഉപയോഗിച്ച് ലോഗിൻ ചെയ്യൂ.",
  paymentNotVerified: "പണമടവ് ഉറപ്പാക്കാൻ കഴിഞ്ഞില്ല. പണം പോയിട്ടുണ്ടെങ്കിൽ അക്ഷയ കേന്ദ്രത്തിൽ റഫറൻസ് നമ്പർ കാണിക്കൂ.",
} as const;

/** Malayalam message for a SpeechRecognition error code. */
export function recognitionErrorMl(code: string): string {
  switch (code) {
    case "no-speech":
      return "ഒന്നും കേട്ടില്ല. വീണ്ടും മൈക്ക് അമർത്തി സംസാരിക്കൂ.";
    case "not-allowed":
    case "service-not-allowed":
      return "മൈക്ക് ഉപയോഗിക്കാൻ അനുവാദമില്ല. ബ്രൗസറിൽ മൈക്ക് അനുവദിക്കൂ, അല്ലെങ്കിൽ ടൈപ്പ് ചെയ്യൂ.";
    case "network":
      return "ഇന്റർനെറ്റ് പ്രശ്നം. കണക്ഷൻ നോക്കി വീണ്ടും ശ്രമിക്കൂ.";
    case "audio-capture":
      return "മൈക്ക് കണ്ടെത്താനായില്ല. ടൈപ്പ് ചെയ്ത് ചോദിക്കൂ.";
    case "language-not-supported":
      return "ഈ ബ്രൗസറിൽ മലയാളം തിരിച്ചറിയാൻ കഴിയില്ല. ടൈപ്പ് ചെയ്ത് ചോദിക്കൂ.";
    default:
      return "കേൾക്കാൻ കഴിഞ്ഞില്ല. വീണ്ടും ശ്രമിക്കൂ.";
  }
}
