import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";

export default async function dashboardRoutes(app: FastifyInstance) {
  app.get("/dashboard/home", async (request) => {
    const ctx = requireAuth(request);
    return ok(await app.container.dashboardQuery.getHomeData(ctx));
  });
}
