import type { FastifyInstance } from "fastify";
import { updateDashboardPreferencesSchema } from "../../modules/dashboard/dashboard.schema";
import { AppError } from "../../utils/app-error";
import { ok } from "../../utils/response";

export default async function adminDashboardRoutes(fastify: FastifyInstance) {
  fastify.get("/dashboard/summary", async (request) => {
    if (!request.adminUser) {
      throw new AppError("AUTH_UNAUTHORIZED", "unauthorized", 401);
    }

    return ok(fastify.services.dashboard.loadDashboard(request.adminUser));
  });

  fastify.get("/dashboard/preferences", async (request) => {
    if (!request.adminUser) {
      throw new AppError("AUTH_UNAUTHORIZED", "unauthorized", 401);
    }

    return ok(fastify.services.dashboard.loadStatPreferences(request.adminUser));
  });

  fastify.put("/dashboard/preferences", async (request) => {
    if (!request.adminUser) {
      throw new AppError("AUTH_UNAUTHORIZED", "unauthorized", 401);
    }

    const body = updateDashboardPreferencesSchema.parse(request.body);
    return ok(fastify.services.dashboard.updateStatPreferences(request.adminUser, body), "dashboard preferences updated");
  });
}
