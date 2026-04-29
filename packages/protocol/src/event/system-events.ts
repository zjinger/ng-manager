import type { SystemLogEntry } from "../ws.log.types";

export const SystemEvents = {
    SYSLOG_APPENDED: "syslog.appended",
} as const;

export type SystemLogEventMap = {
    [SystemEvents.SYSLOG_APPENDED]: { entry: SystemLogEntry };
};
