"use client";

// Scans the needed documents one by one: live camera → photo → compressed page
// → "more pages?" → PDF. Driven by voice (the page forwards commands through
// the ref) or by the big buttons. The phone's camera app / gallery is the
// fallback when the in-page camera isn't available.

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Icon } from "@/components/brand/Logo";
import type { DocCommand } from "@/lib/docs/commands";
import { compressFile, compressPage, kb, MAX_PAGES, type ScannedPage } from "@/lib/docs/compress";
import { makePdf } from "@/lib/docs/pdf";
import { saveDoc } from "@/lib/docs/store";
import styles from "./apply.module.css";

export interface DocToScan {
  en: string;
  ml: string;
}

export interface DocResult extends DocToScan {
  pdf: Blob | null; // null = skipped
  pages: number;
}

export interface DocCaptureHandle {
  command: (cmd: DocCommand | null) => void;
}

type Phase = "camera" | "preview" | "more";

const SAY = {
  intro: "ഇനി രേഖകളുടെ ഫോട്ടോ എടുക്കാം. ഓരോന്നായി ചോദിക്കാം.",
  show: (ml: string) => `${ml}. രേഖ ക്യാമറയ്ക്ക് മുന്നിൽ വെച്ച് എടുക്കൂ എന്ന് പറയൂ. ഇല്ലെങ്കിൽ ഒഴിവാക്കുക എന്ന് പറയൂ.`,
  preview: (size: string) => `ഫോട്ടോ എടുത്തു. ${size}. വായിക്കാൻ പറ്റുന്നുണ്ടോ? ശരി എന്നോ വീണ്ടും എന്നോ പറയൂ.`,
  more: "ഇനിയും പേജ് ഉണ്ടോ? ഉണ്ടെങ്കിൽ അടുത്ത പേജ് എന്നും, ഇല്ലെങ്കിൽ കഴിഞ്ഞു എന്നും പറയൂ.",
  nextPage: "അടുത്ത പേജ് ക്യാമറയ്ക്ക് മുന്നിൽ വെച്ച് എടുക്കൂ എന്ന് പറയൂ.",
  retake: "ശരി, വീണ്ടും എടുക്കാം. എടുക്കൂ എന്ന് പറയൂ.",
  saved: (ml: string, n: number) => `${ml} സേവ് ചെയ്തു. ${n} പേജ്.`,
  skipped: (ml: string) => `${ml} ഒഴിവാക്കി.`,
  maxPages: "പത്ത് പേജ് ആയി. ഈ രേഖ സേവ് ചെയ്യുന്നു.",
  noCamera: "ക്യാമറ തുറക്കാൻ കഴിഞ്ഞില്ല. താഴെയുള്ള ബട്ടൺ അമർത്തി ഫോട്ടോ എടുക്കൂ.",
  failed: "ഫോട്ടോ ശരിയായില്ല. വീണ്ടും എടുക്കൂ.",
};

type Props = {
  docs: DocToScan[];
  /** Speak, then listen for the next command. */
  speak: (text: string) => void;
  onComplete: (results: DocResult[]) => void;
};

export const DocCapture = forwardRef<DocCaptureHandle, Props>(function DocCapture({ docs, speak, onComplete }, ref) {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("camera");
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [pending, setPending] = useState<ScannedPage | null>(null);
  const [busy, setBusy] = useState(false);
  const [camOk, setCamOk] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const results = useRef<DocResult[]>([]);
  const prefix = useRef(""); // "saved"/"skipped" line, said together with the next prompt
  const doc = docs[idx];

  // Live camera (back camera, video only, so it doesn't compete with the mic).
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => {
        setCamOk(false);
      });
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Ask for each document as it comes up.
  useEffect(() => {
    if (!doc) return;
    const before = idx === 0 ? SAY.intro : prefix.current;
    prefix.current = "";
    speak(`${before ? before + " " : ""}${SAY.show(doc.ml)}${camOk ? "" : " " + SAY.noCamera}`);
  }, [idx]);

  async function capture() {
    if (busy) return;
    const v = videoRef.current;
    if (!camOk || !v || !v.videoWidth) {
      fileRef.current?.click(); // fall back to the phone's camera app
      return;
    }
    setBusy(true);
    try {
      showPreview(await compressPage(v, v.videoWidth, v.videoHeight));
    } catch {
      speak(SAY.failed);
    } finally {
      setBusy(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      showPreview(await compressFile(file));
    } catch {
      speak(SAY.failed);
    } finally {
      setBusy(false);
    }
  }

  function showPreview(p: ScannedPage) {
    setPending(p);
    setPhase("preview");
    speak(SAY.preview(kb(p.jpeg.length)));
  }

  function accept() {
    if (!pending) return;
    const next = [...pages, pending];
    setPages(next);
    setPending(null);
    if (next.length >= MAX_PAGES) {
      speak(SAY.maxPages);
      return finishDoc(next);
    }
    setPhase("more");
    speak(SAY.more);
  }

  function retake() {
    if (pending) URL.revokeObjectURL(pending.url);
    setPending(null);
    setPhase("camera");
    speak(SAY.retake);
  }

  function morePages() {
    setPhase("camera");
    speak(SAY.nextPage);
  }

  async function finishDoc(list = pages) {
    if (!list.length) return skip();
    const pdf = makePdf(list);
    await saveDoc(`${idx}-${doc.en}`, pdf);
    list.forEach((p) => URL.revokeObjectURL(p.url));
    results.current.push({ ...doc, pdf, pages: list.length });
    advance(SAY.saved(doc.ml, list.length));
  }

  function skip() {
    if (pending) URL.revokeObjectURL(pending.url);
    pages.forEach((p) => URL.revokeObjectURL(p.url));
    results.current.push({ ...doc, pdf: null, pages: 0 });
    advance(SAY.skipped(doc.ml));
  }

  /** Demo shortcut: this and every remaining document are marked skipped. */
  function skipAll() {
    if (pending) URL.revokeObjectURL(pending.url);
    pages.forEach((p) => URL.revokeObjectURL(p.url));
    for (const d of docs.slice(idx)) results.current.push({ ...d, pdf: null, pages: 0 });
    onComplete(results.current);
  }

  function advance(said: string) {
    setPages([]);
    setPending(null);
    setPhase("camera");
    if (idx + 1 < docs.length) {
      prefix.current = said; // spoken with the next document's prompt
      setIdx(idx + 1);
    } else {
      onComplete(results.current);
    }
  }

  // Voice: the same actions as the buttons, limited to what makes sense now.
  useImperativeHandle(ref, () => ({
    command(cmd) {
      if (busy) return;
      if (cmd === "skipAll") return skipAll();
      if (phase === "camera") {
        if (cmd === "capture" || cmd === "accept") return void capture();
        if (cmd === "skip") return pages.length ? void finishDoc() : skip();
        if (cmd === "done") return void finishDoc();
        return speak(SAY.show(doc.ml));
      }
      if (phase === "preview") {
        if (cmd === "accept" || cmd === "done") return accept();
        if (cmd === "retake" || cmd === "capture") return retake();
        return speak(SAY.preview(pending ? kb(pending.jpeg.length) : ""));
      }
      // "more pages?"  ("ഇല്ല" here means no more pages, not skip)
      if (cmd === "more" || cmd === "capture" || cmd === "accept") return morePages();
      if (cmd === "done" || cmd === "skip") return void finishDoc();
      speak(SAY.more);
    },
  }));

  if (!doc) return null;

  return (
    <section className={styles.card}>
      <p className={styles.progress}>
        രേഖ {idx + 1} / {docs.length} · Document {idx + 1} of {docs.length}
      </p>
      <h2 className={styles.cardTitle}>{doc.ml}</h2>
      <p className={styles.small}>{doc.en}</p>

      {/* Live camera stays mounted (hidden in preview) so it doesn't restart. */}
      <div className={styles.cameraBox} hidden={phase === "preview"}>
        {camOk ? (
          <video ref={videoRef} className={styles.camera} autoPlay playsInline muted />
        ) : (
          <p className={styles.small}>{SAY.noCamera}</p>
        )}
      </div>

      {phase === "preview" && pending && (
        <figure className={styles.previewFig}>
          <img src={pending.url} alt={`${doc.en}, page ${pages.length + 1}`} className={styles.previewImg} />
          <figcaption className={styles.small}>
            {kb(pending.jpeg.length)} · {pending.width}×{pending.height}
          </figcaption>
        </figure>
      )}

      {pages.length > 0 && (
        <div className={styles.thumbs} aria-label={`${pages.length} pages`}>
          {pages.map((p, i) => (
            <img key={p.url} src={p.url} alt={`page ${i + 1}`} className={styles.thumb} />
          ))}
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />

      {phase === "camera" && (
        <>
          <button className={styles.primary} onClick={capture} disabled={busy}>
            {busy ? "ഒരു നിമിഷം..." : "ഫോട്ടോ എടുക്കുക"}
          </button>
          <button className={styles.secondary} onClick={() => fileRef.current?.click()} disabled={busy}>
            ഫോൺ ക്യാമറ / ഗാലറി
          </button>
          {pages.length > 0 ? (
            <button className={styles.linkButton} onClick={() => void finishDoc()}>
              കഴിഞ്ഞു ({pages.length} പേജ്)
            </button>
          ) : (
            <button className={styles.linkButton} onClick={skip}>
              ഒഴിവാക്കുക
            </button>
          )}
        </>
      )}

      {phase === "preview" && (
        <div className={styles.options}>
          <button className={`${styles.option} ${styles.yes}`} onClick={accept}>
            ശരി
          </button>
          <button className={`${styles.option} ${styles.no}`} onClick={retake}>
            വീണ്ടും
          </button>
        </div>
      )}

      {phase === "more" && (
        <div className={styles.options}>
          <button className={`${styles.option} ${styles.yes}`} onClick={morePages}>
            അടുത്ത പേജ്
          </button>
          <button className={styles.option} onClick={() => void finishDoc()}>
            കഴിഞ്ഞു
          </button>
        </div>
      )}

      <button className={styles.skipAll} onClick={skipAll} disabled={busy}>
        എല്ലാ രേഖകളും ഒഴിവാക്കുക · Skip all documents (demo)
      </button>

      <p className={styles.voiceHint}>
        <Icon name="mic" size={28} /> എടുക്കൂ · ശരി · വീണ്ടും · അടുത്ത പേജ് · കഴിഞ്ഞു · ഒഴിവാക്കുക
      </p>
    </section>
  );
});
