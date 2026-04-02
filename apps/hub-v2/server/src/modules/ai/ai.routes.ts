import type { FastifyInstance } from "fastify";
import type { IssueType } from "../issue/issue.types";
import { aiAssigneeRecommendInputSchema, aiIssueRecommendInputSchema } from "./ai.schema";
import type { HistoricalIssue, HistoricalAssignee, ProjectModule } from "./ai.types";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";

export default async function aiRoutes(app: FastifyInstance) {
  app.post("/ai/issue/recommend", async (request, reply) => {
    const ctx = requireAuth(request);
    const body = aiIssueRecommendInputSchema.parse(request.body);
    const { title, description, projectId } = body;
    await app.container.projectAccess.requireProjectAccess(projectId, ctx, "view ai issue recommendation");

    const historicalIssues = await listHistoricalIssuesForAi(app, projectId, 50);
    const projectModules = await listProjectModulesForAi(app, projectId);

    const result = await app.container.aiIssueService.recommend(
      { title, description, projectId },
      historicalIssues,
      projectModules
    );

    return reply.send(ok(result));
  });

  app.post("/ai/issue/assignee", async (request, reply) => {
    const ctx = requireAuth(request);
    const body = aiAssigneeRecommendInputSchema.parse(request.body);
    const { title, description, projectId } = body;
    await app.container.projectAccess.requireProjectAccess(projectId, ctx, "view ai issue assignee recommendation");

    // 获取历史指派记录
    const historicalAssignees = await listHistoricalAssigneesForAi(app, projectId, 30);

    // 优先使用前端已有推荐，避免重复调用 LLM；缺失时回退一次推荐。
    let issueType: IssueType = body.type ?? "task";
    let moduleCode = body.moduleCode ?? null;

    if (!body.type) {
      const historicalIssues = await listHistoricalIssuesForAi(app, projectId, 30);
      const projectModules = await listProjectModulesForAi(app, projectId);
      const typeResult = await app.container.aiIssueService.recommend(
        { title, description, projectId },
        historicalIssues,
        projectModules
      );
      if (typeResult.type) {
        issueType = typeResult.type;
      }
      if (!moduleCode) {
        moduleCode = typeResult.module?.code ?? null;
      }
    }

    const result = await app.container.aiIssueService.recommendAssignee(
      { title, description, type: issueType, moduleCode, projectId },
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
        SELECT title, type, priority, module_code
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

async function listProjectModulesForAi(
  app: FastifyInstance,
  projectId: string
): Promise<ProjectModule[]> {
  const db = app.db;
  const rows = db
    .prepare(
      `
        SELECT code, name
        FROM project_modules
        WHERE project_id = ?
          AND enabled = 1
        ORDER BY sort ASC
      `
    )
    .all(projectId) as Array<{ code: string | null; name: string }>;

  return rows.map((row) => ({
    code: row.code?.trim() || row.name,
    name: row.name
  }));
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
