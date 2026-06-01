import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import { listPersonalApiTokenAuditLogsQuerySchema } from "../api-token-audit-log/api-token-audit-log.schema";
import { createPersonalTokenSchema, personalTokenIdParamSchema } from "./personal-token.schema";

export default async function personalTokenAdminRoutes(app: FastifyInstance) {
  app.get("/personal-api-tokens", async (request) => {
    const ctx = requireAuth(request);
    return ok(await app.container.personalTokenQuery.list(ctx));
  });

  app.get("/personal-api-tokens/audit-logs", async (request) => {
    const ctx = requireAuth(request);
    const actorUserId = ctx.userId?.trim();
    if (!actorUserId) {
      return ok({ items: [], page: 1, pageSize: 20, total: 0 });
    }
    const query = listPersonalApiTokenAuditLogsQuerySchema.parse(request.query);
    return ok(app.container.apiTokenAuditLogQuery.listPersonalByActor(actorUserId, query));
  });

  app.post("/personal-api-tokens", async (request, reply) => {
    const ctx = requireAuth(request);
    const body = createPersonalTokenSchema.parse(request.body);
    const result = await app.container.personalTokenCommand.create(
      {
        name: body.name,
        scopes: body.scopes,
        expiresAt: body.expiresAt ?? null
      },
      ctx
    );
    return reply.status(201).send(ok(result, "personal api token created"));
  });

  app.delete("/personal-api-tokens/:tokenId", async (request) => {
    const ctx = requireAuth(request);
    const params = personalTokenIdParamSchema.parse(request.params);
    await app.container.personalTokenCommand.revoke(params.tokenId, ctx);
    return ok({ id: params.tokenId }, "personal api token revoked");
  });

  app.delete("/personal-api-tokens/:tokenId/revoked", async (request) => {
    const ctx = requireAuth(request);
    const params = personalTokenIdParamSchema.parse(request.params);
    await app.container.personalTokenCommand.deleteRevoked(params.tokenId, ctx);
    return ok({ id: params.tokenId }, "personal api token deleted");
  });
}
