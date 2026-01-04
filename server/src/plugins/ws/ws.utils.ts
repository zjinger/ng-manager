import { AppError } from "@core";
import type { WsConn, WsServerMsg } from "./ws.types";

export function send(conn: WsConn, msg: WsServerMsg) {
    if (conn.socket.readyState === 1) {
        conn.socket.send(JSON.stringify(msg));
    }
}
//  防止广播链路被某个连接拖死
export function safeSend(conn: WsConn, msg: WsServerMsg) {
    try {
        send(conn, msg);
    } catch {
        /* ignore */
    }
}

export function wsError(
    conn: WsConn,
    code: string,
    message: string,
    details?: any,
    connId?: string
) {
    safeSend(conn, { op: "error", code, message, details, ts: Date.now(), connId });
}

export function mapWsError(e: any) {
    if (e instanceof AppError || isCoreAppError(e)) {
        return { code: e.code, message: e.message, details: e.meta };
    }
    return { code: "INTERNAL_ERROR", message: e?.message || "Unknown error" };
}


function isCoreAppError(err: any): err is { code: string; message: string; meta?: any } {
    return err && typeof err === "object" && typeof err.code === "string" && typeof err.message === "string";
}



