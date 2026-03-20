import type { FastifyInstance } from "fastify";
import { createRequestContext } from "../../shared/context/request-context";
import { ok } from "../../shared/http/response";
import { listAnnouncementsQuerySchema } from "./announcement.schema";

export default async function announcementPublicRoutes(app: FastifyInstance) {
  app.get("/announcements", async (request) => {
    const query = listAnnouncementsQuerySchema.parse(request.query);
    const ctx = createRequestContext({
      accountId: "public",
      roles: [],
      source: "http",
      requestId: request.id,
      ip: request.ip
    });
    return ok(await app.container.announcementQuery.listPublic(query, ctx));
  });
}
