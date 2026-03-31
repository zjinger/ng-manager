import type { FastifyInstance } from "fastify";
import { requirePersonalTokenAuth } from "../../shared/auth/require-personal-token-auth";
import { ok } from "../../shared/http/response";
import { personalProjectParamSchema } from "./personal-token.schema";

export default async function personalTokenIntrospectRoutes(app: FastifyInstance) {
  app.get("/me", async (request) => {
    const ctx = requirePersonalTokenAuth(request);
    return ok(app.container.personalTokenQuery.getIdentity(ctx));
  });

  app.get("/projects/:projectKey/capabilities", async (request) => {
    const ctx = requirePersonalTokenAuth(request);
    const params = personalProjectParamSchema.parse(request.params);
    return ok(app.container.personalTokenQuery.getProjectCapabilities(params.projectKey, ctx));
  });
}

