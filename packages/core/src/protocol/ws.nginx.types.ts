/**
 * Nginx WebSocket 消息类型
 */

export type NginxLogType = "error" | "access";

/** 服务端推送：日志尾部（订阅时返回历史） */
export interface NginxLogTailMsg {
    op: "nginx.log.tail";
    logType: NginxLogType;
    lines: string[];
    ts: number;
}

/** 服务端推送：新增日志行 */
export interface NginxLogAppendMsg {
    op: "nginx.log.append";
    logType: NginxLogType;
    line: string;
    ts: number;
}

/** 客户端消息：订阅 nginx 日志 */
export interface NginxSubMsg {
    op: "sub";
    topic: "nginx";
    logType: NginxLogType;
    tail?: number;
}

/** 客户端消息：取消订阅 nginx 日志 */
export interface NginxUnsubMsg {
    op: "unsub";
    topic: "nginx";
    logType: NginxLogType;
}
