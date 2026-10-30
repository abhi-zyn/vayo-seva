"use client";

// Application interview ("Sahayi"): pick a certificate, answer one question at
// a time, confirm each answer, review, send to the Akshaya operator.
// Screens: pick → (scst) → info → ask ⇄ confirm → review → sent.
//
// Voice-first: everything is read aloud in Malayalam, and once the mic is
// allowed every screen listens by itself, so the whole flow works hands-free.
// Every step can also be done by tapping or typing.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { SpeedPicker } from "@/components/SpeedPicker";
import { SuccessState } from "@/components/states/SuccessState";
import { STRINGS } from "@/lib/ui-strings";
import { askText, detectYesNo, nextField, saysDontKnow, saysNone, stepsFor } from "@/lib/apply/engine";
import { extractAnswer } from "@/lib/apply/extract-client";
import { digitsMl, processingMl, readBack, totalYearly, validityMl } from "@/lib/apply/readback";
import { buildApplication } from "@/lib/apply/summary";
import type { Answer, Answers, FieldDef, Option } from "@/lib/apply/types";
import { normalizeKeyed } from "@/lib/apply/validate";
import { ML, recognitionErrorMl } from "@/lib/messages";
import { generalInfo, services, type Service } from "@/lib/services";
import { useRecognition } from "@/lib/use-recognition";
import { useSpeaker } from "@/lib/use-speaker";
import { parseDocCommand } from "@/lib/docs/commands";
import { PaymentCancelled, payWithRazorpay, paymentsOnClient, type PaymentInfo } from "@/lib/pay-client";
import { signInWithGoogle, supabaseBrowser } from "@/lib/supabase/client";
import { authEnabled } from "@/lib/supabase/config";
import { kb } from "@/lib/docs/compress";
import { clearDocs } from "@/lib/docs/store";
import { AnswerInput } from "./AnswerInput";
import { DocCapture, type DocCaptureHandle, type DocResult, type DocToScan } from "./DocCapture";
import { MicButton } from "./MicButton";
import { ReviewList } from "./ReviewList";
import styles from "./apply.module.css";

type Screen = "pick" | "scst" | "info" | "ask" | "confirm" | "docs" | "review" | "sent" | "unavailable";

const SAY = {
  pick: "ഏത് സർട്ടിഫിക്കറ്റാണ് വേണ്ടത്? പേര് പറയൂ, അല്ലെങ്കിൽ താഴെ നിന്ന് തിരഞ്ഞെടുക്കൂ.",
  scst: "നിങ്ങൾ പട്ടികജാതി അല്ലെങ്കിൽ പട്ടികവർഗ വിഭാഗത്തിൽ പെട്ടതാണോ?",
  toCommunity: "പട്ടികജാതി, പട്ടികവർഗ വിഭാഗക്കാർക്ക് ജാതി സർട്ടിഫിക്കറ്റ് അല്ല, കമ്മ്യൂണിറ്റി സർട്ടിഫിക്കറ്റ് ആണ് വേണ്ടത്.",
  startQuestions: "ഇനി കുറച്ച് വിവരങ്ങൾ ചോദിക്കാം.",
  unclear: "മനസ്സിലായില്ല. ഒന്നുകൂടി പറയാമോ?",
  again: "ശരി, ഒന്നുകൂടി പറയൂ.",
  noSpeech: "ഒന്നും കേട്ടില്ല. ഒന്നുകൂടി പറയൂ.",
  typeHelp: "ദയവായി ടൈപ്പ് ചെയ്യൂ, അല്ലെങ്കിൽ കുടുംബത്തിലെ ആരുടെയെങ്കിലും സഹായം തേടൂ.",
  yesNoHelp: "ശരിയാണെങ്കിൽ ശരി എന്നും, അല്ലെങ്കിൽ അല്ല എന്നും പറയൂ.",
  review:
    "എല്ലാ വിവരങ്ങളും കിട്ടി. സ്ക്രീനിലെ വിവരങ്ങൾ കുടുംബത്തിലെ ആരെയെങ്കിലും കൊണ്ട് ഒന്നു നോക്കിക്കൂ. അക്ഷയ കേന്ദ്രത്തിലേക്ക് അയയ്ക്കട്ടെ?",
  payOpening: "പണമടയ്ക്കാനുള്ള സ്ക്രീൻ തുറക്കുന്നു. യു.പി.ഐ., കാർഡ്, നെറ്റ് ബാങ്കിങ് ഇവയിൽ ഏതും ഉപയോഗിക്കാം.",
  payCancelled: "പണമടച്ചില്ല. തയ്യാറാകുമ്പോൾ അയയ്ക്കൂ എന്ന് പറയൂ, അല്ലെങ്കിൽ ബട്ടൺ അമർത്തൂ.",
  notSent: "ശരി, അയച്ചില്ല. തിരുത്താൻ അവസാന ഉത്തരം തിരുത്തുക അമർത്തൂ. അയയ്ക്കാൻ അയയ്ക്കൂ എന്ന് പറയൂ.",
  unavailable: "ഈ സേവനത്തിന് ഈ ആപ്പ് വഴി അപേക്ഷിക്കാൻ കഴിയില്ല. ദയവായി അക്ഷയ കേന്ദ്രം സന്ദർശിക്കൂ.",
};

const NOT_AVAILABLE = "not_available";
const SERVICE_OPTIONS: Option[] = [
  ...services.map((s) => ({ value: s.id, ml: `${s.name_ml} (${s.name_en})` })),
  { value: NOT_AVAILABLE, ml: generalInfo.not_available.map((n) => n.name_en).join(", ") },
];
const OTP_TIME_ML: Record<string, string> = { Morning: "രാവിലെ", Afternoon: "ഉച്ചയ്ക്ക്", Evening: "വൈകുന്നേരം" };

/** Everything on the info screen, as one spoken Malayalam paragraph. */
const infoText = (s: Service) =>
  [
    `${s.name_ml}.`,
    `ഇതിനായി ${s.documents_ml.join(", ")} എന്നിവ കയ്യിൽ കരുതുക.`,
    `സർട്ടിഫിക്കറ്റിന്റെ കാലാവധി ${validityMl(s.validity)}. കിട്ടാൻ എടുക്കുന്ന സമയം ${processingMl(s.processing_time)}.`,
    s.accepted_documents.length === 0 ? ML.listNotPublished : "",
    ML.feeLine,
    "ആധാറിലെ പേരും ജനന തീയതിയും കൃത്യമായി പറയണം.",
    ML.confirmClosing,
  ]
    .filter(Boolean)
    .join(" ");

/** With accounts on, applying needs Google sign-in first; asking questions never does. */
export default function ApplyPage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(authEnabled ? null : true);
  useEffect(() => {
    const sb = supabaseBrowser();
    if (!sb) return;
    sb.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));
    const { data } = sb.auth.onAuthStateChange((_e, session) => setSignedIn(Boolean(session?.user)));
    return () => data.subscription.unsubscribe();
  }, []);
  if (signedIn === null) return <main className={styles.main} aria-busy="true" />;
  return signedIn ? <ApplyFlow /> : <LoginGate />;
}

function LoginGate() {
  const speaker = useSpeaker();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    speaker.say(`${ML.loginNeeded} താഴെയുള്ള ബട്ടൺ അമർത്തൂ. ഒരിക്കൽ ലോഗിൻ ചെയ്താൽ മതി.`);
  }, []);
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <Link href="/" className={styles.homeLink}>
          ← ചോദ്യം ചോദിക്കാൻ
        </Link>
        <h1 className={styles.title}>സർട്ടിഫിക്കറ്റ് അപേക്ഷ</h1>
      </header>
      <section className={styles.card}>
        <p className={styles.question}>{ML.loginNeeded}</p>
        <p className={styles.small}>
          Sign in with Google to apply. Your applications are saved to your account. Asking questions needs no sign-in.
        </p>
        <button
          className={styles.primary}
          disabled={busy}
          onClick={() => {
            setBusy(true);
            // Comes back to the same page, keeping ?service= if they came from the home mic.
            void signInWithGoogle(window.location.pathname + window.location.search);
          }}
        >
          {busy ? ML.oneMoment : "Google ഉപയോഗിച്ച് തുടരുക"}
        </button>
      </section>
    </main>
  );
}

function ApplyFlow() {
  const [screen, setScreenState] = useState<Screen>("pick");
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [history, setHistory] = useState<string[]>([]);
  // A proposed answer is tied to the id of the question it answers, so it can
  // never be saved under a different question (e.g. if a slow reply arrives late).
  const [pending, setPending] = useState<{ id: string; answer: Answer } | null>(null);
  const [fails, setFails] = useState(0);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState("");
  const [askNonce, setAskNonce] = useState(0); // bump to re-ask the same question
  const [sentRef, setSentRef] = useState<string | null>(null);
  const [docResults, setDocResults] = useState<DocResult[] | null>(null); // null = not scanned yet
  const docRef = useRef<DocCaptureHandle>(null);
  const saved = useRef<{ application_id: string; payment: PaymentInfo | null } | null>(null); // saved, awaiting payment/send
  const askPrefix = useRef(""); // said before the question on the next re-ask
  const noSpeechRetried = useRef(false); // one automatic re-listen after silence
  const speaker = useSpeaker();
  const rec = useRecognition({ onFinal: onVoice, onError: onRecognitionError });

  // Refs for async callbacks, where the render-time values may be stale.
  const screenRef = useRef<Screen>("pick");
  const setScreen = (s: Screen) => {
    screenRef.current = s;
    setScreenState(s);
  };
  const busyRef = useRef(false);

  const service = services.find((s) => s.id === serviceId) ?? null;
  const steps = useMemo(() => (serviceId ? stepsFor(serviceId) : []), [serviceId]);
  // Documents to photograph: the service's "keep ready" list, minus numbers that
  // the operator types in (the ration card is verified by number, never uploaded).
  const docsToScan: DocToScan[] = useMemo(
    () =>
      service
        ? service.documents
            .map((en, i) => ({ en, ml: service.documents_ml[i] }))
            .filter((d) => !/number/i.test(d.en))
        : [],
    [service],
  );
  const field = serviceId && (screen === "ask" || screen === "confirm") ? nextField(steps, answers) : null;
  const fieldIdRef = useRef<string | null>(null);
  fieldIdRef.current = field?.id ?? null;
  const application = useMemo(
    () => (service && (screen === "review" || screen === "sent") ? buildApplication(service, answers) : null),
    [service, answers, screen],
  );

  /** Review prompt; says the VayoSeva service fee when payments are on (never the government fee). */
  function reviewText() {
    if (!paymentsOnClient || !service) return SAY.review;
    return SAY.review.replace(
      "അക്ഷയ കേന്ദ്രത്തിലേക്ക് അയയ്ക്കട്ടെ?",
      `VayoSeva സേവന ചാർജ് ${service.service_fee_inr} രൂപ. സർക്കാർ ഫീസ് അക്ഷയ കേന്ദ്രം അറിയിക്കും. പണമടച്ച് അയയ്ക്കട്ടെ?`,
    );
  }

  /**
   * Speak, then (if the mic is allowed) listen for the reply automatically.
   * `then(spoken)` runs after speaking; `spoken` is false if no sound came out.
   */
  function talk(text: string, listenAfter = false, then?: (spoken: boolean) => void) {
    rec.abort();
    speaker.say(text, {
      onDone: (spoken) => {
        then?.(spoken);
        // Listen even if the voice failed: the question is on screen.
        if (listenAfter && rec.canAutoListen()) rec.start();
      },
    });
  }

  // Start: a certificate chosen by voice on the home screen arrives as ?service=.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("service");
    if (id && services.some((s) => s.id === id)) chooseService(id);
    else talk(SAY.pick, true);
  }, []);

  // Ask each new question as it comes up; finish when there are none left.
  useEffect(() => {
    if (screen !== "ask") return;
    if (!field) {
      // Questions done: photograph the documents (once), then review.
      if (docResults === null && docsToScan.length) return setScreen("docs");
      setScreen("review");
      talk(reviewText(), true);
      return;
    }
    const prefix = askPrefix.current;
    askPrefix.current = "";
    talk(`${prefix ? prefix + " " : ""}${askText(field, answers)}`, true);
  }, [screen, field?.id, askNonce]);

  // --- service choice ----------------------------------------------------------

  function chooseService(id: string) {
    setHint("");
    if (id === NOT_AVAILABLE) {
      setScreen("unavailable");
      talk(`${SAY.unavailable} ${ML.confirmClosing}`);
      return;
    }
    setServiceId(id);
    if (id === "caste-certificate") {
      setScreen("scst"); // rule 10: SC/ST need the Community Certificate
      talk(SAY.scst, true);
      return;
    }
    showInfo(services.find((s) => s.id === id)!);
  }

  /** Read out what's needed, then move on to the questions by itself. */
  function showInfo(s: Service, before = "") {
    setScreen("info");
    talk(`${before ? before + " " : ""}${infoText(s)} ${SAY.startQuestions}`, false, (spoken) => {
      // Only auto-advance if they actually heard it; otherwise wait for "തുടങ്ങാം".
      if (spoken && screenRef.current === "info") setScreen("ask");
    });
  }

  function answerScst(isScSt: boolean) {
    const id = isScSt ? "community-certificate" : "caste-certificate";
    setServiceId(id);
    showInfo(services.find((x) => x.id === id)!, isScSt ? SAY.toCommunity : "");
  }

  // --- answering ----------------------------------------------------------------

  function onRecognitionError(code: string) {
    // Silence: ask once more and listen again, then leave it to the mic button.
    if (code === "no-speech" && !noSpeechRetried.current) {
      noSpeechRetried.current = true;
      return talk(SAY.noSpeech, true);
    }
    const msg = recognitionErrorMl(code);
    setHint(msg);
    talk(msg);
  }

  function onVoice(text: string) {
    noSpeechRetried.current = false;
    setHint("");
    const s = screenRef.current;
    if (s === "docs") return docRef.current?.command(parseDocCommand(text));
    // Demo shortcut, checked before yes/no (it contains "ഒഴിവാക്ക", not a yes or no).
    if ((s === "ask" || s === "confirm") && /എല്ലാം ഒഴിവാക്ക|skip all/i.test(text)) return skipAllQuestions();
    if (s === "pick") {
      return interpret(text, { kind: "choice", label: "Certificate", ask: SAY.pick, options: SERVICE_OPTIONS, id: "service" });
    }
    if (s === "scst" || s === "confirm" || s === "review") {
      const yn = detectYesNo(text) ?? (/അയയ്ക്ക|അയക്ക|send/i.test(text) ? "yes" : null);
      if (!yn) return talk(SAY.yesNoHelp, true);
      if (s === "scst") return answerScst(yn === "yes");
      if (s === "review") return yn === "yes" ? send() : talk(SAY.notSent, true);
      return yn === "yes" ? accept() : reject();
    }
    if (s === "ask" && field) {
      if (saysDontKnow(text) || (field.optional && saysNone(text))) return dontKnow(text);
      if (field.kind === "yesno") {
        const yn = detectYesNo(text);
        if (yn) return propose(field, { ...blank(field), english_value: yn, malayalam_raw: text });
      }
      interpret(text, field);
    }
  }

  /** Spoken (or typed) words -> model -> a proposed answer to confirm. */
  async function interpret(text: string, f: FieldDef) {
    if (busyRef.current) return; // one answer at a time
    busyRef.current = true;
    setBusy(true);
    try {
      const ans = await extractAnswer({ kind: f.kind, label: f.label, question: askText(f, answers), options: f.options, transcript: text });
      if (f.id === "service") {
        if (ans.english_value) return chooseService(ans.english_value);
        setHint(SAY.unclear);
        return talk(SAY.unclear, true);
      }
      // The user moved on (back, skip) while we waited: this reply is for an old question.
      if (fieldIdRef.current !== f.id) return;
      if (ans.english_value === null) {
        if (/does not know/i.test(ans.note_for_operator)) return dontKnow(text, f);
        return failed(SAY.unclear);
      }
      // Spoken numbers, dates and codes get the same checks as typed ones.
      if (f.kind === "digits" || f.kind === "date" || f.kind === "typed") {
        const value = normalizeKeyed(f.kind, ans.english_value);
        const err = f.validate?.(value) ?? null;
        if (err) return failed(err);
        return propose(f, { ...ans, english_value: value });
      }
      propose(f, ans);
    } catch (err) {
      const msg = err instanceof Error ? err.message : ML.apiError;
      setHint(msg);
      talk(msg, true);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function propose(f: FieldDef, ans: Answer) {
    setHint(""); // a valid answer replaces any earlier "wrong format" message
    setPending({ id: f.id, answer: ans });
    setScreen("confirm");
    talk(readBack(f, ans), true);
  }

  function commit(id: string, ans: Answer) {
    setAnswers((a) => ({ ...a, [id]: ans }));
    setHistory((h) => [...h, id]);
    setPending(null);
    setFails(0);
    setHint("");
    setScreen("ask");
  }

  const accept = () => pending && commit(pending.id, pending.answer);

  function reject() {
    const n = fails + 1;
    setFails(n);
    setPending(null);
    askPrefix.current = n >= 2 ? SAY.typeHelp : SAY.again; // rule 8: after two misses, type or get help
    if (n >= 2) setHint(SAY.typeHelp);
    setScreen("ask");
    setAskNonce((x) => x + 1);
  }

  function failed(msg: string) {
    const n = fails + 1;
    setFails(n);
    const say = n >= 2 ? `${msg} ${SAY.typeHelp}` : msg;
    setHint(say);
    talk(say, true); // keep listening: they can still answer by voice
  }

  /**
   * Demo shortcut: mark every remaining question as skipped (null) and go on to
   * the documents. "Any more family members?" is answered no, so loops end.
   */
  function skipAllQuestions() {
    if (busyRef.current) return;
    rec.abort();
    speaker.stop();
    let a = answers;
    const ids: string[] = [];
    for (let f = nextField(steps, a); f; f = nextField(steps, a)) {
      const value = f.id.endsWith(".more") ? "no" : null;
      a = { ...a, [f.id]: { ...blank(f), english_value: value, confidence: 1, note_for_operator: "Skipped (demo)" } };
      ids.push(f.id);
    }
    setAnswers(a);
    setHistory((h) => [...h, ...ids]);
    setPending(null);
    setFails(0);
    setHint("");
    setScreen("ask"); // the ask effect sees no field left and moves on
    setAskNonce((x) => x + 1);
  }

  /** Rule 9: record null and move on. */
  function dontKnow(raw = "", f: FieldDef | null = field) {
    if (!f || busyRef.current) return;
    commit(f.id, { ...blank(f), malayalam_raw: raw, confidence: 1, note_for_operator: f.optional ? "Skipped" : "Applicant does not know" });
  }

  function onKeyed(value: string) {
    if (!field || field.kind === "choice" || busyRef.current) return;
    const err = field.validate?.(value) ?? null;
    if (err) {
      setHint(err);
      return talk(err, true);
    }
    const kind = field.kind === "digits" || field.kind === "date" ? field.kind : "typed";
    propose(field, { ...blank(field), english_value: normalizeKeyed(kind, value), confidence: 1 });
  }

  function goBack() {
    rec.abort();
    speaker.stop();
    saved.current = null; // answers will change: a fresh application will be saved
    setHint("");
    setPending(null);
    setFails(0);
    const last = history[history.length - 1];
    if (!last) return service ? showInfo(service) : undefined;
    setHistory((h) => h.slice(0, -1));
    setAnswers((a) => {
      const { [last]: _removed, ...rest } = a;
      return rest;
    });
    setScreen("ask");
    setAskNonce((x) => x + 1);
  }

  /**
   * With accounts on: save the application (once) → pay with Razorpay (if fees
   * are on) → submit, where the server verifies the payment and emails it.
   * Without accounts (demo): submit the answers directly.
   */
  async function send() {
    if (!application || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setHint("");
    try {
      let payload: Record<string, unknown> = { application };
      if (authEnabled) {
        // Reuse the saved application + order if they retry, so nobody is charged twice.
        saved.current ??= await postJson("/api/applications", { application });
        const { application_id, payment } = saved.current as { application_id: string; payment: PaymentInfo | null };
        payload = { application_id };
        if (payment) {
          talk(SAY.payOpening);
          try {
            payload = { ...payload, ...(await payWithRazorpay(payment, service?.name_en ?? "Certificate")) };
          } catch (err) {
            if (err instanceof PaymentCancelled) {
              setHint(SAY.payCancelled);
              talk(SAY.payCancelled, true);
              return;
            }
            throw err;
          }
        }
      }
      const body = await postJson("/api/submit", { ...payload, documents: await docsPayload(docResults) });
      if (!body?.ref) throw new Error(ML.apiError);
      saved.current = null;
      void clearDocs(); // sent: drop the temporary copies from the phone
      setSentRef(body.ref);
      setScreen("sent");
      const when = OTP_TIME_ML[answers.otp_call_time?.english_value ?? ""] ?? "";
      const refDigits = String(body.ref).split("-").pop() ?? "";
      talk(
        `അപേക്ഷ അക്ഷയ കേന്ദ്രത്തിലേക്ക് അയച്ചു. റഫറൻസ് നമ്പറിന്റെ അവസാന അക്കങ്ങൾ ${digitsMl(refDigits)}. ` +
          `ഒ.ടി.പി.ക്കായി ഓപ്പറേറ്റർ ${when} വിളിക്കും. ഫോൺ അടുത്ത് വെക്കൂ. ${ML.feeLine} ${ML.confirmClosing}`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : ML.apiError;
      setHint(msg);
      talk(msg);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function restart() {
    rec.abort();
    speaker.stop();
    saved.current = null;
    setScreen("pick");
    setServiceId(null);
    setAnswers({});
    setHistory([]);
    setPending(null);
    setFails(0);
    setHint("");
    setSentRef(null);
    setDocResults(null);
    void clearDocs();
    talk(SAY.pick, true);
  }

  // --- view -------------------------------------------------------------------

  const mic = rec.supported ? (
    <MicButton
      listening={rec.listening}
      busy={busy}
      speaking={speaker.state !== "idle"}
      onStart={() => {
        speaker.stop();
        setHint("");
        noSpeechRetried.current = false;
        rec.start();
      }}
      onStop={rec.stop}
    />
  ) : null;

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <Link href="/" className={styles.homeLink}>
          ← ചോദ്യം ചോദിക്കാൻ
        </Link>
        <h1 className={styles.title}>സർട്ടിഫിക്കറ്റ് അപേക്ഷ</h1>
      </header>

      {rec.listening && <p className={styles.listening}>കേൾക്കുന്നു… {rec.interim && `“${rec.interim}”`}</p>}
      {hint && <p className={styles.hint}>{hint}</p>}
      {speaker.lastFailed && <p className={styles.small}>ശബ്ദം കേൾപ്പിക്കാൻ കഴിഞ്ഞില്ല. സ്ക്രീനിൽ വായിക്കൂ.</p>}

      {screen === "pick" && (
        <>
          <p className={styles.question}>{SAY.pick}</p>
          {mic}
          <div className={styles.serviceGrid}>
            {services.map((s) => (
              <button key={s.id} className={styles.serviceButton} onClick={() => chooseService(s.id)} disabled={busy}>
                <span className={styles.serviceMl}>{s.name_ml}</span>
                <span className={styles.serviceEn}>{s.name_en}</span>
              </button>
            ))}
          </div>
          <button className={styles.linkButton} onClick={() => chooseService(NOT_AVAILABLE)}>
            മറ്റു സേവനങ്ങൾ (അനന്തരാവകാശം, ജനന രജിസ്ട്രേഷൻ…)
          </button>
        </>
      )}

      {screen === "scst" && (
        <>
          <p className={styles.question}>{SAY.scst}</p>
          <div className={styles.options}>
            <button className={styles.option} onClick={() => answerScst(true)}>
              അതെ (SC / ST)
            </button>
            <button className={styles.option} onClick={() => answerScst(false)}>
              അല്ല
            </button>
          </div>
          {mic}
        </>
      )}

      {screen === "unavailable" && (
        <section className={styles.card}>
          <p className={styles.question}>{SAY.unavailable}</p>
          <ul className={styles.subList}>
            {generalInfo.not_available.map((n) => (
              <li key={n.name_en}>
                <strong>{n.name_ml}</strong> ({n.name_en}): {n.reason}
              </li>
            ))}
          </ul>
          <button className={styles.secondary} onClick={restart}>
            മറ്റൊരു സർട്ടിഫിക്കറ്റ്
          </button>
        </section>
      )}

      {screen === "info" && service && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>
            {service.name_ml}
            {!service.verified && <span className={styles.badge}>ഇതുവരെ ഉറപ്പാക്കിയിട്ടില്ല · not yet verified</span>}
          </h2>
          <p className={styles.small}>{service.name_en}</p>
          <p className={styles.cardLabel}>കയ്യിൽ കരുതേണ്ടവ:</p>
          <ul className={styles.subList}>
            {service.documents_ml.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
          <p>
            കാലാവധി: {validityMl(service.validity)}
            <br />
            കിട്ടാൻ എടുക്കുന്ന സമയം: {processingMl(service.processing_time)}
          </p>
          {service.accepted_documents.length === 0 && <p>{ML.listNotPublished}</p>}
          <p>{ML.feeLine}</p>
          <button className={styles.primary} onClick={() => setScreen("ask")}>
            തുടങ്ങാം
          </button>
          <button className={styles.linkButton} onClick={restart}>
            മറ്റൊരു സർട്ടിഫിക്കറ്റ്
          </button>
        </section>
      )}

      {screen === "ask" && field && (
        <section className={styles.card}>
          <p className={styles.progress}>ചോദ്യം {history.length + 1}</p>
          <p className={styles.question}>{askText(field, answers)}</p>
          <AnswerInput
            field={field}
            typingMode={fails >= 2}
            busy={busy}
            mic={mic}
            onPick={(o) => !busyRef.current && commit(field.id, { ...blank(field), english_value: o.value, malayalam_raw: o.ml, confidence: 1 })}
            onKeyed={onKeyed}
            onTypedVoiceAnswer={(t) => interpret(t, field)}
          />
          <div className={styles.navRow}>
            <button className={styles.linkButton} onClick={goBack}>
              ← മുമ്പത്തെ ചോദ്യം
            </button>
            <button className={styles.linkButton} onClick={() => dontKnow()} disabled={busy}>
              {field.optional ? "ഒഴിവാക്കുക" : "അറിയില്ല"}
            </button>
          </div>
          <button className={styles.skipAll} onClick={skipAllQuestions} disabled={busy}>
            എല്ലാ ചോദ്യങ്ങളും ഒഴിവാക്കുക · Skip all questions (demo)
          </button>
        </section>
      )}

      {screen === "confirm" && field && pending?.id === field.id && (
        <section className={styles.card}>
          <p className={styles.cardLabel}>{field.label}</p>
          <p className={styles.bigValue}>{displayValue(field, pending.answer)}</p>
          {pending.answer.malayalam_raw && field.kind !== "choice" && field.kind !== "yesno" && (
            <p className={styles.small}>കേട്ടത്: {pending.answer.malayalam_raw}</p>
          )}
          <p className={styles.question}>ശരിയാണോ?</p>
          <div className={styles.options}>
            <button className={`${styles.option} ${styles.yes}`} onClick={accept}>
              ശരി
            </button>
            <button className={`${styles.option} ${styles.no}`} onClick={reject}>
              അല്ല
            </button>
          </div>
          {mic}
        </section>
      )}

      {screen === "docs" && (
        <>
          <DocCapture
            ref={docRef}
            docs={docsToScan}
            speak={(text) => talk(text, true)}
            onComplete={(results) => {
              setDocResults(results);
              setScreen("review");
              talk(reviewText(), true);
            }}
          />
          {mic}
        </>
      )}

      {screen === "review" && application && (
        <>
          <p className={styles.question}>അക്ഷയ കേന്ദ്രത്തിലേക്ക് അയയ്ക്കട്ടെ?</p>
          {mic}
          <ReviewList app={application} />
          {docResults && docResults.length > 0 && (
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Scanned documents / ഫോട്ടോ എടുത്ത രേഖകൾ</h2>
              <ul className={styles.docList}>
                {docResults.map((d) => (
                  <li key={d.en}>
                    <span>{d.ml}</span>
                    {d.pdf ? <PdfLink pdf={d.pdf} label={`PDF · ${d.pages} page${d.pages > 1 ? "s" : ""} · ${kb(d.pdf.size)}`} /> : <span>ഒഴിവാക്കി · skipped</span>}
                  </li>
                ))}
              </ul>
              <button className={styles.linkButton} onClick={() => { setDocResults(null); setScreen("docs"); }}>
                രേഖകൾ വീണ്ടും എടുക്കുക
              </button>
            </section>
          )}
          <button className={styles.primary} onClick={send} disabled={busy}>
            {busy
              ? ML.oneMoment
              : paymentsOnClient && service
                ? `₹${service.service_fee_inr} അടച്ച് അയയ്ക്കുക`
                : "അക്ഷയ കേന്ദ്രത്തിലേക്ക് അയയ്ക്കുക"}
          </button>
          {paymentsOnClient && service && (
            <p className={styles.small}>
              VayoSeva സേവന ചാർജ് ₹{service.service_fee_inr} · Service fee. {ML.feeLine} (Government fee is separate.)
            </p>
          )}
          <button className={styles.linkButton} onClick={goBack}>
            ← അവസാന ഉത്തരം തിരുത്തുക
          </button>
        </>
      )}

      {screen === "sent" && sentRef && (
        <SuccessState
          t={STRINGS.ml}
          alt={STRINGS.en}
          refNo={sentRef}
          onReadAloud={() => talk(`${STRINGS.ml.reference}: ${digitsMl(sentRef.split("-").pop() ?? "")}`)}
        >
          <p>ഒ.ടി.പി.ക്കായി അക്ഷയ ഓപ്പറേറ്റർ വിളിക്കും. ഫോൺ അടുത്ത് വെക്കൂ.</p>
          <p>{ML.feeLine}</p>
          <p className={styles.small}>
            Demo mode: the application was not emailed yet. It is logged on the server with ID numbers masked.
          </p>
          {authEnabled && (
            <Link href="/my-applications" className={styles.secondary} style={{ display: "flex", alignItems: "center", textDecoration: "none", padding: "0 20px" }}>
              എന്റെ അപേക്ഷകൾ · My applications
            </Link>
          )}
          <button className={styles.secondary} onClick={restart}>
            പുതിയ അപേക്ഷ
          </button>
        </SuccessState>
      )}

      <SpeedPicker value={speaker.speed} onChange={speaker.setSpeed} />

      <footer className={styles.footer}>
        <p>{ML.confirmClosing}</p>
        <p>Information may change. Please confirm with your Akshaya center.</p>
      </footer>
    </main>
  );
}

/** Opens a scanned PDF so a family member or the operator can check it. */
function PdfLink({ pdf, label }: { pdf: Blob; label: string }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const u = URL.createObjectURL(pdf);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [pdf]);
  return (
    <a href={url} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
}

/** POST JSON; throws an Error carrying the server's (Malayalam) message on failure. */
async function postJson(url: string, data: unknown) {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  } catch {
    throw new Error(ML.networkError);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || ML.apiError);
  return body;
}

const blobToBase64 = (b: Blob) =>
  new Promise<string>((ok, fail) => {
    const fr = new FileReader();
    fr.onload = () => ok(String(fr.result).split(",")[1] ?? "");
    fr.onerror = () => fail(fr.error);
    fr.readAsDataURL(b);
  });

/** Scanned PDFs for the operator (skipped documents are listed with no file). */
async function docsPayload(results: DocResult[] | null) {
  return Promise.all(
    (results ?? []).map(async (r) => ({
      name: r.en,
      pages: r.pages,
      bytes: r.pdf?.size ?? 0,
      pdf_base64: r.pdf ? await blobToBase64(r.pdf) : null,
    })),
  );
}

const blank = (f: FieldDef): Answer => ({
  field: f.label,
  malayalam_raw: "",
  english_value: null,
  confidence: 0,
  note_for_operator: "",
});

/** What a family member checks on screen: the exact value that will be typed on e-District. */
function displayValue(f: FieldDef, a: Answer): string {
  if (f.kind === "choice" || f.kind === "yesno") return f.options?.find((o) => o.value === a.english_value)?.ml ?? "";
  if (f.kind === "income") {
    return `${a.english_value} · Total ₹${totalYearly(a.items ?? []).toLocaleString("en-IN")}/year`;
  }
  return a.english_value ?? "";
}
