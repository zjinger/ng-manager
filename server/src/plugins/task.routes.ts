import { AppError } from "@core";
import type { FastifyInstance } from "fastify";

export default async function taskRoutes(fastify: FastifyInstance) {
    /**
     * 获取 task views（spec + runtime 聚合）
     * GET /projects/:projectId/task-views
     */
    fastify.get("/projects/:projectId/task-views", async (req) => {
        const { projectId } = req.params as { projectId: string };
        await fastify.core.project.get(projectId); // 不存在就抛 AppError
        return fastify.core.task.listViewsByProject(projectId);
    });

    /**
     * 同步项目脚本为 task specs
     * 根据 rootDir 扫描 + scripts 生成 
     */
    fastify.post("/projects/:projectId/tasks/sync", async (req) => {
        const { projectId } = req.params as { projectId: string };
        // 从 ProjectService 读取持久化项目
        const proj = await fastify.core.project.get(projectId);
        const specs = await fastify.core.task.syncSpecsFromProjectScripts(
            projectId,
            proj.root,
            proj.scripts ?? {}
        );
        return { projectId, specs };

    });

    /**
     * 列出该项目的 task specs
     */
    fastify.get("/projects/:projectId/task-specs", async (req) => {
        const { projectId } = req.params as { projectId: string };
        return await fastify.core.task.listSpecsByProject(projectId);
    });

    /**
     * 启动任务
     */
    fastify.post("/tasks/start", async (req) => {
        const body = req.body as {
            id?: string;
            projectId: string;
            name: string;
            command: string;
            cwd: string;
            env?: Record<string, string>;
        };
        return await fastify.core.task.start(body);
    });

    /**
     * 停止任务
     */
    fastify.post("/tasks/:id/stop", async (req) => {
        const { id } = req.params as { id: string };
        return await fastify.core.task.stop(id);
    });

    /**
     * 查询任务状态
     */
    fastify.get("/tasks/:id", async (req) => {
        const { id } = req.params as { id: string };
        return await fastify.core.task.status(id);
    });

    /**
     * 按 project 查询任务
     */
    fastify.get("/projects/:projectId/tasks", async (req) => {
        const { projectId } = req.params as { projectId: string };
        return await fastify.core.task.listByProject(projectId);
    });

    /**
     * 拉取任务日志
     * GET /tasks/:id/log?tail=200
     */
    fastify.get("/tasks/:id/log", async (req) => {
        const { id } = req.params as { id: string };
        const { tail } = req.query as { tail?: string };
        const limit = Math.min(
            Math.max(Number(tail) || 200, 1),
            5000
        );
        return fastify.core.log.tail(limit, { refId: id });
    });
}

