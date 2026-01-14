// 未来扩展：| "git" | "proxy" | "terminal" | "ai"

import { ErrorCode } from "../common/errors";
import { LogLine } from "../infra/log/types";
import { TaskEventMsg } from "./ws.task.types";

export type WsTopic = "task" | "syslog";

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
    | { op: "task.output"; taskId: string; runId: string; stream: "stdout" | "stderr"; chunk: string; ts: number }
    | TaskEventMsg
    | { op: "syslog.append"; entry: LogLine }
    | { op: "syslog.tail"; entries: LogLine[] }
    | { op: "error"; code: ErrorCode; message: string; details?: any; ts: number; fatal?: boolean };


export type WsClientMsg =
    | { op: "ping" }
    | { op: "sub"; topic: "task"; taskId: string; tail?: number }
    | { op: "unsub"; topic: "task"; taskId: string }
    | { op: "resize"; topic: "task"; taskId: string; cols: number; rows: number }
    | { op: "sub"; topic: "syslog"; tail?: number }
    | { op: "unsub"; topic: "syslog" };