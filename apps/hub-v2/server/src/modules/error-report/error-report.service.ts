import { createHash } from "node:crypto";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import type { ErrorReportCommandContract, ErrorReportQueryContract } from "./error-report.contract";
import { ErrorReportRepo } from "./error-report.repo";
import type {
  ClientErrorReportEntity,
  ClientErrorReportListQuery,
  ClientErrorReportListResult,
  ClientErrorReportRequestMeta,
  CreateClientErrorReportInput
} from "./error-report.types";

const MAX_EXTRA_JSON_LENGTH = 12000;

export class ErrorReportService implements ErrorReportCommandContract, ErrorReportQueryContract {
  constructor(private readonly repo: ErrorReportRepo) {}

  submit(input: CreateClientErrorReportInput, meta: ClientErrorReportRequestMeta): ClientErrorReportEntity {
    const now = nowIso();
    const entity: ClientErrorReportEntity = {
      id: genId("cerr"),
      level: input.level,
      type: normalizeText(input.type, 80) || "unknown",
      message: normalizeText(input.message, 2000) || "(empty message)",
      stack: normalizeText(input.stack, 12000),
      source: sanitizeUrl(input.source, 1000),
      lineno: input.lineno ?? null,
      colno: input.colno ?? null,
      url: sanitizeUrl(input.url, 2000),
      route: sanitizeUrl(input.route, 1000),
      userAgent: normalizeText(meta.userAgent, 1000),
      ip: normalizeText(meta.ip, 120),
      appVersion: normalizeText(input.appVersion, 120),
      buildHash: normalizeText(input.buildHash, 160),
      userId: normalizeText(meta.userId, 120),
      username: normalizeText(meta.username, 160),
      requestMethod: normalizeText(input.requestMethod, 20)?.toUpperCase() ?? null,
      requestUrl: sanitizeUrl(input.requestUrl, 2000),
      statusCode: input.statusCode ?? null,
      extraJson: stringifyExtra(input.extra),
      fingerprint: "",
      occurrenceCount: 1,
      firstSeenAt: now,
      lastSeenAt: now,
      createdAt: now
    };
    entity.fingerprint = createFingerprint(entity);
    return this.repo.createOrUpdate(entity);
  }

  list(query: ClientErrorReportListQuery): ClientErrorReportListResult {
    return this.repo.list(query);
  }

  getById(id: string): ClientErrorReportEntity | null {
    return this.repo.getById(id);
  }
}

function createFingerprint(entity: Pick<ClientErrorReportEntity, "type" | "message" | "source" | "route" | "stack">): string {
  const stackHead = (entity.stack ?? "").split(/\r?\n/).slice(0, 3).join("\n");
  const raw = [entity.type, entity.message, entity.source ?? "", entity.route ?? "", stackHead].join("\n---\n");
  return createHash("sha256").update(raw).digest("hex");
}

function normalizeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function sanitizeUrl(value: unknown, maxLength: number): string | null {
  const text = normalizeText(value, maxLength);
  if (!text) {
    return null;
  }

  try {
    const url = new URL(text, "http://localhost");
    for (const key of Array.from(url.searchParams.keys())) {
      if (isSensitiveName(key)) {
        url.searchParams.set(key, "[REDACTED]");
      }
    }
    const sanitized = text.startsWith("http://") || text.startsWith("https://")
      ? url.toString()
      : `${url.pathname}${url.search}${url.hash}`;
    return sanitized.length > maxLength ? sanitized.slice(0, maxLength) : sanitized;
  } catch {
    return text;
  }
}

function stringifyExtra(extra: Record<string, unknown> | null | undefined): string | null {
  if (!extra) {
    return null;
  }

  try {
    const json = JSON.stringify(redactExtra(extra));
    return json.length > MAX_EXTRA_JSON_LENGTH ? json.slice(0, MAX_EXTRA_JSON_LENGTH) : json;
  } catch {
    return null;
  }
}

function redactExtra(value: unknown, depth = 0): unknown {
  if (depth > 4) {
    return "[Truncated]";
  }
  if (value === null || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return sanitizeMaybeUrl(value);
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => redactExtra(item, depth + 1));
  }
  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value).slice(0, 40)) {
      output[key] = isSensitiveName(key) ? "[REDACTED]" : redactExtra(child, depth + 1);
    }
    return output;
  }
  return String(value);
}

function sanitizeMaybeUrl(value: string): string {
  if (/^(https?:)?\/\//i.test(value) || value.startsWith("/") || value.includes("?")) {
    return sanitizeUrl(value, 1000) ?? value;
  }
  return value.length > 1000 ? value.slice(0, 1000) : value;
}

function isSensitiveName(name: string): boolean {
  const normalized = name.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return (
    normalized === "key" ||
    normalized.endsWith("key") ||
    normalized === "token" ||
    normalized.endsWith("token") ||
    normalized.includes("password") ||
    normalized.includes("secret") ||
    normalized === "auth" ||
    normalized.startsWith("auth") ||
    normalized.includes("authorization")
  );
}
