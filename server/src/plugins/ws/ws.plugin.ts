import websocket from "@fastify/websocket";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { Events } from "@core";
import { WsClientMsg, WsConn } from "./ws.types";
import { mapWsError, safeSend, wsError } from "./ws.utils";
import { TopicHandler } from "./topics/topic.types";
import { createTaskTopic } from "./topics/task.topic";

export default fp(async function wsPlugin(fastify: FastifyInstance) {

    await fastify.register(websocket);

    /** connId -> socket */
    const conns = new Map<string, WsConn>();

    /** connId -> subscribed taskIds (现在只做 task；未来扩展可以改成 Map<connId, Map<topic, Set<key>>> ) */
    const subs = new Map<string, Set<string>>();

    function isSub(connId: string, taskId: string) {
        return subs.get(connId)?.has(taskId);
    }

    /* ---------- core events bridge ---------- */
    // task stdout / stderr
    fastify.core.events.on(Events.TASK_OUTPUT, (e) => {
        try {
            const { taskId, text, stream } = e;
            for (const [connId, conn] of conns) {
                if (isSub(connId, taskId)) {
                    safeSend(conn, {
                        op: "log",
                        taskId,
                        entry: { text, stream },
                    });
                }
            }
        } catch (err) {
            // 广播异常不影响主流程，只记日志
            fastify.log.warn({ err }, "[ws] TASK_OUTPUT bridge error");
        }
    });

    // task lifecycle events
    const statusEvents = [
        Events.TASK_STARTED,
        Events.TASK_STOPPED,
        Events.TASK_EXITED,
        Events.TASK_FAILED,
    ] as const;

    for (const evt of statusEvents) {
        fastify.core.events.on(evt, (payload: any) => {
            try {
                const taskId = payload.taskId;
                if (!taskId) return;
                for (const [connId, conn] of conns) {
                    if (isSub(connId, taskId)) {
                        safeSend(conn, {
                            op: "status",
                            taskId,
                            event: evt,
                            payload,
                        });
                    }
                }
            } catch (err) {
                fastify.log.warn({ err }, `[ws] ${String(evt)} bridge error`);
            }
        });
    }
    /* ---------- topics registry ---------- */
    const topics = new Map<string, TopicHandler>();
    // topic: task
    topics.set("task", createTaskTopic(fastify, subs));

    /* ---------- websocket route ---------- */
    fastify.get("/ws", { websocket: true }, (conn) => {
        const connId = `c_${crypto.randomUUID()}`;
        conns.set(connId, conn);
        subs.set(connId, new Set());

        safeSend(conn, { op: "hello", connId, ts: Date.now() });

        conn.socket.on("message", async (raw: Uint8Array) => {
            let msg: WsClientMsg;
            // 1) parse 兜底
            try {
                msg = JSON.parse(String(raw));
            } catch {
                wsError(conn, "INVALID_JSON", "invalid json", { raw: String(raw) }, connId);
                return;
            }
            // 2) 全逻辑兜底
            try {
                // 2-1) ping
                if (msg.op === "ping") {
                    safeSend(conn, { op: "pong", ts: Date.now() });
                    return;
                }
                // 2-2)sub 统一走 topic registry（未来扩展点）
                if (msg.op === "sub") {
                    const handler = topics.get((msg as any).topic);
                    if (!handler) {
                        wsError(conn, "INVALID_TOPIC", "invalid topic", { msg }, connId);
                        return;
                    }
                    const v = handler.validate?.(msg);
                    if (v && !v.ok) {
                        wsError(conn, v.code, v.message, v.details, connId);
                        return;
                    }
                    await handler.sub({ connId, conn }, msg as any);
                    return;
                }

                // 2-3)unsub 统一走 topic registry
                if (msg.op === "unsub") {
                    const handler = topics.get((msg as any).topic);
                    if (!handler) {
                        wsError(conn, "INVALID_TOPIC", "invalid topic", { msg }, connId);
                        return;
                    }
                    const v = handler.validate?.(msg);
                    if (v && !v.ok) {
                        wsError(conn, v.code, v.message, v.details, connId);
                        return;
                    }
                    await handler.unsub({ connId, conn }, msg as any);
                    return;
                }

                wsError(conn, "UNSUPPORTED_OP", "unsupported op", { msg }, connId);
            } catch (e) {
                const mapped = mapWsError(e);
                wsError(conn, mapped.code, mapped.message, mapped.details, connId);
            }
        });
        conn.socket.on("close", () => {
            conns.delete(connId);
            subs.delete(connId);
        });
    });
});
