import { WsOp } from "./ws-op";

export type NginxLogType = "error" | "access";

export interface NginxLogTailMsg {
    op: typeof WsOp.NGINX_LOG_TAIL;
    logType: NginxLogType;
    lines: string[];
    ts: number;
}

export interface NginxLogAppendMsg {
    op: typeof WsOp.NGINX_LOG_APPEND;
    logType: NginxLogType;
    line: string;
    ts: number;
}

export interface NginxSubMsg {
    op: typeof WsOp.SUB;
    topic: "nginx";
    logType: NginxLogType;
    tail?: number;
}

export interface NginxUnsubMsg {
    op: typeof WsOp.UNSUB;
    topic: "nginx";
    logType?: NginxLogType;
}