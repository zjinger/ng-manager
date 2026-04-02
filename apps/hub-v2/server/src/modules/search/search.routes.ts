import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import { searchQuerySchema } from "./search.schema";
import type { SearchEntityType } from "./search.types";

export default async function searchRoutes(app: FastifyInstance) {
  app.get("/search", async (request) => {
    const ctx = requireAuth(request);
    const query = searchQuerySchema.parse(request.query);
    return ok(
      await app.container.searchService.search(
        {
          q: query.q,
          types: query.types as SearchEntityType[] | undefined,
          limit: query.limit
        },
        ctx
      )
    );
  });
}
