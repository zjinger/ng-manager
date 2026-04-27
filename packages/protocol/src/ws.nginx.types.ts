export type NginxLogType = "error" | "access";

export interface NginxLogTailMsg {
    op: "nginx.log.tail";
    logType: NginxLogType;
    lines: string[];
    ts: number;
}

export interface NginxLogAppendMsg {
    op: "nginx.log.append";
    logType: NginxLogType;
    line: string;
    ts: number;
}

export interface NginxSubMsg {
    op: "sub";
    topic: "nginx";
    logType: NginxLogType;
    tail?: number;
}

export interface NginxUnsubMsg {
    op: "unsub";
    topic: "nginx";
    logType: NginxLogType;
}
