import type { FastifyInstance } from "fastify";
import { AppError } from "../../shared/errors/app-error";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import {
  aiReportSqlInputSchema,
  aiReportTemplateCreateInputSchema,
  aiReportTemplateUpdateInputSchema,
  aiReportTemplateIdParamSchema
} from "./ai.schema";

interface ReportTemplateRow {
  id: string;
  title: string;
  natural_query: string;
  sql: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface ReportTemplateDto {
  id: string;
  title: string;
  naturalQuery: string;
  sql: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export default async function aiReportRoutes(app: FastifyInstance) {
  app.post("/ai/report-sql/preview", async (request, reply) => {
    const ctx = requireAuth(request);
    const { query } = aiReportSqlInputSchema.parse(request.body);

    const sqlResult = await app.container.aiReportSqlService.generateSql(query.trim(), ctx);
    const block = app.container.aiReportRenderService.executeAndRender(
      sqlResult.sql,
      sqlResult.params
    );

    return reply.send(ok({
      sql: sqlResult.sql,
      params: sqlResult.params,
      title: sqlResult.title,
      description: sqlResult.description,
      block
    }));
  });

  app.get("/ai/report-sql/templates", async (request, reply) => {
    const ctx = requireAuth(request);
    const actorId = resolveActorId(ctx);
    const rows = app.db
      .prepare(
        `
          SELECT id, title, natural_query, sql, created_by, created_at, updated_at
          FROM report_templates
          WHERE created_by = ?
          ORDER BY updated_at DESC
          LIMIT 100
        `
      )
      .all(actorId) as ReportTemplateRow[];

    return reply.send(ok({ items: rows.map((row) => mapTemplate(row)) }));
  });

  app.post("/ai/report-sql/templates", async (request, reply) => {
    const ctx = requireAuth(request);
    const actorId = resolveActorId(ctx);
    const body = aiReportTemplateCreateInputSchema.parse(request.body);
    const prepared = await app.container.aiReportSqlService.prepareSqlForExecution(body.sql, ctx);

    const now = nowIso();
    const row: ReportTemplateRow = {
      id: genId("rpt"),
      title: body.title,
      natural_query: body.naturalQuery,
      sql: prepared.sql,
      created_by: actorId,
      created_at: now,
      updated_at: now
    };

    app.db
      .prepare(
        `
          INSERT INTO report_templates (
            id, title, natural_query, sql, created_by, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(row.id, row.title, row.natural_query, row.sql, row.created_by, row.created_at, row.updated_at);

    return reply.send(ok(mapTemplate(row), "template created"));
  });

  app.patch("/ai/report-sql/templates/:id", async (request, reply) => {
    const ctx = requireAuth(request);
    const actorId = resolveActorId(ctx);
    const { id } = aiReportTemplateIdParamSchema.parse(request.params);
    const body = aiReportTemplateUpdateInputSchema.parse(request.body);

    const exists = app.db
      .prepare(
        `
          SELECT id, title, natural_query, sql, created_by, created_at, updated_at
          FROM report_templates
          WHERE id = ? AND created_by = ?
          LIMIT 1
        `
      )
      .get(id, actorId) as ReportTemplateRow | undefined;
    if (!exists) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "report template not found", 404);
    }

    const updatedAt = nowIso();
    app.db
      .prepare(
        `
          UPDATE report_templates
          SET title = ?, updated_at = ?
          WHERE id = ? AND created_by = ?
        `
      )
      .run(body.title, updatedAt, id, actorId);

    const updated = app.db
      .prepare(
        `
          SELECT id, title, natural_query, sql, created_by, created_at, updated_at
          FROM report_templates
          WHERE id = ? AND created_by = ?
          LIMIT 1
        `
      )
      .get(id, actorId) as ReportTemplateRow | undefined;
    if (!updated) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "report template not found", 404);
    }

    return reply.send(ok(mapTemplate(updated), "template updated"));
  });

  app.delete("/ai/report-sql/templates/:id", async (request, reply) => {
    const ctx = requireAuth(request);
    const actorId = resolveActorId(ctx);
    const { id } = aiReportTemplateIdParamSchema.parse(request.params);

    const result = app.db
      .prepare("DELETE FROM report_templates WHERE id = ? AND created_by = ?")
      .run(id, actorId);
    if (result.changes === 0) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "report template not found", 404);
    }

    return reply.send(ok({ id }, "template deleted"));
  });

  app.post("/ai/report-sql/templates/:id/execute", async (request, reply) => {
    const ctx = requireAuth(request);
    const actorId = resolveActorId(ctx);
    const { id } = aiReportTemplateIdParamSchema.parse(request.params);

    const row = app.db
      .prepare(
        `
          SELECT id, title, natural_query, sql, created_by, created_at, updated_at
          FROM report_templates
          WHERE id = ? AND created_by = ?
          LIMIT 1
        `
      )
      .get(id, actorId) as ReportTemplateRow | undefined;

    if (!row) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "report template not found", 404);
    }

    const prepared = await app.container.aiReportSqlService.prepareSqlForExecution(row.sql, ctx);
    const block = app.container.aiReportRenderService.executeAndRender(prepared.sql, prepared.params);

    return reply.send(ok({
      template: mapTemplate(row),
      sql: prepared.sql,
      params: prepared.params,
      block
    }));
  });
}

function resolveActorId(ctx: ReturnType<typeof requireAuth>): string {
  return ctx.userId?.trim() || ctx.accountId;
}

function mapTemplate(row: ReportTemplateRow): ReportTemplateDto {
  return {
    id: row.id,
    title: row.title,
    naturalQuery: row.natural_query,
    sql: row.sql,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
