import type { WsClientMsg, WsServerMsg, TaskEventPayloadMap, TaskEventType } from "@core/protocol";
import { WsContext } from "../ws.context";
import type { TopicHandler } from "../ws.router";
import { LogLine, TaskRuntime } from "@core";

const keyOf = (runId: string) => `run:${runId}`;

export type TaskWsDeps = {
    getTaskSnapshot?: (runId: string) => Promise<TaskRuntime | null>;
    getTaskTailLogs?: (runId: string, tail: number) => Promise<LogLine[]>;
    resizeRun?: (runId: string, cols: number, rows: number) => void;
};

export function createTaskTopicHandler(
    deps: TaskWsDeps,
    getAllClients: () => Iterable<WsContext>
): TopicHandler & {
    pushOutput(runId: string, stream: "stdout" | "stderr", chunk: string): void;
    pushEvent<K extends TaskEventType>(runId: string, type: K, payload: TaskEventPayloadMap[K]): void;
} {
    return {
        topic: "task",
        async sub(ctx, msg: any) {
            const runId = String(msg?.runId ?? "").trim();
            const tail = Number(msg?.tail ?? 0);
            if (!runId) {
                ctx.send({ op: "error", code: "RUN_ID_REQUIRED", message: "runId is required", ts: Date.now() });
                return;
            }
            ctx.addSub("task", keyOf(runId));

            // snapshot
            if (deps.getTaskSnapshot) {
                const snap = await deps.getTaskSnapshot(runId);
                if (snap) {
                    const m: WsServerMsg = {
                        op: "task.event",
                        runId,
                        type: "snapshot",
                        payload: snap,
                        ts: Date.now(),
                    };
                    ctx.send(m);
                }
            }

            // tail logs
            if (deps.getTaskTailLogs && tail > 0) {
                const entries = await deps.getTaskTailLogs(runId, tail);
                for (const e of entries ?? []) {
                    const m: WsServerMsg = {
                        op: "task.output",
                        runId,
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
            const runId = (msg as any).runId as string;
            const cols = Number((msg as any).cols);
            const rows = Number((msg as any).rows);
            if (!runId || !Number.isFinite(cols) || !Number.isFinite(rows)) return;

            // 防御：最小值
            const c = Math.max(2, Math.floor(cols));
            const r = Math.max(1, Math.floor(rows));

            deps.resizeRun?.(runId, c, r);
        },
        unsub(ctx, msg: any) {
            const runId = String(msg?.runId ?? "").trim();
            if (!runId) return;
            ctx.delSub("task", keyOf(runId));
        },

        pushOutput(runId: string, stream: "stdout" | "stderr", chunk: string) {
            const m: WsServerMsg = { op: "task.output", runId, stream, chunk, ts: Date.now() };
            for (const c of getAllClients()) if (c.hasSub("task", keyOf(runId))) c.send(m);
        },

        pushEvent<K extends TaskEventType>(runId: string, type: K, payload: TaskEventPayloadMap[K]) {
            const m: WsServerMsg = { op: "task.event", runId, type, payload, ts: Date.now() } as WsServerMsg;
            for (const c of getAllClients()) if (c.hasSub("task", keyOf(runId))) c.send(m);
        },
    };
}
