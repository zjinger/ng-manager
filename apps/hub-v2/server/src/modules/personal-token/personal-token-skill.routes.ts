import type { FastifyInstance } from "fastify";
import { requirePersonalTokenAuth } from "../../shared/auth/require-personal-token-auth";
import { ok } from "../../shared/http/response";
import { listSkillsQuerySchema } from "../skill-hub/skill-hub.schema";

export default async function personalTokenSkillRoutes(app: FastifyInstance) {
  app.get("/skills", async (request) => {
    const ctx = requirePersonalTokenAuth(request, "skill:read");
    const query = listSkillsQuerySchema.parse(request.query);
    return ok(
      await app.container.skillHubQuery.list(
        {
          ...query,
          status: "published"
        },
        ctx
      )
    );
  });
}
