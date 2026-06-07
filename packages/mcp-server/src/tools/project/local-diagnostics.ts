import net from "net";
import { redactText, redactValue, SENSITIVE_KEY_RE } from "./observe-redaction";

export function portCheck(host: string, port: number, timeoutMs: number): Promise<{ status: "listening" | "unavailable" | "unknown"; responseTimeMs: number; error?: string }> {
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

export function normalizeLocalHost(hostname: string): { allowed: boolean; connectHost: string; reason?: string } {
  const value = hostname.trim().toLowerCase();
  if (value === "localhost" || value === "127.0.0.1" || value === "::ffff:127.0.0.1") return { allowed: true, connectHost: "127.0.0.1" };
  if (value === "::1" || value === "[::1]") return { allowed: true, connectHost: "::1" };
  if (value === "0.0.0.0") return { allowed: true, connectHost: "127.0.0.1" };
  if (value === "::" || value === "[::]") return { allowed: true, connectHost: "::1" };
  return { allowed: false, connectHost: hostname, reason: "only localhost, loopback, or wildcard local addresses are allowed" };
}

export function normalizeLocalUrl(input: URL): { allowed: boolean; url: URL; reason?: string } {
  const normalized = normalizeLocalHost(input.hostname);
  if (!normalized.allowed) return { allowed: false, url: input, reason: normalized.reason };
  const url = new URL(input.toString());
  url.hostname = normalized.connectHost;
  return { allowed: true, url };
}

export function headersObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = SENSITIVE_KEY_RE.test(key) ? "[REDACTED]" : redactText(value);
  });
  return out;
}

export async function readBodyPreview(response: Response, maxChars: number): Promise<string | undefined> {
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

export async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function redactHeaders(headers: Record<string, string> | undefined): Record<string, string> {
  return redactValue(headers ?? {}) as Record<string, string>;
}
