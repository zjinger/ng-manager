import type { WsServerMsg } from "@core/protocol/ws.types";
import { WsContext } from "../ws.context";
import type { TopicHandler } from "../ws.router";

function keyOf(taskId: string) {
    return `task:${taskId}`;
}

export type TaskWsDeps = {
    // 由 core/task service 提供的能力
    getTaskSnapshot?: (taskId: string) => Promise<any> | any; // 返回 { status, pid, startedAt... }
    getTaskTailLogs?: (taskId: string, tail: number) => Promise<any[]> | any[]; // 返回 entry[]
};

export function createTaskTopicHandler(
    deps: TaskWsDeps,
    getAllClients: () => Iterable<WsContext>
): TopicHandler & {
    pushTaskLog(taskId: string, entry: any): void;
    pushTaskStatus(taskId: string, event: string, payload: any): void;
} {
    return {
        topic: "task",
        async sub(ctx, msg) {
            // msg: { op:"sub", topic:"task", taskId, tail? }
            const taskId = (msg as any).taskId as string;
            const tail = Number((msg as any).tail ?? 0);
            if (!taskId) {
                ctx.send({ op: "error", code: "TASK_ID_REQUIRED", message: "taskId is required", ts: Date.now() });
                return;
            }

            ctx.addSub("task", keyOf(taskId));

            // 1) snapshot（可选）
            if (deps.getTaskSnapshot) {
                const snap = await deps.getTaskSnapshot(taskId);
                if (snap) {
                    const m: WsServerMsg = { op: "status", taskId, event: "snapshot", payload: snap };
                    ctx.send(m);
                }
            }

            // 2) tail logs（可选）
            if (deps.getTaskTailLogs && tail > 0) {
                const entries = await deps.getTaskTailLogs(taskId, tail);
                for (const entry of entries ?? []) {
                    const m: WsServerMsg = { op: "log", taskId, entry };
                    ctx.send(m);
                }
            }
        },

        unsub(ctx, msg) {
            const taskId = (msg as any).taskId as string;
            if (!taskId) return;
            ctx.delSub("task", keyOf(taskId));
        },

        pushTaskLog(taskId: string, entry: any) {
            const m: WsServerMsg = { op: "log", taskId, entry };
            for (const c of getAllClients()) {
                if (c.hasSub("task", keyOf(taskId))) c.send(m);
            }
        },

        pushTaskStatus(taskId: string, event: string, payload: any) {
            const m: WsServerMsg = { op: "status", taskId, event, payload };
            for (const c of getAllClients()) {
                if (c.hasSub("task", keyOf(taskId))) c.send(m);
            }
        },
    };
}
