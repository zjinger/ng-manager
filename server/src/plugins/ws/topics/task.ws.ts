import type { WsClientMsg, WsServerMsg, TaskEventPayloadMap, TaskEventType } from "@core/protocol";
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
    pushOutput(taskId: string, runId: string, stream: "stdout" | "stderr", chunk: string): void;
    pushEvent<K extends TaskEventType>(taskId: string, runId: string, type: K, payload: TaskEventPayloadMap[K]): void;
} {
    return {
        topic: "task",
        async sub(ctx, msg: Extract<WsClientMsg, { op: "sub"; topic: "task" }>) {
            console.log("task.sub", msg);
            const taskId = String(msg?.taskId ?? "").trim();
            const tail = Number(msg?.tail ?? 0);

            if (!taskId) {
                ctx.send({ op: "error", code: "TASK_ID_REQUIRED", message: "runId is required", ts: Date.now() });
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
                        taskId,
                        runId: snap.runId,
                        type: "snapshot",
                        payload: snap,
                        ts: Date.now(),
                    };
                    ctx.send(m);
                }
            }

            // tail logs : 按 runId 去拉（因为 log 是按 runId 存的）
            if (snap?.runId && deps.getTaskTailLogsByRun && tail > 0) {
                // if (deps.getTaskTailLogs && tail > 0) {
                const entries = await deps.getTaskTailLogsByRun(snap.runId, tail);
                for (const e of entries ?? []) {
                    const m: WsServerMsg = {
                        op: "task.output",
                        taskId,
                        runId: snap.runId,
                        stream: (e?.level === "warn" ? "stderr" : "stdout"),
                        chunk: String(e?.text ?? ""),
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

            // 防御：最小值
            const c = Math.max(2, Math.floor(cols));
            const r = Math.max(1, Math.floor(rows));

            deps.resizeRun?.(taskId, c, r);
        },

        unsub(ctx, msg: Extract<WsClientMsg, { op: "unsub"; topic: "task" }>) {
            const taskId = String(msg?.taskId ?? "").trim();
            if (!taskId) return;
            ctx.delSub("task", keyOfTask(taskId));
        },

        pushOutput(taskId: string, runId: string, stream: "stdout" | "stderr", chunk: string) {
            const m: WsServerMsg = { op: "task.output", taskId, runId, stream, chunk, ts: Date.now() };
            for (const c of getAllClients()) if (c.hasSub("task", keyOfTask(taskId))) c.send(m);
        },

        pushEvent<K extends TaskEventType>(taskId: string, runId: string, type: K, payload: TaskEventPayloadMap[K]) {
            const m: WsServerMsg = { op: "task.event", taskId, runId, type, payload, ts: Date.now() } as WsServerMsg;
            for (const c of getAllClients()) if (c.hasSub("task", keyOfTask(taskId))) c.send(m);
        },
    };
}
