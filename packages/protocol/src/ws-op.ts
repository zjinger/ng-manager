export const WsOp = {
    // Server → Client
    HELLO: "hello",
    PONG: "pong",

    TASK_OUTPUT: "task.output",
    TASK_EVENT: "task.event",

    SVN_EVENT: "svn.event",

    SYSLOG_APPEND: "syslog.append",
    SYSLOG_TAIL: "syslog.tail",

    NGINX_LOG_TAIL: "nginx.log.tail",
    NGINX_LOG_APPEND: "nginx.log.append",

    ERROR: "error",

    // Client → Server
    PING: "ping",
    SUB: "sub",
    UNSUB: "unsub",
    RESIZE: "resize",
} as const;

export type WsOp = (typeof WsOp)[keyof typeof WsOp];