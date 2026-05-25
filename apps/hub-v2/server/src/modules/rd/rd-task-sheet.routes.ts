import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import {
  attachRdTaskSheetUploadSchema,
  closeRdTaskSheetSchema,
  convertRdTaskSheetToIssueSchema,
  convertRdTaskSheetToRdItemSchema,
  createRdTaskSheetSchema,
  listRdTaskSheetsQuerySchema,
  previewRdTaskSheetImportSchema,
  replyRdTaskSheetSchema,
  updateRdTaskSheetSchema
} from "./rd-task-sheet.schema";
import type { ListRdTaskSheetsQuery } from "./rd-task-sheet.types";

export default async function rdTaskSheetRoutes(app: FastifyInstance) {
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
