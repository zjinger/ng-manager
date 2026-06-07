import { z } from "zod";
import type { McpToolDefinition } from "../index";
import type { ToolContext } from "../../context/tool-context";
import { projectLocatorSchema, resolveProject } from "../project.tools";
import { ok } from "../../utils/result";
import { fetchWithTimeout, headersObject, normalizeLocalHost, normalizeLocalUrl, portCheck, readBodyPreview, redactHeaders } from "./local-diagnostics";
import { redactText } from "./observe-redaction";
import {
  activeTasks,
  fitLogLines,
  latestTimestamp,
  listProjectRows,
  localServerAvailability,
  runtimeSummary,
  taskStatus,
  taskSummary,
  type RuntimeLike,
} from "./observe-runtime";

const taskListSchema = projectLocatorSchema.extend({
  activeOnly: z.boolean().optional(),
}).strict();

const taskStatusSchema = z.object({
  taskId: z.string().trim().min(1),
}).strict();

const taskLogsSchema = z.object({
  taskId: z.string().trim().min(1).optional(),
  runId: z.string().trim().min(1).optional(),
  tail: z.number().int().min(1).max(200).optional(),
  maxChars: z.number().int().min(200).max(20000).optional(),
}).strict();

const portCheckSchema = z.object({
  host: z.string().trim().min(1).max(253).optional(),
  port: z.number().int().min(1).max(65535),
  timeoutMs: z.number().int().min(50).max(3000).optional(),
}).strict();

const healthCheckSchema = projectLocatorSchema.extend({
  taskId: z.string().trim().min(1).optional(),
  url: z.string().trim().min(1).optional(),
  method: z.enum(["GET", "HEAD"]).optional(),
  timeoutMs: z.number().int().min(100).max(5000).optional(),
  headers: z.record(z.string()).optional(),
  includeBodyPreview: z.boolean().optional(),
}).strict();

async function deriveHealthUrl(context: ToolContext, args: z.infer<typeof healthCheckSchema>): Promise<{ url?: string; reason?: string; runtime?: RuntimeLike | null }> {
  if (args.url) return { url: args.url };
  if (args.taskId) {
    const status = await taskStatus(context, args.taskId);
    const urls = Array.isArray(status.runtime?.urls) ? status.runtime?.urls.filter((item): item is string => typeof item === "string") : [];
    return urls[0] ? { url: urls[0], runtime: status.runtime } : { reason: "task runtime has no detected URL", runtime: status.runtime };
  }
  if (args.projectId || args.projectPath) {
    const project = await resolveProject(context, args);
    const availability = await localServerAvailability(context);
    const { rows } = await listProjectRows(context, project.id, availability);
    const row = rows.find((item) => item.runtime?.status === "running" && Array.isArray(item.runtime?.urls) && item.runtime.urls.length > 0);
    const url = row?.runtime?.urls?.find((item: unknown): item is string => typeof item === "string");
    return url ? { url, runtime: row?.runtime } : { reason: "project has no running task with detected URL" };
  }
  return { reason: "url, taskId, projectId, or projectPath is required" };
}

function listTasksTool(): McpToolDefinition {
  return {
    name: "ngm_project_list_tasks",
    description: "Skill ngm-project. Read-only diagnostic tool that lists ng-manager managed project tasks from the local server control plane when available. It does not execute scripts, stop processes, or inspect unmanaged system processes.",
    riskLevel: "read",
    inputSchema: taskListSchema,
    async handler(args, context) {
      const availability = await localServerAvailability(context);
      if (!availability.available) {
        return ok("ngm_project_list_tasks", { controlPlane: "unavailable", localServer: availability, status: "unavailable", reason: "ng-manager local server is not running; start it with ngm server or ngm ui to inspect managed task state", taskGroups: [] });
      }
      if (args.activeOnly && !args.projectId && !args.projectPath) {
        const { tasks, controlPlane } = await activeTasks(context, availability);
        return ok("ngm_project_list_tasks", { controlPlane, localServer: availability, activeOnly: true, tasks: tasks.map(taskSummary) });
      }

      const projects = args.projectId || args.projectPath ? [await resolveProject(context, args)] : await context.services.core.project.list();
      const taskGroups = [];
      for (const project of projects) {
        const { rows, controlPlane } = await listProjectRows(context, project.id, availability);
        const tasks = rows.map(taskSummary).filter((task) => !args.activeOnly || task.status === "running" || task.status === "stopping");
        taskGroups.push({ project: { id: project.id, name: project.name, root: project.root }, controlPlane, tasks });
      }
      return ok("ngm_project_list_tasks", { localServer: availability, activeOnly: args.activeOnly === true, taskGroups });
    },
  };
}

function taskStatusTool(): McpToolDefinition {
  return {
    name: "ngm_project_task_status",
    description: "Skill ngm-project. Read-only diagnostic tool that returns structured status for one ng-manager managed task, including runtime status, pid existence, exit code, recent update time, and error summary.",
    riskLevel: "read",
    inputSchema: taskStatusSchema,
    async handler(args, context) {
      const status = await taskStatus(context, args.taskId);
      const runtime = status.runtime;
      if (!runtime) {
        return ok("ngm_project_task_status", { controlPlane: status.controlPlane, localServer: status.localServer, taskId: args.taskId, status: "unavailable", running: false, pidExists: null, reason: "ng-manager local server is not running or the task is not available from the shared server runtime" });
      }
      return ok("ngm_project_task_status", {
        controlPlane: status.controlPlane,
        localServer: status.localServer,
        taskId: args.taskId,
        running: runtime?.status === "running",
        pidExists: runtimeSummary(runtime)?.pidExists ?? null,
        status: runtime?.status ?? "unknown",
        exitCode: runtime?.exitCode,
        signal: runtime?.signal,
        updatedAt: latestTimestamp(runtime ?? undefined),
        errorSummary: typeof runtime?.lastError === "string" ? redactText(runtime.lastError) : undefined,
        runtime: runtimeSummary(runtime ?? undefined),
      });
    },
  };
}

function taskLogsTool(): McpToolDefinition {
  return {
    name: "ngm_project_task_logs",
    description: "Skill ngm-project. Read-only diagnostic tool that reads a limited tail of logs for one ng-manager managed task/run. It enforces line and character limits and redacts token/password/secret/authorization-like values.",
    riskLevel: "read",
    inputSchema: taskLogsSchema,
    async handler(args, context) {
      const tail = args.tail ?? 50;
      const maxChars = args.maxChars ?? 8000;
      const availability = await localServerAvailability(context);
      let runId = args.runId;
      if (!runId && args.taskId) {
        const status = await taskStatus(context, args.taskId);
        if (!status.runtime) return ok("ngm_project_task_logs", { controlPlane: status.controlPlane, localServer: status.localServer, status: "unavailable", reason: "ng-manager local server is not running or the task has no shared runtime state", taskId: args.taskId, tail, maxChars, lines: [] });
        runId = status.runtime?.runId;
      }
      if (!runId) return ok("ngm_project_task_logs", { controlPlane: availability.available ? "local-server" : "unavailable", localServer: availability, status: "unavailable", reason: "runId could not be resolved from the provided taskId", taskId: args.taskId, tail, maxChars, lines: [] });

      const localServer = context.services.localServer;
      if (!availability.available || !localServer) return ok("ngm_project_task_logs", { controlPlane: "unavailable", localServer: availability, status: "unavailable", reason: "ng-manager local server is not running; start it with ngm server or ngm ui to read shared task logs", taskId: args.taskId, runId, tail, maxChars, lines: [] });

      const fitted = fitLogLines(await localServer.getTaskLogTail(runId, tail), maxChars);
      return ok("ngm_project_task_logs", { controlPlane: "local-server", localServer: availability, status: fitted.lines.length > 0 ? "ok" : "empty", reason: fitted.lines.length > 0 ? undefined : "no task log lines were found for this run", taskId: args.taskId, runId, tail, ...fitted });
    },
  };
}

function portCheckTool(): McpToolDefinition {
  return {
    name: "ngm_project_port_check",
    description: "Skill ngm-project. Read-only diagnostic tool that checks one local host/port for TCP listening state without running shell commands, killing processes, occupying the port, or scanning ranges.",
    riskLevel: "read",
    inputSchema: portCheckSchema,
    async handler(args) {
      const host = args.host ?? "127.0.0.1";
      const timeoutMs = args.timeoutMs ?? 800;
      const normalized = normalizeLocalHost(host);
      if (!normalized.allowed) return ok("ngm_project_port_check", { host, port: args.port, timeoutMs, status: "blocked", reason: normalized.reason });
      return ok("ngm_project_port_check", { host, checkedHost: normalized.connectHost, port: args.port, timeoutMs, ...(await portCheck(normalized.connectHost, args.port, timeoutMs)) });
    },
  };
}

function healthCheckTool(): McpToolDefinition {
  return {
    name: "ngm_project_health_check",
    description: "Skill ngm-project. Read-only diagnostic tool that performs a short local HTTP health check by URL or by URL detected from a managed project/task runtime. It uses GET by default, does not send request bodies, redacts sensitive headers, and returns only a small optional body preview.",
    riskLevel: "read",
    inputSchema: healthCheckSchema,
    async handler(args, context) {
      const timeoutMs = args.timeoutMs ?? 1500;
      const method = args.method ?? "GET";
      const derived = await deriveHealthUrl(context, args);
      if (!derived.url) return ok("ngm_project_health_check", { status: "unavailable", reachable: false, reason: derived.reason, runtime: runtimeSummary(derived.runtime ?? undefined) });

      let url: URL;
      try {
        url = new URL(derived.url);
      } catch {
        return ok("ngm_project_health_check", { status: "unavailable", reachable: false, reason: "invalid URL", url: redactText(derived.url) });
      }
      const normalizedUrl = normalizeLocalUrl(url);
      if ((url.protocol !== "http:" && url.protocol !== "https:") || !normalizedUrl.allowed) {
        return ok("ngm_project_health_check", { status: "blocked", reachable: false, reason: "health_check only supports local http/https URLs", url: redactText(derived.url) });
      }

      const startedAt = Date.now();
      const requestHeaders = redactHeaders(args.headers);
      try {
        const response = await fetchWithTimeout(normalizedUrl.url.toString(), { method, headers: args.headers }, timeoutMs);
        const responseTimeMs = Date.now() - startedAt;
        const bodyPreview = args.includeBodyPreview ? await readBodyPreview(response, 500) : undefined;
        return ok("ngm_project_health_check", { status: "ok", reachable: true, url: redactText(url.toString()), checkedUrl: redactText(normalizedUrl.url.toString()), method, timeoutMs, statusCode: response.status, responseTimeMs, requestHeaders, responseHeaders: headersObject(response.headers), bodyPreview, runtime: runtimeSummary(derived.runtime ?? undefined) });
      } catch (error: any) {
        return ok("ngm_project_health_check", { status: "unavailable", reachable: false, url: redactText(url.toString()), checkedUrl: redactText(normalizedUrl.url.toString()), method, timeoutMs, responseTimeMs: Date.now() - startedAt, requestHeaders, error: error?.name === "AbortError" ? "timeout" : redactText(error?.message ?? String(error)), runtime: runtimeSummary(derived.runtime ?? undefined) });
      }
    },
  };
}

export function projectObserveTools(): McpToolDefinition[] {
  return [listTasksTool(), taskStatusTool(), taskLogsTool(), portCheckTool(), healthCheckTool()];
}
