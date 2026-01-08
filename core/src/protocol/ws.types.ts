export type WsTopic = "task"; // 未来扩展：| "git" | "proxy" | "terminal" | "ai"

export type WsServerMsg =
    | { op: "hello"; connId: string; ts: number }
    | { op: "pong"; ts: number }
    | { op: "log"; taskId: string; entry: any }
    | { op: "status"; taskId: string; event: string; payload: any }
    | { op: "error"; code: string; message: string; details?: any; ts: number; fatal?: boolean, connId?: string };

export type WsClientTopicPayload = {
    task: { taskId: string; tail?: number };
};

export type WsClientMsg =
    | { op: "ping" }
    | { [T in keyof WsClientTopicPayload]: { op: "sub"; topic: T } & WsClientTopicPayload[T] }[keyof WsClientTopicPayload]
    | { [T in keyof WsClientTopicPayload]: { op: "unsub"; topic: T } & WsClientTopicPayload[T] }[keyof WsClientTopicPayload];

export type WsConn = {
    socket: {
        readyState: number;
        send(data: string): void;
        on(event: "message", cb: (data: any) => void): void;
        on(event: "close", cb: () => void): void;
    };
};
