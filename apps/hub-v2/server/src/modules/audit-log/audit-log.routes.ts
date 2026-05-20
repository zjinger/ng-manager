import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import { requirePermission } from "../utils/require-permission";
import { listAuditLogsQuerySchema } from "./audit-log.schema";

export default async function auditLogRoutes(app: FastifyInstance) {
  app.get("/audit-logs", async (request) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.audit.view");
    const query = listAuditLogsQuerySchema.parse(request.query);
    return ok(app.container.auditLogQuery.list(query));
  });
}
