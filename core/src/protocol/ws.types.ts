// 未来扩展：| "git" | "proxy" | "terminal" | "ai"

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
    | { op: "task.output"; runId: string; stream: "stdout" | "stderr"; chunk: string; ts: number }
    | TaskEventMsg
    | { op: "syslog.append"; entry: any }
    | { op: "error"; code: string; message: string; details?: any; ts: number; fatal?: boolean };


export type WsClientMsg =
    | { op: "ping" }
    | { op: "sub"; topic: "task"; runId: string; tail?: number }
    | { op: "unsub"; topic: "task"; runId: string }
    | { op: "resize"; topic: "task"; runId: string; cols: number; rows: number }
    | { op: "sub"; topic: "syslog"; tail?: number }
    | { op: "unsub"; topic: "syslog" };