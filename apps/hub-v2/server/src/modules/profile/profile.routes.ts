import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import { listProfileActivitiesQuerySchema, updateProfileNotificationPrefsSchema } from "./profile.schema";

export default async function profileRoutes(app: FastifyInstance) {
  app.get("/profile/preferences", async (request) => {
    const ctx = requireAuth(request);
    return ok(await app.container.profileQuery.getNotificationPrefs(ctx));
  });

  app.patch("/profile/preferences", async (request) => {
    const ctx = requireAuth(request);
    const body = updateProfileNotificationPrefsSchema.parse(request.body);
    return ok(await app.container.profileCommand.updateNotificationPrefs(body, ctx), "preferences updated");
  });

  app.get("/profile/activity", async (request) => {
    const ctx = requireAuth(request);
    const query = listProfileActivitiesQuerySchema.parse(request.query);
    return ok(await app.container.profileQuery.listActivities(query, ctx));
  });
}
