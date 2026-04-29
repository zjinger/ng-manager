import type { ErrorCode } from "@yinuo-ngm/errors";
import type { LogLine } from "./ws.log.types";
import type { NginxLogAppendMsg, NginxLogTailMsg, NginxSubMsg, NginxUnsubMsg } from "./ws.nginx.types";
import type { SvnEventMsg } from "./ws.svn.types";
import type { TaskEventMsg, TaskOutputMsg } from "./ws.task.types";
import { WsOp } from "./ws-op";

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
    (
        | { op: typeof WsOp.HELLO; connId: string; ts: number }
        | { op: typeof WsOp.PONG; ts: number }
        | TaskOutputMsg
        | TaskEventMsg
        | SvnEventMsg
        | { op: typeof WsOp.SYSLOG_APPEND; entry: LogLine }
        | { op: typeof WsOp.SYSLOG_TAIL; entries: LogLine[] }
        | NginxLogTailMsg
        | NginxLogAppendMsg
        | { op: typeof WsOp.ERROR; code: ErrorCode; message: string; details?: any; ts: number; fatal?: boolean }
    ) & { version?: string };

export type WsClientMsg =
    | { op: typeof WsOp.PING }
    | { op: typeof WsOp.SUB; topic: "task"; taskId: string; tail?: number }
    | { op: typeof WsOp.UNSUB; topic: "task"; taskId: string }
    | { op: typeof WsOp.RESIZE; topic: "task"; taskId: string; cols: number; rows: number }
    | { op: typeof WsOp.SUB; topic: "syslog"; tail?: number }
    | { op: typeof WsOp.UNSUB; topic: "syslog" }
    | { op: typeof WsOp.SUB; topic: "svn"; projectId: string; tail?: number }
    | { op: typeof WsOp.UNSUB; topic: "svn"; projectId: string }
    | NginxSubMsg
    | NginxUnsubMsg;