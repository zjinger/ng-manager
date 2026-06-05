import type { FastifyInstance } from "fastify";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { requirePersonalTokenAuth } from "../../shared/auth/require-personal-token-auth";
import { AppError } from "../../shared/errors/app-error";
import { ok } from "../../shared/http/response";
import type { RequestContext } from "../../shared/context/request-context";
import { resolveRdStageKey } from "../rd/rd-stage-task-templates";
import type { RdItemEntity } from "../rd/rd.types";
import {
  advanceRdStageSchema,
  blockRdItemSchema,
  closeRdItemSchema,
  completeRdItemSchema,
  updateRdItemProgressSchema,
  updateRdItemSchema
} from "../rd/rd.schema";
import {
  createPersonalRdItemSchema,
  createPersonalRdStageTaskSchema,
  personalProjectParamSchema,
  personalRdItemIdParamSchema
} from "./personal-token.schema";

export default async function personalTokenRdRoutes(app: FastifyInstance) {
  app.post("/projects/:projectKey/rd-items", async (request, reply) => {
    const ctx = requirePersonalTokenAuth(request, "rd:create:write");
    const params = personalProjectParamSchema.parse(request.params);
    const projectId = app.container.personalTokenQuery.resolveProjectId(params.projectKey);
    const body = createPersonalRdItemSchema.parse(request.body);
    const entity = await app.container.rdCommand.createItem({ ...body, projectId }, ctx);
    return reply.status(201).send(ok(entity, "rd item created"));
  });

  app.post("/projects/:projectKey/rd-items/:itemId/stage-tasks", async (request, reply) => {
    const ctx = requirePersonalTokenAuth(request, "rd:stage-task:write");
    const params = personalRdItemIdParamSchema.parse(request.params);
    const { projectId, item } = await assertRdProjectAccess(app, params.projectKey, params.itemId, ctx);
    const stageKey = await resolveCurrentStageKey(app, projectId, item.stageId, ctx);
    const body = createPersonalRdStageTaskSchema.parse(request.body);
    const entity = await app.container.rdCommand.createStageTask(params.itemId, { ...body, stageKey }, ctx);
    return reply.status(201).send(ok(entity, "rd stage task created"));
  });

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
    const body = completeRdItemSchema.parse(request.body ?? {});
    return ok(await app.container.rdCommand.complete(params.itemId, ctx, body), "rd item completed");
  });

  app.post("/projects/:projectKey/rd-items/:itemId/accept", async (request) => {
    const ctx = requirePersonalTokenAuth(request, "rd:transition:write");
    const params = personalRdItemIdParamSchema.parse(request.params);
    await assertRdProjectAccess(app, params.projectKey, params.itemId, ctx);
    return ok(await app.container.rdCommand.accept(params.itemId, ctx), "rd item accepted");
  });

  app.post("/projects/:projectKey/rd-items/:itemId/reopen", async (request) => {
    const ctx = requirePersonalTokenAuth(request, "rd:transition:write");
    const params = personalRdItemIdParamSchema.parse(request.params);
    await assertRdProjectAccess(app, params.projectKey, params.itemId, ctx);
    return ok(await app.container.rdCommand.reopen(params.itemId, ctx), "rd item reopened");
  });

  app.post("/projects/:projectKey/rd-items/:itemId/close", async (request) => {
    const ctx = requirePersonalTokenAuth(request, "rd:transition:write");
    const params = personalRdItemIdParamSchema.parse(request.params);
    await assertRdProjectAccess(app, params.projectKey, params.itemId, ctx);
    const body = closeRdItemSchema.parse(request.body);
    return ok(await app.container.rdCommand.close(params.itemId, body, ctx), "rd item closed");
  });

  app.post("/projects/:projectKey/rd-items/:itemId/advance-stage", async (request) => {
    const ctx = requirePersonalTokenAuth(request, "rd:transition:write");
    const params = personalRdItemIdParamSchema.parse(request.params);
    await assertRdProjectAccess(app, params.projectKey, params.itemId, ctx);
    const body = advanceRdStageSchema.parse(request.body);
    return ok(await app.container.rdCommand.advanceStage(params.itemId, body, ctx), "rd item advanced stage");
  });

  app.post("/projects/:projectKey/rd-items/:itemId/progress", async (request) => {
    const ctx = requirePersonalTokenAuth(request, ["rd:progress:write", "rd:transition:write"]);
    const params = personalRdItemIdParamSchema.parse(request.params);
    await assertRdProjectAccess(app, params.projectKey, params.itemId, ctx);
    const body = updateRdItemProgressSchema.parse(request.body);
    return ok(await app.container.rdCommand.updateProgress(params.itemId, body, ctx), "rd item progress updated");
  });

  app.patch("/projects/:projectKey/rd-items/:itemId", async (request) => {
    const ctx = requirePersonalTokenAuth(request, "rd:edit:write");
    const params = personalRdItemIdParamSchema.parse(request.params);
    await assertRdProjectAccess(app, params.projectKey, params.itemId, ctx);
    const body = updateRdItemSchema.parse(request.body);
    return ok(await app.container.rdCommand.updateItem(params.itemId, body, ctx));
  });

}

async function assertRdProjectAccess(
  app: FastifyInstance,
  projectKey: string,
  itemId: string,
  ctx: ReturnType<typeof requirePersonalTokenAuth>
): Promise<{ projectId: string; item: RdItemEntity }> {
  const projectId = app.container.personalTokenQuery.resolveProjectId(projectKey);
  const item = await app.container.rdQuery.getItemById(itemId, ctx);
  if (item.projectId !== projectId) {
    throw new AppError(ERROR_CODES.RD_ITEM_NOT_FOUND, "rd item not found", 404);
  }
  return { projectId, item };
}

async function resolveCurrentStageKey(
  app: FastifyInstance,
  projectId: string,
  stageId: string | null,
  ctx: RequestContext
): Promise<string> {
  if (!stageId) {
    throw new AppError(ERROR_CODES.BAD_REQUEST, "rd current stage is required", 400);
  }
  const stages = await app.container.rdQuery.listStages({ projectId }, ctx);
  const stage = stages.find((item) => item.id === stageId);
  if (!stage || !stage.enabled) {
    throw new AppError(ERROR_CODES.BAD_REQUEST, "rd current stage is unavailable", 400);
  }
  return resolveRdStageKey(stage);
}
