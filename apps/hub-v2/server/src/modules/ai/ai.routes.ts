import type { FastifyInstance } from "fastify";
import type { IssueType } from "../issue/issue.types";
import { aiAssigneeRecommendInputSchema, aiIssueRecommendInputSchema } from "./ai.schema";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import { AiRepo } from "./ai.repo";

export default async function aiRoutes(app: FastifyInstance) {
  const aiRepo = new AiRepo(app.db);

  app.post("/ai/issue/recommend", async (request, reply) => {
    const ctx = requireAuth(request);
    const body = aiIssueRecommendInputSchema.parse(request.body);
    const { title, description, projectId } = body;
    await app.container.projectAccess.requireProjectAccess(projectId, ctx, "view ai issue recommendation");

    const historicalIssues = aiRepo.listHistoricalIssues(projectId, 50);
    const projectModules = aiRepo.listProjectModules(projectId);

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
    const historicalAssignees = aiRepo.listHistoricalAssignees(projectId, 30);

    // 优先使用前端已有推荐，避免重复调用 LLM；缺失时回退一次推荐。
    let issueType: IssueType = body.type ?? "task";
    let moduleCode = body.moduleCode ?? null;

    if (!body.type) {
      const historicalIssues = aiRepo.listHistoricalIssues(projectId, 30);
      const projectModules = aiRepo.listProjectModules(projectId);
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
