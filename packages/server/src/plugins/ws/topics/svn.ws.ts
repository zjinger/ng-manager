import type { SvnEventMsg, SvnEventPayloadMap, SvnEventType, SvnRuntime, WsClientMsg, WsServerMsg } from "@yinuo-ngm/core";
import { WsContext } from "../ws.context";
import { TopicHandler } from "../ws.router";

const keyOf = (projectId: string) => `svn:${projectId}`;
export type SvnSyncWsDeps = {
    getSvnRuntimeByProjectId?: (projectId: string, tail?: number) => Promise<SvnRuntime[]>;
};
export function createSvnSyncTopicHandler(
    deps: SvnSyncWsDeps,
    getAllClients: () => Iterable<WsContext>
): TopicHandler & {
    pushEvent<K extends SvnEventType>(type: K, payload: SvnEventPayloadMap[K]): void;
} {
    return {
        topic: "svn",
        async sub(ctx, msg: Extract<WsClientMsg, { op: "sub"; topic: "svn" }>) {
            const projectId = String(msg?.projectId ?? "").trim();
            if (!projectId) {
                ctx.send({ op: "error", code: "PROJECT_ID_REQUIRED", message: "projectId is required", ts: Date.now() });
                return;
            }
            const t = Number(msg?.tail ?? 0) || 0;
            ctx.addSub("svn", keyOf(projectId));
            if (deps.getSvnRuntimeByProjectId) {
                const runtimes = await deps.getSvnRuntimeByProjectId(projectId, t);
                if (runtimes?.length) {
                    runtimes.forEach(runtime => {
                        const m: WsServerMsg = {
                            op: "svn.event",
                            type: "runtime",
                            payload: runtime,
                            ts: Date.now(),
                        };
                        ctx.send(m);
                    });
                }
            }
        },
        async unsub(ctx, msg: Extract<WsClientMsg, { op: "unsub"; topic: "svn" }>) {
            const projectId = String(msg?.projectId ?? "").trim();
            if (!projectId) {
                ctx.send({ op: "error", code: "PROJECT_ID_REQUIRED", message: "projectId is required", ts: Date.now() });
                return;
            }
            ctx.delSub("svn", keyOf(projectId));
        },

        pushEvent<K extends SvnEventType>(type: K, payload: SvnEventPayloadMap[K]) {
            const m: WsServerMsg = { op: "svn.event", type, payload, ts: Date.now() } as SvnEventMsg;
            for (const c of getAllClients()) if (c.hasSub("svn", keyOf(payload.projectId))) c.send(m);
        }
    }
}