"use client";

// Bare capability check for real devices (Android Chrome first).
// Tests: ml-IN speech recognition, Malayalam TTS, and the voice list.

import { useEffect, useRef, useState } from "react";
import {
  getRecognitionCtor,
  hasSpeechSynthesis,
  isMalayalamVoice,
  micPermission,
  pickMalayalamVoice,
  recognitionErrorHint,
  speak,
  watchVoices,
  type SpeechRecognitionLike,
} from "@/lib/speech";
import { speakText } from "@/lib/tts-client";
import styles from "./voice-test.module.css";

const SAMPLE_ML = "നമസ്കാരം. ഇത് ഒരു ശബ്ദ പരിശോധനയാണ്. എന്റെ ശബ്ദം വ്യക്തമായി കേൾക്കാമോ?";

type Support = { recognition: boolean; synthesis: boolean; secure: boolean };

export default function VoiceTestPage() {
  // Support flags are only known in the browser, so start as null (SSR-safe).
  const [support, setSupport] = useState<Support | null>(null);
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [recError, setRecError] = useState("");
  const [micState, setMicState] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [ttsStatus, setTtsStatus] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  const addLog = (msg: string) =>
    setLog((l) => [`${new Date().toLocaleTimeString()}  ${msg}`, ...l].slice(0, 30));

  useEffect(() => {
    setSupport({
      recognition: getRecognitionCtor() !== null,
      synthesis: hasSpeechSynthesis(),
      secure: window.isSecureContext,
    });
    micPermission().then(setMicState);
    return watchVoices(setVoices);
  }, []);

  const mlVoice = pickMalayalamVoice(voices);
  const mlVoices = voices.filter(isMalayalamVoice);

  function startListening() {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    recRef.current?.abort();

    const rec = new Ctor();
    rec.lang = "ml-IN";
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setListening(true);
      addLog("recognition: start");
    };
    rec.onaudiostart = () => addLog("recognition: audio start (mic open)");
    rec.onspeechstart = () => addLog("recognition: speech detected");
    rec.onspeechend = () => addLog("recognition: speech end");
    rec.onresult = (e) => {
      // Results accumulate; rebuild final + interim text from the full list.
      let fin = "";
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) fin += r[0].transcript;
        else interim += r[0].transcript;
      }
      setFinalText(fin);
      setInterimText(interim);
      if (fin) addLog(`recognition: final "${fin}" (confidence ${e.results[0][0].confidence.toFixed(2)})`);
    };
    rec.onerror = (e) => {
      setRecError(`${e.error}: ${recognitionErrorHint(e.error)}`);
      addLog(`recognition: error ${e.error}`);
    };
    rec.onend = () => {
      setListening(false);
      setInterimText("");
      addLog("recognition: end");
      micPermission().then(setMicState); // may have changed after the prompt
    };

    setFinalText("");
    setInterimText("");
    setRecError("");
    recRef.current = rec;
    try {
      rec.start();
    } catch (err) {
      setRecError(String(err));
    }
  }

  function stopListening() {
    recRef.current?.stop();
  }

  function speakWith(voice: SpeechSynthesisVoice | null) {
    setTtsStatus("");
    speak(SAMPLE_ML, voice, {
      onStart: () => {
        setTtsStatus(`Speaking with: ${voice ? `${voice.name} (${voice.lang})` : "browser default for ml-IN"}`);
        addLog("tts: start");
      },
      onEnd: (ms) => {
        addLog(`tts: end after ${Math.round(ms)} ms`);
        // The sample takes several seconds to read. Ending almost at once means
        // the voice skipped the Malayalam text and nothing was heard.
        if (ms < 1000 && !(voice && isMalayalamVoice(voice))) {
          setTtsStatus(
            "Nothing was heard: this voice cannot read Malayalam, so it skipped the text. A Malayalam voice is needed (see the notice above).",
          );
        } else {
          setTtsStatus("Finished speaking.");
        }
      },
      onError: (err) => {
        setTtsStatus(`TTS error: ${err}`);
        addLog(`tts: error ${err}`);
      },
    });
  }

  function speakWithGemini() {
    setTtsStatus("Fetching Gemini audio…");
    addLog("gemini tts: request");
    // Passing no browser voice forces the Gemini path.
    speakText(SAMPLE_ML, null, {
      onStart: () => {
        setTtsStatus("Speaking with Gemini TTS.");
        addLog("gemini tts: playing");
      },
      onEnd: () => {
        setTtsStatus("Finished speaking (Gemini).");
        addLog("gemini tts: end");
      },
      onFail: (reason) => {
        setTtsStatus(`Gemini TTS failed: ${reason}. Check GEMINI_API_KEY in .env.local and the server log.`);
        addLog(`gemini tts: failed ${reason}`);
      },
    });
  }

  if (!support) return <main className={styles.main}>Checking browser support…</main>;

  return (
    <main className={styles.main}>
      <h1>Voice test</h1>

      {!support.secure && (
        <p className={styles.bad}>
          Not a secure context (HTTPS). The microphone will be blocked. Use the Vercel URL or localhost.
        </p>
      )}

      <section className={styles.section}>
        <h2>1. Speech recognition (ml-IN)</h2>
        {support.recognition ? (
          <p className={styles.ok}>SpeechRecognition is available.</p>
        ) : (
          <p className={styles.bad}>
            SpeechRecognition is NOT supported in this browser. Use Chrome on Android (or desktop Chrome).
          </p>
        )}
        {micState && (
          <p className={micState === "denied" ? styles.bad : styles.muted}>
            Microphone permission: {micState}
            {micState === "denied" && ". " + recognitionErrorHint("not-allowed")}
          </p>
        )}
        <button
          className={`${styles.bigButton} ${listening ? styles.listening : ""}`}
          disabled={!support.recognition}
          onClick={listening ? stopListening : startListening}
        >
          {listening ? "Stop listening" : "Start listening"}
        </button>
        <div className={styles.output}>
          <div className={styles.label}>Transcript</div>
          <div className={styles.transcript}>
            {finalText}
            {interimText && <span className={styles.interim}>{interimText}</span>}
            {!finalText && !interimText && <span className={styles.muted}>(nothing yet)</span>}
          </div>
          {recError && <p className={styles.bad}>Error: {recError}</p>}
        </div>
      </section>

      <section className={styles.section}>
        <h2>2. Text to speech</h2>
        {!support.synthesis ? (
          <p className={styles.bad}>speechSynthesis is NOT supported in this browser.</p>
        ) : mlVoice ? (
          <p className={styles.ok}>
            Malayalam voice found: {mlVoice.name} ({mlVoice.lang})
          </p>
        ) : (
          <p className={styles.bad}>
            No Malayalam voice on this device, so the sample will be silent. Fixes: on Android, Settings → Google
            TTS (Speech Services by Google) → Install voice data → Malayalam. On Windows, open this page in
            Microsoft Edge, which has online Malayalam voices (Midhun, Sobhana). Desktop Chrome and the Claude
            preview pane have none.
          </p>
        )}
        <button className={styles.bigButton} disabled={!support.synthesis} onClick={() => speakWith(mlVoice)}>
          Speak sample sentence
        </button>
        <button className={`${styles.bigButton} ${styles.secondButton}`} onClick={speakWithGemini}>
          Speak with Gemini (server TTS)
        </button>
        <p className={styles.sample}>{SAMPLE_ML}</p>
        {ttsStatus && <p>{ttsStatus}</p>}
      </section>

      <section className={styles.section}>
        <h2>3. Available voices ({voices.length})</h2>
        <p className={mlVoices.length ? styles.ok : styles.bad}>
          {mlVoices.length
            ? `${mlVoices.length} voice(s) with lang starting with "ml".`
            : 'No voice has lang starting with "ml".'}
        </p>
        <p className={styles.muted}>Tap a voice to hear the sample with it.</p>
        <ul className={styles.voiceList}>
          {voices.map((v) => (
            <li key={v.voiceURI + v.name}>
              <button
                className={`${styles.voiceButton} ${isMalayalamVoice(v) ? styles.mlVoice : ""}`}
                onClick={() => speakWith(v)}
              >
                <strong>{v.lang}</strong> {v.name}
                {v.localService ? "" : " (network)"}
                {v.default ? " [default]" : ""}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2>Event log</h2>
        <pre className={styles.log}>{log.join("\n") || "(no events)"}</pre>
        <p className={styles.muted}>User agent: {typeof navigator !== "undefined" ? navigator.userAgent : ""}</p>
      </section>
    </main>
  );
}
