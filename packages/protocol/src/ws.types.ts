import type { ErrorCode } from "@yinuo-ngm/errors";
import type { LogLine } from "./ws.log.types";
import type { NginxLogAppendMsg, NginxLogTailMsg, NginxSubMsg, NginxUnsubMsg } from "./ws.nginx.types";
import type { SvnEventMsg } from "./ws.svn.types";
import type { TaskEventMsg, TaskOutputMsg } from "./ws.task.types";

export type WsTopic = "task" | "syslog" | "svn" | "nginx";

export type WsState = "idle" | "connecting" | "open" | "closed" | "error";

export type WsConn = {
    socket: {
        readyState: number;
        send(data: string): void;
        on(event: "message", cb: (data: any) => void): void;
        on(event: "close", cb: () => void): void;
    };
};

export type WsServerMsg =
    | { op: "hello"; connId: string; ts: number }
    | { op: "pong"; ts: number }
    | TaskOutputMsg
    | TaskEventMsg
    | SvnEventMsg
    | { op: "syslog.append"; entry: LogLine }
    | { op: "syslog.tail"; entries: LogLine[] }
    | NginxLogTailMsg
    | NginxLogAppendMsg
    | { op: "error"; code: ErrorCode; message: string; details?: any; ts: number; fatal?: boolean };

export type WsClientMsg =
    | { op: "ping" }
    | { op: "sub"; topic: "task"; taskId: string; tail?: number }
    | { op: "unsub"; topic: "task"; taskId: string }
    | { op: "resize"; topic: "task"; taskId: string; cols: number; rows: number }
    | { op: "sub"; topic: "syslog"; tail?: number }
    | { op: "unsub"; topic: "syslog" }
    | { op: "sub"; topic: "svn"; projectId: string; tail?: number }
    | { op: "unsub"; topic: "svn"; projectId: string }
    | NginxSubMsg
    | NginxUnsubMsg;
