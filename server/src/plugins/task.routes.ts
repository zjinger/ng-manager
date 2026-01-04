import { AppError } from "@core";
import type { FastifyInstance } from "fastify";

export default async function taskRoutes(fastify: FastifyInstance) {
    /**
 * 获取 task views（spec + runtime 聚合）
 * GET /projects/:projectId/task-views
 */
    fastify.get("/projects/:projectId/task-views", async (req, reply) => {
        try {
            const { projectId } = req.params as { projectId: string };
            // 可选：确保项目存在（更友好 404）
            await fastify.core.project.get(projectId);
            return await fastify.core.task.listViewsByProject(projectId);
        } catch (e) {
            return handleError(e, reply);
        }
    });
    // 同步该项目的 task specs（根据 rootDir 扫描 + scripts 生成）
    fastify.post("/projects/:projectId/tasks/sync", async (req, reply) => {
        try {
            const { projectId } = req.params as { projectId: string };
            // 从 ProjectService 读取持久化项目
            const proj = await fastify.core.project.get(projectId);
            const specs = await fastify.core.task.syncSpecsFromProjectScripts(
                projectId,
                proj.root,
                proj.scripts ?? {}
            );
            return { projectId, specs };
        } catch (e) {
            return handleError(e, reply);
        }
    });

    // 列出该项目的 task specs
    fastify.get("/projects/:projectId/task-specs", async (req, reply) => {
        try {
            const { projectId } = req.params as { projectId: string };
            return await fastify.core.task.listSpecsByProject(projectId);
        } catch (e) {
            return handleError(e, reply);
        }
    });

    /**
     * 启动任务
     */
    fastify.post("/tasks/start", async (req, reply) => {
        try {
            const body = req.body as {
                id?: string;
                projectId: string;
                name: string;
                command: string;
                cwd: string;
                env?: Record<string, string>;
            };

            const rt = await fastify.core.task.start(body);
            return rt;
        } catch (e) {
            return handleError(e, reply);
        }
    });

    /**
     * 停止任务
     */
    fastify.post("/tasks/:id/stop", async (req, reply) => {
        try {
            const { id } = req.params as { id: string };
            const rt = await fastify.core.task.stop(id);
            return rt;
        } catch (e) {
            return handleError(e, reply);
        }
    });

    /**
     * 查询任务状态
     */
    fastify.get("/tasks/:id", async (req, reply) => {
        try {
            const { id } = req.params as { id: string };
            return await fastify.core.task.status(id);
        } catch (e) {
            return handleError(e, reply);
        }
    });

    /**
     * 按 project 查询任务
     */
    fastify.get("/projects/:projectId/tasks", async (req, reply) => {
        try {
            const { projectId } = req.params as { projectId: string };
            return await fastify.core.task.listByProject(projectId);
        } catch (e) {
            return handleError(e, reply);
        }
    });

    /**
     * 拉取任务日志
     * GET /tasks/:id/log?tail=200
     */
    fastify.get("/tasks/:id/log", async (req, reply) => {
        try {
            const { id } = req.params as { id: string };
            const { tail } = req.query as { tail?: string };

            const limit = Math.min(
                Math.max(Number(tail) || 200, 1),
                5000
            );

            return fastify.core.log.tail(limit, { refId: id });
        } catch (e) {
            return handleError(e, reply);
        }
    });
}

/* -------------------- error mapping -------------------- */

function handleError(err: any, reply: any) {
    if (err instanceof AppError) {
        const status = mapErrorCodeToHttp(err.code);
        reply.code(status);
        return {
            code: err.code,
            message: err.message,
            meta: err.meta,
        };
    }

    reply.code(500);
    return {
        code: "INTERNAL_ERROR",
        message: err?.message || "Unknown error",
    };
}

function mapErrorCodeToHttp(code: string): number {
    switch (code) {
        case "TASK_NOT_FOUND":
        case "PROJECT_NOT_FOUND":
            return 404;
        case "TASK_ALREADY_RUNNING":
            return 409;
        case "PROCESS_SPAWN_FAILED":
            return 500;
        default:
            return 400;
    }
}
