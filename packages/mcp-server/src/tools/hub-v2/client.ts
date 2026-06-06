import type { HubV2ResolvedContext } from "./config/index";
import { toHubV2HttpError } from "./errors";

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export class HubV2Client {
  constructor(private readonly context: HubV2ResolvedContext) {}

  tokenUrl(suffix: string, query?: Record<string, unknown>): string {
    return this.queryUrl("api/token", suffix, query);
  }

  personalUrl(suffix: string, query?: Record<string, unknown>): string {
    return this.queryUrl("api/personal", suffix, query);
  }

  async request<T = unknown>(
    method: HttpMethod,
    url: string,
    body?: Record<string, unknown>,
    options: { preserveNull?: boolean } = {}
  ): Promise<T> {
    const headers: Record<string, string> = { Authorization: `Bearer ${this.context.token}` };
    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(options.preserveNull ? compactUndefined(body) : compact(body));
    }

    const response = await fetch(url, init);
    const text = await response.text();
    const parsed = parseResponseBody(text);
    if (!response.ok) {
      throw toHubV2HttpError(response.status, response.statusText, parsed);
    }
    return (parsed ?? { code: "OK", data: null }) as T;
  }

  async multipart<T = unknown>(method: "POST", url: string, body: FormData): Promise<T> {
    const response = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${this.context.token}` },
      body,
    });
    const text = await response.text();
    const parsed = parseResponseBody(text);
    if (!response.ok) {
      throw toHubV2HttpError(response.status, response.statusText, parsed);
    }
    return (parsed ?? { code: "OK", data: null }) as T;
  }

  private queryUrl(prefix: string, suffix: string, query?: Record<string, unknown>): string {
    let url = `${this.context.baseUrl}/${prefix}/projects/${encodeURIComponent(this.context.projectKey)}${suffix}`;
    const queryString = toQueryString(query ?? {});
    if (queryString) {
      url += `?${queryString}`;
    }
    return url;
  }
}

export function compact(values: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && !(Array.isArray(value) && value.length === 0)) {
      result[key] = value;
    }
  }
  return result;
}

export function compactUndefined(values: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && !(Array.isArray(value) && value.length === 0)) {
      result[key] = value;
    }
  }
  return result;
}

function toQueryString(values: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(compact(values))) {
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, String(item));
      }
    } else {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

function parseResponseBody(text: string): unknown {
  if (!text.trim()) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
