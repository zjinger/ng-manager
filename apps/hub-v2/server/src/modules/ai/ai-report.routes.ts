import type { FastifyInstance } from "fastify";
import { AppError } from "../../shared/errors/app-error";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import { AiReportTemplateRepo } from "./ai-report-template.repo";
import { buildReportCaliber } from "./ai-report-caliber";
import {
  aiReportSqlInputSchema,
  aiReportTemplateCreateInputSchema,
  aiReportTemplateUpdateInputSchema,
  aiReportTemplateIdParamSchema
} from "./ai.schema";

export default async function aiReportRoutes(app: FastifyInstance) {
  const templateRepo = new AiReportTemplateRepo(app.db);

  app.post("/ai/report-sql/preview", async (request, reply) => {
    const ctx = requireAuth(request);
    const { query } = aiReportSqlInputSchema.parse(request.body);

    const sqlResult = await app.container.aiReportSqlService.generateSql(query.trim(), ctx);
    const blocks = app.container.aiReportRenderService.executeAndRenderAll(
      sqlResult.sql,
      sqlResult.params
    );
    const block = blocks[0] ?? { type: "empty", title: "暂无数据" };
    const caliber = buildReportCaliber({
      query: query.trim(),
      sql: sqlResult.sql,
      title: sqlResult.title,
      description: sqlResult.description
    });

    return reply.send(ok({
      sql: sqlResult.sql,
      params: sqlResult.params,
      title: sqlResult.title,
      description: sqlResult.description,
      caliber,
      blocks,
      block
    }));
  });

  app.get("/ai/report-sql/templates", async (request, reply) => {
    const ctx = requireAuth(request);
    const actorId = resolveActorId(ctx);
    const items = templateRepo.listByCreator(actorId);
    return reply.send(ok({ items }));
  });

  app.post("/ai/report-sql/templates", async (request, reply) => {
    const ctx = requireAuth(request);
    const actorId = resolveActorId(ctx);
    const body = aiReportTemplateCreateInputSchema.parse(request.body);
    const prepared = await app.container.aiReportSqlService.prepareSqlForExecution(body.sql, ctx);

    const existing = templateRepo.findDuplicateByTitleAndSql(actorId, body.title, prepared.sql);
    if (existing) {
      const result = {
        template: existing,
        duplicated: true
      };
      return reply.send(ok(result, "template exists"));
    }

    const now = nowIso();
    const row = {
      id: genId("rpt"),
      title: body.title,
      naturalQuery: body.naturalQuery,
      sql: prepared.sql,
      createdBy: actorId,
      createdAt: now,
      updatedAt: now
    };
    templateRepo.create(row);

    const result = {
      template: row,
      duplicated: false
    };
    return reply.send(ok(result, "template created"));
  });

  app.patch("/ai/report-sql/templates/:id", async (request, reply) => {
    const ctx = requireAuth(request);
    const actorId = resolveActorId(ctx);
    const { id } = aiReportTemplateIdParamSchema.parse(request.params);
    const body = aiReportTemplateUpdateInputSchema.parse(request.body);

    const exists = templateRepo.findByIdAndCreator(id, actorId);
    if (!exists) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "report template not found", 404);
    }

    const updatedAt = nowIso();
    templateRepo.updateTitleByIdAndCreator(id, actorId, body.title, updatedAt);

    const updated = templateRepo.findByIdAndCreator(id, actorId);
    if (!updated) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "report template not found", 404);
    }

    return reply.send(ok(updated, "template updated"));
  });

  app.delete("/ai/report-sql/templates/:id", async (request, reply) => {
    const ctx = requireAuth(request);
    const actorId = resolveActorId(ctx);
    const { id } = aiReportTemplateIdParamSchema.parse(request.params);

    const deleted = templateRepo.deleteByIdAndCreator(id, actorId);
    if (!deleted) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "report template not found", 404);
    }

    return reply.send(ok({ id }, "template deleted"));
  });

  app.post("/ai/report-sql/templates/:id/execute", async (request, reply) => {
    const ctx = requireAuth(request);
    const actorId = resolveActorId(ctx);
    const { id } = aiReportTemplateIdParamSchema.parse(request.params);

    const row = templateRepo.findByIdAndCreator(id, actorId);
    if (!row) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "report template not found", 404);
    }

    const prepared = await app.container.aiReportSqlService.prepareSqlForExecution(row.sql, ctx);
    const blocks = app.container.aiReportRenderService.executeAndRenderAll(prepared.sql, prepared.params);
    const block = blocks[0] ?? { type: "empty", title: "暂无数据" };
    const caliber = buildReportCaliber({
      query: row.naturalQuery,
      sql: prepared.sql,
      title: row.title
    });

    return reply.send(ok({
      template: row,
      sql: prepared.sql,
      params: prepared.params,
      caliber,
      blocks,
      block
    }));
  });
}

function resolveActorId(ctx: ReturnType<typeof requireAuth>): string {
  return ctx.userId?.trim() || ctx.accountId;
}
