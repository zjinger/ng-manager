import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import {
  createSystemTitleSchema,
  listSystemTitlesQuerySchema,
  updateSystemTitleSchema
} from "./system-title.schema";

export default async function systemTitleRoutes(app: FastifyInstance) {
  app.get("/titles", async (request) => {
    const ctx = requireAuth(request);
    const query = listSystemTitlesQuerySchema.parse(request.query);
    const items = await app.container.systemTitleQuery.listSystemTitles(query, ctx);
    return ok({ items });
  });

  app.post("/titles", async (request, reply) => {
    const ctx = requireAuth(request);
    const body = createSystemTitleSchema.parse(request.body);
    const item = await app.container.systemTitleCommand.createSystemTitle(body, ctx);
    return reply.status(201).send(ok(item, "system title created"));
  });

  app.patch("/titles/:titleId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { titleId: string };
    const body = updateSystemTitleSchema.parse(request.body);
    const item = await app.container.systemTitleCommand.updateSystemTitle(params.titleId, body, ctx);
    return ok(item, "system title updated");
  });

  app.delete("/titles/:titleId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { titleId: string };
    await app.container.systemTitleCommand.deleteSystemTitle(params.titleId, ctx);
    return ok({ id: params.titleId }, "system title deleted");
  });
}
