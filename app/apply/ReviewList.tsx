"use client";

// The finished application, laid out for a family member to check before sending.

import type { Application } from "@/lib/apply/summary";
import styles from "./apply.module.css";

const pretty = (key: string) => key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

function Value({ v }: { v: unknown }) {
  if (v === null || v === undefined || v === "") return <span className={styles.missing}>—</span>;
  if (Array.isArray(v)) {
    return (
      <ol className={styles.subList}>
        {v.map((item, i) => (
          <li key={i}>
            {typeof item === "object" && item
              ? Object.entries(item)
                  .map(([k, x]) => `${pretty(k)}: ${x ?? "—"}`)
                  .join(", ")
              : String(item)}
          </li>
        ))}
      </ol>
    );
  }
  return <>{String(v)}</>;
}

function Section({ title, data }: { title: string; data: Record<string, unknown> }) {
  const rows = Object.entries(data);
  if (!rows.length) return null;
  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>{title}</h2>
      <dl className={styles.dl}>
        {rows.map(([k, v]) => (
          <div key={k} className={styles.dlRow}>
            <dt>{pretty(k)}</dt>
            <dd>
              <Value v={v} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function ReviewList({ app }: { app: Application }) {
  return (
    <>
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Service</h2>
        <p className={styles.bigValue}>{app.service}</p>
      </section>
      <Section title="Applicant / അപേക്ഷകൻ" data={app.applicant} />
      <Section title="Service details" data={app.service_details} />
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Documents to upload / അപ്‌ലോഡ് ചെയ്യേണ്ട രേഖകൾ</h2>
        <ul className={styles.subList}>
          {app.documents_to_upload.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </section>
      {app.missing_or_unsure.length > 0 && (
        <section className={`${styles.card} ${styles.warnCard}`}>
          <h2 className={styles.cardTitle}>Missing or unsure / ഉറപ്പില്ലാത്തവ</h2>
          <ul className={styles.subList}>
            {app.missing_or_unsure.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
