import type { WsServerMsg } from "@core/protocol";
import { WsContext } from "../ws.context";
import type { TopicHandler } from "../ws.router";

const keyOf = (runId: string) => `run:${runId}`;

export type TaskWsDeps = {
    getRunTailLogs: (runId: string, tail: number) => Promise<any[]> | any[];
};

export function createTaskTopicHandler(
    deps: TaskWsDeps,
    getAllClients: () => Iterable<WsContext>
): TopicHandler & {
    pushOutput(runId: string, stream: "stdout" | "stderr", chunk: string): void;
    pushEvent(runId: string, type: (WsServerMsg & { op: "task.event" })["type"], payload: any): void;
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

            // snapshot：一期先不强依赖 core 查询，直接发一个占位（后续你要更强的 snapshot 再加 getRunSnapshot）
            const snap: WsServerMsg = { op: "task.event", runId, type: "snapshot", payload: {}, ts: Date.now() };
            ctx.send(snap);

            if (tail > 0) {
                const entries = await deps.getRunTailLogs(runId, tail);
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

        unsub(ctx, msg: any) {
            const runId = String(msg?.runId ?? "").trim();
            if (!runId) return;
            ctx.delSub("task", keyOf(runId));
        },

        pushOutput(runId, stream, chunk) {
            const m: WsServerMsg = { op: "task.output", runId, stream, chunk, ts: Date.now() };
            for (const c of getAllClients()) if (c.hasSub("task", keyOf(runId))) c.send(m);
        },

        pushEvent(runId, type, payload) {
            const m: WsServerMsg = { op: "task.event", runId, type, payload, ts: Date.now() };
            for (const c of getAllClients()) if (c.hasSub("task", keyOf(runId))) c.send(m);
        },
    };
}
