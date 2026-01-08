// server/src/plugins/ws/ws.plugin.ts
import fp from "fastify-plugin";
import websocket from "@fastify/websocket";
import type { FastifyInstance } from "fastify";
import { WsContext } from "./ws.context";
import { WsRouter } from "./ws.router";
import { createTaskTopicHandler } from "./topics";
import { Events } from "@core";
import { createSyslogTopicHandler } from "./topics/syslog.ws";

function uid() {
    return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export default fp(async function wsPlugin(fastify: FastifyInstance) {

    await fastify.register(websocket);

    const clients = new Map<string, WsContext>();

    const router = new WsRouter();

    // 注册 topics： core.task 的能力注入进来
    const taskHandler = createTaskTopicHandler(
        { getRunTailLogs: (runId, tail) => fastify.core.task.getTailLogsByRun(runId, tail) },
        () => clients.values()
    );
    router.register(taskHandler);
    // syslog
    const syslogHandler = createSyslogTopicHandler(
        { getSyslogTail: (tail) => fastify.core.task.getSyslogTail(tail) },
        () => clients.values()
    );
    router.register(syslogHandler);


    // 事件订阅：拿到 disposer，onClose 释放
    const offs: Array<() => void> = [];

    offs.push(fastify.core.events.on(Events.TASK_OUTPUT, (e) => {
        taskHandler.pushOutput(e.runId, e.stream, e.text);
    }));

    offs.push(fastify.core.events.on(Events.TASK_STARTED, (e) => {
        taskHandler.pushEvent(e.runId, "started", { pid: e.pid, taskId: e.taskId });
    }));

    offs.push(fastify.core.events.on(Events.TASK_STOP_REQUESTED, (e) => {
        taskHandler.pushEvent(e.runId, "stopRequested", { taskId: e.taskId });
    }));

    offs.push(fastify.core.events.on(Events.TASK_EXITED, (e) => {
        taskHandler.pushEvent(e.runId, "exited", { exitCode: e.exitCode, signal: e.signal, taskId: e.taskId });
    }));

    offs.push(fastify.core.events.on(Events.TASK_FAILED, (e) => {
        taskHandler.pushEvent(e.runId, "failed", { error: e.error, taskId: e.taskId });
    }));

    offs.push(fastify.core.events.on(Events.SYSLOG_APPENDED, (e) => {
        syslogHandler.push(e.entry);
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
