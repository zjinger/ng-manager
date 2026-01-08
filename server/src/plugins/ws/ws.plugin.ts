// server/src/plugins/ws/ws.plugin.ts
import fp from "fastify-plugin";
import websocket from "@fastify/websocket";
import type { FastifyInstance } from "fastify";
import { WsContext } from "./ws.context";
import { WsRouter } from "./ws.router";
import { createTaskTopicHandler } from "./topics";
import { Events } from "@core";

function uid() {
    return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export default fp(async function wsPlugin(fastify: FastifyInstance) {
    
    await fastify.register(websocket);

    const clients = new Map<string, WsContext>();

    const router = new WsRouter();

    // 注册 topics： core.task 的能力注入进来
    const taskHandler = createTaskTopicHandler(
        {
            getTaskSnapshot: (taskId) => fastify.core.task.getSnapshot(taskId),
            getTaskTailLogs: (taskId, tail) => fastify.core.task.getTailLogs(taskId, tail),
        },
        () => clients.values()
    );
    router.register(taskHandler);
    // 事件订阅：拿到 disposer，onClose 释放
    const offs: Array<() => void> = [];

    // 把 push 接到 core events 上（下面演示）
    offs.push(fastify.core.events.on(Events.TASK_OUTPUT, (e) => {
        taskHandler.pushTaskLog(e.taskId, {
            ts: Date.now(),
            level: e.stream === "stderr" ? "warn" : "info",
            source: "task",
            refId: e.taskId,
            text: e.text,
            stream: e.stream,
        });
    }));

    offs.push(fastify.core.events.on(Events.TASK_STARTED, (e) => {
        taskHandler.pushTaskStatus(e.taskId, "task.started", { pid: e.pid });
    }));
    offs.push(fastify.core.events.on(Events.TASK_EXITED, (e) => {
        taskHandler.pushTaskStatus(e.taskId, "task.exited", { exitCode: e.exitCode, signal: e.signal });
    }));

    offs.push(fastify.core.events.on(Events.TASK_FAILED, (e) => {
        taskHandler.pushTaskStatus(e.taskId, "task.failed", { error: e.error });
    }));

    offs.push(fastify.core.events.on(Events.TASK_STOPPED, (e) => {
        taskHandler.pushTaskStatus(e.taskId, "task.stopped", {});
    }));

    fastify.addHook("onClose", async () => {
        // 防止 dev 热重载 / 反复 register 导致重复推送
        offs.forEach((off) => {
            try { off(); } catch { }
        });
        clients.clear();
    });

    fastify.get("/ws", { websocket: true }, (ws) => {
        const connId = uid();
        const ctx = new WsContext(connId, ws);
        console.log("[ws] open", connId, "clients=", clients.size + 1);
        clients.set(connId, ctx);
        ctx.send({ op: "hello", connId, ts: Date.now() });

        ws.on("message", (data: any) => router.handleRaw(ctx, data));
        ws.on("close", () => {
            ctx.clearAll();
            clients.delete(connId);
        });
    });
});
