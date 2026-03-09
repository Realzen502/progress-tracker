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

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const data = await loadProgress();
  const params = await searchParams;
  const activeTab = params?.tab === "kanban" ? "kanban" : "dashboard";

  const completed = data.tasks.filter((t) => t.done).length;
  const total = data.tasks.length;
  const groupedTasks = groupTasks(data.tasks);
  const kanban = {
    todo: data.kanban?.todo || [],
    inProgress: data.kanban?.inProgress || [],
    done: data.kanban?.done || [],
  };

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
        ) : (
          <div className={styles.kanbanGrid}>
            <div className={styles.group}>
              <h3>To Do</h3>
              <ul>
                {kanban.todo.map((task) => (
                  <li key={`todo-${task}`}>⬜ {task}</li>
                ))}
              </ul>
            </div>
            <div className={styles.group}>
              <h3>In Progress</h3>
              <ul>
                {kanban.inProgress.map((task) => (
                  <li key={`inprogress-${task}`}>🔄 {task}</li>
                ))}
              </ul>
            </div>
            <div className={styles.group}>
              <h3>Done</h3>
              <ul>
                {kanban.done.map((task) => (
                  <li key={`done-${task}`}>✅ {task}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

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
