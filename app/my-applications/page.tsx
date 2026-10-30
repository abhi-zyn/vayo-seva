"use client";

// "എന്റെ അപേക്ഷകൾ": the signed-in user's applications. Read straight from
// Supabase in the browser; row-level security returns only their own rows.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/brand/Logo";
import { signInWithGoogle, supabaseBrowser } from "@/lib/supabase/client";
import styles from "../apply/apply.module.css";

type Row = {
  id: string;
  ref: string;
  service_name: string;
  status: "pending_payment" | "paid" | "sent" | "failed";
  fee_inr: number;
  documents: { name: string; pages: number; provided: boolean }[];
  created_at: string;
};

const STATUS: Record<Row["status"], { ml: string; en: string }> = {
  pending_payment: { ml: "പണമടയ്ക്കാൻ ബാക്കി", en: "Payment pending" },
  paid: { ml: "പണം ലഭിച്ചു, അയയ്ക്കാൻ ബാക്കി", en: "Paid, not yet sent" },
  sent: { ml: "അക്ഷയ കേന്ദ്രത്തിലേക്ക് അയച്ചു", en: "Sent to Akshaya centre" },
  failed: { ml: "പ്രശ്നം ഉണ്ടായി", en: "Problem" },
};

export default function MyApplications() {
  const sb = supabaseBrowser();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [email, setEmail] = useState<string | null | undefined>(undefined); // undefined = checking

  useEffect(() => {
    if (!sb) return;
    sb.auth.getUser().then(async ({ data }) => {
      setEmail(data.user?.email ?? null);
      if (!data.user) return;
      const { data: list } = await sb
        .from("applications")
        .select("id, ref, service_name, status, fee_inr, documents, created_at")
        .order("created_at", { ascending: false });
      setRows((list as Row[]) ?? []);
    });
  }, [sb]);

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <Link href="/" className={styles.homeLink}>
          ← VayoSeva
        </Link>
        <h1 className={styles.title}>എന്റെ അപേക്ഷകൾ</h1>
      </header>

      {!sb && <p className={styles.hint}>Accounts are not set up yet (Supabase keys missing).</p>}

      {sb && email === null && (
        <section className={styles.card}>
          <p className={styles.question}>അപേക്ഷകൾ കാണാൻ ലോഗിൻ ചെയ്യൂ.</p>
          <button className={styles.primary} onClick={() => void signInWithGoogle("/my-applications")}>
            Google ഉപയോഗിച്ച് തുടരുക
          </button>
        </section>
      )}

      {email && (
        <p className={styles.small}>
          {email} ·{" "}
          <button
            className={styles.linkButton}
            onClick={async () => {
              await sb?.auth.signOut();
              window.location.href = "/";
            }}
          >
            ലോഗൗട്ട് · Sign out
          </button>
        </p>
      )}

      {rows && rows.length === 0 && (
        <section className={styles.card}>
          <p className={styles.question}>ഇതുവരെ അപേക്ഷകൾ ഇല്ല.</p>
          <Link href="/apply" className={styles.homeLink}>
            സർട്ടിഫിക്കറ്റിന് അപേക്ഷിക്കാം →
          </Link>
        </section>
      )}

      {rows?.map((r) => (
        <section key={r.id} className={styles.card}>
          <div className={styles.cardTitle}>
            <Icon name="document-tick" size={40} />
            {r.service_name}
          </div>
          <p className={styles.bigValue} style={{ fontVariantNumeric: "tabular-nums" }}>
            {r.ref}
          </p>
          <p>
            <strong>{STATUS[r.status].ml}</strong> · {STATUS[r.status].en}
          </p>
          <p className={styles.small}>
            {new Date(r.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            {r.fee_inr > 0 && ` · ₹${r.fee_inr}`}
          </p>
          {r.documents.length > 0 && (
            <ul className={styles.docList}>
              {r.documents.map((d) => (
                <li key={d.name}>
                  <span>{d.name}</span>
                  <span>{d.provided ? `${d.pages} page(s)` : "ഒഴിവാക്കി · skipped"}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </main>
  );
}
