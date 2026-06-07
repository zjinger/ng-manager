import * as fs from "fs/promises";
import * as path from "path";
import type { ToolRiskLevel } from "../policy/tool-policy";
import type { ToolContext } from "../context/tool-context";
import type { ToolResult } from "../utils/result";
import { resolveNgManagerPath } from "../filesystem/project-files";
import { redactText, redactValue } from "./redact";
import type { AuditToolEvent, AuditWarning } from "./audit-event";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown, key: string): string | undefined {
  return isRecord(value) && typeof value[key] === "string" ? value[key] : undefined;
}

function normalizePath(value: string): string {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.replace(/\\/g, "/").toLowerCase() : resolved;
}

async function registeredProjectByPath(context: ToolContext, projectPath: string): Promise<{
  projectId?: string;
  projectName?: string;
  projectRoot: string;
} | null> {
  const list = (context.services.core as any)?.project?.list;
  if (typeof list !== "function") return null;
  let projects: unknown;
  try {
    projects = await list.call((context.services.core as any).project);
  } catch {
    return null;
  }
  if (!Array.isArray(projects)) return null;
  const requested = normalizePath(projectPath);
  const matched = projects.find((project) => typeof project?.root === "string" && normalizePath(project.root) === requested);
  return matched ? {
    projectId: typeof matched.id === "string" ? matched.id : undefined,
    projectName: typeof matched.name === "string" ? matched.name : undefined,
    projectRoot: path.resolve(matched.root),
  } : null;
}

async function resolveAuditProjectRoot(context: ToolContext, args: Record<string, unknown>): Promise<{
  projectId?: string;
  projectName?: string;
  projectRoot: string;
}> {
  const projectId = getString(args, "projectId");
  if (projectId) {
    const project = await context.services.core.project.get(projectId);
    return {
      projectId: project.id,
      projectName: project.name,
      projectRoot: path.resolve(project.root),
    };
  }

  const projectPath = getString(args, "projectPath");
  if (projectPath) {
    const requestedRoot = path.resolve(projectPath);
    const registered = await registeredProjectByPath(context, requestedRoot);
    if (registered) return registered;
    throw new Error("Audit projectPath must match a registered project root");
  }

  return {
    projectRoot: path.resolve(context.workspaceRoot),
  };
}

function byteLength(value: unknown): number | undefined {
  return typeof value === "string" ? Buffer.byteLength(value, "utf-8") : undefined;
}

function shortText(value: unknown, maxChars = 200): string | undefined {
  if (typeof value !== "string") return undefined;
  const redacted = redactText(value);
  return redacted.length > maxChars ? `${redacted.slice(0, maxChars)}...` : redacted;
}

export function summarizeAuditArgs(args: unknown): Record<string, unknown> {
  const source = isRecord(args) ? args : {};
  const out: Record<string, unknown> = {};
  for (const key of ["projectId", "projectPath", "taskId"]) {
    const value = getString(source, key);
    if (value) out[key] = value;
  }
  for (const key of ["confirm", "dryRun", "overwrite"]) {
    if (typeof source[key] === "boolean") out[key] = source[key];
  }
  const title = shortText(source.title);
  if (title) out.title = title;
  const patchBytes = byteLength(source.patch);
  if (patchBytes !== undefined) out.patchBytes = patchBytes;
  const contextBytes = byteLength(source.context);
  if (contextBytes !== undefined) out.contextBytes = contextBytes;
  const markdownBytes = byteLength(source.markdown);
  if (markdownBytes !== undefined) out.markdownBytes = markdownBytes;
  const summaryBytes = byteLength(source.summary);
  if (summaryBytes !== undefined) out.summaryBytes = summaryBytes;
  return out;
}

function resultStatus(result: ToolResult | undefined, error: unknown): string {
  if (error) {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes("blocked by policy") ? "blocked" : "failed";
  }
  if (!result) return "unknown";
  if (!result.ok) return "failed";
  const data = isRecord(result.data) ? result.data : {};
  const operation = isRecord(data.operation) ? data.operation : undefined;
  return typeof operation?.status === "string" ? operation.status : "ok";
}

function changedFilesFromResult(result: ToolResult | undefined): string[] {
  if (!result?.ok || !isRecord(result.data)) return [];
  const value = result.data.changedFiles;
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").slice(0, 100);
}

function todayFileName(now = new Date()): string {
  return `mcp-${now.toISOString().slice(0, 10)}.jsonl`;
}

export async function writeAuditLog(context: ToolContext, event: AuditToolEvent): Promise<void> {
  const args = isRecord(event.args) ? event.args : {};
  const project = await resolveAuditProjectRoot(context, args);
  const auditPath = resolveNgManagerPath(project.projectRoot, "audit", todayFileName());
  const entry = {
    time: new Date().toISOString(),
    tool: event.tool,
    riskLevel: event.riskLevel,
    projectId: getString(args, "projectId") ?? project.projectId,
    projectRoot: project.projectRoot,
    taskId: getString(args, "taskId"),
    status: resultStatus(event.result, event.error),
    changedFiles: changedFilesFromResult(event.result),
    durationMs: event.durationMs,
    error: event.error ? redactValue(event.error instanceof Error ? event.error.message : String(event.error)) : undefined,
    argsSummary: summarizeAuditArgs(event.args),
  };

  await fs.mkdir(path.dirname(auditPath), { recursive: true });
  await fs.appendFile(auditPath, `${JSON.stringify(entry)}\n`, "utf-8");
}

export function shouldAuditTool(toolName: string, riskLevel: ToolRiskLevel): boolean {
  return riskLevel !== "read" || toolName.startsWith("ngm_workflow_");
}

export function auditWarning(error: unknown): AuditWarning {
  return {
    code: "AUDIT_LOG_WRITE_FAILED",
    message: error instanceof Error ? error.message : String(error),
  };
}
