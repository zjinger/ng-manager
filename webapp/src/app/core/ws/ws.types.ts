export type WsServerMsg =
    | { op: "hello"; connId: string; ts: number }
    | { op: "pong"; ts: number }
    | { op: "log"; taskId?: string; entry: any }
    | { op: "status"; taskId: string; event: string; payload: any }
    | { op: "error"; code: string; message: string; details?: any; ts: number };

export type WsClientMsg =
    | { op: "ping" }
    | { op: "sub"; topic: string;[k: string]: any }
    | { op: "unsub"; topic: string;[k: string]: any };
