import { promises as fs } from "node:fs";
import path from "node:path";
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

export default async function Home() {
  const data = await loadProgress();
  const completed = data.tasks.filter((t) => t.done).length;
  const total = data.tasks.length;
  const groupedTasks = groupTasks(data.tasks);

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1>{data.title}</h1>
        <p className={styles.sub}>{data.subtitle}</p>

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
