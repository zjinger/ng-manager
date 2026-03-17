import type { FastifyInstance } from "fastify";
import {
  addRdCommentSchema,
  changeRdItemStatusSchema,
  createRdItemSchema,
  createRdStageSchema,
  listRdItemsQuerySchema,
  rdItemParamsSchema,
  rdStageParamsSchema,
  updateRdItemProgressSchema,
  updateRdItemSchema,
  updateRdStageSchema
} from "../../modules/rd/rd.schema";
import type { RdItemEntity } from "../../modules/rd/rd.types";
import { AppError } from "../../utils/app-error";
import { ok } from "../../utils/response";

function getOperator(request: { adminUser: { id: string; userId?: string | null; nickname?: string | null; username: string } | null }) {
  if (!request.adminUser) {
    throw new AppError("AUTH_UNAUTHORIZED", "unauthorized", 401);
  }
  return {
    operatorId: request.adminUser.userId?.trim() || request.adminUser.id,
    operatorName: request.adminUser.nickname?.trim() || request.adminUser.username
  };
}

function emitRdRealtimeEvent(
  fastify: FastifyInstance,
  item: RdItemEntity,
  action: "created" | "edited" | "status_changed" | "progress_updated" | "deleted"
): void {
  const eventType = action === "created" ? "rd.created" : "rd.updated";

  fastify.log.info(
    {
      event: eventType,
      id: item.id,
      rdNo: item.rdNo,
      title: item.title,
      status: item.status,
      action,
      projectId: item.projectId
    },
    "[hub-ws] emit rd event"
  );

  if (action === "created") {
    fastify.hubWsEvents.rdCreated({
      id: item.id,
      rdNo: item.rdNo,
      title: item.title,
      status: item.status,
      projectId: item.projectId
    });
    return;
  }

  fastify.hubWsEvents.rdUpdated({
    id: item.id,
    rdNo: item.rdNo,
    title: item.title,
    status: item.status,
    action,
    projectId: item.projectId
  });
}

export default async function rdRoutes(fastify: FastifyInstance) {
  fastify.get("/projects/:projectId/rd/overview", async (request) => {
    const params = request.params as { projectId: string };
    return ok(fastify.services.rd.getOverview(params.projectId, getOperator(request)));
  });

  fastify.get("/projects/:projectId/rd/stages", async (request) => {
    const params = request.params as { projectId: string };
    return ok({ items: fastify.services.rd.listStages(params.projectId, getOperator(request)) });
  });

  fastify.post("/projects/:projectId/rd/stages", async (request, reply) => {
    const params = request.params as { projectId: string };
    const body = createRdStageSchema.parse(request.body);
    const item = fastify.services.rd.createStage(params.projectId, { ...body, ...getOperator(request) });
    return reply.status(201).send(ok(item, "rd stage created"));
  });

  fastify.patch("/projects/:projectId/rd/stages/:stageId", async (request) => {
    const params = rdStageParamsSchema.parse(request.params);
    const body = updateRdStageSchema.parse(request.body);
    const item = fastify.services.rd.updateStage(params.projectId, params.stageId, { ...body, ...getOperator(request) });
    return ok(item, "rd stage updated");
  });

  fastify.delete("/projects/:projectId/rd/stages/:stageId", async (request) => {
    const params = rdStageParamsSchema.parse(request.params);
    fastify.services.rd.removeStage(params.projectId, params.stageId, getOperator(request));
    return ok({ id: params.stageId }, "rd stage deleted");
  });

  fastify.get("/projects/:projectId/rd/items", async (request) => {
    const params = request.params as { projectId: string };
    const query = listRdItemsQuerySchema.parse(request.query);
    return ok(fastify.services.rd.list(params.projectId, query, getOperator(request)));
  });

  fastify.post("/projects/:projectId/rd/items", async (request, reply) => {
    const params = request.params as { projectId: string };
    const body = createRdItemSchema.parse(request.body);
    const item = fastify.services.rd.create({ ...body, projectId: params.projectId, ...getOperator(request) });
    emitRdRealtimeEvent(fastify, item, "created");
    return reply.status(201).send(ok(item, "rd item created"));
  });

  fastify.get("/projects/:projectId/rd/items/:id", async (request) => {
    const params = rdItemParamsSchema.parse(request.params);
    return ok(fastify.services.rd.getDetail(params.projectId, params.id, getOperator(request)));
  });

  fastify.patch("/projects/:projectId/rd/items/:id", async (request) => {
    const params = rdItemParamsSchema.parse(request.params);
    const body = updateRdItemSchema.parse(request.body);
    const item = fastify.services.rd.update(params.projectId, params.id, { ...body, ...getOperator(request) });
    emitRdRealtimeEvent(fastify, item, "edited");
    return ok(item, "rd item updated");
  });

  fastify.delete("/projects/:projectId/rd/items/:id", async (request) => {
    const params = rdItemParamsSchema.parse(request.params);
    const detail = fastify.services.rd.getDetail(params.projectId, params.id, getOperator(request));
    fastify.services.rd.remove(params.projectId, params.id, getOperator(request));
    emitRdRealtimeEvent(fastify, detail.item, "deleted");
    return ok({ id: params.id }, "rd item deleted");
  });

  fastify.post("/projects/:projectId/rd/items/:id/status", async (request) => {
    const params = rdItemParamsSchema.parse(request.params);
    const body = changeRdItemStatusSchema.parse(request.body);
    const item = fastify.services.rd.changeStatus(params.projectId, params.id, { ...body, ...getOperator(request) });
    emitRdRealtimeEvent(fastify, item, "status_changed");
    return ok(item, "rd item status updated");
  });

  fastify.post("/projects/:projectId/rd/items/:id/progress", async (request) => {
    const params = rdItemParamsSchema.parse(request.params);
    const body = updateRdItemProgressSchema.parse(request.body);
    const item = fastify.services.rd.updateProgress(params.projectId, params.id, { ...body, ...getOperator(request) });
    emitRdRealtimeEvent(fastify, item, "progress_updated");
    return ok(item, "rd item progress updated");
  });

  fastify.post("/projects/:projectId/rd/items/:id/comment", async (request) => {
    const params = rdItemParamsSchema.parse(request.params);
    const body = addRdCommentSchema.parse(request.body);
    return ok(
      fastify.services.rd.addComment(params.projectId, params.id, { ...body, ...getOperator(request) }),
      "rd item comment added"
    );
  });
}
