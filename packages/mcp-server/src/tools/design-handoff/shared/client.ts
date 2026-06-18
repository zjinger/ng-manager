/**
 * Design Handoff HTTP 客户端
 * 只包含通用的 HTTP 请求方法，业务逻辑在各 tools 文件中
 */
import type { DesignHandoffConfig } from "./config";
import { handleHttpError } from "./errors";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export class DesignHandoffClient {
  constructor(private readonly config: DesignHandoffConfig) {}

  /**
   * 发送 HTTP 请求
   */
  async request<T = unknown>(
    method: HttpMethod,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    const response = await fetch(url, init);
    if (!response.ok) {
      await handleHttpError(response);
    }

    const text = await response.text();
    return parseResponseBody<T>(text);
  }

  /**
   * 发送 GET 请求
   */
  async get<T = unknown>(
    path: string,
    query?: Record<string, unknown>,
  ): Promise<T> {
    let url = path;
    if (query) {
      const queryString = toQueryString(query);
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    return this.request<T>("GET", url);
  }

  /**
   * 发送 POST 请求
   */
  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  /**
   * 发送 PUT 请求
   */
  async put<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PUT", path, body);
  }

  /**
   * 下载文件（返回二进制数据）
   */
  async download(path: string): Promise<{
    content: Buffer;
    contentType: string;
    contentLength: number;
  }> {
    const url = `${this.config.baseUrl}${path}`;
    const response = await fetch(url);

    if (!response.ok) {
      await handleHttpError(response);
    }

    const arrayBuffer = await response.arrayBuffer();
    const content = Buffer.from(arrayBuffer);
    const contentType =
      response.headers.get("content-type") ?? "application/octet-stream";

    return { content, contentType, contentLength: content.length };
  }
}

// ==================== 工具函数 ====================

function toQueryString(values: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        for (const item of value) {
          params.append(key, String(item));
        }
      } else {
        params.set(key, String(value));
      }
    }
  }
  return params.toString();
}

function parseResponseBody<T>(text: string): T {
  if (!text.trim()) {
    return undefined as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}
