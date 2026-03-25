import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import { createProjectTokenSchema, projectParamSchema, tokenIdParamSchema } from "./api-token.schema";

export default async function apiTokenAdminRoutes(app: FastifyInstance) {
  app.get("/projects/:projectKey/api-tokens", async (request) => {
    const ctx = requireAuth(request);
    const params = projectParamSchema.parse(request.params);
    return ok(await app.container.apiTokenQuery.listProjectTokens(params.projectKey, ctx));
  });

  app.post("/projects/:projectKey/api-tokens", async (request, reply) => {
    const ctx = requireAuth(request);
    const params = projectParamSchema.parse(request.params);
    const body = createProjectTokenSchema.parse(request.body);
    const result = await app.container.apiTokenCommand.createProjectToken(
      {
        projectKey: params.projectKey,
        name: body.name,
        scopes: body.scopes,
        expiresAt: body.expiresAt ?? null
      },
      ctx
    );
    return reply.status(201).send(ok(result, "project api token created"));
  });

  app.delete("/projects/:projectKey/api-tokens/:tokenId", async (request) => {
    const ctx = requireAuth(request);
    const params = tokenIdParamSchema.parse(request.params);
    await app.container.apiTokenCommand.revokeProjectToken(params.projectKey, params.tokenId, ctx);
    return ok({ id: params.tokenId }, "project api token revoked");
  });
}
