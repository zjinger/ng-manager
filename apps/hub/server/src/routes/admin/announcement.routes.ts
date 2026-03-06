import type { FastifyInstance } from "fastify";
import {
  createAnnouncementSchema,
  listAnnouncementQuerySchema,
  publishAnnouncementSchema,
  updateAnnouncementSchema
} from "../../modules/announcement/announcement.schema";
import { ok } from "../../utils/response";

export default async function adminAnnouncementRoutes(fastify: FastifyInstance) {
  fastify.get("/announcements", async (request) => {
    const query = listAnnouncementQuerySchema.parse(request.query);
    const result = fastify.services.announcement.list(query);
    return ok(result);
  });

  fastify.get("/announcements/:id", async (request) => {
    const params = request.params as { id: string };
    const item = fastify.services.announcement.getById(params.id);
    return ok(item);
  });

  fastify.post("/announcements", async (request, reply) => {
    const body = createAnnouncementSchema.parse(request.body);
    const item = fastify.services.announcement.create(body);
    return reply.status(201).send(ok(item, "announcement created"));
  });

  fastify.put("/announcements/:id", async (request) => {
    const params = request.params as { id: string };
    const body = updateAnnouncementSchema.parse(request.body);
    const item = fastify.services.announcement.update(params.id, body);
    return ok(item, "announcement updated");
  });

  fastify.post("/announcements/:id/publish", async (request) => {
    const params = request.params as { id: string };
    const body = publishAnnouncementSchema.parse(request.body ?? {});
    const item = fastify.services.announcement.publish(params.id, body);
    return ok(item, "announcement published");
  });

  fastify.post("/announcements/:id/archive", async (request) => {
    const params = request.params as { id: string };
    const item = fastify.services.announcement.archive(params.id);
    return ok(item, "announcement archived");
  });
}