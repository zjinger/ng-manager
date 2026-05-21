import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import { adminSearchQuerySchema } from "./admin-search.schema";
import type { AdminSearchEntityType } from "./admin-search.types";

export default async function adminSearchRoutes(app: FastifyInstance) {
  app.get("/admin/search", async (request) => {
    const ctx = requireAuth(request);
    const query = adminSearchQuerySchema.parse(request.query);
    return ok(
      app.container.adminSearchService.search(
        {
          q: query.q,
          types: query.types as AdminSearchEntityType[] | undefined,
          limit: query.limit
        },
        ctx
      )
    );
  });
}
