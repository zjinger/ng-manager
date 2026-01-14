import { AppError } from "@core";
import type { FastifyInstance } from "fastify";
/** 判断该项目是否已有 specs（用于懒加载） */
async function ensureSpecs(fastify: FastifyInstance, projectId: string) {
    const specs = await fastify.core.task.listSpecsByProject(projectId);
    if (specs.length === 0) {
        await fastify.core.task.refreshByProject(projectId);
    }
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
     * 启动任务（唯一方式）
     * POST /start
     * body: { taskId: string } 
     */
    fastify.post("/start", async (req) => {
        const body = req.body as { taskId?: string };
        const taskId = body?.taskId?.trim();
        if (!taskId) throw new AppError("TASK_ID_REQUIRED", "taskId is required", { body });
        return await fastify.core.task.start(taskId);
    });


    /**
     * 停止任务
     * POST /stop
     * body: { taskId: string } 
     */
    fastify.post("/stop", async (req) => {
        const body = req.body as { taskId?: string };
        const taskId = body?.taskId?.trim();
        if (!taskId) throw new AppError("TASK_ID_REQUIRED", "taskId is required", { body });
        return await fastify.core.task.stop(taskId);
    });

    /**
     * 查询任务状态
     * GET /status/:taskId  
     */
    fastify.get("/status/:taskId", async (req) => {
        const { taskId } = req.params as { taskId: string };
        return await fastify.core.task.status(taskId);
    });

    /** 列出所有活跃的任务（running / stopping） */
    fastify.get("/active", async () => {
        return await fastify.core.task.listActive();
    });

    /**
     * 拉取某次运行的任务日志
     * GET /log/run/:runId?tail=200
     */
    fastify.get("/log/run/:runId", async (req) => {
        const { runId } = req.params as { runId: string };
        const { tail } = req.query as { tail?: string };
        const limit = Math.min(Math.max(Number(tail) || 200, 1), 5000);
        return await fastify.core.task.getTailLogsByRun(runId, limit);
    });
}

