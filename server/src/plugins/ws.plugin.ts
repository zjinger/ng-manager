import fp from "fastify-plugin";
import websocket from "@fastify/websocket";
import type { FastifyInstance } from "fastify";

import { Events } from "@core";

/* ---------------- WS 协议 ---------------- */
type WsConn = {
    socket: {
        readyState: number;
        send(data: string): void;
        on(event: "message", cb: (data: any) => void): void;
        on(event: "close", cb: () => void): void;
    };
};

type WsClientMsg =
    | { op: "ping" }
    | { op: "sub"; topic: "task"; taskId: string; tail?: number }
    | { op: "unsub"; topic: "task"; taskId: string };

type WsServerMsg =
    | { op: "hello"; connId: string; ts: number }
    | { op: "pong"; ts: number }
    | { op: "log"; taskId: string; entry: any }
    | { op: "status"; taskId: string; event: string; payload: any }
    | { op: "error"; message: string };

/* ---------------- utils ---------------- */

function send(conn: WsConn, msg: WsServerMsg) {
    if (conn.socket.readyState === 1) {
        conn.socket.send(JSON.stringify(msg));
    }
}

/* ---------------- plugin ---------------- */

export default fp(async function wsPlugin(fastify: FastifyInstance) {

    await fastify.register(websocket);

    /** connId -> socket */
    const conns = new Map<string, WsConn>();

    /** connId -> subscribed taskIds */
    const subs = new Map<string, Set<string>>();

    function isSub(connId: string, taskId: string) {
        return subs.get(connId)?.has(taskId);
    }

    /* ---------- core events bridge ---------- */

    // task stdout / stderr
    fastify.core.events.on(Events.TASK_OUTPUT, (e) => {
        const { taskId, text, stream } = e;

        for (const [connId, conn] of conns) {
            if (isSub(connId, taskId)) {
                send(conn, {
                    op: "log",
                    taskId,
                    entry: { text, stream },
                });
            }
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
            const taskId = payload.taskId;
            if (!taskId) return;

            for (const [connId, conn] of conns) {
                if (isSub(connId, taskId)) {
                    send(conn, {
                        op: "status",
                        taskId,
                        event: evt,
                        payload,
                    });
                }
            }
        });
    }

    /* ---------- websocket route ---------- */

    fastify.get("/ws", { websocket: true }, (conn) => {

        const connId = `c_${Math.random().toString(16).slice(2, 10)}`;
        conns.set(connId, conn);
        subs.set(connId, new Set());

        send(conn, { op: "hello", connId, ts: Date.now() });

        conn.socket.on("message", async (raw: Uint8Array) => {
            let msg: WsClientMsg;
            try {
                msg = JSON.parse(String(raw));
            } catch {
                send(conn, { op: "error", message: "invalid json" });
                return;
            }

            if (msg.op === "ping") {
                send(conn, { op: "pong", ts: Date.now() });
                return;
            }

            if (msg.op === "sub" && msg.topic === "task") {
                subs.get(connId)!.add(msg.taskId);

                // 订阅时先推一段历史日志（体验很好）
                const tail = Math.min(Math.max(msg.tail ?? 200, 1), 2000);
                const entries = fastify.core.log.tail(tail, { refId: msg.taskId });
                for (const entry of entries) {
                    send(conn, {
                        op: "log",
                        taskId: msg.taskId,
                        entry,
                    });
                }

                // 再推一次当前状态
                try {
                    const status = await fastify.core.task.status(msg.taskId);
                    send(conn, {
                        op: "status",
                        taskId: msg.taskId,
                        event: "snapshot",
                        payload: status,
                    });
                } catch {
                    /* ignore */
                }
                return;
            }

            if (msg.op === "unsub" && msg.topic === "task") {
                subs.get(connId)?.delete(msg.taskId);
                return;
            }
        });

        conn.socket.on("close", () => {
            conns.delete(connId);
            subs.delete(connId);
        });
    });
});
