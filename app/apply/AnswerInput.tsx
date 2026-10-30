"use client";

// How a question can be answered, by field kind: option buttons, the mic,
// a keypad, or typing. Rule 7: numbers and dates are always typed.

import { useEffect, useState } from "react";
import type { FieldDef, Option } from "@/lib/apply/types";
import styles from "./apply.module.css";

type Props = {
  field: FieldDef;
  /** Show the text box for voice kinds (after two failed tries, or on request). */
  typingMode: boolean;
  busy: boolean;
  mic: React.ReactNode;
  onPick: (o: Option) => void;
  onKeyed: (value: string) => void;
  onTypedVoiceAnswer: (text: string) => void;
};

export function AnswerInput({ field, typingMode, busy, mic, onPick, onKeyed, onTypedVoiceAnswer }: Props) {
  const [value, setValue] = useState("");
  const [showTyping, setShowTyping] = useState(typingMode);
  useEffect(() => {
    setValue("");
    setShowTyping(typingMode);
  }, [field.id, typingMode]);

  if (field.kind === "choice" || field.kind === "yesno") {
    return (
      <>
        <div className={styles.options}>
          {field.options?.map((o) => (
            <button key={o.value} className={styles.option} onClick={() => onPick(o)} disabled={busy}>
              {o.ml}
            </button>
          ))}
        </div>
        {mic}
      </>
    );
  }

  if (field.kind === "digits" || field.kind === "date" || field.kind === "typed") {
    const numeric = field.kind !== "typed";
    // Speak it, or type it (a family member, or when speech keeps mishearing).
    return (
      <>
        {mic}
        <form
          className={styles.keyForm}
          onSubmit={(e) => {
            e.preventDefault();
            if (value.trim()) onKeyed(value);
          }}
        >
          <input
            className={styles.keyInput}
            value={value}
            onChange={(e) => setValue(numeric ? formatNumeric(field.kind, e.target.value) : e.target.value)}
            inputMode={numeric ? "numeric" : field.id === "email" ? "email" : "text"}
            autoComplete="off"
            maxLength={field.kind === "date" ? 10 : field.maxLength}
            placeholder={field.placeholder ?? "ടൈപ്പ് ചെയ്യാം"}
            aria-label={field.label}
          />
          <button className={styles.primary} type="submit" disabled={!value.trim() || busy}>
            ശരി
          </button>
        </form>
      </>
    );
  }

  // name / place / translate / income: speak, or type if speech keeps failing.
  return (
    <>
      {mic}
      {showTyping ? (
        <form
          className={styles.keyForm}
          onSubmit={(e) => {
            e.preventDefault();
            if (value.trim()) onTypedVoiceAnswer(value.trim());
          }}
        >
          <input
            className={styles.keyInput}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={200}
            placeholder="മലയാളത്തിലോ ഇംഗ്ലീഷിലോ ടൈപ്പ് ചെയ്യൂ"
            aria-label={field.label}
            autoFocus
          />
          <button className={styles.primary} type="submit" disabled={!value.trim() || busy}>
            ശരി
          </button>
        </form>
      ) : (
        <button className={styles.linkButton} onClick={() => setShowTyping(true)}>
          ടൈപ്പ് ചെയ്യാം
        </button>
      )}
    </>
  );
}

/** Digits only; dates get slashes as you type (DD/MM/YYYY). */
function formatNumeric(kind: FieldDef["kind"], raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (kind !== "date") return d;
  const s = d.slice(0, 8);
  if (s.length <= 2) return s;
  if (s.length <= 4) return `${s.slice(0, 2)}/${s.slice(2)}`;
  return `${s.slice(0, 2)}/${s.slice(2, 4)}/${s.slice(4)}`;
}
