// src/core/index.ts

export { createCoreApp, } from "./app/core-app";
export { type CoreApp } from "./app/types";
export type {
    NodeVersionInfo,
    ProjectNodeRequirement,
} from "@yinuo-ngm/node-version";

export { Events } from './infra/event'

export type { TaskRuntime } from "@yinuo-ngm/task";
export type { DashboardDocV1 } from './domain/dashboard'

export type { SpriteConfig, GenerateSpriteOptions } from "@yinuo-ngm/sprite";

export type { SvnRuntime } from "@yinuo-ngm/svn";

export { savePersistedNginxPath, clearPersistedNginxPath } from "./app/composers";
