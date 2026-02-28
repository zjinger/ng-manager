import { LogLine } from "@models/log.model";
import { TaskEventMsg, TaskOutputMsg } from "./ws.task.types";
import { SvnEventMsg } from "./ws.svn.types";

export type WsTopic = "task" | "syslog" | "svn";

export type WsState = "idle" | "connecting" | "open" | "closed" | "error";

export type WsServerMsg =
    | { op: "hello"; connId: string; ts: number }
    | { op: "pong"; ts: number }
    | TaskOutputMsg
    | TaskEventMsg
    | SvnEventMsg
    | { op: "syslog.append"; entry: LogLine }
    | { op: "syslog.tail"; entries: LogLine[] }
    | { op: "error"; code: string; message: string; details?: any; ts: number; fatal?: boolean };


export type WsClientMsg =
    | { op: "ping" }
    | { op: "sub"; topic: "task"; taskId: string; tail?: number }
    | { op: "unsub"; topic: "task"; taskId: string }
    | { op: "resize"; topic: "task"; taskId: string; cols: number; rows: number }
    | { op: "sub"; topic: "syslog"; tail?: number }
    | { op: "unsub"; topic: "syslog" }
    | { op: "sub"; topic: "svn"; projectId: string; }
    | { op: "unsub"; topic: "svn"; projectId: string; };


