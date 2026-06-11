import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import {
  mobileIssueActionParamsSchema,
  mobileIssueActionSchema,
  mobileIssueCommentParamsSchema,
  mobileIssueCommentSchema,
  mobileMessageDetailParamsSchema,
  mobileMessageQuerySchema,
  mobileMessageReadSchema,
  mobileRdActionSchema,
  mobileRdItemParamsSchema,
  mobileRdProgressSchema,
  mobileTodoDetailParamsSchema,
  mobileTodoQuerySchema
} from "./mobile.schema";

export default async function mobileRoutes(app: FastifyInstance) {
  app.get("/mobile/bootstrap", async (request) => {
    const ctx = requireAuth(request);
    return ok(await app.container.mobileQuery.getBootstrap(ctx));
  });

  app.get("/mobile/dashboard", async (request) => {
    const ctx = requireAuth(request);
    return ok(await app.container.mobileQuery.getDashboard(ctx));
  });

  app.get("/mobile/todos", async (request) => {
    const ctx = requireAuth(request);
    const query = mobileTodoQuerySchema.parse(request.query);
    return ok(await app.container.mobileQuery.listTodos(query, ctx));
  });

  app.get("/mobile/todos/:targetType/:targetId", async (request) => {
    const ctx = requireAuth(request);
    const params = mobileTodoDetailParamsSchema.parse(request.params);
    return ok(await app.container.mobileQuery.getTodoDetail(params.targetType, params.targetId, ctx));
  });

  app.post("/mobile/issues/:issueId/comments", async (request, reply) => {
    const ctx = requireAuth(request);
    const params = mobileIssueCommentParamsSchema.parse(request.params);
    const body = mobileIssueCommentSchema.parse(request.body);
    const entity = await app.container.mobileCommand.createIssueComment(params.issueId, body, ctx);
    return reply.status(201).send(ok(entity, "mobile issue comment created"));
  });

  app.post("/mobile/issues/:issueId/actions", async (request) => {
    const ctx = requireAuth(request);
    const params = mobileIssueActionParamsSchema.parse(request.params);
    const body = mobileIssueActionSchema.parse(request.body);
    return ok(await app.container.mobileCommand.runIssueAction(params.issueId, body, ctx), "mobile issue action executed");
  });

  app.post("/mobile/rd-items/:itemId/progress", async (request) => {
    const ctx = requireAuth(request);
    const params = mobileRdItemParamsSchema.parse(request.params);
    const body = mobileRdProgressSchema.parse(request.body);
    return ok(await app.container.mobileCommand.updateRdProgress(params.itemId, body, ctx), "mobile rd progress updated");
  });

  app.post("/mobile/rd-items/:itemId/actions", async (request) => {
    const ctx = requireAuth(request);
    const params = mobileRdItemParamsSchema.parse(request.params);
    const body = mobileRdActionSchema.parse(request.body);
    return ok(await app.container.mobileCommand.runRdAction(params.itemId, body, ctx), "mobile rd action executed");
  });

  app.get("/mobile/messages", async (request) => {
    const ctx = requireAuth(request);
    const query = mobileMessageQuerySchema.parse(request.query);
    return ok(await app.container.mobileQuery.listMessages(query, ctx));
  });

  app.get("/mobile/messages/:messageType/:id", async (request) => {
    const ctx = requireAuth(request);
    const params = mobileMessageDetailParamsSchema.parse(request.params);
    return ok(await app.container.mobileQuery.getMessageDetail(params.messageType, params.id, ctx));
  });

  app.post("/mobile/messages/read", async (request) => {
    const ctx = requireAuth(request);
    const body = mobileMessageReadSchema.parse(request.body);
    return ok(await app.container.mobileCommand.markMessagesRead(body, ctx), "mobile messages marked read");
  });

  app.get("/mobile/connection", async (request) => {
    const ctx = requireAuth(request);
    return ok(await app.container.mobileQuery.getConnection(ctx));
  });
}
