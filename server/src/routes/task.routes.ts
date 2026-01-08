import { AppError } from "@core";
import type { FastifyInstance } from "fastify";
/** 判断该项目是否已有 specs（用于懒加载） */
async function ensureSpecs(fastify: FastifyInstance, projectId: string) {
    const specs = await fastify.core.task.listSpecsByProject(projectId);
    if (specs.length === 0) {
        await fastify.core.task.refreshByProject(projectId);
    }
}

/** 根据 projectId + name 找 spec（用于 start） */
async function findSpecByName(fastify: FastifyInstance, projectId: string, name: string) {
    await ensureSpecs(fastify, projectId);
    const specs = await fastify.core.task.listSpecsByProject(projectId);
    return specs.find((s) => s.projectId === projectId && s.name === name);
}

export default async function taskRoutes(fastify: FastifyInstance) {

    /**
     * 获取 task views（spec + runtime 聚合）
     * 懒加载，如果该项目未 refresh 过则自动 refresh
     * GET /views/:projectId
     */
    fastify.get("/list/:projectId", async (req) => {
        const { projectId } = req.params as { projectId: string };
        await ensureSpecs(fastify, projectId);
        return fastify.core.task.listViewsByProject(projectId);
    });

    /**
     * 刷新（从 ProjectService.get(projectId) 的 scripts 重新生成 specs）
     * 返回 views，前端可直接渲染
     * POST /refresh/:projectId
     */
    fastify.post("/refresh/:projectId", async (req) => {
        const { projectId } = req.params as { projectId: string };
        // refreshByProject 内部会从 ProjectService.get() 拉 root/scripts/pm 并更新 specs
        return await fastify.core.task.refreshByProject(projectId);
    });

    /**
     * 列出该项目的 task specs
     * 懒加载，避免空
     * GET /specs/:projectId
     */
    fastify.get("/specs/:projectId", async (req) => {
        const { projectId } = req.params as { projectId: string };
        await ensureSpecs(fastify, projectId);
        return await fastify.core.task.listSpecsByProject(projectId);
    });

    /** 
     * 启动任务（唯一方式）
     * POST /start
     * body: { taskId: string }
     */
    fastify.post("/start", async (req) => {
        const body = req.body as { specId?: string };
        const specId = body?.specId?.trim();

        if (!specId) {
            throw new AppError("BAD_REQUEST", "specId is required", { body });
        }
        return fastify.core.task.start(specId);
    });


    /**
     * 停止任务
     * POST /stop/:id
     *  id === taskId === specId
     */
    fastify.post("/stop/:id", async (req) => {
        const { id } = req.params as { id: string };
        return fastify.core.task.stop(id);
    });

    /**
     * 查询任务状态
     * GET /status/:id
     */
    fastify.get("/status/:id", async (req) => {
        const { id } = req.params as { id: string };
        return fastify.core.task.status(id);
    });

    /**
     * 拉取任务日志
     * GET /log/:id?tail=200
     */
    fastify.get("/log/:id", async (req) => {
        const { id } = req.params as { id: string };
        const { tail } = req.query as { tail?: string };
        const limit = Math.min(Math.max(Number(tail) || 200, 1), 5000);
        return fastify.core.log.tail(limit, { refId: id });
    });
}

