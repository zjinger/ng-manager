import { LogLine } from "@models/log.model";
import { TaskEventMsg } from "./ws.task.types";

export type WsTopic = "task" | "syslog";

export type WsState = "idle" | "connecting" | "open" | "closed" | "error";

export type WsServerMsg =
    | { op: "hello"; connId: string; ts: number }
    | { op: "pong"; ts: number }
    | { op: "task.output"; taskId: string; runId: string; stream: "stdout" | "stderr"; chunk: string; ts: number }
    | TaskEventMsg
    | { op: "syslog.append"; entry: LogLine }
    | { op: "syslog.tail"; entries: LogLine[] }
    | { op: "error"; code: string; message: string; details?: any; ts: number; fatal?: boolean };


export type WsClientMsg =
    | { op: "ping" }
    | { op: "sub"; topic: "task"; taskId: string; tail?: number }
    | { op: "unsub"; topic: "task"; taskId: string }
    | { op: "resize"; topic: "task"; taskId: string; cols: number; rows: number }
    | { op: "sub"; topic: "syslog"; tail?: number }
    | { op: "unsub"; topic: "syslog" };
