import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import {
  attachRdTaskSheetUploadSchema,
  assignRdTaskSheetSchema,
  closeRdTaskSheetSchema,
  convertRdTaskSheetToIssueSchema,
  convertRdTaskSheetToRdItemSchema,
  createRdTaskSheetDefaultRouteSchema,
  createRdTaskSheetSchema,
  listRdTaskSheetDefaultRoutesQuerySchema,
  listRdTaskSheetsQuerySchema,
  matchRdTaskSheetDefaultRouteQuerySchema,
  previewRdTaskSheetImportSchema,
  replyRdTaskSheetSchema,
  returnReviewRdTaskSheetSchema,
  updateRdTaskSheetDefaultRouteSchema,
  updateRdTaskSheetSchema
} from "./rd-task-sheet.schema";
import type { ListRdTaskSheetDefaultRoutesQuery, ListRdTaskSheetsQuery } from "./rd-task-sheet.types";

export default async function rdTaskSheetRoutes(app: FastifyInstance) {
  app.get("/rd/task-sheet-config/default-routes", async (request) => {
    const ctx = requireAuth(request);
    const query = listRdTaskSheetDefaultRoutesQuerySchema.parse(request.query) as ListRdTaskSheetDefaultRoutesQuery;
    return ok({ items: await app.container.rdTaskSheetQuery.listDefaultRoutes(query, ctx) });
  });

  app.get("/rd/task-sheet-config/default-routes/me", async (request) => {
    const ctx = requireAuth(request);
    return ok(await app.container.rdTaskSheetQuery.getMyDefaultRoute(ctx));
  });

  app.get("/rd/task-sheet-config/default-routes/match", async (request) => {
    const ctx = requireAuth(request);
    const query = matchRdTaskSheetDefaultRouteQuerySchema.parse(request.query);
    return ok(await app.container.rdTaskSheetQuery.matchDefaultRoute(query.issuerUserId, ctx));
  });

  app.post("/rd/task-sheet-config/default-routes", async (request, reply) => {
    const ctx = requireAuth(request);
    const body = createRdTaskSheetDefaultRouteSchema.parse(request.body ?? {});
    return reply.status(201).send(ok(await app.container.rdTaskSheetCommand.createDefaultRoute(body, ctx), "rd task sheet default route created"));
  });

  app.patch("/rd/task-sheet-config/default-routes/:routeId", async (request) => {
    const ctx = requireAuth(request);
    const { routeId } = request.params as { routeId: string };
    const body = updateRdTaskSheetDefaultRouteSchema.parse(request.body ?? {});
    return ok(await app.container.rdTaskSheetCommand.updateDefaultRoute(routeId, body, ctx), "rd task sheet default route updated");
  });

  app.delete("/rd/task-sheet-config/default-routes/:routeId", async (request) => {
    const ctx = requireAuth(request);
    const { routeId } = request.params as { routeId: string };
    return ok(await app.container.rdTaskSheetCommand.deleteDefaultRoute(routeId, ctx), "rd task sheet default route deleted");
  });

  app.get("/rd/task-sheets", async (request) => {
    const ctx = requireAuth(request);
    const query = listRdTaskSheetsQuerySchema.parse(request.query) as ListRdTaskSheetsQuery;
    return ok(await app.container.rdTaskSheetQuery.list(query, ctx));
  });

  app.post("/rd/task-sheets", async (request, reply) => {
    const ctx = requireAuth(request);
    const body = createRdTaskSheetSchema.parse(request.body);
    return reply.status(201).send(ok(await app.container.rdTaskSheetCommand.create(body, ctx), "rd task sheet created"));
  });

  app.post("/rd/task-sheets/import/preview", async (request) => {
    const ctx = requireAuth(request);
    const body = previewRdTaskSheetImportSchema.parse(request.body ?? {});
    return ok(await app.container.rdTaskSheetQuery.previewImport(body, ctx));
  });

  app.get("/rd/task-sheets/:sheetId/export", async (request, reply) => {
    const ctx = requireAuth(request);
    const { sheetId } = request.params as { sheetId: string };
    const file = await app.container.rdTaskSheetQuery.exportWord(sheetId, ctx);
    const encodedFileName = encodeURIComponent(file.fileName);
    return reply
      .type(file.mimeType)
      .header("Content-Disposition", `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`)
      .send(file.buffer);
  });

  app.get("/rd/task-sheets/:sheetId", async (request) => {
    const ctx = requireAuth(request);
    const { sheetId } = request.params as { sheetId: string };
    return ok(await app.container.rdTaskSheetQuery.getById(sheetId, ctx));
  });

  app.patch("/rd/task-sheets/:sheetId", async (request) => {
    const ctx = requireAuth(request);
    const { sheetId } = request.params as { sheetId: string };
    const body = updateRdTaskSheetSchema.parse(request.body);
    return ok(await app.container.rdTaskSheetCommand.update(sheetId, body, ctx), "rd task sheet updated");
  });

  app.post("/rd/task-sheets/:sheetId/issue", async (request) => {
    const ctx = requireAuth(request);
    const { sheetId } = request.params as { sheetId: string };
    return ok(await app.container.rdTaskSheetCommand.issue(sheetId, ctx), "rd task sheet issued");
  });

  app.post("/rd/task-sheets/:sheetId/submit-review", async (request) => {
    const ctx = requireAuth(request);
    const { sheetId } = request.params as { sheetId: string };
    return ok(await app.container.rdTaskSheetCommand.submitReview(sheetId, ctx), "rd task sheet submitted for review");
  });

  app.post("/rd/task-sheets/:sheetId/review/approve", async (request) => {
    const ctx = requireAuth(request);
    const { sheetId } = request.params as { sheetId: string };
    return ok(await app.container.rdTaskSheetCommand.approveReview(sheetId, ctx), "rd task sheet review approved");
  });

  app.post("/rd/task-sheets/:sheetId/review/return", async (request) => {
    const ctx = requireAuth(request);
    const { sheetId } = request.params as { sheetId: string };
    const body = returnReviewRdTaskSheetSchema.parse(request.body ?? {});
    return ok(await app.container.rdTaskSheetCommand.returnReview(sheetId, body, ctx), "rd task sheet review returned");
  });

  app.post("/rd/task-sheets/:sheetId/assign", async (request) => {
    const ctx = requireAuth(request);
    const { sheetId } = request.params as { sheetId: string };
    const body = assignRdTaskSheetSchema.parse(request.body ?? {});
    return ok(await app.container.rdTaskSheetCommand.assign(sheetId, body, ctx), "rd task sheet assigned");
  });

  app.post("/rd/task-sheets/:sheetId/start-processing", async (request) => {
    const ctx = requireAuth(request);
    const { sheetId } = request.params as { sheetId: string };
    return ok(await app.container.rdTaskSheetCommand.startProcessing(sheetId, ctx), "rd task sheet processing started");
  });

  app.post("/rd/task-sheets/:sheetId/reply", async (request) => {
    const ctx = requireAuth(request);
    const { sheetId } = request.params as { sheetId: string };
    const body = replyRdTaskSheetSchema.parse(request.body);
    return ok(await app.container.rdTaskSheetCommand.reply(sheetId, body, ctx), "rd task sheet replied");
  });

  app.post("/rd/task-sheets/:sheetId/close", async (request) => {
    const ctx = requireAuth(request);
    const { sheetId } = request.params as { sheetId: string };
    const body = closeRdTaskSheetSchema.parse(request.body ?? {});
    return ok(await app.container.rdTaskSheetCommand.close(sheetId, body, ctx), "rd task sheet closed");
  });

  app.post("/rd/task-sheets/:sheetId/convert/rd-item", async (request) => {
    const ctx = requireAuth(request);
    const { sheetId } = request.params as { sheetId: string };
    const body = convertRdTaskSheetToRdItemSchema.parse(request.body ?? {});
    return ok(await app.container.rdTaskSheetCommand.convertToRdItem(sheetId, body, ctx), "rd task sheet converted to rd item");
  });

  app.post("/rd/task-sheets/:sheetId/convert/issue", async (request) => {
    const ctx = requireAuth(request);
    const { sheetId } = request.params as { sheetId: string };
    const body = convertRdTaskSheetToIssueSchema.parse(request.body ?? {});
    return ok(await app.container.rdTaskSheetCommand.convertToIssue(sheetId, body, ctx), "rd task sheet converted to issue");
  });

  app.post("/rd/task-sheets/:sheetId/attachments", async (request) => {
    const ctx = requireAuth(request);
    const { sheetId } = request.params as { sheetId: string };
    const body = attachRdTaskSheetUploadSchema.parse(request.body ?? {});
    return ok(await app.container.rdTaskSheetCommand.attach(sheetId, body, ctx), "rd task sheet attachment added");
  });

  app.delete("/rd/task-sheets/:sheetId/attachments/:attachmentId", async (request) => {
    const ctx = requireAuth(request);
    const { sheetId, attachmentId } = request.params as { sheetId: string; attachmentId: string };
    return ok(await app.container.rdTaskSheetCommand.detach(sheetId, attachmentId, ctx), "rd task sheet attachment removed");
  });
}
