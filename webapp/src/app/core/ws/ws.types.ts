export type WsTopic = "task" | "syslog";

export type WsServerMsg =
    | { op: "hello"; connId: string; ts: number }
    | { op: "pong"; ts: number }
    | { op: "task.output"; runId: string; stream: "stdout" | "stderr"; chunk: string; ts: number }
    | { op: "task.event"; runId: string; type: "snapshot" | "started" | "stopRequested" | "exited" | "failed"; payload: any; ts: number }
    | { op: "syslog.append"; entry: any }
    | { op: "error"; code: string; message: string; details?: any; ts: number; fatal?: boolean };

export type WsClientMsg =
    | { op: "ping" }
    | { op: "sub"; topic: "task"; runId: string; tail?: number }
    | { op: "resize"; topic: "task"; runId: string; cols: number; rows: number }
    | { op: "unsub"; topic: "task"; runId: string }
    | { op: "sub"; topic: "syslog"; tail?: number }
    | { op: "unsub"; topic: "syslog" };


export type WsState = "idle" | "connecting" | "open" | "closed" | "error";

