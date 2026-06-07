import * as fs from "fs/promises";
import * as path from "path";
import type { ToolRiskLevel } from "../policy/tool-policy";
import type { ToolContext } from "../context/tool-context";
import type { ToolResult } from "../utils/result";
import { resolveNgManagerPath, resolveProjectRoot } from "../filesystem/project-files";
import { redactValue } from "./redact";

export type AuditToolEvent = {
  tool: string;
  riskLevel: ToolRiskLevel;
  args?: unknown;
  result?: ToolResult;
  error?: unknown;
  durationMs: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown, key: string): string | undefined {
  return isRecord(value) && typeof value[key] === "string" ? value[key] : undefined;
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
  const project = await resolveProjectRoot(context, {
    projectId: getString(args, "projectId"),
    projectPath: getString(args, "projectPath"),
  });
  const auditPath = resolveNgManagerPath(project.projectRoot, "audit", todayFileName());
  const entry = {
    time: new Date().toISOString(),
    tool: event.tool,
    riskLevel: event.riskLevel,
    projectId: getString(args, "projectId") ?? project.projectId,
    taskId: getString(args, "taskId"),
    status: resultStatus(event.result, event.error),
    changedFiles: changedFilesFromResult(event.result),
    durationMs: event.durationMs,
    error: event.error ? redactValue(event.error instanceof Error ? event.error.message : String(event.error)) : undefined,
    args: redactValue(event.args),
  };

  await fs.mkdir(path.dirname(auditPath), { recursive: true });
  await fs.appendFile(auditPath, `${JSON.stringify(entry)}\n`, "utf-8");
}

export function shouldAuditTool(toolName: string, riskLevel: ToolRiskLevel): boolean {
  return riskLevel !== "read" || toolName.startsWith("ngm.workflow.");
}
