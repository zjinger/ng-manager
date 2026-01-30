import type { WsClientMsg, WsServerMsg, LogLine } from "@ngm/core";
import { WsContext } from "../ws.context";
import type { TopicHandler } from "../ws.router";
const KEY_ALL = "syslog:all";
export type SyslogWsDeps = {
    getSyslogTail: (tail: number) => LogLine[];
};

export function createSyslogTopicHandler(
    deps: SyslogWsDeps,
    getAllClients: () => Iterable<WsContext>
): TopicHandler & { push(entry: LogLine): void } {
    return {
        topic: "syslog",
        async sub(ctx, msg: Extract<WsClientMsg, { op: "sub"; topic: "syslog" }>) {
            const tail = Math.max(0, Number(msg?.tail ?? 0));
            ctx.addSub("syslog", KEY_ALL);

            if (tail > 0) {
                const entries = await deps.getSyslogTail(tail);
                // 用一个 batch，前端更好处理
                const m: WsServerMsg = { op: "syslog.tail", entries: entries ?? [] };
                ctx.send(m);
            }
        },
        unsub(ctx) {
            ctx.delSub("syslog", KEY_ALL);
        },
        push(entry: LogLine) {
            const m: WsServerMsg = { op: "syslog.append", entry };
            for (const c of getAllClients()) {
                if (c.hasSub("syslog", KEY_ALL)) c.send(m);
            }
        },
    };
}