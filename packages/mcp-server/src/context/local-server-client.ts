import { getLocalServerDataDir, readLocalServerLock } from "@yinuo-ngm/runtime";
import type { LocalServerAvailability, LocalServerClient } from "./tool-context";
import { McpErrorCodes } from "../errors/error-codes";

type ApiEnvelope<T> = {
  ok?: boolean;
  data?: T;
  error?: string;
};

function normalizeHostForValidation(host: string): string {
  return host.trim().toLowerCase().replace(/^\[|\]$/g, "");
}

function isAllowedLocalHost(host: string): boolean {
  const normalized = normalizeHostForValidation(host);
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

function validatePort(port: unknown): number | null {
  const value = Number(port);
  return Number.isInteger(value) && value >= 1 && value <= 65535 ? value : null;
}

function validateServerUrl(value: string, source: "env" | "lock"): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`invalid ${source} local server URL`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${source} local server URL must use http or https`);
  }
  if (!isAllowedLocalHost(url.hostname)) {
    throw new Error(`${source} local server host must be localhost, 127.0.0.1, or ::1`);
  }

  const port = validatePort(url.port || (url.protocol === "https:" ? 443 : 80));
  if (!port) {
    throw new Error(`${source} local server port must be 1-65535`);
  }

  return url.origin;
}

function envServerUrl(): string | undefined {
  const value = process.env.NGM_MCP_SERVER_URL || process.env.NGM_SERVER_URL;
  const trimmed = value?.trim();
  return trimmed ? validateServerUrl(trimmed, "env") : undefined;
}

function lockServerUrl(): string | undefined {
  const lock = readLocalServerLock();
  if (!lock?.port) return undefined;
  const host = lock.host || "127.0.0.1";
  if (!isAllowedLocalHost(host)) {
    throw new Error("lock local server host must be localhost, 127.0.0.1, or ::1");
  }
  const port = validatePort(lock.port);
  if (!port) {
    throw new Error("lock local server port must be 1-65535");
  }
  const normalizedHost = normalizeHostForValidation(host);
  const urlHost = normalizedHost === "::1" ? "[::1]" : normalizedHost;
  return validateServerUrl(`http://${urlHost}:${port}`, "lock");
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 1500): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function unwrap<T>(value: unknown): T {
  const envelope = value as ApiEnvelope<T>;
  if (envelope && typeof envelope === "object" && "ok" in envelope) {
    if (envelope.ok === false) {
      throw new Error(envelope.error || "ng-manager server request failed");
    }
    if ("data" in envelope) {
      return envelope.data as T;
    }
    return value as T;
  }
  return value as T;
}

function unavailableError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = error instanceof Error && error.name === "AbortError"
    ? "request timed out"
    : message;
  const out = new Error(`ng-manager local server is unavailable: ${normalized}`);
  (out as Error & { code?: string; errorCode?: string }).code = McpErrorCodes.LOCAL_SERVER_UNAVAILABLE;
  (out as Error & { code?: string; errorCode?: string }).errorCode = McpErrorCodes.LOCAL_SERVER_UNAVAILABLE;
  return out;
}

function clampTail(tail: number): number {
  return Math.min(Math.max(Number.isInteger(tail) ? tail : 100, 1), 500);
}

export function createLocalServerClient(): LocalServerClient {
  async function baseUrl(): Promise<string> {
    const url = envServerUrl() || lockServerUrl();
    if (!url) {
      throw new Error(`ng-manager local server is not discoverable from ${getLocalServerDataDir()}; start ng-manager UI/server first`);
    }
    return url.replace(/\/+$/, "");
  }

  async function request<T>(method: string, route: string, body?: unknown): Promise<T> {
    const url = `${await baseUrl()}${route}`;
    let response: Response;
    try {
      response = await fetchWithTimeout(url, {
        method,
        headers: body === undefined ? undefined : { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (error) {
      throw unavailableError(error);
    }
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json") ? await response.json() : await response.text();
    if (!response.ok) {
      const envelope = payload as ApiEnvelope<unknown>;
      throw new Error(envelope?.error || `ng-manager server request failed: ${response.status}`);
    }
    return unwrap<T>(payload);
  }

  return {
    async availability(): Promise<LocalServerAvailability> {
      let url: string;
      try {
        url = await baseUrl();
      } catch (error) {
        return { available: false, reason: error instanceof Error ? error.message : String(error) };
      }

      try {
        const health = await request<{ name?: string; pid?: number }>("GET", "/health");
        if (health?.name === "ngm-server" && typeof health.pid === "number") {
          return { available: true, url };
        }
        return { available: false, url, reason: "health check did not identify ngm-server" };
      } catch (error) {
        return { available: false, url, reason: error instanceof Error ? error.message : String(error) };
      }
    },
    refreshTaskProject(projectId: string) {
      return request<any[]>("POST", `/api/tasks/refresh/${encodeURIComponent(projectId)}`);
    },
    refreshProjectScripts(projectId: string) {
      return request<any>("POST", `/api/projects/refreshScripts/${encodeURIComponent(projectId)}`);
    },
    updateProjectRuntime(projectId: string, runtime: unknown) {
      return request<any>("POST", `/api/projects/${encodeURIComponent(projectId)}/runtime`, { runtime });
    },
    listTaskViews(projectId: string) {
      return request<any[]>("GET", `/api/tasks/list/${encodeURIComponent(projectId)}`);
    },
    listActiveTasks() {
      return request<any[]>("GET", "/api/tasks/active");
    },
    startTask(taskId: string) {
      return request<any>("POST", "/api/tasks/start", { taskId });
    },
    stopTask(taskId: string) {
      return request<any>("POST", "/api/tasks/stop", { taskId });
    },
    getTaskStatus(taskId: string) {
      return request<any>("GET", `/api/tasks/status/${encodeURIComponent(taskId)}`);
    },
    getTaskLogTail(runId: string, tail: number) {
      return request<any[]>("GET", `/api/tasks/log/run/${encodeURIComponent(runId)}?tail=${encodeURIComponent(String(clampTail(tail)))}`);
    },
  };
}
