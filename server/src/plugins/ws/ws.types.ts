
export type WsConn = {
    socket: {
        readyState: number;
        send(data: string): void;
        on(event: "message", cb: (data: any) => void): void;
        on(event: "close", cb: () => void): void;
    };
};

/**
 * WS 客户端消息
 */
export type WsClientMsg =
    | { op: "ping" }
    | { op: "sub"; topic: string;[k: string]: any }
    | { op: "unsub"; topic: string;[k: string]: any };

/**
 * WS 服务器消息
 */
export type WsServerMsg =
    | { op: "hello"; connId: string; ts: number }
    | { op: "pong"; ts: number }
    | { op: "log"; taskId?: string; entry: any }
    | { op: "status"; taskId: string; event: string; payload: any }
    | { op: "error"; code: string; message: string; details?: any; ts: number; connId?: string };
