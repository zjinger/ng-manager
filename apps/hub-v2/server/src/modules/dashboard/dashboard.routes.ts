import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";

export default async function dashboardRoutes(app: FastifyInstance) {
  app.get("/dashboard/home", async (request) => {
    const ctx = requireAuth(request);
    return ok(await app.container.dashboardQuery.getHomeData(ctx));
  });

  app.get("/dashboard/stats", async (request) => {
    const ctx = requireAuth(request);
    return ok(await app.container.dashboardQuery.getStats(ctx));
  });

  app.get("/dashboard/todos", async (request) => {
    const ctx = requireAuth(request);
    return ok(await app.container.dashboardQuery.getTodos(ctx));
  });

  app.get("/dashboard/activities", async (request) => {
    const ctx = requireAuth(request);
    return ok(await app.container.dashboardQuery.getActivities(ctx));
  });

  app.get("/dashboard/announcements", async (request) => {
    const ctx = requireAuth(request);
    return ok(await app.container.dashboardQuery.getAnnouncements(ctx));
  });

  app.get("/dashboard/documents", async (request) => {
    const ctx = requireAuth(request);
    return ok(await app.container.dashboardQuery.getDocuments(ctx));
  });
}
