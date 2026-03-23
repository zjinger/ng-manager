import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import type { ListNotificationsQuery } from "./notification.types";

export default async function notificationRoutes(app: FastifyInstance) {
  app.get("/notifications", async (request) => {
    const ctx = requireAuth(request);
    const query = request.query as ListNotificationsQuery;
    return ok(await app.container.notificationQuery.list(query, ctx));
  });
}
