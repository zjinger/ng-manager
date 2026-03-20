import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import {
  createAnnouncementSchema,
  listAnnouncementsQuerySchema,
  updateAnnouncementSchema
} from "./announcement.schema";

export default async function announcementRoutes(app: FastifyInstance) {
  app.get("/announcements", async (request) => {
    const ctx = requireAuth(request);
    const query = listAnnouncementsQuerySchema.parse(request.query);
    return ok(await app.container.announcementQuery.list(query, ctx));
  });

  app.post("/announcements", async (request, reply) => {
    const ctx = requireAuth(request);
    const body = createAnnouncementSchema.parse(request.body);
    const entity = await app.container.announcementCommand.create(body, ctx);
    return reply.status(201).send(ok(entity, "announcement created"));
  });

  app.get("/announcements/:announcementId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { announcementId: string };
    return ok(await app.container.announcementQuery.getById(params.announcementId, ctx));
  });

  app.patch("/announcements/:announcementId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { announcementId: string };
    const body = updateAnnouncementSchema.parse(request.body);
    return ok(await app.container.announcementCommand.update(params.announcementId, body, ctx));
  });

  app.post("/announcements/:announcementId/publish", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { announcementId: string };
    return ok(
      await app.container.announcementCommand.publish(params.announcementId, ctx),
      "announcement published"
    );
  });
}
