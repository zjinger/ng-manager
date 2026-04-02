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

interface ReportTemplateCreateDto {
  template: ReportTemplateDto;
  duplicated: boolean;
}

interface ReportCaliberDto {
  summary: string;
  scope: string;
  timeRange: string;
  metric: string;
  dataSource: string;
}

export default async function aiReportRoutes(app: FastifyInstance) {
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

    const existing = app.db
      .prepare(
        `
          SELECT id, title, natural_query, sql, created_by, created_at, updated_at
          FROM report_templates
          WHERE created_by = ? AND title = ? AND sql = ?
          LIMIT 1
        `
      )
      .get(actorId, body.title, prepared.sql) as ReportTemplateRow | undefined;
    if (existing) {
      const result: ReportTemplateCreateDto = {
        template: mapTemplate(existing),
        duplicated: true
      };
      return reply.send(ok(result, "template exists"));
    }

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

    const result: ReportTemplateCreateDto = {
      template: mapTemplate(row),
      duplicated: false
    };
    return reply.send(ok(result, "template created"));
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
    const blocks = app.container.aiReportRenderService.executeAndRenderAll(prepared.sql, prepared.params);
    const block = blocks[0] ?? { type: "empty", title: "暂无数据" };
    const caliber = buildReportCaliber({
      query: row.natural_query,
      sql: prepared.sql,
      title: row.title
    });

    return reply.send(ok({
      template: mapTemplate(row),
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

function buildReportCaliber(input: {
  query: string;
  sql: string;
  title?: string;
  description?: string;
}): ReportCaliberDto {
  const normalizedQuery = input.query.trim();
  const normalizedTitle = input.title?.trim() || normalizedQuery || "报表分析";
  const normalizedDesc = input.description?.trim() || "";
  const summary = normalizedDesc ? `${normalizedTitle}：${normalizedDesc}` : normalizedTitle;

  return {
    summary,
    scope: inferScope(normalizedQuery),
    timeRange: inferTimeRange(normalizedQuery, input.sql),
    metric: inferMetric(normalizedTitle, normalizedQuery),
    dataSource: inferDataSource(input.sql)
  };
}

function inferScope(query: string): string {
  if (/(各项目|按项目|项目对比|项目分布)/.test(query)) {
    return "按项目维度统计，仅包含你有权限访问的项目数据";
  }
  if (/(成员|负责人|处理人|指派人|人员)/.test(query)) {
    return "按成员维度统计，仅包含你有权限访问的项目数据";
  }
  if (/(研发项|需求)/.test(query)) {
    return "按研发项相关数据统计，仅包含你有权限访问的项目数据";
  }
  return "仅包含你有权限访问的项目数据";
}

function inferTimeRange(query: string, sql: string): string {
  const queryRangeMatch = query.match(/最近\s*\d+\s*(?:天|周|月|年)|本周|本月|本季度|今年|今天|昨日|昨天/);
  if (queryRangeMatch?.[0]) {
    return `按“${queryRangeMatch[0]}”范围统计`;
  }

  const sqlRangeMatch = sql.match(/datetime\(\s*'now'\s*,\s*'-(\d+)\s*(day|days|week|weeks|month|months|year|years)'\s*\)/i);
  if (sqlRangeMatch) {
    const amount = sqlRangeMatch[1];
    const unitMap: Record<string, string> = {
      day: "天",
      days: "天",
      week: "周",
      weeks: "周",
      month: "个月",
      months: "个月",
      year: "年",
      years: "年"
    };
    const unit = unitMap[sqlRangeMatch[2].toLowerCase()] || "";
    return `按最近 ${amount}${unit} 统计`;
  }
  return "未显式指定时默认按最近 90 天统计";
}

function inferMetric(title: string, query: string): string {
  const base = title || query;
  const normalized = base.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "统计口径由当前查询语义自动推断";
  }
  return `核心指标：${normalized}`;
}

function inferDataSource(sql: string): string {
  const sourceMap: Array<{ table: string; label: string }> = [
    { table: "issues", label: "测试单" },
    { table: "rd_items", label: "研发项" },
    { table: "project_members", label: "项目成员" },
    { table: "projects", label: "项目" },
    { table: "rd_stages", label: "研发阶段" },
    { table: "users", label: "成员信息" }
  ];
  const sources = sourceMap
    .filter((item) => new RegExp(`\\b${item.table}\\b`, "i").test(sql))
    .map((item) => item.label);

  if (sources.length === 0) {
    return "测试追踪业务数据";
  }
  return sources.join("、");
}
