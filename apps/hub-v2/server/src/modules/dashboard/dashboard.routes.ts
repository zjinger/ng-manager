import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import { dashboardBoardQuerySchema } from "./dashboard.schema";

export default async function dashboardRoutes(app: FastifyInstance) {
  app.get("/dashboard/board", async (request) => {
    const ctx = requireAuth(request);
    const query = dashboardBoardQuerySchema.parse(request.query);
    return ok(
      await app.container.dashboardQuery.getBoardData(
        { projectId: query.projectId, range: query.range ?? "7d" },
        ctx
      )
    );
  });

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

  app.get("/dashboard/reported-issues", async (request) => {
    const ctx = requireAuth(request);
    return ok(await app.container.dashboardQuery.getReportedIssues(ctx));
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
