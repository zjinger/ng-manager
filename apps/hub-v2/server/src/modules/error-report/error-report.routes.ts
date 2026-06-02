import type { FastifyInstance, FastifyRequest } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { fail } from "../../shared/http/error-response";
import { ok } from "../../shared/http/response";
import { requirePermission } from "../utils/require-permission";
import {
  createClientErrorReportSchema,
  listClientErrorReportsQuerySchema
} from "./error-report.schema";

const CLIENT_REPORT_BODY_LIMIT_BYTES = 64 * 1024;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 60;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const rateLimitBuckets = new Map<string, RateLimitBucket>();

export default async function errorReportRoutes(app: FastifyInstance) {
  app.post(
    "/client/error-reports",
    {
      bodyLimit: CLIENT_REPORT_BODY_LIMIT_BYTES
    },
    async (request, reply) => {
      if (isRateLimited(request)) {
        return reply.status(202).send(ok({ accepted: true, rateLimited: true }, "error report accepted"));
      }

      const body = createClientErrorReportSchema.parse(request.body);
      const ctx = request.requestContext;
      const entity = app.container.errorReportCommand.submit(body, {
        userAgent: resolveUserAgent(request),
        ip: resolveClientIp(request),
        userId: ctx?.authType === "user" ? ctx.userId ?? ctx.accountId : null,
        username: ctx?.authType === "user" ? ctx.nickname ?? ctx.accountId : null
      });

      return reply.status(201).send(ok({ id: entity.id, fingerprint: entity.fingerprint }, "error report accepted"));
    }
  );

  app.get("/admin/client-error-reports", async (request) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.audit.view");
    const query = listClientErrorReportsQuerySchema.parse(request.query);
    return ok(app.container.errorReportQuery.list(query));
  });

  app.get("/admin/client-error-reports/:reportId", async (request, reply) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.audit.view");
    const params = request.params as { reportId: string };
    const item = app.container.errorReportQuery.getById(params.reportId);
    if (!item) {
      return reply.status(404).send(fail("NOT_FOUND", "client error report not found"));
    }
    return ok(item);
  });
}

function resolveUserAgent(request: FastifyRequest): string | null {
  const value = request.headers["user-agent"];
  return typeof value === "string" ? value : value?.[0] ?? null;
}

function resolveClientIp(request: FastifyRequest): string {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0]?.trim() || request.ip;
  }
  return request.ip;
}

function isRateLimited(request: FastifyRequest): boolean {
  const now = Date.now();
  cleanupBuckets(now);
  const key = `${resolveClientIp(request)}|${resolveUserAgent(request) ?? ""}`;
  const current = rateLimitBuckets.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  current.count += 1;
  return current.count > RATE_LIMIT_MAX;
}

function cleanupBuckets(now: number): void {
  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(key);
    }
  }
}
