import { JsonFileKvRepo } from "@yinuo-ngm/storage";
import * as path from "node:path";
import { ApiCollectionScope, ApiEnvironmentEntity } from "../../../domain/models";
import type { EnvRepo } from "../../../domain/services";

export interface JsonEnvRepoOptions {
    rootDir: string;      // <data>/api
    fileName?: string;    // default: envs.kv.json
}

/**
 * EnvRepo 的 JSON(KV) 实现（单文件 items Map）
 *
 * 路径约定：
 * - global:  <rootDir>/global/envs.kv.json
 * - project: <rootDir>/projects/<projectId>/envs.kv.json
 */
export class JsonEnvRepo implements EnvRepo {
    private readonly rootDir: string;
    private readonly fileName: string;

    constructor(opts: JsonEnvRepoOptions) {
        this.rootDir = opts.rootDir;
        this.fileName = opts.fileName ?? "envs.kv.json";
    }

    list(scope: ApiCollectionScope, projectId?: string): Promise<ApiEnvironmentEntity[]> {
        return this.kv(scope, projectId).list();
    }

    get(id: string, scope: ApiCollectionScope, projectId?: string): Promise<ApiEnvironmentEntity | null> {
        return this.kv(scope, projectId).get(id);
    }

    async save(env: ApiEnvironmentEntity, scope: ApiCollectionScope, projectId?: string): Promise<void> {
        if (!env?.id) throw new Error("env.id is required");
        const repo = this.kv(scope, projectId);
        await repo.set(env.id, env);
    }

    remove(id: string, scope: ApiCollectionScope, projectId?: string): Promise<void> {
        return this.kv(scope, projectId).delete(id);
    }

    private kv(scope: ApiCollectionScope, projectId?: string) {
        const file = this.filePath(scope, projectId);
        return new JsonFileKvRepo<ApiEnvironmentEntity>(file);
    }

    private filePath(scope: ApiCollectionScope, projectId?: string) {
        if (scope === "global") return path.join(this.rootDir, "global", this.fileName);
        if (!projectId) throw new Error("projectId is required when scope=project");
        return path.join(this.rootDir, "projects", projectId, this.fileName);
    }
}
