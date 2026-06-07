import * as fs from "fs/promises";
import * as path from "path";
import type { ResolvedProjectRoot } from "../filesystem/project-files";
import { projectRelativePath, resolveNgManagerPath, validateSafeId, writeJsonFile, writeTextFile } from "../filesystem/project-files";
import type { FrontendTask } from "./frontend-task.schema";
import { frontendTaskSchema } from "./frontend-task.schema";
import type { FrontendWorkflowStatus } from "./workflow-status";

function timestampSlug(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "task";
}

export function createTaskId(title: string): string {
  return `fe-${timestampSlug()}-${slugify(title)}`;
}

export function taskDir(projectRoot: string, taskId: string): string {
  validateSafeId("taskId", taskId);
  return resolveNgManagerPath(projectRoot, "frontend-tasks", taskId);
}

export function taskFile(projectRoot: string, taskId: string, fileName: string): string {
  validateSafeId("taskId", taskId);
  validateSafeId("fileName", fileName.replace(/\.(json|md)$/, ""));
  return resolveNgManagerPath(projectRoot, "frontend-tasks", taskId, fileName);
}

export async function readFrontendTask(project: ResolvedProjectRoot, taskId: string): Promise<FrontendTask> {
  const raw = await fs.readFile(taskFile(project.projectRoot, taskId, "task.json"), "utf-8");
  return frontendTaskSchema.parse(JSON.parse(raw));
}

export async function writeFrontendTask(project: ResolvedProjectRoot, task: FrontendTask): Promise<string> {
  const filePath = taskFile(project.projectRoot, task.taskId, "task.json");
  await writeJsonFile(filePath, task);
  return projectRelativePath(project.projectRoot, filePath);
}

export async function createFrontendTask(project: ResolvedProjectRoot, input: {
  taskId?: string;
  title: string;
  description?: string;
}): Promise<{ task: FrontendTask; changedFiles: string[] }> {
  const now = new Date().toISOString();
  const task: FrontendTask = {
    taskId: input.taskId || createTaskId(input.title),
    title: input.title,
    description: input.description,
    status: "draft",
    projectId: project.projectId,
    createdAt: now,
    updatedAt: now,
  };
  validateSafeId("taskId", task.taskId);
  const dir = taskDir(project.projectRoot, task.taskId);
  await fs.mkdir(dir, { recursive: true });
  const changedFiles = [await writeFrontendTask(project, task)];
  return { task, changedFiles };
}

export async function updateTaskStatus(project: ResolvedProjectRoot, taskId: string, status: FrontendWorkflowStatus): Promise<FrontendTask> {
  const task = await readFrontendTask(project, taskId);
  const updated = { ...task, status, updatedAt: new Date().toISOString() };
  await writeFrontendTask(project, updated);
  return updated;
}

export async function writeTaskMarkdown(project: ResolvedProjectRoot, taskId: string, fileName: string, content: string, nextStatus: FrontendWorkflowStatus) {
  const filePath = taskFile(project.projectRoot, taskId, fileName);
  await writeTextFile(filePath, content);
  const task = await updateTaskStatus(project, taskId, nextStatus);
  return {
    task,
    changedFiles: [
      projectRelativePath(project.projectRoot, filePath),
      projectRelativePath(project.projectRoot, taskFile(project.projectRoot, taskId, "task.json")),
    ],
  };
}

export function devPlanMarkdown(input: { taskId: string; title: string; context?: string; acceptance?: string[] }): string {
  const lines = [
    `# Dev Plan ${input.taskId}`,
    "",
    `## Title`,
    input.title,
    "",
    "## Context",
    input.context || "No design context provided.",
    "",
    "## Implementation",
    "- Inspect related Angular routes, services, stores, and API clients.",
    "- Make the smallest maintainable change that satisfies the task.",
    "- Keep write/execute operations previewable and auditable when adding MCP behavior.",
    "",
    "## Acceptance",
    ...(input.acceptance?.length ? input.acceptance.map((item) => `- ${item}`) : ["- Relevant build or package tests pass.", "- Review checklist has no unresolved high-risk item."]),
  ];
  return lines.join("\n");
}

export function deliveryReportMarkdown(input: { taskId: string; summary: string; verification?: string[]; risks?: string[] }): string {
  return [
    `# Delivery Report ${input.taskId}`,
    "",
    "## Summary",
    input.summary,
    "",
    "## Verification",
    ...(input.verification?.length ? input.verification.map((item) => `- ${item}`) : ["- Not recorded."]),
    "",
    "## Remaining Risks",
    ...(input.risks?.length ? input.risks.map((item) => `- ${item}`) : ["- No remaining risks recorded."]),
  ].join("\n");
}
