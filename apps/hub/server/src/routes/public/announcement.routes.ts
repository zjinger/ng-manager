import type { FastifyInstance } from "fastify";
import {
  publicAnnouncementDetailQuerySchema,
  publicListAnnouncementQuerySchema
} from "../../modules/announcement/announcement.schema";
import { ok } from "../../utils/response";

export default async function publicAnnouncementRoutes(fastify: FastifyInstance) {
  fastify.get("/announcements", async (request) => {
    const query = publicListAnnouncementQuerySchema.parse(request.query);

    const items = fastify.services.announcement.listPublic({
      projectKey: query.projectKey,
      includeGlobal: query.includeGlobal,
      scope: query.scope,
      limit: query.limit
    });

    return ok(items);
  });

  fastify.get("/announcements/:id", async (request) => {
    const params = request.params as { id: string };
    const query = publicAnnouncementDetailQuerySchema.parse(request.query);

    const item = fastify.services.announcement.getPublicById(
      params.id,
      query.scope ?? "all",
      query.projectKey
    );

    return ok(item);
  });
}