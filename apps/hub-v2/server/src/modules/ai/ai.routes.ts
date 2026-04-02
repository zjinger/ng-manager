import type { FastifyInstance } from "fastify";
import { aiIssueRecommendInputSchema } from "./ai.schema";
import type { HistoricalIssue, HistoricalAssignee } from "./ai.types";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";

export default async function aiRoutes(app: FastifyInstance) {
  app.post("/ai/issue/recommend", async (request, reply) => {
    const ctx = requireAuth(request);
    const body = aiIssueRecommendInputSchema.parse(request.body);
    const { title, description, projectId } = body;
    await app.container.projectAccess.requireProjectAccess(projectId, ctx, "view ai issue recommendation");

    const historicalIssues = await listHistoricalIssuesForAi(app, projectId, 50);

    const result = await app.container.aiIssueService.recommend(
      { title, description, projectId },
      historicalIssues
    );

    return reply.send(ok(result));
  });

  app.post("/ai/issue/assignee", async (request, reply) => {
    const ctx = requireAuth(request);
    const body = aiIssueRecommendInputSchema.parse(request.body);
    const { title, description, projectId } = body;
    await app.container.projectAccess.requireProjectAccess(projectId, ctx, "view ai issue assignee recommendation");

    // 获取历史指派记录
    const historicalAssignees = await listHistoricalAssigneesForAi(app, projectId, 30);

    // 先获取类型推荐（如果没有提供）
    let issueType: "bug" | "feature" | "task" | "change" | "improvement" | "test" = "task";
    const typeResult = await app.container.aiIssueService.recommend(
      { title, description, projectId },
      []
    );
    if (typeResult.type) {
      issueType = typeResult.type;
    }

    const result = await app.container.aiIssueService.recommendAssignee(
      { title, description, type: issueType, projectId },
      historicalAssignees
    );

    return reply.send(ok(result));
  });
}

async function listHistoricalIssuesForAi(
  app: FastifyInstance,
  projectId: string,
  limit: number
): Promise<HistoricalIssue[]> {
  const db = app.db;
  const rows = db
    .prepare(
      `
        SELECT title, type, priority
        FROM issues
        WHERE project_id = ?
          AND status IN ('closed', 'resolved', 'verified')
        ORDER BY updated_at DESC
        LIMIT ?
      `
    )
    .all(projectId, limit) as HistoricalIssue[];

  return rows;
}

async function listHistoricalAssigneesForAi(
  app: FastifyInstance,
  projectId: string,
  limit: number
): Promise<HistoricalAssignee[]> {
  const db = app.db;
  const rows = db
    .prepare(
      `
        SELECT
          assignee_id as userId,
          assignee_name as userName,
          type,
          COUNT(*) as count
        FROM issues
        WHERE project_id = ?
          AND assignee_id IS NOT NULL
          AND status IN ('closed', 'resolved', 'verified')
        GROUP BY assignee_id, type
        ORDER BY count DESC
        LIMIT ?
      `
    )
    .all(projectId, limit) as HistoricalAssignee[];

  return rows;
}
