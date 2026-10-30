"use client";

// Main screen: tap the mic, ask in Malayalam, hear the answer.
// Flow: idle → listening → thinking → speaking → idle.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { askQuestion, type AskResponse } from "@/lib/ask-client";
import { playClip, stopClip } from "@/lib/audio-clips";
import { ML, recognitionErrorMl } from "@/lib/messages";
import { getRecognitionCtor, speak, type SpeechRecognitionLike } from "@/lib/speech";
import { BROWSER_RATE, DEFAULT_SPEED, loadSpeed, saveSpeed, SPEEDS, type Speed } from "@/lib/speed";
import { speakText, stopSpeaking } from "@/lib/tts-client";
import { useMalayalamVoice } from "@/lib/use-ml-voice";
import styles from "./page.module.css";

type Phase = "idle" | "listening" | "thinking" | "speaking";

const MIC_LABEL: Record<Phase, { icon: string; text: string }> = {
  idle: { icon: "🎤", text: "സംസാരിക്കാൻ അമർത്തൂ" },
  listening: { icon: "👂", text: "കേൾക്കുന്നു… നിർത്താൻ അമർത്തൂ" },
  thinking: { icon: "⏳", text: ML.oneMoment },
  speaking: { icon: "🔊", text: "പറയുന്നു… നിർത്താൻ അമർത്തൂ" },
};

export default function Home() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [heard, setHeard] = useState("");
  const [answer, setAnswer] = useState<AskResponse | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState("");
  const [canListen, setCanListen] = useState(true);
  const [speed, setSpeed] = useState<Speed>(DEFAULT_SPEED);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const sayId = useRef(0); // lets a stale say() timeout know it was superseded
  const { voice: mlVoice, checked: voiceChecked } = useMalayalamVoice();

  useEffect(() => {
    const ok = getRecognitionCtor() !== null;
    setCanListen(ok);
    if (!ok) setTyping(true); // no speech recognition: typing is the only way in
    setSpeed(loadSpeed());
    playClip("greeting"); // optional; silently skipped if missing or autoplay is blocked
  }, []);

  /** Speak text with the best available engine; falls back to text-only. */
  function say(text: string, atSpeed: Speed = speed) {
    // Gemini audio can take seconds to arrive: show "one moment" until sound
    // actually starts, so the screen never says "speaking" during silence.
    setPhase("thinking");
    const id = ++sayId.current;
    // If no sound starts within 25 s (dropped utterance, stalled download),
    // give up rather than leave the mic button disabled forever.
    const timer = window.setTimeout(() => {
      if (sayId.current !== id) return;
      stopSpeaking();
      setNotice("ശബ്ദം കേൾപ്പിക്കാൻ കഴിഞ്ഞില്ല. ഉത്തരം സ്ക്രീനിൽ വായിക്കൂ.");
      setPhase("idle");
    }, 25_000);
    speakText(text, mlVoice, {
      speed: atSpeed,
      onStart: () => {
        window.clearTimeout(timer);
        setPhase("speaking");
      },
      onEnd: () => {
        window.clearTimeout(timer);
        setPhase("idle");
      },
      onFail: (reason) => {
        window.clearTimeout(timer);
        console.warn("speech failed:", reason);
        setNotice("ശബ്ദം കേൾപ്പിക്കാൻ കഴിഞ്ഞില്ല. ഉത്തരം സ്ക്രീനിൽ വായിക്കൂ.");
        setPhase("idle");
      },
    });
  }

  async function ask(question: string) {
    stopEverything();
    setHeard(question);
    setAnswer(null);
    setError("");
    setNotice("");
    setPhase("thinking");

    // "One moment": recorded clip if present, else the device voice. We don't
    // spend Gemini TTS quota on this; the text on the button is enough.
    playClip("one-moment").then((played) => {
      if (!played && mlVoice) speak(ML.oneMoment, mlVoice, { rate: BROWSER_RATE[speed] });
    });

    try {
      const res = await askQuestion(question);
      setAnswer(res);
      say(res.answer);
    } catch (err) {
      const msg = err instanceof Error ? err.message : ML.apiError;
      setError(msg);
      say(msg); // errors are spoken too: the user may not be reading the screen
    }
  }

  function startListening() {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    stopEverything();
    setError("");
    setNotice("");
    setHeard("");

    const rec = new Ctor();
    rec.lang = "ml-IN";
    rec.continuous = false;
    rec.interimResults = true; // show words as they're recognised
    let finalText = "";
    let failed = false;

    rec.onresult = (e) => {
      let fin = "";
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) fin += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      finalText = fin;
      setHeard(fin + interim);
    };
    rec.onerror = (e) => {
      failed = true;
      if (e.error === "aborted") return;
      setError(recognitionErrorMl(e.error));
      if (e.error === "not-allowed" || e.error === "service-not-allowed") setTyping(true);
    };
    rec.onend = () => {
      recRef.current = null;
      if (!failed && finalText.trim()) ask(finalText.trim());
      else setPhase("idle");
    };

    recRef.current = rec;
    setPhase("listening");
    try {
      rec.start();
    } catch {
      setPhase("idle");
    }
  }

  function stopEverything() {
    sayId.current++;
    recRef.current?.abort();
    recRef.current = null;
    stopSpeaking();
    stopClip();
  }

  function onMicClick() {
    if (phase === "listening") recRef.current?.stop(); // onend will send what was heard
    else if (phase === "speaking") {
      stopEverything();
      setPhase("idle");
    } else if (phase === "idle") startListening();
  }

  function changeSpeed(s: Speed) {
    setSpeed(s);
    saveSpeed(s);
    // Re-read the answer at the new speed so the change is heard at once.
    if (answer && phase !== "listening" && phase !== "thinking") say(answer.answer, s);
  }

  function onSubmitTyped(e: React.FormEvent) {
    e.preventDefault();
    const q = typed.trim();
    if (q && phase !== "thinking") ask(q);
  }

  const label = MIC_LABEL[phase];

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>അക്ഷയ സഹായി</h1>
      <p className={styles.greeting}>{ML.greeting}</p>

      {canListen ? (
        <button
          className={`${styles.mic} ${styles[phase]}`}
          onClick={onMicClick}
          disabled={phase === "thinking"}
          aria-live="polite"
        >
          <span className={styles.micIcon} aria-hidden>
            {label.icon}
          </span>
          <span className={styles.micText}>{label.text}</span>
        </button>
      ) : (
        <p className={styles.notice}>ഈ ബ്രൗസറിൽ സംസാരം തിരിച്ചറിയാൻ കഴിയില്ല. ദയവായി താഴെ ടൈപ്പ് ചെയ്യൂ.</p>
      )}

      {voiceChecked && !mlVoice && (
        <p className={styles.small}>ഈ ഉപകരണത്തിൽ മലയാളം ശബ്ദം ഇല്ല. ഓൺലൈൻ ശബ്ദം ഉപയോഗിക്കും.</p>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {heard && (
        <section className={styles.card}>
          <div className={styles.cardLabel}>ഞാൻ കേട്ടത്:</div>
          <p className={styles.heard}>{heard}</p>
          {canListen && phase === "idle" && (
            <button className={styles.secondary} onClick={startListening}>
              🔁 വീണ്ടും പറയുക
            </button>
          )}
        </section>
      )}

      {answer && (
        <section className={`${styles.card} ${styles.answerCard}`}>
          <div className={styles.cardLabel}>
            ഉത്തരം:
            {answer.any_unverified && (
              <span className={styles.badge} title="Not yet verified">
                ഇതുവരെ ഉറപ്പാക്കിയിട്ടില്ല · not yet verified
              </span>
            )}
          </div>
          <p className={styles.answer}>{answer.answer}</p>
          <button
            className={styles.secondary}
            onClick={() => say(answer.answer)}
            disabled={phase === "listening" || phase === "thinking"}
          >
            🔊 വീണ്ടും കേൾക്കുക
          </button>
          <div className={styles.speedRow} role="group" aria-label="വായനയുടെ വേഗത">
            <span className={styles.cardLabel}>വേഗത:</span>
            {SPEEDS.map((s) => (
              <button
                key={s.id}
                className={`${styles.speedButton} ${speed === s.id ? styles.speedActive : ""}`}
                aria-pressed={speed === s.id}
                onClick={() => changeSpeed(s.id)}
                disabled={phase === "listening" || phase === "thinking"}
              >
                {s.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {notice && <p className={styles.notice}>{notice}</p>}

      <section className={styles.typeArea}>
        {!typing ? (
          <button className={styles.secondary} onClick={() => setTyping(true)}>
            ⌨️ ടൈപ്പ് ചെയ്ത് ചോദിക്കുക
          </button>
        ) : (
          <form onSubmit={onSubmitTyped} className={styles.form}>
            <label htmlFor="q" className={styles.cardLabel}>
              ചോദ്യം ഇവിടെ എഴുതൂ:
            </label>
            <textarea
              id="q"
              className={styles.input}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="ഉദാ: വരുമാന സർട്ടിഫിക്കറ്റിന് എന്തൊക്കെ വേണം?"
            />
            <button className={styles.primary} type="submit" disabled={!typed.trim() || phase === "thinking"}>
              ചോദിക്കുക
            </button>
          </form>
        )}
      </section>

      <footer className={styles.footer}>
        <p>വിവരങ്ങൾ മാറാം. ദയവായി നിങ്ങളുടെ അക്ഷയ കേന്ദ്രത്തിൽ ഉറപ്പാക്കുക.</p>
        <p>Information may change. Please confirm with your Akshaya center.</p>
        <Link href="/voice-test" className={styles.testLink}>
          Voice test
        </Link>
      </footer>
    </main>
  );
}
