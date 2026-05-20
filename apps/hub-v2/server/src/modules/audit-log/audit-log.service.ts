import type { RequestContext } from "../../shared/context/request-context";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import type { AuditLogCommandContract, AuditLogQueryContract } from "./audit-log.contract";
import { AuditLogRepo } from "./audit-log.repo";
import type { AuditLogListResult, CreateAuditLogInput, ListAuditLogsQuery } from "./audit-log.types";

const SENSITIVE_KEYWORDS = ["password", "passwd", "pwd", "token", "secret", "key", "apiKey", "accessKey", "privateKey", "encrypted"];

export class AuditLogService implements AuditLogCommandContract, AuditLogQueryContract {
  constructor(private readonly repo: AuditLogRepo) {}

  record(input: CreateAuditLogInput, ctx: RequestContext): void {
    try {
      this.repo.create({
        id: genId("audit"),
        module: input.module,
        action: input.action,
        level: input.level ?? "info",
        actorId: ctx.accountId === "anonymous" ? null : ctx.accountId,
        actorName: ctx.nickname?.trim() || null,
        actorUserId: ctx.userId?.trim() || null,
        targetType: input.targetType?.trim() || null,
        targetId: input.targetId?.trim() || null,
        targetName: input.targetName?.trim() || null,
        summary: input.summary.trim(),
        ip: ctx.ip?.trim() || null,
        userAgent: ctx.userAgent?.trim() || null,
        requestId: ctx.requestId?.trim() || null,
        beforeJson: this.stringifySanitized(input.before),
        afterJson: this.stringifySanitized(input.after),
        metaJson: this.stringifySanitized(input.meta),
        createdAt: nowIso()
      });
    } catch (error) {
      console.error("[audit-log] failed to record audit log", error);
    }
  }

  list(query: ListAuditLogsQuery): AuditLogListResult {
    return this.repo.list(query);
  }

  sanitize(value: unknown): unknown {
    if (value === null || value === undefined) {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item));
    }
    if (typeof value === "object") {
      const sanitized: Record<string, unknown> = {};
      for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
        sanitized[key] = this.isSensitiveKey(key) ? "[REDACTED]" : this.sanitize(nested);
      }
      return sanitized;
    }
    return value;
  }

  private stringifySanitized(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    return JSON.stringify(this.sanitize(value));
  }

  private isSensitiveKey(key: string): boolean {
    const normalized = key.toLowerCase();
    return SENSITIVE_KEYWORDS.some((keyword) => normalized.includes(keyword.toLowerCase()));
  }
}
