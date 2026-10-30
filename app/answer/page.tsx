// No-JavaScript fallback: the home screen's type-to-ask form submits here
// (GET /answer?q=...) when scripts don't run. Rendered on the server.

import Link from "next/link";
import { answerQuestion } from "@/lib/ask-core";
import { STRINGS } from "@/lib/ui-strings";
import styles from "../home.module.css";

export const dynamic = "force-dynamic";

export default async function AnswerPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const t = STRINGS.ml;
  const out = q.trim() ? await answerQuestion(q) : null;

  return (
    <main className={styles.main}>
      <h1 className={styles.greeting}>{t.answer}</h1>
      {q && (
        <p className={styles.prompt}>
          {t.heard}: {q}
        </p>
      )}
      <section className={styles.panel}>
        <p className={styles.noJsAnswer}>{out ? (out.ok ? out.result.answer : out.error) : t.typePlaceholder}</p>
      </section>
      <form action="/answer" method="get" className={styles.typeForm}>
        <label htmlFor="q2" className={styles.typeLabel}>
          {t.typeLabel}
        </label>
        <textarea id="q2" name="q" className={styles.typeInput} rows={3} maxLength={500} defaultValue="" />
        <button type="submit" className={styles.typeSend}>
          {t.typeSend}
        </button>
      </form>
      <Link href="/" className={styles.backLink}>
        VayoSeva
      </Link>
    </main>
  );
}
