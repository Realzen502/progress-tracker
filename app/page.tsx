import styles from "./page.module.css";

const goals = [
  "Real Estate Recruiting: Build a high-performing agent team",
  "Content & Audience Growth: Grow online presence (TikTok, IG, YouTube)",
  "Business Development: Expand referral network and partnerships",
];

const tasks = [
  "Research top real estate recruiting strategies",
  "Develop a content calendar for TikTok and IG",
  "Identify potential referral partners in the area",
  "Create a draft for a YouTube video outline",
  "Review and organize existing leads in the CRM",
];

export default function Home() {
  const completed = 0;
  const total = tasks.length;

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1>Progress Tracker</h1>
        <p className={styles.sub}>Daily operating dashboard</p>

        <div className={styles.section}>
          <h2>Goals</h2>
          <ul>
            {goals.map((goal) => (
              <li key={goal}>{goal}</li>
            ))}
          </ul>
        </div>

        <div className={styles.section}>
          <h2>Today&apos;s Tasks</h2>
          <ul>
            {tasks.map((task) => (
              <li key={task}>{task}</li>
            ))}
          </ul>
        </div>

        <div className={styles.footer}>
          <span>Completed: {completed}</span>
          <span>Remaining: {total - completed}</span>
        </div>
      </section>
    </main>
  );
}
