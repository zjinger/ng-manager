export type TaskSub = { taskId: string; tail?: number };

export type WsClientTopicPayload = {
    task: TaskSub;
    // git: { repoId: string; ... }
    // terminal: { sessionId: string; ... }
};
export type WsTopic = keyof WsClientTopicPayload;

export type WsClientMsg =
    | { op: "ping" }
    | { [T in WsTopic]: { op: "sub"; topic: T } & WsClientTopicPayload[T] }[WsTopic]
    | { [T in WsTopic]: { op: "unsub"; topic: T } & WsClientTopicPayload[T] }[WsTopic];

export type WsServerMsg =
    | { op: "hello"; connId: string; ts: number }
    | { op: "pong"; ts: number }
    | { op: "log"; taskId?: string; entry: any }
    | { op: "status"; taskId: string; event: string; payload: any }
    | { op: "error"; code: string; message: string; details?: any; ts: number };



