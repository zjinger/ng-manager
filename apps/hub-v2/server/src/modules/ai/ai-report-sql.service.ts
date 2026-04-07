import { createHash } from "node:crypto";
import OpenAI from "openai";

import { AppError } from "../../shared/errors/app-error";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import type { RequestContext } from "../../shared/context/request-context";
import type { AppConfig } from "../../shared/env/env";
import type { ProjectAccessContract } from "../project/project-access.contract";
import {
  REPORT_SQL_SYSTEM_PROMPT,
  buildReportSqlUserPrompt
} from "./prompts/report-sql.prompt";

export interface SqlGenerationResult {
  sql: string;
  params: string[];
  title: string;
  description: string;
}

interface CacheEntry {
  result: SqlGenerationResult;
  expiresAt: number;
}

interface ReportSqlLlmResponse {
  sql?: string;
  title?: string;
  description?: string;
}

export class AiReportSqlService {
  private readonly noProjectAccessMessage = "当前不属于任何项目成员，无法生成报表";
  private readonly openai: OpenAI | null;
  private readonly model: string;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cacheTtlMs = 5 * 60 * 1000;
  private readonly maxLimit = 1000;
  private readonly forbiddenKeywords = [
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "ALTER",
    "CREATE",
    "TRUNCATE",
    "GRANT",
    "REVOKE",
    "PRAGMA",
    "ATTACH",
    "DETACH",
    "VACUUM"
  ];
  private readonly projectScopedTableColumns: Record<string, "project_id" | "id"> = {
    issues: "project_id",
    rd_items: "project_id",
    project_members: "project_id",
    rd_stages: "project_id",
    projects: "id"
  };
  private readonly narrativeTokenMap: Record<string, string> = {
    in_progress: "处理中",
    reopened: "重新打开",
    resolved: "已解决",
    verified: "已验证",
    closed: "已关闭",
    pending: "待处理",
    open: "待处理"
  };

  constructor(
    private readonly config: AppConfig,
    openaiClient: OpenAI | null,
    private readonly projectAccess: ProjectAccessContract
  ) {
    this.model = config.openaiModel?.trim();
    this.openai = openaiClient;
  }

  async generateSql(
    query: string,
    ctx: RequestContext
  ): Promise<SqlGenerationResult> {
    const projectIds = await this.getAccessibleProjectIds(ctx);
    if (projectIds.length === 0) {
      throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, this.noProjectAccessMessage, 403);
    }
    return this.generateSqlForProjectIds(query, projectIds);
  }

  async generateSqlForProjectIds(query: string, projectIds: string[]): Promise<SqlGenerationResult> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      throw new AppError(ERROR_CODES.AI_SQL_INVALID, "AI query is empty", 400);
    }

    const normalizedProjectIds = this.normalizeProjectIds(projectIds);
    if (normalizedProjectIds.length === 0) {
      throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, "No accessible projects", 403);
    }

    const cacheKey = this.buildCacheKey(
      normalizedQuery,
      normalizedProjectIds
    );
    
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const preset = this.buildPresetSqlResult(normalizedQuery);
    if (preset) {
      let sql = this.normalizeSql(preset.sql);
      this.validateSql(sql);
      sql = this.bindProjectFilter(sql, normalizedProjectIds);
      sql = this.enforceLimit(sql);

      const presetResult: SqlGenerationResult = {
        sql,
        params: normalizedProjectIds,
        title: this.localizeAiNarrative(preset.title).slice(0, 120),
        description: this.localizeAiNarrative(preset.description).slice(0, 300)
      };
      this.setCache(cacheKey, presetResult);
      return presetResult;
    }

    if (!this.openai) {
      throw new AppError(
        ERROR_CODES.INTERNAL_ERROR,
        "OPENAI_API_KEY is not configured. Please configure OPENAI_API_KEY first.",
        500
      );
    }

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: REPORT_SQL_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildReportSqlUserPrompt(normalizedQuery, normalizedProjectIds.length)
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new AppError(ERROR_CODES.INTERNAL_ERROR, "AI response is empty", 500);
    }

    const llmResult = this.parseLlmResponse(content);
    let sql = this.normalizeSql(llmResult.sql ?? "");
    this.validateSql(sql);
    sql = this.bindProjectFilter(sql, normalizedProjectIds);
    sql = this.enforceLimit(sql);

    const finalResult: SqlGenerationResult = {
      sql,
      params: normalizedProjectIds,
      title: this.localizeAiNarrative((llmResult.title || normalizedQuery).trim()).slice(0, 120),
      description: this.localizeAiNarrative((llmResult.description || "").trim()).slice(0, 300)
    };
    this.setCache(cacheKey, finalResult);
    return finalResult;
  }

  async prepareSqlForExecution(rawSql: string, ctx: RequestContext): Promise<{ sql: string; params: string[] }> {
    const projectIds = await this.getAccessibleProjectIds(ctx);
    if (projectIds.length === 0) {
      throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, this.noProjectAccessMessage, 403);
    }
    return this.prepareSqlForProjectIds(rawSql, projectIds);
  }

  prepareSqlForProjectIds(rawSql: string, projectIds: string[]): { sql: string; params: string[] } {
    const normalizedProjectIds = this.normalizeProjectIds(projectIds);
    if (normalizedProjectIds.length === 0) {
      throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, "No accessible projects", 403);
    }

    let sql = this.normalizeSql(rawSql);
    this.validateSql(sql);
    sql = this.bindProjectFilter(sql, normalizedProjectIds);
    sql = this.enforceLimit(sql);

    return {
      sql,
      params: normalizedProjectIds
    };
  }

  private async getAccessibleProjectIds(ctx: RequestContext): Promise<string[]> {
    const projectIds = await this.projectAccess.listAccessibleProjectIds(ctx);
    return this.normalizeProjectIds(projectIds);
  }

  private normalizeProjectIds(projectIds: string[]): string[] {
    return Array.from(new Set(projectIds.map((item) => item.trim()).filter((item) => item.length > 0)));
  }

  private parseLlmResponse(content: string): ReportSqlLlmResponse {
    try {
      return JSON.parse(content) as ReportSqlLlmResponse;
    } catch {
      throw new AppError(ERROR_CODES.INTERNAL_ERROR, "Invalid AI response format", 500);
    }
  }

  private normalizeSql(rawSql: string): string {
    let sql = rawSql.trim();
    if (!sql) {
      throw new AppError(ERROR_CODES.AI_SQL_INVALID, "AI generated SQL is empty", 400);
    }
    sql = sql.replace(/^```sql\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    sql = sql.replace(/;+$/g, "").trim();
    if (!sql) {
      throw new AppError(ERROR_CODES.AI_SQL_INVALID, "AI generated SQL is empty", 400);
    }
    if (sql.includes(";")) {
      throw new AppError(ERROR_CODES.AI_SQL_FORBIDDEN, "Multiple SQL statements are not allowed", 400);
    }
    return sql;
  }

  private validateSql(sql: string): void {
    const normalized = sql.trim();
    if (!/^(SELECT|WITH)\b/i.test(normalized)) {
      throw new AppError(ERROR_CODES.AI_SQL_FORBIDDEN, "Only SELECT/CTE queries are allowed", 400);
    }

    for (const keyword of this.forbiddenKeywords) {
      const keywordPattern = new RegExp(`\\b${keyword}\\b`, "i");
      if (keywordPattern.test(normalized)) {
        throw new AppError(ERROR_CODES.AI_SQL_FORBIDDEN, `Forbidden SQL keyword: ${keyword}`, 400);
      }
    }
  }

  injectProjectFilter(sql: string, projectIds: string[]): string {
    if (projectIds.length === 0) {
      return sql;
    }

    const projectExpr = this.detectProjectExpression(sql);
    const expressionPattern = new RegExp(`\\b${this.escapeForRegex(projectExpr)}\\s+IN\\s*\\(`, "i");
    if (expressionPattern.test(sql) || /\b(?:\w+\.)?project_id\s+IN\s*\(/i.test(sql)) {
      return sql;
    }

    const placeholders = projectIds.map(() => "?").join(", ");
    return this.injectProjectFilterByExpression(sql, projectExpr, placeholders);
  }

  private injectProjectFilterByExpression(sql: string, projectExpr: string, placeholders: string): string {
    const filterExpr = `${projectExpr} IN (${placeholders})`;

    const whereIndex = this.findTopLevelKeywordIndex(sql, "WHERE");
    if (whereIndex >= 0) {
      const beforeWhere = sql.slice(0, whereIndex);
      const afterWhere = sql.slice(whereIndex + "WHERE".length).trimStart();
      const clauseStartInAfterWhere = this.findFirstTopLevelClauseIndex(afterWhere, ["GROUP BY", "ORDER BY", "LIMIT"]);
      if (clauseStartInAfterWhere >= 0) {
        const originalWhereExpr = afterWhere.slice(0, clauseStartInAfterWhere).trim();
        const tailClauses = afterWhere.slice(clauseStartInAfterWhere).trimStart();
        return `${beforeWhere}WHERE ${filterExpr} AND (${originalWhereExpr}) ${tailClauses}`;
      }
      const originalWhereExpr = afterWhere.trim();
      return `${beforeWhere}WHERE ${filterExpr} AND (${originalWhereExpr})`;
    }

    const clauseIndex = this.findFirstTopLevelClauseIndex(sql, ["GROUP BY", "ORDER BY", "LIMIT"]);
    if (clauseIndex >= 0) {
      return `${sql.slice(0, clauseIndex).trimEnd()} WHERE ${filterExpr} ${sql.slice(clauseIndex).trimStart()}`;
    }

    return `${sql.trimEnd()} WHERE ${filterExpr}`;
  }

  private bindProjectFilter(sql: string, projectIds: string[]): string {
    const placeholders = projectIds.map(() => "?").join(", ");
    const projectExpr = this.detectProjectExpression(sql);
    const expressionPattern = new RegExp(
      `(\\b${this.escapeForRegex(projectExpr)}\\s+IN\\s*)\\(([^)]*)\\)`,
      "i"
    );
    if (expressionPattern.test(sql)) {
      return sql.replace(expressionPattern, `$1(${placeholders})`);
    }

    const legacyProjectIdPattern = /(\b(?:\w+\.)?project_id\s+IN\s*)\(([^)]*)\)/i;
    if (legacyProjectIdPattern.test(sql)) {
      return sql.replace(legacyProjectIdPattern, `$1(${placeholders})`);
    }

    return this.injectProjectFilterByExpression(sql, projectExpr, placeholders);
  }

  private detectProjectExpression(sql: string): string {
    const tablePattern = Object.keys(this.projectScopedTableColumns).join("|");
    const tableMatches = Array.from(
      sql.matchAll(new RegExp(`\\b(?:FROM|JOIN)\\s+(${tablePattern})\\b(?:\\s+(?:AS\\s+)?([A-Za-z_][A-Za-z0-9_]*))?`, "gi")),
    );

    if (tableMatches.length === 0) {
      throw new AppError(
        ERROR_CODES.AI_SQL_INVALID,
        "AI SQL must query at least one project-scoped table (issues/rd_items/projects/project_members/rd_stages)",
        400
      );
    }

    const firstMatch = tableMatches[0];
    const tableName = firstMatch[1];
    const aliasCandidate = firstMatch[2];
    const reservedWords = new Set([
      "WHERE",
      "JOIN",
      "GROUP",
      "ORDER",
      "LIMIT",
      "INNER",
      "LEFT",
      "RIGHT",
      "FULL",
      "ON"
    ]);
    const alias =
      aliasCandidate && !reservedWords.has(aliasCandidate.toUpperCase()) ? aliasCandidate : undefined;
    const qualifier = alias || tableName;
    const projectColumn = this.projectScopedTableColumns[tableName.toLowerCase()] ?? "project_id";
    return `${qualifier}.${projectColumn}`;
  }

  private findFirstTopLevelClauseIndex(sql: string, clauses: string[]): number {
    let min = -1;
    for (const clause of clauses) {
      const idx = this.findTopLevelKeywordIndex(sql, clause);
      if (idx >= 0 && (min < 0 || idx < min)) {
        min = idx;
      }
    }
    return min;
  }

  private findTopLevelKeywordIndex(sql: string, keyword: string): number {
    const source = sql;
    const upper = source.toUpperCase();
    const target = keyword.toUpperCase();
    const targetLen = target.length;
    let depth = 0;
    let inSingleQuote = false;
    let inDoubleQuote = false;

    for (let i = 0; i <= source.length - targetLen; i += 1) {
      const ch = source[i];
      const next = source[i + 1];
      const prev = source[i - 1];

      if (!inDoubleQuote && ch === "'") {
        if (inSingleQuote && next === "'") {
          i += 1;
          continue;
        }
        inSingleQuote = !inSingleQuote;
        continue;
      }

      if (!inSingleQuote && ch === "\"") {
        if (inDoubleQuote && next === "\"") {
          i += 1;
          continue;
        }
        inDoubleQuote = !inDoubleQuote;
        continue;
      }

      if (inSingleQuote || inDoubleQuote) {
        continue;
      }

      if (ch === "(") {
        depth += 1;
        continue;
      }
      if (ch === ")") {
        depth = Math.max(0, depth - 1);
        continue;
      }

      if (depth !== 0) {
        continue;
      }

      if (!upper.startsWith(target, i)) {
        continue;
      }

      const beforeChar = prev ?? "";
      const afterChar = source[i + targetLen] ?? "";
      const isWordChar = (value: string) => /[A-Za-z0-9_]/.test(value);
      if (isWordChar(beforeChar) || isWordChar(afterChar)) {
        continue;
      }

      return i;
    }

    return -1;
  }

  private escapeForRegex(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private enforceLimit(sql: string): string {
    const limitMatch = /\bLIMIT\s+(\d+)\b/i.exec(sql);
    if (!limitMatch) {
      return `${sql} LIMIT ${this.maxLimit}`;
    }

    const currentLimit = Number(limitMatch[1]);
    if (!Number.isFinite(currentLimit) || currentLimit <= 0) {
      return sql.replace(/\bLIMIT\s+\d+\b/i, `LIMIT ${this.maxLimit}`);
    }
    if (currentLimit > this.maxLimit) {
      return sql.replace(/\bLIMIT\s+\d+\b/i, `LIMIT ${this.maxLimit}`);
    }
    return sql;
  }

  private buildCacheKey(query: string, projectIds: string[]): string {
    const normalizedQuery = query
      .normalize("NFKC")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    const data = `${normalizedQuery}:${[...projectIds].sort().join(",")}`;
    return createHash("sha256").update(data).digest("hex");
  }

  private getFromCache(key: string): SqlGenerationResult | null {
    this.cleanupCache();
    const entry = this.cache.get(key);
    if (!entry || entry.expiresAt <= Date.now()) {
      return null;
    }
    return {
      ...entry.result,
      title: this.localizeAiNarrative(entry.result.title),
      description: this.localizeAiNarrative(entry.result.description)
    };
  }

  private setCache(key: string, result: SqlGenerationResult): void {
    this.cache.set(key, {
      result,
      expiresAt: Date.now() + this.cacheTtlMs
    });
    this.cleanupCache();
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }

  private localizeAiNarrative(input: string): string {
    if (!input) {
      return "";
    }

    let localized = input;
    for (const [token, label] of Object.entries(this.narrativeTokenMap)) {
      const pattern = new RegExp(`\\b${token}\\b`, "gi");
      localized = localized.replace(pattern, label);
    }

    localized = localized
      .replace(/(待处理|处理中|已解决|已验证|已关闭|重新打开)\s*,\s*/g, "$1、")
      .replace(/、\s*\)/g, "）")
      .replace(/\(\s*/g, "（")
      .replace(/\s*\)/g, "）");

    return localized;
  }

  private buildPresetSqlResult(query: string): Omit<SqlGenerationResult, "params"> | null {
    const compactQuery = query.replace(/\s+/g, "");
    const recentDays = this.extractRecentDays(query);
    const daysExpr = `-${recentDays} days`;

    const isProjectMemberCountCompare =
      (compactQuery.includes("各项目") || compactQuery.includes("项目")) &&
      compactQuery.includes("成员") &&
      (compactQuery.includes("数量") || compactQuery.includes("人数")) &&
      (compactQuery.includes("对比") || compactQuery.includes("分布") || compactQuery.includes("排行"));
    if (isProjectMemberCountCompare) {
      const sql =
        "SELECT p.id as project_id, p.name as project_name, COUNT(pm.id) as member_count " +
        "FROM projects p " +
        "LEFT JOIN project_members pm ON pm.project_id = p.id " +
        "GROUP BY p.id, p.name " +
        "ORDER BY member_count DESC, p.name ASC LIMIT 1000";

      return {
        sql,
        title: "各项目当前成员数量对比",
        description: "统计各项目当前成员数量（仅包含你有权限访问的项目）"
      };
    }

    const isMemberHandledStats =
      (compactQuery.includes("成员") || compactQuery.includes("处理人") || compactQuery.includes("负责人")) &&
      (compactQuery.includes("处理") || compactQuery.includes("最多") || compactQuery.includes("排行"));
    if (isMemberHandledStats) {
      const sql =
        "SELECT " +
        "COALESCE(NULLIF(u.display_name, ''), NULLIF(i.assignee_name, ''), '未指派') as assignee, " +
        "COUNT(*) as handled_count, " +
        "SUM(CASE WHEN i.status = 'resolved' THEN 1 ELSE 0 END) as resolved_count, " +
        "SUM(CASE WHEN i.status = 'verified' THEN 1 ELSE 0 END) as verified_count, " +
        "SUM(CASE WHEN i.status = 'closed' THEN 1 ELSE 0 END) as closed_count " +
        "FROM issues i " +
        "LEFT JOIN users u ON u.id = i.assignee_id " +
        "WHERE i.assignee_id IS NOT NULL " +
        "AND i.status IN ('resolved', 'verified', 'closed') " +
        "AND ( " +
        `  (i.status = 'resolved' AND i.resolved_at IS NOT NULL AND i.resolved_at >= datetime('now', '${daysExpr}')) ` +
        "  OR " +
        `  (i.status = 'verified' AND i.verified_at IS NOT NULL AND i.verified_at >= datetime('now', '${daysExpr}')) ` +
        "  OR " +
        `  (i.status = 'closed' AND i.closed_at IS NOT NULL AND i.closed_at >= datetime('now', '${daysExpr}')) ` +
        ") " +
        "GROUP BY i.assignee_id, COALESCE(NULLIF(u.display_name, ''), NULLIF(i.assignee_name, ''), '未指派') " +
        "ORDER BY handled_count DESC, assignee ASC LIMIT 20";

      return {
        sql,
        title: "成员处理数量排行",
        description: `最近 ${recentDays} 天成员处理数量统计（已解决/已验证/已关闭按各自时间字段计入，不限制类型）`
      };
    }

    const isCreateCloseTrend =
      compactQuery.includes("测试单") &&
      compactQuery.includes("创建") &&
      compactQuery.includes("关闭") &&
      compactQuery.includes("趋势");
    if (!isCreateCloseTrend) {
      const isRdCompletion =
        compactQuery.includes("研发项") &&
        (compactQuery.includes("完成情况") || compactQuery.includes("完成量") || compactQuery.includes("完成度"));
      if (!isRdCompletion) {
        return null;
      }

      const sql =
        "SELECT p.id as project_id, p.name as project_name, " +
        "COUNT(r.id) as rd_count, " +
        "SUM(CASE WHEN r.status IN ('done','closed','completed') THEN 1 ELSE 0 END) as completed_rd_count " +
        "FROM projects p " +
        "LEFT JOIN rd_items r ON r.project_id = p.id " +
        `AND r.created_at >= datetime('now', '${daysExpr}') ` +
        "GROUP BY p.id, p.name " +
        "ORDER BY rd_count DESC, p.name ASC LIMIT 1000";

      return {
        sql,
        title: "项目研发项完成情况",
        description: `最近 ${recentDays} 天各项目研发项总量与完成量（包含零值项目）`
      };
    }

    const sql =
      "SELECT p.id as project_id, p.name as project_name, d.date as date, " +
      "COALESCE(c.created_count, 0) as created_count, COALESCE(cl.closed_count, 0) as closed_count " +
      "FROM projects p " +
      "JOIN (SELECT date FROM (" +
      `SELECT DATE(i.created_at) as date FROM issues i WHERE i.type = 'test' AND i.created_at >= datetime('now', '${daysExpr}') ` +
      "UNION " +
      `SELECT DATE(i.closed_at) as date FROM issues i WHERE i.type = 'test' AND i.closed_at IS NOT NULL AND i.closed_at >= datetime('now', '${daysExpr}')` +
      ")) d ON 1 = 1 " +
      "LEFT JOIN (" +
      `SELECT i.project_id, DATE(i.created_at) as date, COUNT(*) as created_count FROM issues i WHERE i.type = 'test' AND i.created_at >= datetime('now', '${daysExpr}') ` +
      "GROUP BY i.project_id, DATE(i.created_at)" +
      ") c ON c.project_id = p.id AND c.date = d.date " +
      "LEFT JOIN (" +
      `SELECT i.project_id, DATE(i.closed_at) as date, COUNT(*) as closed_count FROM issues i WHERE i.type = 'test' AND i.closed_at IS NOT NULL AND i.closed_at >= datetime('now', '${daysExpr}') ` +
      "GROUP BY i.project_id, DATE(i.closed_at)" +
      ") cl ON cl.project_id = p.id AND cl.date = d.date " +
      "ORDER BY d.date DESC, p.name ASC LIMIT 1000";

    return {
      sql,
      title: "各项目测试单创建与关闭趋势",
      description: `最近 ${recentDays} 天各项目每日测试单创建数量与关闭数量统计（关闭按关闭时间）`
    };
  }

  private extractRecentDays(query: string): number {
    const matched = query.match(/最近\s*(\d+)\s*天/);
    const parsed = matched ? Number(matched[1]) : NaN;
    if (!Number.isFinite(parsed)) {
      return 30;
    }
    if (parsed < 1) {
      return 1;
    }
    if (parsed > 365) {
      return 365;
    }
    return Math.floor(parsed);
  }
}
