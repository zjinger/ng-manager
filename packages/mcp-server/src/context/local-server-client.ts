import { getLocalServerDataDir, readLocalServerLock } from "@yinuo-ngm/runtime";
import type { LocalServerAvailability, LocalServerClient } from "./tool-context";

type ApiEnvelope<T> = {
  ok?: boolean;
  data?: T;
  error?: string;
};

function envServerUrl(): string | undefined {
  const value = process.env.NGM_MCP_SERVER_URL || process.env.NGM_SERVER_URL;
  return value?.trim() || undefined;
}

function lockServerUrl(): string | undefined {
  const lock = readLocalServerLock();
  if (!lock?.port) return undefined;
  const host = lock.host || "127.0.0.1";
  return `http://${host}:${lock.port}`;
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
    return envelope.data as T;
  }
  return value as T;
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
    const response = await fetchWithTimeout(url, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
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
      return request<any[]>("GET", `/api/tasks/log/run/${encodeURIComponent(runId)}?tail=${encodeURIComponent(String(tail))}`);
    },
  };
}
