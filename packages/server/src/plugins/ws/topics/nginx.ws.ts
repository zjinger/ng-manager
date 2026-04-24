import { GlobalErrorCodes, type WsClientMsg, type WsServerMsg, NginxLogType } from "@yinuo-ngm/core";
import type { NginxLogEntry, NginxLogService } from "@yinuo-ngm/nginx";
import { WsContext } from "../ws.context";
import type { TopicHandler } from "../ws.router";

export type NginxWsDeps = {
    logService: NginxLogService;
};

export function createNginxTopicHandler(
    deps: NginxWsDeps,
    getAllClients: () => Iterable<WsContext>
): TopicHandler {
    const { logService } = deps;

    // 监听日志事件并广播
    const onLog = (entry: NginxLogEntry) => {
        const msg: WsServerMsg = {
            op: "nginx.log.append",
            logType: entry.type,
            line: entry.line,
            ts: entry.timestamp
        };
        for (const client of getAllClients()) {
            if (client.hasSub("nginx", `nginx:${entry.type}`)) {
                client.send(msg);
            }
        }
    };

    logService.on("log", onLog);

    return {
        topic: "nginx",

        async sub(ctx, msg: Extract<WsClientMsg, { op: "sub"; topic: "nginx" }>) {
            const logType = (msg as any).logType as NginxLogType;
            if (!logType || (logType !== "error" && logType !== "access")) {
                ctx.send({
                    op: "error",
                    code: GlobalErrorCodes.BAD_MSG,
                    message: "logType must be 'error' or 'access'",
                    ts: Date.now()
                });
                return;
            }

            const subKey = `nginx:${logType}`;
            ctx.addSub("nginx", subKey);

            // 开始监听
            logService.startWatching(logType);

            // 发送历史日志
            const tail = Math.max(0, Number((msg as any).tail ?? 0));
            if (tail > 0) {
                const lines = await logService.readLogTail(logType, tail);
                const response: WsServerMsg = {
                    op: "nginx.log.tail",
                    logType,
                    lines,
                    ts: Date.now()
                };
                ctx.send(response);
            }
        },

        unsub(ctx, msg: Extract<WsClientMsg, { op: "unsub"; topic: "nginx" }>) {
            const logType = (msg as any).logType as NginxLogType;
            if (logType) {
                ctx.delSub("nginx", `nginx:${logType}`);
            } else {
                ctx.delSub("nginx", "nginx:error");
                ctx.delSub("nginx", "nginx:access");
            }
        }
    };
}
