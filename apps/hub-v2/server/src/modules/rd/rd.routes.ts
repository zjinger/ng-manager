import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import {
  advanceRdStageSchema,
  blockRdItemSchema,
  createRdItemSchema,
  createRdStageSchema,
  listRdItemsQuerySchema,
  listRdStagesQuerySchema,
  updateRdItemSchema,
  updateRdStageSchema
} from "./rd.schema";
import type { ListRdItemsQuery } from "./rd.types";

export default async function rdRoutes(app: FastifyInstance) {
  app.get("/rd/stages", async (request) => {
    const ctx = requireAuth(request);
    const query = listRdStagesQuerySchema.parse(request.query);
    return ok({ items: await app.container.rdQuery.listStages(query, ctx) });
  });

  app.post("/rd/stages", async (request, reply) => {
    const ctx = requireAuth(request);
    const body = createRdStageSchema.parse(request.body);
    const entity = await app.container.rdCommand.createStage(body, ctx);
    return reply.status(201).send(ok(entity, "rd stage created"));
  });

  app.patch("/rd/stages/:stageId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { stageId: string };
    const body = updateRdStageSchema.parse(request.body);
    return ok(await app.container.rdCommand.updateStage(params.stageId, body, ctx));
  });

  app.get("/rd/items", async (request) => {
    const ctx = requireAuth(request);
    const query = listRdItemsQuerySchema.parse(request.query) as ListRdItemsQuery;
    return ok(await app.container.rdQuery.listItems(query, ctx));
  });

  app.post("/rd/items", async (request, reply) => {
    const ctx = requireAuth(request);
    const body = createRdItemSchema.parse(request.body);
    const entity = await app.container.rdCommand.createItem(body, ctx);
    return reply.status(201).send(ok(entity, "rd item created"));
  });

  app.get("/rd/items/:itemId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { itemId: string };
    return ok(await app.container.rdQuery.getItemById(params.itemId, ctx));
  });

  app.get("/rd/items/:itemId/logs", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { itemId: string };
    return ok({ items: await app.container.rdQuery.listLogs(params.itemId, ctx) });
  });

  app.patch("/rd/items/:itemId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { itemId: string };
    const body = updateRdItemSchema.parse(request.body);
    return ok(await app.container.rdCommand.updateItem(params.itemId, body, ctx));
  });

  app.post("/rd/items/:itemId/start", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { itemId: string };
    return ok(await app.container.rdCommand.start(params.itemId, ctx), "rd item started");
  });

  app.post("/rd/items/:itemId/block", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { itemId: string };
    const body = blockRdItemSchema.parse(request.body);
    return ok(await app.container.rdCommand.block(params.itemId, body, ctx), "rd item blocked");
  });

  app.post("/rd/items/:itemId/resume", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { itemId: string };
    return ok(await app.container.rdCommand.resume(params.itemId, ctx), "rd item resumed");
  });

  app.post("/rd/items/:itemId/complete", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { itemId: string };
    return ok(await app.container.rdCommand.complete(params.itemId, ctx), "rd item completed");
  });

  app.post("/rd/items/:itemId/accept", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { itemId: string };
    return ok(await app.container.rdCommand.accept(params.itemId, ctx), "rd item accepted");
  });

  app.post("/rd/items/:itemId/close", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { itemId: string };
    return ok(await app.container.rdCommand.close(params.itemId, ctx), "rd item closed");
  });

  app.post("/rd/items/:itemId/advance-stage", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { itemId: string };
    const body = advanceRdStageSchema.parse(request.body);
    return ok(await app.container.rdCommand.advanceStage(params.itemId, body, ctx), "rd item advanced stage");
  });

  app.delete("/rd/items/:itemId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { itemId: string };
    return ok(await app.container.rdCommand.delete(params.itemId, ctx), "rd item deleted");
  });
}
