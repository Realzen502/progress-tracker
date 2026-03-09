import { promises as fs } from "node:fs";
import path from "node:path";
import Link from "next/link";
import styles from "../../page.module.css";

export const dynamic = "force-dynamic";

type DocPayload = {
  title: string;
  sourcePath: string;
  content: string;
  updatedAt?: string;
};

async function loadDoc(id: string): Promise<DocPayload | null> {
  const safeId = id.replace(/[^a-z0-9-]/gi, "");
  if (!safeId) return null;

  const filePath = path.join(process.cwd(), "data", "docs", `${safeId}.json`);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as DocPayload;
  } catch {
    return null;
  }
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doc = await loadDoc(id);

  const isLesson = doc?.sourcePath?.includes("brain/learning/real-estate-recruiting/day-");

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p>
          <Link href={isLesson ? "/?tab=lessons" : "/?tab=kanban"} className={styles.docLink}>
            {isLesson ? "← Back to Lessons" : "← Back to Kanban"}
          </Link>
        </p>

        {!doc ? (
          <div className={styles.section}>
            <h2>Document not found</h2>
            <p className={styles.sub}>
              This document hasn&apos;t been synced yet or the link is stale.
            </p>
          </div>
        ) : (
          <>
            <h1>{doc.title}</h1>
            <p className={styles.sub}>{doc.sourcePath}</p>
            <pre className={styles.docContent}>{doc.content}</pre>
            {doc.updatedAt ? (
              <div className={styles.footer}>
                <span>Updated: {new Date(doc.updatedAt).toLocaleString("en-US")}</span>
              </div>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}
