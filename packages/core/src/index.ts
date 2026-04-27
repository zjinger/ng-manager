// src/core/index.ts

export { createCoreApp, } from "./app/core-app";
export { type CoreApp } from "./app/types";
export type {
    NodeVersionInfo,
    ProjectNodeRequirement,
} from "./domain/node-version/node-version.service";

export { Events } from './infra/event'

export type { TaskRuntime } from "./domain/task/task.types";
export type { DashboardDocV1 } from './domain/dashboard'

export type { SpriteConfig, GenerateSpriteOptions } from "./domain/sprite";

export type { SvnRuntime } from "./domain/svn";

export type { ProjectAssets, ProjectAssetSourceSvn, Project } from "./domain/project";
