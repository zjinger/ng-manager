// server/src/plugins/ws/ws.plugin.ts
import { Events } from "@yinuo-ngm/core";
import websocket from "@fastify/websocket";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { createTaskTopicHandler, createSyslogTopicHandler, createSvnSyncTopicHandler } from "./topics";
import { WsContext } from "./ws.context";
import { WsRouter } from "./ws.router";

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
            getTaskSnapshotByTaskId: (taskId) => fastify.core.task.getSnapshotByTaskId(taskId),
            getTaskTailLogsByRun: (runId, tail) => fastify.core.task.getTailLogsByRun(runId, tail),
            resizeRun: (taskId, cols, rows) => fastify.core.task.resizeRun(taskId, cols, rows),
        },
        () => clients.values()
    );
    router.register(taskHandler);

    // syslog
    const syslogHandler = createSyslogTopicHandler(
        { getSyslogTail: (tail) => fastify.core.sysLog.tail(tail) },
        () => clients.values()
    );
    router.register(syslogHandler);

    // svn sync
    const svnSyncHandler = createSvnSyncTopicHandler({
        getSvnRuntimeByProjectId: (projectId, tail) => fastify.core.svnSync.getRuntimeByProjectId(projectId, tail),
    }, () => clients.values()
    );
    router.register(svnSyncHandler);

    // 事件订阅：拿到 disposer，onClose 释放
    const offs: Array<() => void> = [];
    const events = fastify.core.events;
    offs.push(events.on(Events.TASK_OUTPUT, (e) => {
        taskHandler.pushOutput(e);
    }));

    offs.push(events.on(Events.TASK_STARTED, (e) => {
        taskHandler.pushEvent("started", e);
    }));

    offs.push(events.on(Events.TASK_STOP_REQUESTED, (e) => {
        taskHandler.pushEvent("stopRequested", e);
    }));

    offs.push(events.on(Events.TASK_EXITED, (e) => {
        taskHandler.pushEvent("exited", e);
    }));

    offs.push(events.on(Events.TASK_FAILED, (e) => {
        taskHandler.pushEvent("failed", e);
    }));

    offs.push(events.on(Events.SYSLOG_APPENDED, (e) => {
        syslogHandler.push(e.entry);
    }));

    offs.push(events.on(Events.PROJECT_BOOTSTRAP_DONE, (e) => {
        taskHandler.pushEvent("bootstrapDone", e);
    }))

    offs.push(events.on(Events.PROJECT_BOOTSTRAP_FAILED, (e) => {
        taskHandler.pushEvent("bootstrapFailed", e);
    }))

    offs.push(events.on(Events.PROJECT_BOOTSTRAP_NEED_PICK_ROOT, (e) => {
        taskHandler.pushEvent("bootstrapNeedPickRoot", e);
    }))

    offs.push(events.on(Events.SVN_SYNC_STARTED, (e) => {
        svnSyncHandler.pushEvent("started", e);
    }))

    offs.push(events.on(Events.SVN_SYNC_OUTPUT, (e) => {
        svnSyncHandler.pushEvent("output", e);
    }));

    offs.push(events.on(Events.SVN_SYNC_PROGRESS, (e) => {
        svnSyncHandler.pushEvent("progress", e);
    }))

    offs.push(events.on(Events.SVN_SYNC_DONE, (e) => {
        svnSyncHandler.pushEvent("done", e);
    }))

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
        // console.log("[ws] open", connId, "clients=", clients.size + 1);
        clients.set(connId, ctx);
        ctx.send({ op: "hello", connId, ts: Date.now() });
        // 接收client消息
        ws.on("message", (data: any) => router.handleRaw(ctx, data));
        ws.on("close", () => {
            ctx.clearAll();
            clients.delete(connId);
        });
    });
});
