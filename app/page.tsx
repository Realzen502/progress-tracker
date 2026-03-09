import { promises as fs } from "node:fs";
import path from "node:path";
import Link from "next/link";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

type Task = {
  title: string;
  done: boolean;
  category?: string;
};

type DocMeta = {
  id: string;
  title: string;
  sourcePath: string;
  href: string;
};

type LessonMeta = {
  id: string;
  day: number;
  title: string;
  sourcePath: string;
  href: string;
  updatedAt?: string;
};

type ProgressData = {
  title: string;
  subtitle: string;
  updatedBy?: string;
  goals: string[];
  tasks: Task[];
  updatedAt?: string;
  kanban?: {
    todo?: string[];
    inProgress?: string[];
    done?: string[];
  };
  docs?: DocMeta[];
  lessons?: LessonMeta[];
  taskDocs?: Record<string, string[]>;
};

async function loadProgress(): Promise<ProgressData> {
  const filePath = path.join(process.cwd(), "data", "progress.json");
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as ProgressData;
}

function groupTasks(tasks: Task[]) {
  const grouped = new Map<string, Task[]>();
  for (const task of tasks) {
    const key = task.category?.trim() || "General";
    grouped.set(key, [...(grouped.get(key) || []), task]);
  }
  return grouped;
}

function renderTaskWithDoc(
  statusIcon: string,
  task: string,
  docsByTask: Record<string, DocMeta[]>,
) {
  const linkedDocs = docsByTask[task] || [];

  return (
    <li key={`${statusIcon}-${task}`}>
      {statusIcon} {task}
      {linkedDocs.length > 0 ? (
        <div className={styles.taskLinks}>
          {linkedDocs.map((doc) => (
            <Link key={`${task}-${doc.id}`} href={doc.href} className={styles.docLink}>
              {doc.title}
            </Link>
          ))}
        </div>
      ) : null}
    </li>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const data = await loadProgress();
  const params = await searchParams;
  const requestedTab = params?.tab;
  const activeTab =
    requestedTab === "kanban" || requestedTab === "lessons" ? requestedTab : "dashboard";

  const completed = data.tasks.filter((t) => t.done).length;
  const total = data.tasks.length;
  const groupedTasks = groupTasks(data.tasks);
  const kanban = {
    todo: data.kanban?.todo || [],
    inProgress: data.kanban?.inProgress || [],
    done: data.kanban?.done || [],
  };

  const docs = data.docs || [];
  const lessons = data.lessons || [];
  const docById = new Map(docs.map((doc) => [doc.id, doc]));
  const docsByTask: Record<string, DocMeta[]> = {};

  for (const [taskTitle, ids] of Object.entries(data.taskDocs || {})) {
    docsByTask[taskTitle] = ids
      .map((id) => docById.get(id))
      .filter((doc): doc is DocMeta => Boolean(doc));
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1>{data.title}</h1>
        <p className={styles.sub}>{data.subtitle}</p>

        <div className={styles.tabs}>
          <Link
            href="/"
            className={`${styles.tab} ${
              activeTab === "dashboard" ? styles.tabActive : ""
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/?tab=kanban"
            className={`${styles.tab} ${activeTab === "kanban" ? styles.tabActive : ""}`}
          >
            Kanban
          </Link>
          <Link
            href="/?tab=lessons"
            className={`${styles.tab} ${activeTab === "lessons" ? styles.tabActive : ""}`}
          >
            Lessons
          </Link>
        </div>

        {activeTab === "dashboard" ? (
          <>
            <div className={styles.section}>
              <h2>Goals</h2>
              <ul>
                {data.goals.map((goal) => (
                  <li key={goal}>{goal}</li>
                ))}
              </ul>
            </div>

            <div className={styles.section}>
              <h2>Today&apos;s Tasks</h2>
              {[...groupedTasks.entries()].map(([category, tasks]) => (
                <div key={category} className={styles.group}>
                  <h3>{category}</h3>
                  <ul>
                    {tasks.map((task) => (
                      <li key={`${category}-${task.title}`}>
                        <span>{task.done ? "✅" : "⬜"}</span> {task.title}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {activeTab === "kanban" ? (
          <>
            <div className={styles.kanbanGrid}>
              <div className={styles.group}>
                <h3>To Do</h3>
                <ul>{kanban.todo.map((task) => renderTaskWithDoc("⬜", task, docsByTask))}</ul>
              </div>
              <div className={styles.group}>
                <h3>In Progress</h3>
                <ul>
                  {kanban.inProgress.map((task) => renderTaskWithDoc("🔄", task, docsByTask))}
                </ul>
              </div>
              <div className={styles.group}>
                <h3>Done</h3>
                <ul>{kanban.done.map((task) => renderTaskWithDoc("✅", task, docsByTask))}</ul>
              </div>
            </div>

            <div className={styles.section}>
              <h2>Docs</h2>
              {docs.length === 0 ? (
                <p className={styles.sub}>No synced docs yet.</p>
              ) : (
                <ul className={styles.docsList}>
                  {docs.map((doc) => (
                    <li key={doc.id}>
                      <Link href={doc.href} className={styles.docLink}>
                        {doc.title}
                      </Link>
                      <span className={styles.docMeta}>{doc.sourcePath}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : null}

        {activeTab === "lessons" ? (
          <div className={styles.section}>
            <h2>Lessons</h2>
            {lessons.length === 0 ? (
              <p className={styles.sub}>No lessons synced yet.</p>
            ) : (
              <ul className={styles.docsList}>
                {lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <Link href={lesson.href} className={styles.docLink}>
                      Day {lesson.day}: {lesson.title}
                    </Link>
                    <span className={styles.docMeta}>
                      Updated: {new Date(lesson.updatedAt || "").toLocaleDateString("en-US")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        <div className={styles.footer}>
          <span>Completed: {completed}</span>
          <span>Remaining: {total - completed}</span>
          {data.updatedBy ? <span>Updated by: {data.updatedBy}</span> : null}
          {data.updatedAt ? (
            <span>Updated: {new Date(data.updatedAt).toLocaleString("en-US")}</span>
          ) : null}
        </div>
      </section>
    </main>
  );
}
