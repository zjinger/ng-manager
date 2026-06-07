import net from "net";
import { z } from "zod";
import type { McpToolDefinition } from "./index";
import { projectLocatorSchema, resolveProject } from "./project.tools";
import { ok } from "../utils/result";
import type { LocalServerAvailability, ToolContext } from "../context/tool-context";

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

type TaskRowLike = {
  spec?: Record<string, any>;
  runtime?: Record<string, any>;
};

type RuntimeLike = Record<string, any>;

const SENSITIVE_KEY_RE = /(authorization|token|password|passwd|secret|api[-_]?key|access[-_]?token|refresh[-_]?token)/i;

function redactText(value: string): string {
  return value
    .replace(/(authorization\s*[:=]\s*)(bearer\s+)?[^\s,;]+/gi, "$1[REDACTED]")
    .replace(/((?:token|password|passwd|secret|api[-_]?key|access[-_]?token|refresh[-_]?token)\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,;&]+)/gi, "$1[REDACTED]")
    .replace(/([?&](?:token|password|passwd|secret|api[-_]?key|access[-_]?token|refresh[-_]?token)=)[^&\s]+/gi, "$1[REDACTED]");
}

function redactValue(value: unknown): unknown {
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.map(redactValue);
  if (!value || typeof value !== "object") return value;

  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEY_RE.test(key) ? "[REDACTED]" : redactValue(item);
  }
  return out;
}

function defaultLocalServer(): LocalServerAvailability {
  return { available: false, reason: "local server client is not configured" };
}

async function localServerAvailability(context: ToolContext): Promise<LocalServerAvailability> {
  return context.services.localServer ? context.services.localServer.availability() : defaultLocalServer();
}

function pidExists(pid: unknown): boolean | null {
  if (typeof pid !== "number" || !Number.isInteger(pid) || pid <= 0) return null;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error: any) {
    if (error?.code === "ESRCH") return false;
    if (error?.code === "EPERM") return true;
    return null;
  }
}

function parsePortFromUrl(value: unknown): { url: string; host: string; port: number; protocol: string } | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const port = Number(url.port || (url.protocol === "https:" ? 443 : 80));
    return { url: redactText(value), host: url.hostname, port, protocol: url.protocol.replace(":", "") };
  } catch {
    return null;
  }
}

function portSummary(runtime?: RuntimeLike) {
  const urls = Array.isArray(runtime?.urls) ? runtime?.urls : [];
  return urls.map(parsePortFromUrl).filter(Boolean);
}

function runtimeSummary(runtime?: RuntimeLike) {
  if (!runtime) return undefined;
  return {
    taskId: runtime.taskId,
    runId: runtime.runId,
    status: runtime.status,
    pid: runtime.pid,
    pidExists: pidExists(runtime.pid),
    startedAt: runtime.startedAt,
    stoppedAt: runtime.stoppedAt,
    lastOutputAt: runtime.lastOutputAt,
    readyAt: runtime.readyAt,
    exitCode: runtime.exitCode,
    signal: runtime.signal,
    lastError: typeof runtime.lastError === "string" ? redactText(runtime.lastError) : runtime.lastError,
    urls: Array.isArray(runtime.urls) ? runtime.urls.map((url) => typeof url === "string" ? redactText(url) : url) : [],
  };
}

function taskSummary(rowOrRuntime: TaskRowLike | RuntimeLike) {
  const row = rowOrRuntime as TaskRowLike;
  const spec = row.spec;
  const runtime = (row.runtime ?? (!row.spec ? rowOrRuntime : undefined)) as RuntimeLike | undefined;
  return {
    taskId: spec?.id ?? runtime?.taskId,
    projectId: spec?.projectId ?? runtime?.projectId,
    projectPath: spec?.projectRoot,
    scriptName: spec?.name ?? runtime?.name,
    status: runtime?.status ?? "idle",
    pid: runtime?.pid,
    startTime: runtime?.startedAt,
    runtime: runtimeSummary(runtime),
    ports: portSummary(runtime),
  };
}

function latestTimestamp(runtime?: RuntimeLike): number | undefined {
  const values = [runtime?.lastOutputAt, runtime?.stoppedAt, runtime?.startedAt].filter((item): item is number => typeof item === "number");
  return values.length ? Math.max(...values) : undefined;
}

async function taskStatus(context: ToolContext, taskId: string): Promise<{ runtime: RuntimeLike | null; controlPlane: string; localServer: LocalServerAvailability }> {
  const localServer = context.services.localServer;
  const availability = await localServerAvailability(context);
  if (availability.available && localServer) {
    return {
      runtime: await localServer.getTaskStatus(taskId),
      controlPlane: "local-server",
      localServer: availability,
    };
  }

  return {
    runtime: null,
    controlPlane: "unavailable",
    localServer: availability,
  };
}

async function listProjectRows(context: ToolContext, projectId: string, availability: LocalServerAvailability): Promise<{ rows: TaskRowLike[]; controlPlane: string }> {
  const localServer = context.services.localServer;
  if (availability.available && localServer) {
    return { rows: await localServer.listTaskViews(projectId), controlPlane: "local-server" };
  }
  return { rows: [], controlPlane: "unavailable" };
}

async function activeTasks(context: ToolContext, availability: LocalServerAvailability): Promise<{ tasks: RuntimeLike[]; controlPlane: string }> {
  const localServer = context.services.localServer;
  if (availability.available && localServer) {
    return { tasks: await localServer.listActiveTasks(), controlPlane: "local-server" };
  }
  return { tasks: [], controlPlane: "unavailable" };
}

function fitLogLines(lines: unknown[], maxChars: number) {
  const redacted = redactValue(lines) as unknown[];
  const selected: unknown[] = [];
  let used = 0;

  for (let i = redacted.length - 1; i >= 0; i--) {
    let item = redacted[i];
    const remaining = maxChars - used;
    if (remaining <= 0) break;
    const length = JSON.stringify(item).length;
    if (length > remaining) {
      if (selected.length === 0) {
        item = truncateLogItem(item, remaining);
        selected.unshift(item);
        used += JSON.stringify(item).length;
      }
      break;
    }
    if (selected.length > 0 && used + length > maxChars) break;
    selected.unshift(item);
    used += length;
  }

  return {
    lines: selected,
    returned: selected.length,
    omitted: Math.max(0, redacted.length - selected.length),
    maxChars,
  };
}

function truncateLogItem(item: unknown, maxChars: number): unknown {
  const budget = Math.max(0, maxChars - 80);
  if (typeof item === "string") {
    return `${item.slice(0, budget)}...[truncated]`;
  }
  if (item && typeof item === "object" && !Array.isArray(item)) {
    const record = item as Record<string, unknown>;
    if (typeof record.text === "string") {
      return {
        ...record,
        text: `${record.text.slice(0, budget)}...[truncated]`,
        truncated: true,
      };
    }
  }
  return {
    text: `${JSON.stringify(item).slice(0, budget)}...[truncated]`,
    truncated: true,
  };
}

function portCheck(host: string, port: number, timeoutMs: number): Promise<{ status: "listening" | "unavailable" | "unknown"; responseTimeMs: number; error?: string }> {
  const startedAt = Date.now();
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    function finish(status: "listening" | "unavailable" | "unknown", error?: string) {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ status, responseTimeMs: Date.now() - startedAt, ...(error ? { error } : {}) });
    }

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish("listening"));
    socket.once("timeout", () => finish("unknown", "timeout"));
    socket.once("error", (error: any) => {
      const code = typeof error?.code === "string" ? error.code : "";
      finish(code === "ECONNREFUSED" ? "unavailable" : "unknown", code || error?.message || "connect error");
    });
    socket.connect(port, host);
  });
}

function normalizeLocalHost(hostname: string): { allowed: boolean; connectHost: string; reason?: string } {
  const value = hostname.trim().toLowerCase();
  if (value === "localhost" || value === "127.0.0.1" || value === "::ffff:127.0.0.1") {
    return { allowed: true, connectHost: "127.0.0.1" };
  }
  if (value === "::1" || value === "[::1]") {
    return { allowed: true, connectHost: "::1" };
  }
  if (value === "0.0.0.0") {
    return { allowed: true, connectHost: "127.0.0.1" };
  }
  if (value === "::" || value === "[::]") {
    return { allowed: true, connectHost: "::1" };
  }
  return { allowed: false, connectHost: hostname, reason: "only localhost, loopback, or wildcard local addresses are allowed" };
}

function normalizeLocalUrl(input: URL): { allowed: boolean; url: URL; reason?: string } {
  const normalized = normalizeLocalHost(input.hostname);
  if (!normalized.allowed) return { allowed: false, url: input, reason: normalized.reason };
  const url = new URL(input.toString());
  url.hostname = normalized.connectHost;
  return { allowed: true, url };
}

function headersObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = SENSITIVE_KEY_RE.test(key) ? "[REDACTED]" : redactText(value);
  });
  return out;
}

async function readBodyPreview(response: Response, maxChars: number): Promise<string | undefined> {
  if (!response.body) return undefined;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";

  try {
    while (text.length < maxChars) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      if (text.length >= maxChars) break;
    }
  } finally {
    reader.cancel().catch(() => undefined);
  }

  return redactText(text.slice(0, maxChars));
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

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

export function projectObserveTools(): McpToolDefinition[] {
  return [
    {
      name: "ngm_project_list_tasks",
      description: "Skill ngm-project. Read-only diagnostic tool that lists ng-manager managed project tasks from the local server control plane when available. It does not execute scripts, stop processes, or inspect unmanaged system processes.",
      riskLevel: "read",
      inputSchema: taskListSchema,
      async handler(args, context) {
        const availability = await localServerAvailability(context);
        if (!availability.available) {
          return ok("ngm_project_list_tasks", {
            controlPlane: "unavailable",
            localServer: availability,
            status: "unavailable",
            reason: "ng-manager local server is not running; start it with ngm server or ngm ui to inspect managed task state",
            taskGroups: [],
          });
        }

        if (args.activeOnly && !args.projectId && !args.projectPath) {
          const { tasks, controlPlane } = await activeTasks(context, availability);
          return ok("ngm_project_list_tasks", {
            controlPlane,
            localServer: availability,
            activeOnly: true,
            tasks: tasks.map(taskSummary),
          });
        }

        const projects = args.projectId || args.projectPath
          ? [await resolveProject(context, args)]
          : await context.services.core.project.list();
        const taskGroups = [];

        for (const project of projects) {
          const { rows, controlPlane } = await listProjectRows(context, project.id, availability);
          const tasks = rows.map(taskSummary).filter((task) => !args.activeOnly || task.status === "running" || task.status === "stopping");
          taskGroups.push({
            project: { id: project.id, name: project.name, root: project.root },
            controlPlane,
            tasks,
          });
        }

        return ok("ngm_project_list_tasks", {
          localServer: availability,
          activeOnly: args.activeOnly === true,
          taskGroups,
        });
      },
    },
    {
      name: "ngm_project_task_status",
      description: "Skill ngm-project. Read-only diagnostic tool that returns structured status for one ng-manager managed task, including runtime status, pid existence, exit code, recent update time, and error summary.",
      riskLevel: "read",
      inputSchema: taskStatusSchema,
      async handler(args, context) {
        const status = await taskStatus(context, args.taskId);
        const runtime = status.runtime;
        if (!runtime) {
          return ok("ngm_project_task_status", {
            controlPlane: status.controlPlane,
            localServer: status.localServer,
            taskId: args.taskId,
            status: "unavailable",
            running: false,
            pidExists: null,
            reason: "ng-manager local server is not running or the task is not available from the shared server runtime",
          });
        }
        return ok("ngm_project_task_status", {
          controlPlane: status.controlPlane,
          localServer: status.localServer,
          taskId: args.taskId,
          running: runtime?.status === "running",
          pidExists: pidExists(runtime?.pid),
          status: runtime?.status ?? "unknown",
          exitCode: runtime?.exitCode,
          signal: runtime?.signal,
          updatedAt: latestTimestamp(runtime ?? undefined),
          errorSummary: typeof runtime?.lastError === "string" ? redactText(runtime.lastError) : undefined,
          runtime: runtimeSummary(runtime ?? undefined),
        });
      },
    },
    {
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
          if (!status.runtime) {
            return ok("ngm_project_task_logs", {
              controlPlane: status.controlPlane,
              localServer: status.localServer,
              status: "unavailable",
              reason: "ng-manager local server is not running or the task has no shared runtime state",
              taskId: args.taskId,
              tail,
              maxChars,
              lines: [],
            });
          }
          runId = status.runtime?.runId;
        }

        if (!runId) {
          return ok("ngm_project_task_logs", {
            controlPlane: availability.available ? "local-server" : "unavailable",
            localServer: availability,
            status: "unavailable",
            reason: "runId could not be resolved from the provided taskId",
            taskId: args.taskId,
            tail,
            maxChars,
            lines: [],
          });
        }

        const localServer = context.services.localServer;
        if (!availability.available || !localServer) {
          return ok("ngm_project_task_logs", {
            controlPlane: "unavailable",
            localServer: availability,
            status: "unavailable",
            reason: "ng-manager local server is not running; start it with ngm server or ngm ui to read shared task logs",
            taskId: args.taskId,
            runId,
            tail,
            maxChars,
            lines: [],
          });
        }
        const controlPlane = "local-server";
        const rawLines = await localServer.getTaskLogTail(runId, tail);
        const fitted = fitLogLines(rawLines, maxChars);

        return ok("ngm_project_task_logs", {
          controlPlane,
          localServer: availability,
          status: fitted.lines.length > 0 ? "ok" : "empty",
          reason: fitted.lines.length > 0 ? undefined : "no task log lines were found for this run",
          taskId: args.taskId,
          runId,
          tail,
          ...fitted,
        });
      },
    },
    {
      name: "ngm_project_port_check",
      description: "Skill ngm-project. Read-only diagnostic tool that checks one local host/port for TCP listening state without running shell commands, killing processes, occupying the port, or scanning ranges.",
      riskLevel: "read",
      inputSchema: portCheckSchema,
      async handler(args) {
        const host = args.host ?? "127.0.0.1";
        const timeoutMs = args.timeoutMs ?? 800;
        const normalized = normalizeLocalHost(host);
        if (!normalized.allowed) {
          return ok("ngm_project_port_check", {
            host,
            port: args.port,
            timeoutMs,
            status: "blocked",
            reason: normalized.reason,
          });
        }
        const result = await portCheck(normalized.connectHost, args.port, timeoutMs);
        return ok("ngm_project_port_check", {
          host,
          checkedHost: normalized.connectHost,
          port: args.port,
          timeoutMs,
          ...result,
        });
      },
    },
    {
      name: "ngm_project_health_check",
      description: "Skill ngm-project. Read-only diagnostic tool that performs a short local HTTP health check by URL or by URL detected from a managed project/task runtime. It uses GET by default, does not send request bodies, redacts sensitive headers, and returns only a small optional body preview.",
      riskLevel: "read",
      inputSchema: healthCheckSchema,
      async handler(args, context) {
        const timeoutMs = args.timeoutMs ?? 1500;
        const method = args.method ?? "GET";
        const derived = await deriveHealthUrl(context, args);

        if (!derived.url) {
          return ok("ngm_project_health_check", {
            status: "unavailable",
            reachable: false,
            reason: derived.reason,
            runtime: runtimeSummary(derived.runtime ?? undefined),
          });
        }

        let url: URL;
        try {
          url = new URL(derived.url);
        } catch {
          return ok("ngm_project_health_check", {
            status: "unavailable",
            reachable: false,
            reason: "invalid URL",
            url: redactText(derived.url),
          });
        }

        const normalizedUrl = normalizeLocalUrl(url);
        if ((url.protocol !== "http:" && url.protocol !== "https:") || !normalizedUrl.allowed) {
          return ok("ngm_project_health_check", {
            status: "blocked",
            reachable: false,
            reason: "health_check only supports local http/https URLs",
            url: redactText(derived.url),
          });
        }

        const startedAt = Date.now();
        const requestHeaders = redactValue(args.headers ?? {}) as Record<string, string>;
        try {
          const response = await fetchWithTimeout(normalizedUrl.url.toString(), {
            method,
            headers: args.headers,
          }, timeoutMs);
          const responseTimeMs = Date.now() - startedAt;
          const bodyPreview = args.includeBodyPreview ? await readBodyPreview(response, 500) : undefined;

          return ok("ngm_project_health_check", {
            status: "ok",
            reachable: true,
            url: redactText(url.toString()),
            checkedUrl: redactText(normalizedUrl.url.toString()),
            method,
            timeoutMs,
            statusCode: response.status,
            responseTimeMs,
            requestHeaders,
            responseHeaders: headersObject(response.headers),
            bodyPreview,
            runtime: runtimeSummary(derived.runtime ?? undefined),
          });
        } catch (error: any) {
          return ok("ngm_project_health_check", {
            status: "unavailable",
            reachable: false,
            url: redactText(url.toString()),
            checkedUrl: redactText(normalizedUrl.url.toString()),
            method,
            timeoutMs,
            responseTimeMs: Date.now() - startedAt,
            requestHeaders,
            error: error?.name === "AbortError" ? "timeout" : redactText(error?.message ?? String(error)),
            runtime: runtimeSummary(derived.runtime ?? undefined),
          });
        }
      },
    },
  ];
}
