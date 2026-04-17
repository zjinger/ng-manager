import type { FastifyInstance } from "fastify";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { requirePersonalTokenAuth } from "../../shared/auth/require-personal-token-auth";
import { AppError } from "../../shared/errors/app-error";
import { ok } from "../../shared/http/response";
import { blockRdItemSchema, updateRdItemSchema } from "../rd/rd.schema";
import { personalRdItemIdParamSchema } from "./personal-token.schema";

export default async function personalTokenRdRoutes(app: FastifyInstance) {
  app.post("/projects/:projectKey/rd-items/:itemId/start", async (request) => {
    const ctx = requirePersonalTokenAuth(request, "rd:transition:write");
    const params = personalRdItemIdParamSchema.parse(request.params);
    await assertRdProjectAccess(app, params.projectKey, params.itemId, ctx);
    return ok(await app.container.rdCommand.start(params.itemId, ctx), "rd item started");
  });

  app.post("/projects/:projectKey/rd-items/:itemId/block", async (request) => {
    const ctx = requirePersonalTokenAuth(request, "rd:transition:write");
    const params = personalRdItemIdParamSchema.parse(request.params);
    await assertRdProjectAccess(app, params.projectKey, params.itemId, ctx);
    const body = blockRdItemSchema.parse(request.body);
    return ok(await app.container.rdCommand.block(params.itemId, body, ctx), "rd item blocked");
  });

  app.post("/projects/:projectKey/rd-items/:itemId/resume", async (request) => {
    const ctx = requirePersonalTokenAuth(request, "rd:transition:write");
    const params = personalRdItemIdParamSchema.parse(request.params);
    await assertRdProjectAccess(app, params.projectKey, params.itemId, ctx);
    return ok(await app.container.rdCommand.resume(params.itemId, ctx), "rd item resumed");
  });

  app.post("/projects/:projectKey/rd-items/:itemId/complete", async (request) => {
    const ctx = requirePersonalTokenAuth(request, "rd:transition:write");
    const params = personalRdItemIdParamSchema.parse(request.params);
    await assertRdProjectAccess(app, params.projectKey, params.itemId, ctx);
    return ok(await app.container.rdCommand.complete(params.itemId, ctx), "rd item completed");
  });

  app.post("/projects/:projectKey/rd-items/:itemId/progress", async (request) => {
    const ctx = requirePersonalTokenAuth(request, "rd:transition:write");
    const params = personalRdItemIdParamSchema.parse(request.params);
    await assertRdProjectAccess(app, params.projectKey, params.itemId, ctx);
    const body = updateRdItemSchema.pick({ version: true, progress: true }).parse(request.body);
    return ok(await app.container.rdCommand.updateItem(params.itemId, body, ctx), "rd item progress updated");
  });

  app.patch("/projects/:projectKey/rd-items/:itemId", async (request) => {
    const ctx = requirePersonalTokenAuth(request, "rd:edit:write");
    const params = personalRdItemIdParamSchema.parse(request.params);
    await assertRdProjectAccess(app, params.projectKey, params.itemId, ctx);
    const body = updateRdItemSchema.parse(request.body);
    return ok(await app.container.rdCommand.updateItem(params.itemId, body, ctx));
  });

}

async function assertRdProjectAccess(app: FastifyInstance, projectKey: string, itemId: string, ctx: ReturnType<typeof requirePersonalTokenAuth>) {
  const projectId = app.container.personalTokenQuery.resolveProjectId(projectKey);
  const item = await app.container.rdQuery.getItemById(itemId, ctx);
  if (item.projectId !== projectId) {
    throw new AppError(ERROR_CODES.RD_ITEM_NOT_FOUND, "rd item not found", 404);
  }
}
