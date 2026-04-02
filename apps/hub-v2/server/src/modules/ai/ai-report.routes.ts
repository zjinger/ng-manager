import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import { AppError } from "../../shared/errors/app-error";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { aiReportSqlInputSchema } from "./ai.schema";

export default async function aiReportRoutes(app: FastifyInstance) {
  // 生成 SQL 并预览
  app.post("/ai/report-sql/preview", async (request) => {
    const ctx = requireAuth(request);
    const { query } = aiReportSqlInputSchema.parse(request.body);

    // 1. AI 生成 SQL（内部已获取 projectIds）
    let sqlResult;
    try {
      sqlResult = await app.container.aiReportSqlService.generateSql(query.trim(), ctx);
    } catch (err) {
      if (err instanceof Error && err.message.includes("OPENAI_API_KEY")) {
        throw new AppError(ERROR_CODES.INTERNAL_ERROR, "AI 服务未配置，请联系管理员配置 OPENAI_API_KEY", 500);
      }
      throw err;
    }

    // 2. 执行并渲染（使用 SQL 结果中已注入的 params）
    const block = app.container.aiReportRenderService.executeAndRender(
      sqlResult.sql,
      sqlResult.params
    );

    return ok({
      sql: sqlResult.sql,
      params: sqlResult.params,
      title: sqlResult.title,
      description: sqlResult.description,
      block
    });
  });
}
