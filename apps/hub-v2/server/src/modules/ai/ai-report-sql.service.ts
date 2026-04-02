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
  private readonly openai: OpenAI | null;
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

  constructor(
    private readonly config: AppConfig,
    private readonly projectAccess: ProjectAccessContract
  ) {
    this.openai = config.openaiApiKey
      ? new OpenAI({
          apiKey: config.openaiApiKey,
          baseURL: config.openaiBaseUrl ?? undefined
        })
      : null;
  }

  async generateSql(
    query: string,
    ctx: RequestContext
  ): Promise<SqlGenerationResult> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      throw new AppError(ERROR_CODES.AI_SQL_INVALID, "AI query is empty", 400);
    }

    const projectIds = await this.getAccessibleProjectIds(ctx);
    if (projectIds.length === 0) {
      throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, "No accessible projects", 403);
    }

    const cacheKey = this.buildCacheKey(
      normalizedQuery,
      projectIds
    );
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    if (!this.openai) {
      throw new AppError(
        ERROR_CODES.INTERNAL_ERROR,
        "OPENAI_API_KEY is not configured. Please configure OPENAI_API_KEY first.",
        500
      );
    }

    const response = await this.openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: REPORT_SQL_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildReportSqlUserPrompt(normalizedQuery, projectIds.length)
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
    sql = this.bindProjectFilter(sql, projectIds);
    sql = this.enforceLimit(sql);

    const finalResult: SqlGenerationResult = {
      sql,
      params: projectIds,
      title: (llmResult.title || normalizedQuery).trim().slice(0, 120),
      description: (llmResult.description || "").trim().slice(0, 300)
    };
    this.setCache(cacheKey, finalResult);
    return finalResult;
  }

  async prepareSqlForExecution(rawSql: string, ctx: RequestContext): Promise<{ sql: string; params: string[] }> {
    const projectIds = await this.getAccessibleProjectIds(ctx);
    if (projectIds.length === 0) {
      throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, "No accessible projects", 403);
    }

    let sql = this.normalizeSql(rawSql);
    this.validateSql(sql);
    sql = this.bindProjectFilter(sql, projectIds);
    sql = this.enforceLimit(sql);

    return {
      sql,
      params: projectIds
    };
  }

  private async getAccessibleProjectIds(ctx: RequestContext): Promise<string[]> {
    const projectIds = await this.projectAccess.listAccessibleProjectIds(ctx);
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

    if (/\b(?:\w+\.)?project_id\s+IN\s*\(/i.test(sql)) {
      return sql;
    }

    const projectExpr = this.detectProjectExpression(sql);
    const placeholders = projectIds.map(() => "?").join(", ");
    const filterExpr = `${projectExpr} IN (${placeholders})`;

    if (/\bWHERE\b/i.test(sql)) {
      return sql.replace(/\bWHERE\b/i, `WHERE ${filterExpr} AND`);
    }

    const clauseMatch = /\bGROUP\s+BY\b|\bORDER\s+BY\b|\bLIMIT\b/i.exec(sql);
    if (clauseMatch?.index !== undefined) {
      return `${sql.slice(0, clauseMatch.index)} WHERE ${filterExpr} ${sql.slice(clauseMatch.index)}`;
    }

    return `${sql} WHERE ${filterExpr}`;
  }

  private bindProjectFilter(sql: string, projectIds: string[]): string {
    const placeholders = projectIds.map(() => "?").join(", ");
    const existingFilterPattern = /(\b(?:\w+\.)?project_id\s+IN\s*)\(([^)]*)\)/i;
    if (existingFilterPattern.test(sql)) {
      return sql.replace(existingFilterPattern, `$1(${placeholders})`);
    }

    return this.injectProjectFilter(sql, projectIds);
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
    const data = `${query}:${[...projectIds].sort().join(",")}`;
    return createHash("sha256").update(data).digest("hex");
  }

  private getFromCache(key: string): SqlGenerationResult | null {
    this.cleanupCache();
    const entry = this.cache.get(key);
    if (!entry || entry.expiresAt <= Date.now()) {
      return null;
    }
    return entry.result;
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
}
