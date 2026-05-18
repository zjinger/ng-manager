import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import { requirePermission } from "../utils/require-permission";
import {
  createSharedConfigSchema,
  listSharedConfigsQuerySchema,
  updateSharedConfigSchema
} from "./shared-config.schema";

export default async function sharedConfigRoutes(app: FastifyInstance) {
  app.get("/shared-configs", async (request) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.settings.manage");
    const query = listSharedConfigsQuerySchema.parse(request.query);
    return ok(await app.container.sharedConfigQuery.list(query, ctx));
  });

  app.post("/shared-configs", async (request, reply) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.settings.manage");
    const body = createSharedConfigSchema.parse(request.body);
    const entity = await app.container.sharedConfigCommand.create(body, ctx);
    return reply.status(201).send(ok(entity, "shared config created"));
  });

  app.get("/shared-configs/:configId", async (request) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.settings.manage");
    const params = request.params as { configId: string };
    return ok(await app.container.sharedConfigQuery.getById(params.configId, ctx));
  });

  app.patch("/shared-configs/:configId", async (request) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.settings.manage");
    const params = request.params as { configId: string };
    const body = updateSharedConfigSchema.parse(request.body);
    return ok(await app.container.sharedConfigCommand.update(params.configId, body, ctx));
  });
}
