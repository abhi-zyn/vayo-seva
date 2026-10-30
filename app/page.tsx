"use client";

// VayoSeva home: the അക്ഷയ സഹായി voice assistant.
// The stage under the greeting shows one state at a time:
//   mic (B listening) → thinking (C) → speaking answer (D), or error (F).
// The splash (A) plays once per session; success (E) lives on /apply.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon, LogoMark, Wordmark } from "@/components/brand/Logo";
import { CallLink, ErrorState } from "@/components/states/ErrorState";
import { MicField } from "@/components/states/MicField";
import { SpeakingAnswer } from "@/components/states/SpeakingAnswer";
import { Splash } from "@/components/states/Splash";
import { Thinking } from "@/components/states/Thinking";
import { askQuestion, OfflineError, type AskResponse } from "@/lib/ask-client";
import { ML, recognitionErrorMl } from "@/lib/messages";
import { DEFAULT_SPEED } from "@/lib/speed";
import { authEnabled } from "@/lib/supabase/config";
import { CHIPS, greetingKey, STRINGS } from "@/lib/ui-strings";
import { useLang } from "@/lib/use-lang";
import { useMicLevel } from "@/lib/use-mic-level";
import { useRecognition } from "@/lib/use-recognition";
import { useSpeaker } from "@/lib/use-speaker";
import styles from "./home.module.css";

type Phase = "idle" | "thinking" | "answer" | "error";
const SPLASH_KEY = "vayoseva-splash-seen";

export default function Home() {
  const router = useRouter();
  const { lang, toggle, t, alt } = useLang();
  const ml = STRINGS.ml; // speech is always Malayalam
  const [phase, setPhase] = useState<Phase>("idle");
  const [heard, setHeard] = useState("");
  const [answer, setAnswer] = useState<AskResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState("");
  const [wordStart, setWordStart] = useState(-1); // char offset of the word being spoken
  const [slower, setSlower] = useState(false);
  const [splash, setSplash] = useState(false);
  const [help, setHelp] = useState(false);
  const [greet, setGreet] = useState<"greetingMorning" | "greetingDay" | "greetingEvening">("greetingDay");
  const [hydrated, setHydrated] = useState(false); // false in server HTML, so no-JS users see the form
  const lastQuestion = useRef("");
  const abortRef = useRef<AbortController | null>(null);

  const speaker = useSpeaker();
  const mic = useMicLevel();
  const rec = useRecognition({
    onFinal: (text) => ask(text),
    onError: (code) => {
      if (code === "no-speech") return;
      setErrorMsg(recognitionErrorMl(code));
      if (code === "not-allowed" || code === "service-not-allowed") setTyping(true);
    },
  });

  useEffect(() => {
    setHydrated(true);
    setGreet(greetingKey(new Date().getHours()));
    try {
      if (!sessionStorage.getItem(SPLASH_KEY)) setSplash(true);
    } catch {
      // no storage: skip the splash rather than show it every time
    }
  }, []);
  useEffect(() => {
    if (!rec.supported) setTyping(true); // no speech recognition: typing is the way in
  }, [rec.supported]);

  // The waveform follows the mic while listening.
  useEffect(() => {
    if (rec.listening) mic.start();
    else mic.stop();
  }, [rec.listening]);
  useEffect(() => {
    if (rec.interim) mic.bump();
  }, [rec.interim]);

  // Word starts of the current answer, so speech progress maps to a word.
  const starts = useMemo(() => {
    const out: number[] = [];
    const re = /\S+/g;
    let m: RegExpExecArray | null;
    while (answer && (m = re.exec(answer.answer))) out.push(m.index);
    return out;
  }, [answer]);

  function sayAnswer(text: string, isSlower = slower) {
    setWordStart(0);
    speaker.say(text, {
      speed: isSlower ? "verySlow" : DEFAULT_SPEED,
      // Only re-render when the spoken word changes, not on every frame.
      onProgress: (i) => {
        let w = 0;
        for (let k = 0; k < starts.length && starts[k] <= i; k++) w = starts[k];
        setWordStart((prev) => (prev === w ? prev : w));
      },
      onDone: () => setWordStart(-1),
    });
  }

  async function ask(question: string) {
    stopEverything();
    const q = question.trim();
    if (!q) return;
    lastQuestion.current = q;
    setHeard(q);
    setAnswer(null);
    setErrorMsg("");
    setPhase("thinking");
    speaker.say(ml.thinking[1]); // "ഒരു നിമിഷം…": every state is spoken
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await askQuestion(q, ctrl.signal);
      if (ctrl.signal.aborted) return;
      if (res.apply_service_id) {
        // "I need an income certificate": straight to that application.
        speaker.stop();
        router.push(`/apply?service=${encodeURIComponent(res.apply_service_id)}`);
        return;
      }
      setAnswer(res);
      setPhase("answer");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const msg = err instanceof OfflineError ? ml.offline : err instanceof Error ? err.message : ML.apiError;
      setErrorMsg(err instanceof OfflineError ? t.offline : msg);
      setPhase("error");
      speaker.say(msg);
    } finally {
      if (abortRef.current === ctrl) abortRef.current = null;
    }
  }

  // Speak a new answer once it's on screen (so word starts are ready).
  useEffect(() => {
    if (phase === "answer" && answer) sayAnswer(answer.answer);
  }, [phase, answer]);

  function cancel() {
    abortRef.current?.abort();
    abortRef.current = null;
    speaker.stop();
    setPhase("idle");
    speaker.say(ml.cancelled);
  }

  function stopEverything() {
    rec.abort();
    speaker.stop();
    setWordStart(-1);
  }

  function onMic() {
    if (rec.listening) return rec.stop(); // onFinal sends what was heard
    abortRef.current?.abort();
    stopEverything();
    setErrorMsg("");
    setHeard("");
    if (phase !== "answer") setPhase("idle");
    rec.start();
  }

  function onSubmitTyped(e: React.FormEvent) {
    e.preventDefault(); // without JavaScript the form goes to /answer instead
    if (typed.trim() && phase !== "thinking") ask(typed);
  }

  function openHelp() {
    setHelp(true);
    speaker.say(`${ml.helpTitle}. ${ml.helpSteps.join(" ")}`);
  }

  const micLabel = rec.listening ? t.micListening : phase === "answer" ? t.micAgain : t.micIdle;
  const micSub = rec.listening ? alt.micListening : phase === "answer" ? alt.micAgain : alt.micIdle;
  const statusText =
    phase === "thinking" ? t.thinking[1] : rec.listening ? t.micListening : phase === "error" ? errorMsg : phase === "answer" ? t.answer : "";

  return (
    <>
      {splash && (
        <Splash
          t={t}
          onDone={() => {
            setSplash(false);
            try {
              sessionStorage.setItem(SPLASH_KEY, "1");
            } catch {
              // fine
            }
          }}
        />
      )}

      <header className={styles.topBar}>
        <Link href="/" className={styles.brand} aria-label="VayoSeva">
          <LogoMark size={44} decorative />
          <Wordmark className={styles.brandWord} />
        </Link>
        <div className={styles.topActions}>
          <button type="button" className={styles.topBtn} onClick={toggle} lang={lang === "ml" ? "en" : "ml"}>
            {t.langToggle}
          </button>
          <button type="button" className={styles.topBtn} onClick={openHelp} aria-expanded={help}>
            {t.help}
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {/* Announces each state change for screen readers. */}
        <p className="sr-only" aria-live="polite">
          {statusText}
        </p>

        {help && (
          <section className={`${styles.panel} ${styles.help} vs-enter`} aria-labelledby="help-title">
            <h2 id="help-title" className={styles.sectionHead}>
              {t.helpTitle}
            </h2>
            <ol className={styles.helpList}>
              {t.helpSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <button type="button" className={styles.rowBtn} onClick={() => setHelp(false)}>
              {t.helpClose}
            </button>
          </section>
        )}

        <div className={styles.layout}>
          <div className={styles.primaryCol}>
            <section className={`${styles.greet} vs-enter`}>
              <h1 className={styles.greeting}>{t[greet]}</h1>
              <p className={styles.prompt}>{t.prompt}</p>
            </section>

            {phase === "thinking" ? (
              <Thinking t={t} alt={alt} onCancel={cancel} />
            ) : phase === "error" ? (
              <ErrorState t={t} message={errorMsg} onRetry={() => ask(lastQuestion.current)} />
            ) : (
              <>
                {phase === "answer" && answer && (
                  <SpeakingAnswer
                    t={t}
                    text={answer.answer}
                    charIndex={wordStart}
                    speaking={speaker.state !== "idle"}
                    unverified={answer.any_unverified}
                    slower={slower}
                    onReplay={() => sayAnswer(answer.answer)}
                    onStop={() => {
                      speaker.stop();
                      setWordStart(-1);
                    }}
                    onSlower={() => {
                      const next = !slower;
                      setSlower(next);
                      sayAnswer(answer.answer, next);
                    }}
                  />
                )}
                {rec.supported && (
                  <MicField
                    listening={rec.listening}
                    label={micLabel}
                    sub={micSub}
                    onPress={onMic}
                    compact={phase === "answer"}
                    level={mic.level}
                  />
                )}
                {(rec.interim || (heard && phase !== "idle")) && (
                  <p className={styles.heard}>
                    <span className={styles.heardLabel}>{t.heard}:</span> {rec.interim || heard}
                  </p>
                )}
                {errorMsg && (
                  <p className={styles.inlineError} role="alert">
                    <Icon name="cloud-off" size={36} /> {errorMsg}
                  </p>
                )}
              </>
            )}
          </div>

          <div className={styles.secondaryCol}>
            <Link href="/apply" className={`${styles.row} vs-btn`}>
              <Icon name="document-tick" size={56} />
              <span className={styles.rowText}>
                {t.apply}
                <span className={styles.rowAlt}>{alt.apply}</span>
              </span>
              <Icon name="chevron" size={40} className={styles.chevron} />
            </Link>

            {authEnabled && (
              <Link href="/my-applications" className={`${styles.row} vs-btn`}>
                <Icon name="node-tick" size={56} />
                <span className={styles.rowText}>
                  {lang === "ml" ? "എന്റെ അപേക്ഷകൾ" : "My applications"}
                  <span className={styles.rowAlt}>{lang === "ml" ? "My applications" : "എന്റെ അപേക്ഷകൾ"}</span>
                </span>
                <Icon name="chevron" size={40} className={styles.chevron} />
              </Link>
            )}

            <div className={styles.typeBlock}>
              {hydrated && !typing && (
                <button type="button" className={styles.row} onClick={() => setTyping(true)} aria-expanded={typing}>
                  <Icon name="keyboard" size={56} />
                  <span className={styles.rowText}>
                    {t.type}
                    <span className={styles.rowAlt}>{alt.type}</span>
                  </span>
                  <Icon name="chevron" size={40} className={styles.chevron} />
                </button>
              )}
              {/* Works without JavaScript too: it then submits to /answer. */}
              <form action="/answer" method="get" onSubmit={onSubmitTyped} className={!hydrated || typing ? styles.typeForm : styles.hidden}>
                <label htmlFor="q" className={styles.typeLabel}>
                  {t.typeLabel}
                </label>
                <textarea
                  id="q"
                  name="q"
                  className={styles.typeInput}
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder={t.typePlaceholder}
                />
                <button type="submit" className={styles.typeSend} disabled={phase === "thinking"}>
                  {t.typeSend}
                </button>
              </form>
            </div>

            <section aria-labelledby="chips-head">
              <h2 id="chips-head" className={styles.sectionHead}>
                {t.commonServices}
              </h2>
              <div className={styles.chips}>
                {CHIPS.map((c) => (
                  <button key={c.ml} type="button" className={styles.chip} onClick={() => ask(c.ask)} disabled={phase === "thinking"}>
                    {lang === "ml" ? c.ml : c.en}
                    <span className={styles.chipAlt}>{lang === "ml" ? c.en : c.ml}</span>
                  </button>
                ))}
              </div>
            </section>

            {speaker.voiceChecked && (
              <p className={styles.voiceNote}>
                <Icon name="speaker" size={40} />
                <span>{speaker.lastFailed ? t.voiceNone : speaker.mlVoice ? t.voiceDevice : t.voiceOnline}</span>
                {!speaker.lastFailed && <Icon name="node-tick" size={32} />}
              </p>
            )}
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <p className={styles.tagline}>{STRINGS.ml.brandTagline}</p>
        <p className={styles.taglineEn}>{STRINGS.en.brandTagline}</p>
        <p className={styles.disclaimer}>
          {STRINGS.ml.disclaimer}
          <span className={styles.disclaimerEn}>{STRINGS.en.disclaimer}</span>
        </p>
        <CallLink t={t} />
        <svg className={styles.signature} viewBox="0 0 1000 190" role="img" aria-label="VayoSeva">
          <text x="0" y="150" textLength="1000" lengthAdjust="spacingAndGlyphs">
            VayoSeva
          </text>
        </svg>
      </footer>
    </>
  );
}
