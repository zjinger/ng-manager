import type { WsConn } from "../ws.types";

export type TopicHandler = {
    validate?: (msg: any) =>
        | { ok: true }
        | { ok: false; code: string; message: string; details?: any };

    sub: (ctx: { connId: string; conn: WsConn }, msg: any) => Promise<void> | void;
    unsub: (ctx: { connId: string; conn: WsConn }, msg: any) => Promise<void> | void;
};
