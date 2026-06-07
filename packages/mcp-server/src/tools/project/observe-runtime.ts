import type { LocalServerAvailability, ToolContext } from "../../context/tool-context";
import { redactText, redactValue } from "./observe-redaction";

export type TaskRowLike = {
  spec?: Record<string, any>;
  runtime?: Record<string, any>;
};

export type RuntimeLike = Record<string, any>;

function defaultLocalServer(): LocalServerAvailability {
  return { available: false, reason: "local server client is not configured" };
}

export async function localServerAvailability(context: ToolContext): Promise<LocalServerAvailability> {
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

export function runtimeSummary(runtime?: RuntimeLike) {
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

export function taskSummary(rowOrRuntime: TaskRowLike | RuntimeLike) {
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

export function latestTimestamp(runtime?: RuntimeLike): number | undefined {
  const values = [runtime?.lastOutputAt, runtime?.stoppedAt, runtime?.startedAt].filter((item): item is number => typeof item === "number");
  return values.length ? Math.max(...values) : undefined;
}

export async function taskStatus(context: ToolContext, taskId: string): Promise<{ runtime: RuntimeLike | null; controlPlane: string; localServer: LocalServerAvailability }> {
  const localServer = context.services.localServer;
  const availability = await localServerAvailability(context);
  if (availability.available && localServer) {
    return { runtime: await localServer.getTaskStatus(taskId), controlPlane: "local-server", localServer: availability };
  }
  return { runtime: null, controlPlane: "unavailable", localServer: availability };
}

export async function listProjectRows(context: ToolContext, projectId: string, availability: LocalServerAvailability): Promise<{ rows: TaskRowLike[]; controlPlane: string }> {
  const localServer = context.services.localServer;
  if (availability.available && localServer) {
    return { rows: await localServer.listTaskViews(projectId), controlPlane: "local-server" };
  }
  return { rows: [], controlPlane: "unavailable" };
}

export async function activeTasks(context: ToolContext, availability: LocalServerAvailability): Promise<{ tasks: RuntimeLike[]; controlPlane: string }> {
  const localServer = context.services.localServer;
  if (availability.available && localServer) {
    return { tasks: await localServer.listActiveTasks(), controlPlane: "local-server" };
  }
  return { tasks: [], controlPlane: "unavailable" };
}

export function fitLogLines(lines: unknown[], maxChars: number) {
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

  return { lines: selected, returned: selected.length, omitted: Math.max(0, redacted.length - selected.length), maxChars };
}

function truncateLogItem(item: unknown, maxChars: number): unknown {
  const budget = Math.max(0, maxChars - 80);
  if (typeof item === "string") return `${item.slice(0, budget)}...[truncated]`;
  if (item && typeof item === "object" && !Array.isArray(item)) {
    const record = item as Record<string, unknown>;
    if (typeof record.text === "string") return { ...record, text: `${record.text.slice(0, budget)}...[truncated]`, truncated: true };
  }
  return { text: `${JSON.stringify(item).slice(0, budget)}...[truncated]`, truncated: true };
}
