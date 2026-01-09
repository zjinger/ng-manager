import type { WsServerMsg } from "@core/protocol";
import { WsContext } from "../ws.context";
import type { TopicHandler } from "../ws.router";
import { LogLine } from "@core";
const KEY = "syslog:all";
export type SyslogWsDeps = {
    getSyslogTail: (tail: number) => Promise<LogLine[]>;
};
export function createSyslogTopicHandler(
    deps: SyslogWsDeps,
    getAllClients: () => Iterable<WsContext>
): TopicHandler & { push(entry: LogLine): void } {
    return {
        topic: "syslog",
        async sub(ctx, msg: any) {
            const tail = Number(msg?.tail ?? 0);
            ctx.addSub("syslog", KEY);

            if (tail > 0) {
                const entries = await deps.getSyslogTail(tail);
                for (const entry of entries ?? []) {
                    const m: WsServerMsg = { op: "syslog.append", entry };
                    ctx.send(m);
                }
            }
        },
        unsub(ctx) {
            ctx.delSub("syslog", KEY);
        },
        push(entry: any) {
            const m: WsServerMsg = { op: "syslog.append", entry };
            for (const c of getAllClients()) if (c.hasSub("syslog", KEY)) c.send(m);
        },
    };
}