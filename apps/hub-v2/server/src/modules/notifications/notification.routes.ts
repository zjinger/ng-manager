import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import type { ListNotificationsQuery, MarkNotificationReadsInput } from "./notification.types";

export default async function notificationRoutes(app: FastifyInstance) {
  app.get("/notifications", async (request) => {
    const ctx = requireAuth(request);
    const query = request.query as ListNotificationsQuery;
    return ok(await app.container.notificationQuery.list(query, ctx));
  });

  app.post("/notifications/read", async (request) => {
    const ctx = requireAuth(request);
    const body = (request.body || {}) as MarkNotificationReadsInput;
    const result = await app.container.notificationCommand.markRead(body, ctx);
    const userId = ctx.userId?.trim();
    if (userId) {
      app.wsHub.broadcastToUsers([userId], {
        type: "notification.unread",
        ts: new Date().toISOString(),
        payload: {
          unreadCount: result.unreadCount
        }
      });
    }
    return ok(result);
  });
}
