import type { FastifyInstance } from "fastify";
import { AppError } from "../../shared/errors/app-error";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { ok } from "../../shared/http/response";
import { buildReportCaliber } from "./ai-report-caliber";
import {
  reportPublicBoardQuerySchema,
  reportPublicPreviewBodySchema,
  reportPublicProjectsQuerySchema,
  reportPublicTemplateIdParamSchema,
  reportPublicTemplateQuerySchema
} from "../report-public/report-public.schema";

const SENSITIVE_SQL_COLUMN_PATTERN =
  /\b(assignee_id|reporter_id|verifier_id|user_id|creator_id|created_by|updated_by)\b/i;

export default async function aiReportPublicRoutes(app: FastifyInstance) {
  app.get("/report/board", async (request) => {
    app.container.reportPublicService.enforcePublicRateLimit(request.ip);
    const query = reportPublicBoardQuerySchema.parse(request.query);
    const board = app.container.reportPublicService.resolvePublicBoardByShareToken(query.share);
    return ok(board);
  });

  app.get("/report/projects", async (request) => {
    app.container.reportPublicService.enforcePublicRateLimit(request.ip);
    const query = reportPublicProjectsQuerySchema.parse(request.query);

    const projects = app.container.reportPublicService.resolveVisibleProjects(query.share);
    const items = projects.map((item) => ({
      id: item.projectId,
      name: item.projectName,
      key: item.projectKey,
      description: item.projectDescription
    }));

    return ok({ items });
  });

  app.post("/report/preview", async (request, reply) => {
    app.container.reportPublicService.enforcePublicRateLimit(request.ip);
    const body = reportPublicPreviewBodySchema.parse(request.body);
    const normalizedQuery = body.query.trim();
    if (!normalizedQuery) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "query is required", 400);
    }

    const projectIds = app.container.reportPublicService.resolvePreviewProjectIds({
      projectId: body.projectId,
      shareToken: body.share
    });
    const sqlResult = await app.container.aiReportSqlService.generateSqlForProjectIds(normalizedQuery, projectIds);
    assertPublicSafeSql(sqlResult.sql);

    const blocks = app.container.aiReportRenderService.executeAndRenderAll(sqlResult.sql, sqlResult.params);
    const block = blocks[0] ?? { type: "empty", title: "暂无数据" };
    const caliber = buildReportCaliber({
      query: normalizedQuery,
      sql: sqlResult.sql,
      title: sqlResult.title,
      description: sqlResult.description
    });

    return reply.send(
      ok({
        sql: sqlResult.sql,
        params: sqlResult.params,
        title: sqlResult.title,
        description: sqlResult.description,
        caliber,
        blocks,
        block
      })
    );
  });

  app.get("/report/templates/:id", async (request, reply) => {
    app.container.reportPublicService.enforcePublicRateLimit(request.ip);
    const { id } = reportPublicTemplateIdParamSchema.parse(request.params);
    const query = reportPublicTemplateQuerySchema.parse(request.query);
    const template = app.container.reportPublicService.findTemplateById(id);

    const allowedProjectIds = app.container.reportPublicService.resolveAllowedProjectIds(
      query.share || template.shareToken
    );
    if (!allowedProjectIds.includes(template.projectId)) {
      throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, "project is not publicly accessible", 403);
    }

    const sqlResult = await app.container.aiReportSqlService.generateSqlForProjectIds(
      template.naturalQuery,
      [template.projectId]
    );
    assertPublicSafeSql(sqlResult.sql);
    const blocks = app.container.aiReportRenderService.executeAndRenderAll(sqlResult.sql, sqlResult.params);
    const block = blocks[0] ?? { type: "empty", title: "暂无数据" };
    const caliber = buildReportCaliber({
      query: template.naturalQuery,
      sql: sqlResult.sql,
      title: sqlResult.title,
      description: sqlResult.description
    });

    return reply.send(
      ok({
        template: {
          id: template.id,
          title: template.title,
          naturalQuery: template.naturalQuery
        },
        sql: sqlResult.sql,
        params: sqlResult.params,
        caliber,
        blocks,
        block
      })
    );
  });
}

function assertPublicSafeSql(sql: string): void {
  if (SENSITIVE_SQL_COLUMN_PATTERN.test(sql)) {
    throw new AppError(
      ERROR_CODES.AI_SQL_FORBIDDEN,
      "public report sql contains sensitive columns",
      400
    );
  }
}
