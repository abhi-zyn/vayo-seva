"use client";

// Q&A screen: tap the mic, ask in Malayalam, hear the answer.
// Flow: idle → listening → thinking → speaking → idle.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SpeedPicker } from "@/components/SpeedPicker";
import { askQuestion, type AskResponse } from "@/lib/ask-client";
import { playClip } from "@/lib/audio-clips";
import { ML, recognitionErrorMl } from "@/lib/messages";
import { speak } from "@/lib/speech";
import { BROWSER_RATE, type Speed } from "@/lib/speed";
import { useRecognition } from "@/lib/use-recognition";
import { useSpeaker } from "@/lib/use-speaker";
import styles from "./page.module.css";

type Phase = "idle" | "listening" | "thinking" | "speaking";

const MIC_LABEL: Record<Phase, { icon: string; text: string }> = {
  idle: { icon: "🎤", text: "സംസാരിക്കാൻ അമർത്തൂ" },
  listening: { icon: "👂", text: "കേൾക്കുന്നു… നിർത്താൻ അമർത്തൂ" },
  thinking: { icon: "⏳", text: ML.oneMoment },
  speaking: { icon: "🔊", text: "പറയുന്നു… നിർത്താൻ അമർത്തൂ" },
};

const NO_SOUND = "ശബ്ദം കേൾപ്പിക്കാൻ കഴിഞ്ഞില്ല. ഉത്തരം സ്ക്രീനിൽ വായിക്കൂ.";

export default function Home() {
  const [asking, setAsking] = useState(false);
  const [heard, setHeard] = useState("");
  const [answer, setAnswer] = useState<AskResponse | null>(null);
  const [error, setError] = useState("");
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState("");
  const router = useRouter();
  const speaker = useSpeaker();
  const rec = useRecognition({
    onFinal: (text) => ask(text),
    onError: (code) => {
      setError(recognitionErrorMl(code));
      if (code === "not-allowed" || code === "service-not-allowed") setTyping(true);
    },
  });

  const phase: Phase = rec.listening
    ? "listening"
    : asking || speaker.state === "loading"
      ? "thinking"
      : speaker.state === "speaking"
        ? "speaking"
        : "idle";

  useEffect(() => {
    playClip("greeting"); // optional; silently skipped if missing or autoplay is blocked
  }, []);
  useEffect(() => {
    if (!rec.supported) setTyping(true); // no speech recognition: typing is the only way in
  }, [rec.supported]);

  async function ask(question: string) {
    stopEverything();
    setHeard(question);
    setAnswer(null);
    setError("");
    setAsking(true);

    // "One moment": recorded clip if present, else the device voice. We don't
    // spend Gemini TTS quota on this; the text on the button is enough.
    playClip("one-moment").then((played) => {
      if (!played && speaker.mlVoice) speak(ML.oneMoment, speaker.mlVoice, { rate: BROWSER_RATE[speaker.speed] });
    });

    try {
      const res = await askQuestion(question);
      if (res.apply_service_id) {
        // "I need an income certificate": go straight to that application.
        // The next screen reads out what's needed and continues by voice.
        speaker.stop();
        router.push(`/apply?service=${encodeURIComponent(res.apply_service_id)}`);
        return;
      }
      setAnswer(res);
      speaker.say(res.answer);
    } catch (err) {
      const msg = err instanceof Error ? err.message : ML.apiError;
      setError(msg);
      speaker.say(msg); // errors are spoken too: the user may not be reading the screen
    } finally {
      setAsking(false);
    }
  }

  function stopEverything() {
    rec.abort();
    speaker.stop();
  }

  function startListening() {
    stopEverything();
    setError("");
    setHeard("");
    rec.start();
  }

  function onMicClick() {
    if (phase === "listening") rec.stop(); // onFinal will send what was heard
    else if (phase === "speaking") stopEverything();
    else if (phase === "idle") startListening();
  }

  function changeSpeed(s: Speed) {
    speaker.setSpeed(s);
    // Re-read the answer at the new speed so the change is heard at once.
    if (answer && phase !== "listening" && phase !== "thinking") speaker.say(answer.answer, { speed: s });
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

      {rec.supported ? (
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

      <Link href="/apply" className={styles.applyLink}>
        📝 സർട്ടിഫിക്കറ്റിന് അപേക്ഷിക്കാം
      </Link>

      {speaker.voiceChecked && !speaker.mlVoice && (
        <p className={styles.small}>ഈ ഉപകരണത്തിൽ മലയാളം ശബ്ദം ഇല്ല. ഓൺലൈൻ ശബ്ദം ഉപയോഗിക്കും.</p>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {(heard || rec.interim) && (
        <section className={styles.card}>
          <div className={styles.cardLabel}>ഞാൻ കേട്ടത്:</div>
          <p className={styles.heard}>{rec.interim || heard}</p>
          {rec.supported && phase === "idle" && (
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
            onClick={() => speaker.say(answer.answer)}
            disabled={phase === "listening" || phase === "thinking"}
          >
            🔊 വീണ്ടും കേൾക്കുക
          </button>
          <SpeedPicker
            value={speaker.speed}
            onChange={changeSpeed}
            disabled={phase === "listening" || phase === "thinking"}
          />
        </section>
      )}

      {speaker.lastFailed && <p className={styles.notice}>{NO_SOUND}</p>}

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
