import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import { requirePermission } from "../utils/require-permission";
import {
  createOrganizationTitleSchema,
  listOrganizationTitlesQuerySchema,
  updateOrganizationTitleSchema
} from "./organization-title.schema";

export default async function organizationTitleRoutes(app: FastifyInstance) {
  app.get("/organization-titles", async (request) => {
    const ctx = requireAuth(request);
    const query = listOrganizationTitlesQuerySchema.parse(request.query);
    const items = await app.container.organizationTitleQuery.listOrganizationTitles(query, ctx);
    return ok({ items });
  });

  app.post("/organization-titles", async (request, reply) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.users.manage");
    const body = createOrganizationTitleSchema.parse(request.body);
    const item = await app.container.organizationTitleCommand.createOrganizationTitle(body, ctx);
    return reply.status(201).send(ok(item, "organization title created"));
  });

  app.patch("/organization-titles/:titleId", async (request) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.users.manage");
    const params = request.params as { titleId: string };
    const body = updateOrganizationTitleSchema.parse(request.body);
    const item = await app.container.organizationTitleCommand.updateOrganizationTitle(params.titleId, body, ctx);
    return ok(item, "organization title updated");
  });

  app.delete("/organization-titles/:titleId", async (request) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.users.manage");
    const params = request.params as { titleId: string };
    await app.container.organizationTitleCommand.deleteOrganizationTitle(params.titleId, ctx);
    return ok({ id: params.titleId }, "organization title deleted");
  });
}
