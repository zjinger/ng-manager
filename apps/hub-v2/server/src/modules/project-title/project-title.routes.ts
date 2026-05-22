import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import { requirePermission } from "../utils/require-permission";
import {
  createProjectTitleSchema,
  listProjectTitlesQuerySchema,
  updateProjectTitleSchema
} from "./project-title.schema";

export default async function projectTitleRoutes(app: FastifyInstance) {
  app.get("/project-titles", async (request) => {
    const ctx = requireAuth(request);
    const query = listProjectTitlesQuerySchema.parse(request.query);
    const items = await app.container.projectTitleQuery.listProjectTitles(query, ctx);
    return ok({ items });
  });

  app.post("/project-titles", async (request, reply) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.users.manage");
    const body = createProjectTitleSchema.parse(request.body);
    const item = await app.container.projectTitleCommand.createProjectTitle(body, ctx);
    return reply.status(201).send(ok(item, "project title created"));
  });

  app.patch("/project-titles/:titleId", async (request) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.users.manage");
    const params = request.params as { titleId: string };
    const body = updateProjectTitleSchema.parse(request.body);
    const item = await app.container.projectTitleCommand.updateProjectTitle(params.titleId, body, ctx);
    return ok(item, "project title updated");
  });

  app.delete("/project-titles/:titleId", async (request) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.users.manage");
    const params = request.params as { titleId: string };
    await app.container.projectTitleCommand.deleteProjectTitle(params.titleId, ctx);
    return ok({ id: params.titleId }, "project title deleted");
  });
}
