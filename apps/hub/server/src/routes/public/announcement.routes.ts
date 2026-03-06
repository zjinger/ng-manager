import type { FastifyInstance } from "fastify";
import { AppError } from "../../utils/app-error";
import { ok } from "../../utils/response";

export default async function publicAnnouncementRoutes(fastify: FastifyInstance) {
  fastify.get("/announcements", async (request) => {
    const query = request.query as {
      scope?: "desktop" | "cli" | "all";
      limit?: string | number;
    };

    const scope = query.scope ?? "all";
    if (!["desktop", "cli", "all"].includes(scope)) {
      throw new AppError("VALIDATION_ERROR", "scope must be one of: all, desktop, cli", 400);
    }

    const rawLimit = Number(query.limit ?? 10);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(rawLimit, 100)) : 10;

    const items = fastify.services.announcement.listPublic(scope, limit);
    return ok(items);
  });

  fastify.get("/announcements/:id", async (request) => {
    const params = request.params as { id: string };
    const query = request.query as { scope?: "desktop" | "cli" | "all" };

    const scope = query.scope ?? "all";
    if (!["desktop", "cli", "all"].includes(scope)) {
      throw new AppError("VALIDATION_ERROR", "scope must be one of: all, desktop, cli", 400);
    }

    const item = fastify.services.announcement.getPublicById(params.id, scope);
    return ok(item);
  });
}