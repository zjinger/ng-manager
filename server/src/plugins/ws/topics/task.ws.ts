import type { WsClientMsg, WsServerMsg, TaskEventPayloadMap, TaskEventType, TaskOutputPayload, TaskOutputMsg, TaskEventMsg } from "@core/protocol";
import { WsContext } from "../ws.context";
import type { TopicHandler } from "../ws.router";
import { LogLine, TaskRuntime } from "@core";

const keyOfTask = (taskId: string) => `task:${taskId}`;

export type TaskWsDeps = {
    getTaskSnapshotByTaskId?: (taskId: string) => Promise<TaskRuntime | null>;
    getTaskTailLogsByRun?: (runId: string, tail: number) => Promise<LogLine[]>;
    resizeRun?: (taskId: string, cols: number, rows: number) => void;
};

export function createTaskTopicHandler(
    deps: TaskWsDeps,
    getAllClients: () => Iterable<WsContext>
): TopicHandler & {
    pushOutput(payload: TaskOutputPayload): void;
    pushEvent<K extends TaskEventType>(type: K, payload: TaskEventPayloadMap[K]): void;
} {
    return {
        topic: "task",
        async sub(ctx, msg: Extract<WsClientMsg, { op: "sub"; topic: "task" }>) {
            const taskId = String(msg?.taskId ?? "").trim();
            const tail = Number(msg?.tail ?? 0);

            if (!taskId) {
                ctx.send({ op: "error", code: "TASK_ID_REQUIRED", message: "taskId is required", ts: Date.now() });
                return;
            }
            ctx.addSub("task", keyOfTask(taskId));

            // snapshot：按 taskId
            let snap: TaskRuntime | undefined
            if (deps.getTaskSnapshotByTaskId) {
                snap = await deps.getTaskSnapshotByTaskId(taskId) ?? undefined;
                if (snap) {
                    const m: WsServerMsg = {
                        op: "task.event",
                        type: "snapshot",
                        payload: snap,
                        ts: Date.now(),
                    };
                    ctx.send(m);
                }
            }

            // tail logs : 按 runId 去拉
            if (snap?.runId && deps.getTaskTailLogsByRun && tail > 0) {
                const entries = await deps.getTaskTailLogsByRun(snap.runId, tail);
                for (const e of entries ?? []) {
                    const m: TaskOutputMsg = {
                        op: "task.output",
                        payload: {
                            taskId: taskId,
                            runId: snap.runId,
                            stream: (e?.level === "warn" || e?.level === "error") ? "stderr" : "stdout",
                            text: String(e?.text ?? ""),
                        },
                        ts: e?.ts ?? Date.now(),
                    };
                    ctx.send(m);
                }
            }
        },
        // resize
        resize(ctx, msg: Extract<WsClientMsg, { op: "resize" }>) {
            const taskId = (msg as any).taskId as string;
            const cols = Number((msg as any).cols);
            const rows = Number((msg as any).rows);
            if (!taskId || !Number.isFinite(cols) || !Number.isFinite(rows)) return;

            // 最小值
            const c = Math.max(2, Math.floor(cols));
            const r = Math.max(1, Math.floor(rows));

            deps.resizeRun?.(taskId, c, r);
        },

        unsub(ctx, msg: Extract<WsClientMsg, { op: "unsub"; topic: "task" }>) {
            const taskId = String(msg?.taskId ?? "").trim();
            if (!taskId) return;
            ctx.delSub("task", keyOfTask(taskId));
        },

        pushOutput(payload: TaskOutputPayload) {
            const m: TaskOutputMsg = { op: "task.output", payload, ts: Date.now() };
            for (const c of getAllClients()) if (c.hasSub("task", keyOfTask(payload.taskId))) c.send(m);
        },

        pushEvent<K extends TaskEventType>(type: K, payload: TaskEventPayloadMap[K]) {
            const m: WsServerMsg = { op: "task.event", type, payload, ts: Date.now() } as TaskEventMsg;
            for (const c of getAllClients()) if (c.hasSub("task", keyOfTask(payload.taskId))) c.send(m);

        },
    };
}
