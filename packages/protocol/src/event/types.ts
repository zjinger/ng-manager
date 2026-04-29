import type { BootstrapEventMap } from "./bootstrap-events";
import type { NginxEventMap } from "./nginx-events";
import type { ProjectEventMap } from "./project-events";
import type { SvnEventMap } from "./svn-events";
import type { SystemLogEventMap } from "./system-events";
import type { TaskEventMap } from "./task-events";

export interface CoreOwnEventMap extends ProjectEventMap, SystemLogEventMap {}

export type CoreEventMap =
    & CoreOwnEventMap
    & TaskEventMap
    & SvnEventMap
    & BootstrapEventMap
    & NginxEventMap;
