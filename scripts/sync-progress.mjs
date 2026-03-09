#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";

const workspaceRoot = path.resolve(process.cwd(), "..");
const kanbanPath = path.join(workspaceRoot, "brain", "kanban", "today.md");
const projectsDir = path.join(workspaceRoot, "brain", "projects");
const progressPath = path.join(process.cwd(), "data", "progress.json");
const docsDir = path.join(process.cwd(), "data", "docs");

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
  docs: [],
  taskDocs: {},
};

const mapBucketFromHeading = (heading) => {
  const h = heading.toLowerCase();
  if (/\bin\s*progress\b|\bdoing\b/.test(h)) return "inProgress";
  if (/\bdone\b|\bcomplete(d)?\b/.test(h)) return "done";
  if (/\bto\s*do\b|\btodo\b|\bbacklog\b|\btasks?\b/.test(h)) return "todo";
  return null;
};

const toStableId = (value) =>
  value
    .toLowerCase()
    .replace(/\\/g, "/")
    .replace(/[^a-z0-9/._-]+/g, "-")
    .replace(/\//g, "-")
    .replace(/\.+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const prettifyTitle = (sourcePath) =>
  path
    .basename(sourcePath, path.extname(sourcePath))
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

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

function extractTaskPaths(taskTitle) {
  const matches = taskTitle.match(/(?:\.?\.?\/)?brain\/[\w./-]+\.md\b/g) || [];
  return matches.map((m) => m.replace(/^\.\//, "").replace(/^\.\.\//, ""));
}

async function listProjectDocs() {
  let entries = [];
  try {
    entries = await fs.readdir(projectsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
    .map((entry) => path.posix.join("brain", "projects", entry.name));
}

function findRelevantProjectDocs(tasks, projectDocPaths) {
  const relevant = new Set();
  const normalizedTasks = tasks.map((task) => ({
    ...task,
    lower: task.title.toLowerCase(),
  }));

  for (const sourcePath of projectDocPaths) {
    const stem = path.basename(sourcePath, ".md").toLowerCase();
    const keywords = stem.split(/[-_]+/).filter((part) => part.length >= 3);

    if (keywords.length === 0) continue;

    const isRelevant = normalizedTasks.some((task) =>
      keywords.some((keyword) => task.lower.includes(keyword)),
    );

    if (isRelevant) relevant.add(sourcePath);
  }

  return relevant;
}

async function buildDocs(tasks) {
  const explicitTaskPaths = new Set();
  for (const task of tasks) {
    for (const taskPath of extractTaskPaths(task.title)) {
      explicitTaskPaths.add(taskPath);
    }
  }

  const projectDocs = await listProjectDocs();
  const relevantProjectDocs = findRelevantProjectDocs(tasks, projectDocs);

  const allPaths = new Set([...explicitTaskPaths, ...relevantProjectDocs]);
  const docs = [];
  const taskDocs = {};

  for (const sourcePath of allPaths) {
    const absolutePath = path.join(workspaceRoot, sourcePath);

    let content;
    try {
      content = await fs.readFile(absolutePath, "utf8");
    } catch {
      continue;
    }

    const id = toStableId(sourcePath);
    const title = prettifyTitle(sourcePath);
    const href = `/docs/${id}`;

    docs.push({ id, title, sourcePath, href });

    const payload = {
      title,
      sourcePath,
      content,
      updatedAt: new Date().toISOString(),
    };

    await fs.mkdir(docsDir, { recursive: true });
    await fs.writeFile(path.join(docsDir, `${id}.json`), `${JSON.stringify(payload, null, 2)}\n`, "utf8");

    for (const task of tasks) {
      if (extractTaskPaths(task.title).includes(sourcePath)) {
        taskDocs[task.title] = [...(taskDocs[task.title] || []), id];
        continue;
      }

      const taskLower = task.title.toLowerCase();
      const titleWords = title.toLowerCase().split(/\s+/).filter((w) => w.length >= 3);
      if (titleWords.some((w) => taskLower.includes(w))) {
        taskDocs[task.title] = [...(taskDocs[task.title] || []), id];
      }
    }
  }

  docs.sort((a, b) => a.title.localeCompare(b.title));

  // Remove stale exported docs.
  const keep = new Set(docs.map((doc) => `${doc.id}.json`));
  try {
    const existing = await fs.readdir(docsDir, { withFileTypes: true });
    for (const entry of existing) {
      if (entry.isFile() && entry.name.endsWith(".json") && !keep.has(entry.name)) {
        await fs.unlink(path.join(docsDir, entry.name));
      }
    }
  } catch {
    // noop
  }

  return { docs, taskDocs };
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
  const { docs, taskDocs } = await buildDocs(tasks);

  const output = {
    ...defaultData,
    ...existing,
    tasks,
    kanban,
    docs,
    taskDocs,
    updatedBy: "Kanban Sync",
    updatedAt: new Date().toISOString(),
  };

  await fs.writeFile(progressPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Synced ${tasks.length} tasks and ${docs.length} docs from ${kanbanPath}`);
}

run().catch((error) => {
  console.error("Sync failed:", error);
  process.exit(1);
});
