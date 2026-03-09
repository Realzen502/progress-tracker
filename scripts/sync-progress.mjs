#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";

const workspaceRoot = path.resolve(process.cwd(), "..");
const kanbanPath = path.join(workspaceRoot, "brain", "kanban", "today.md");
const progressPath = path.join(process.cwd(), "data", "progress.json");

const defaultData = {
  title: "Progress Tracker",
  subtitle: "Daily operating dashboard",
  updatedBy: "Kanban Sync",
  goals: [],
  tasks: [],
  kanban: {
    todo: [],
    inProgress: [],
    done: [],
  },
};

const mapBucketFromHeading = (heading) => {
  const h = heading.toLowerCase();
  if (/\bin\s*progress\b|\bdoing\b/.test(h)) return "inProgress";
  if (/\bdone\b|\bcomplete(d)?\b/.test(h)) return "done";
  if (/\bto\s*do\b|\btodo\b|\bbacklog\b|\btasks?\b/.test(h)) return "todo";
  return null;
};

function parseKanban(markdown) {
  const lines = markdown.split(/\r?\n/);
  const tasks = [];
  const kanban = { todo: [], inProgress: [], done: [] };

  let currentHeading = "General";
  let currentBucket = "todo";

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,6}\s+(.+)$/);
    if (headingMatch) {
      currentHeading = headingMatch[1].trim();
      currentBucket = mapBucketFromHeading(currentHeading) || "todo";
      continue;
    }

    const taskMatch = line.match(/^\s*-\s*\[( |x|X)\]\s+(.+)$/);
    if (!taskMatch) continue;

    const done = taskMatch[1].toLowerCase() === "x";
    const title = taskMatch[2].trim();
    if (!title) continue;

    const inferredBucket = done ? "done" : currentBucket;
    kanban[inferredBucket].push(title);

    tasks.push({
      title,
      done,
      category: currentHeading || "General",
    });
  }

  return { tasks, kanban };
}

async function run() {
  const markdown = await fs.readFile(kanbanPath, "utf8");

  let existing = {};
  try {
    existing = JSON.parse(await fs.readFile(progressPath, "utf8"));
  } catch {
    existing = {};
  }

  const { tasks, kanban } = parseKanban(markdown);
  const output = {
    ...defaultData,
    ...existing,
    tasks,
    kanban,
    updatedBy: "Kanban Sync",
    updatedAt: new Date().toISOString(),
  };

  await fs.writeFile(progressPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Synced ${tasks.length} tasks from ${kanbanPath}`);
}

run().catch((error) => {
  console.error("Sync failed:", error);
  process.exit(1);
});
