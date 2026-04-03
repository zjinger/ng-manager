import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import type { ReportPublicBoardPublishItemInput } from "./report-public.types";
import {
  reportPublicBoardPublishBodySchema,
  reportPublicBoardIdParamSchema,
  reportPublicProjectCreateSchema,
  reportPublicProjectIdParamSchema
} from "./report-public.schema";

export default async function reportPublicRoutes(app: FastifyInstance) {
  app.get("/report-public/capability", async (request) => {
    requireAuth(request);
    const data = app.container.reportPublicService.getCapability();
    return ok(data);
  });

  app.get("/report-public/projects", async (request) => {
    const ctx = requireAuth(request);
    const items = await app.container.reportPublicService.listProjects(ctx);
    return ok({ items });
  });

  app.post("/report-public/projects", async (request, reply) => {
    const ctx = requireAuth(request);
    const body = reportPublicProjectCreateSchema.parse(request.body);
    const project = await app.container.reportPublicService.addProject(ctx, body);
    return reply.status(201).send(ok(project, "report public project created"));
  });

  app.delete("/report-public/projects/:id", async (request, reply) => {
    const ctx = requireAuth(request);
    const { id } = reportPublicProjectIdParamSchema.parse(request.params);
    await app.container.reportPublicService.removeProject(ctx, id);
    return reply.send(ok({ id }, "report public project removed"));
  });

  app.post("/report-public/projects/:id/generate-link", async (request) => {
    const ctx = requireAuth(request);
    const { id } = reportPublicProjectIdParamSchema.parse(request.params);
    const entity = await app.container.reportPublicService.regenerateShareToken(ctx, id);
    return ok(entity, "report public share link regenerated");
  });

  app.post("/report-public/boards/publish", async (request, reply) => {
    const ctx = requireAuth(request);
    const body = reportPublicBoardPublishBodySchema.parse(request.body);

    const snapshotItems: ReportPublicBoardPublishItemInput[] = [];
    for (const item of body.items) {
      const prepared = await app.container.aiReportSqlService.prepareSqlForExecution(item.sql, ctx);
      const blocks = app.container.aiReportRenderService.executeAndRenderAll(prepared.sql, prepared.params);
      snapshotItems.push({
        title: item.title,
        naturalQuery: item.naturalQuery,
        sql: prepared.sql,
        params: prepared.params,
        blocks,
        layoutSize: (item.layoutSize === "compact" ? "compact" : "wide") as "compact" | "wide"
      });
    }

    const board = app.container.reportPublicService.createPublicBoard(ctx, {
      title: body.title,
      items: snapshotItems
    });
    return reply.status(201).send(ok(board, "report public board published"));
  });

  app.get("/report-public/boards", async (request) => {
    const ctx = requireAuth(request);
    const items = app.container.reportPublicService.listMyPublicBoards(ctx);
    return ok({ items });
  });

  app.post("/report-public/boards/:id/invalidate", async (request) => {
    const ctx = requireAuth(request);
    const { id } = reportPublicBoardIdParamSchema.parse(request.params);
    const board = app.container.reportPublicService.deactivatePublicBoard(ctx, id);
    return ok(board, "report public board disabled");
  });

  app.post("/report-public/boards/:id/activate", async (request) => {
    const ctx = requireAuth(request);
    const { id } = reportPublicBoardIdParamSchema.parse(request.params);
    const board = app.container.reportPublicService.activatePublicBoard(ctx, id);
    return ok(board, "report public board enabled");
  });

  app.delete("/report-public/boards/:id", async (request, reply) => {
    const ctx = requireAuth(request);
    const { id } = reportPublicBoardIdParamSchema.parse(request.params);
    app.container.reportPublicService.removePublicBoard(ctx, id);
    return reply.send(ok({ id }, "report public board removed"));
  });
}
