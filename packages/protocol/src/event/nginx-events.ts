import type { NginxLogAppendMsg } from "../ws.nginx.types";

export const NginxEvents = {
    LOG_APPENDED: "nginx.log.appended",
} as const;

export type NginxLogAppendedPayload = Pick<NginxLogAppendMsg, "logType" | "line" | "ts">;

export type NginxEventMap = {
    [NginxEvents.LOG_APPENDED]: NginxLogAppendedPayload;
};
