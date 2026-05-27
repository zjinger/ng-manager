import type { FastifyInstance } from "fastify";
import type { QuickSpriteProjectDto } from "@yinuo-ngm/protocol";
import { quickFetch } from "./sprite-quick.utils";

/**
 * 快捷雪碧图路由 — 仅透传远端数据给前端配置弹窗使用
 *
 * - GET /projects：获取远端项目列表（供配置弹窗选择）
 * - GET /groups/:projectId：获取远端项目的分组列表（供配置弹窗选择）
 *
 * 注意：实际的生成与查询分流逻辑已内置在 sprite.routes 的
 * POST /generate/:projectId 和 GET /list/:projectId 中，
 * 前端无需感知是否需要走远端，始终调本地接口即可。
 */
export default async function spriteQuickRoutes(fastify: FastifyInstance) {
  // ========== GET /projects —— 获取含有雪碧图的远端项目列表 ==========
  fastify.get<{ Reply: QuickSpriteProjectDto[] }>("/projects", async (_req) => {
    const projects = await quickFetch<QuickSpriteProjectDto[]>(
      fastify,
      "/api/projects",
    );
    return projects;
  });

  // ========== GET /groups/:projectId —— 获取远端项目的分组信息 ==========
  fastify.get<{
    Params: { projectId: string };
    Reply: string[];
  }>("/groups/:projectId", async (req) => {
    const { projectId } = req.params;
    const groups = await quickFetch<string[]>(
      fastify,
      `/api/groups?projectId=${encodeURIComponent(projectId)}`,
    );
    return groups;
  });
}