"use client";

import { SPEEDS, type Speed } from "@/lib/speed";
import styles from "./speed-picker.module.css";

/** Three big buttons to pick the reading speed (shared by both screens). */
export function SpeedPicker(props: { value: Speed; onChange: (s: Speed) => void; disabled?: boolean }) {
  return (
    <div className={styles.row} role="group" aria-label="വായനയുടെ വേഗത">
      <span className={styles.label}>വേഗത:</span>
      {SPEEDS.map((s) => (
        <button
          key={s.id}
          className={`${styles.button} ${props.value === s.id ? styles.active : ""}`}
          aria-pressed={props.value === s.id}
          onClick={() => props.onChange(s.id)}
          disabled={props.disabled}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
