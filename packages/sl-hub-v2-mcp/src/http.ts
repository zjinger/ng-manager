import { quote } from "./url";

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export type RequestContext = {
  baseUrl: string;
  projectKey: string;
  token: string;
};

export type HttpErrorPayload = {
  code: "HTTP_ERROR";
  status: number;
  message: string;
  body?: unknown;
};

export async function requestJson<T = unknown>(
  url: string,
  token: string,
  method: HttpMethod,
  body?: Record<string, unknown>,
): Promise<T> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  const response = await fetch(url, init);
  const text = await response.text();
  const parsed = parseResponseBody(text);
  if (!response.ok) {
    const error: HttpErrorPayload = {
      code: "HTTP_ERROR",
      status: response.status,
      message: response.statusText,
      body: parsed,
    };
    throw Object.assign(new Error(`HTTP ${response.status}: ${response.statusText}`), { payload: error });
  }
  return (parsed ?? { code: "OK", data: null }) as T;
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

export function tokenUrl(ctx: RequestContext, suffix = "", query?: Record<string, unknown>): string {
  return queryUrl(ctx, "api/token", suffix, query);
}

export function personalProjectUrl(ctx: RequestContext, suffix = "", query?: Record<string, unknown>): string {
  return queryUrl(ctx, "api/personal", suffix, query);
}

export function personalUrl(ctx: Pick<RequestContext, "baseUrl">, suffix = ""): string {
  return `${ctx.baseUrl}/api/personal${suffix}`;
}

function queryUrl(ctx: RequestContext, prefix: string, suffix = "", query?: Record<string, unknown>): string {
  let url = `${ctx.baseUrl}/${prefix}/projects/${quote(ctx.projectKey)}${suffix}`;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(compact(query ?? {}))) {
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, String(item));
      }
    } else {
      params.set(key, String(value));
    }
  }
  const queryString = params.toString();
  if (queryString) {
    url += `?${queryString}`;
  }
  return url;
}

export function compact<T extends Record<string, unknown>>(values: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && !(Array.isArray(value) && value.length === 0)) {
      result[key] = value;
    }
  }
  return result;
}
