import { createHash } from "node:crypto";
import { AppError } from "../../shared/errors/app-error";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import type { RequestContext } from "../../shared/context/request-context";
import type { AppConfig } from "../../shared/env/env";
import type { ProjectAccessContract } from "../project/project-access.contract";
import OpenAI from "openai";
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

export class AiReportSqlService {
  private readonly openai: OpenAI;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 分钟缓存
  private readonly FORBIDDEN_KEYWORDS = [
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

  constructor(
    private readonly config: AppConfig,
    private readonly projectAccess: ProjectAccessContract
  ) {
    if (!config.openaiApiKey) {
      throw new Error("OPENAI_API_KEY is not configured. Please set it in your .env file.");
    }
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey,
      baseURL: config.openaiBaseUrl ?? undefined
    });
  }

  async generateSql(query: string, ctx: RequestContext): Promise<SqlGenerationResult> {
    // 1. 获取用户可访问的项目
    const projectIds = await this.getAccessibleProjectIds(ctx);

    if (projectIds.length === 0) {
      throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, "No accessible projects", 403);
    }

    // 2. 检查缓存（基于 query + projectIds 的 hash）
    const cacheKey = this.buildCacheKey(query, projectIds);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // 3. 调用 LLM 生成 SQL
    const response = await this.openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: REPORT_SQL_SYSTEM_PROMPT },
        { role: "user", content: buildReportSqlUserPrompt(query, projectIds.length) }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new AppError(ERROR_CODES.INTERNAL_ERROR, "AI response empty", 500);
    }

    let result: SqlGenerationResult;
    try {
      result = JSON.parse(content) as SqlGenerationResult;
    } catch {
      throw new AppError(ERROR_CODES.INTERNAL_ERROR, "Invalid AI response format", 500);
    }

    // 4. 安全校验
    this.validateSql(result.sql);

    // 5. 自动注入权限过滤
    result.sql = this.injectProjectFilter(result.sql, projectIds);

    // 6. 确保有 LIMIT
    if (!result.sql.match(/\bLIMIT\s+\d+\b/i)) {
      result.sql = `${result.sql} LIMIT 1000`;
    }

    // 7. 构建完整结果并缓存
    const finalResult: SqlGenerationResult = {
      ...result,
      params: projectIds
    };
    this.setCache(cacheKey, finalResult);

    return finalResult;
  }

  private async getAccessibleProjectIds(ctx: RequestContext): Promise<string[]> {
    return this.projectAccess.listAccessibleProjectIds(ctx);
  }

  private validateSql(sql: string): void {
    const upperSql = sql.toUpperCase().trim();

    // 必须是 SELECT 开头
    if (!upperSql.startsWith("SELECT")) {
      throw new AppError(
        ERROR_CODES.AI_SQL_FORBIDDEN,
        "Only SELECT queries are allowed",
        400
      );
    }

    // 禁止危险关键字
    for (const keyword of this.FORBIDDEN_KEYWORDS) {
      if (upperSql.includes(keyword)) {
        throw new AppError(
          ERROR_CODES.AI_SQL_FORBIDDEN,
          `Forbidden SQL keyword: ${keyword}`,
          400
        );
      }
    }
  }

  injectProjectFilter(sql: string, projectIds: string[]): string {
    // 如果 SQL 已有 project_id 过滤，不再注入
    if (sql.match(/project_id\s+IN\s*\(/i)) {
      return sql;
    }

    // 在 WHERE 后注入，或在 FROM 后加 WHERE
    const placeholders = projectIds.map(() => "?").join(",");

    if (sql.match(/\bWHERE\b/i)) {
      return sql.replace(/\bWHERE\b/i, `WHERE project_id IN (${placeholders}) AND`);
    }

    // 没有 WHERE，找 FROM 子句
    const fromMatch = sql.match(/\bFROM\s+\w+/i);
    if (fromMatch) {
      return sql.replace(
        fromMatch[0],
        `${fromMatch[0]} WHERE project_id IN (${placeholders})`
      );
    }

    return sql;
  }

  // 缓存相关方法
  private buildCacheKey(query: string, projectIds: string[]): string {
    const data = `${query}:${projectIds.sort().join(",")}`;
    return createHash("sha256").update(data).digest("hex");
  }

  private getFromCache(key: string): SqlGenerationResult | null {
    this.cleanupCache();
    const entry = this.cache.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      return entry.result;
    }
    return null;
  }

  private setCache(key: string, result: SqlGenerationResult): void {
    this.cache.set(key, {
      result,
      expiresAt: Date.now() + this.CACHE_TTL_MS
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
