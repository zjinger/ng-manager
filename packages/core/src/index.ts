// src/core/index.ts

export { createCoreApp, } from "./app/core-app";
export { type CoreApp } from "./app/types";

export { type ErrorCode, AppError } from "./common/errors";

export type { LogLine } from "./infra/log";

export { Events } from './infra/event'

export type { TaskRuntime } from "./domain/task/task.types";
export type { DashboardDocV1 } from './domain/dashboard'

export type { SpriteConfig, GenerateSpriteOptions } from "./domain/sprite";

export type { SvnRuntime } from "./domain/svn";

export type { ProjectAssets, ProjectAssetSourceSvn, Project } from "./domain/project";

export type {
    WsTopic,
    WsState,
    WsConn,
    WsServerMsg,
    WsClientMsg,
    TaskEventPayloadMap, TaskEventType, TaskOutputPayload, TaskOutputMsg, TaskEventMsg,
    TaskStartedPayload, TaskStopRequestedPayload,
    SvnEventType, SvnTaskStatus, SvnSyncOutputPayload, SvnSyncDonePayload, SvnSyncProgressPayload, SvnSyncStartedPayload, SvnSyncFailedPayload, SvnEventPayloadMap, SvnEventMsg
} from "./protocol"