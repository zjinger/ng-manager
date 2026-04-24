import { ApiError, ApiErrorCodes } from "@yinuo-ngm/errors";
import type { ApiScope } from "../../../domain/models/types";
import type { ApiCollectionEntity } from "../../../domain/models/api-collection";
import type { CollectionRepo } from "../../../domain/services/collection-repo";
import { JsonFileKvRepo } from "@yinuo-ngm/storage";
import path from "path";

export interface JsonCollectionRepoOptions {
    /**
    * api 数据根目录，例如：
    * <appData>/api
    */
    rootDir: string;

    /**
     * kv 文件名（可选）
     * 默认：collections.kv.json
     */
    fileName?: string;
}

/**
 * CollectionRepo 的 JSON(KV) 实现：
 * - 单文件：{version:1, items:{[id]: ApiCollectionEntity}}
 * - 进程内串行：FileLock（由 JsonFileKvRepo 内部实现）
 * - 原子写：atomicWrite（由 JsonFileKvRepo 内部实现）
 *
 * 路径约定：
 * - global:  <rootDir>/global/collections.kv.json
 * - project: <rootDir>/projects/<projectId>/collections.kv.json
 */
export class JsonCollectionRepo implements CollectionRepo {
    private readonly rootDir: string;
    private readonly fileName: string;

    constructor(opts: JsonCollectionRepoOptions) {
        this.rootDir = opts.rootDir;
        this.fileName = opts.fileName ?? "collections.kv.json";
    }

    async get(id: string, scope: ApiScope, projectId?: string) {
        return this.kv(scope, projectId).get(id);
    }

    async list(scope: ApiScope, projectId?: string) {
        return this.kv(scope, projectId).list();
    }

    async save(entity: ApiCollectionEntity, scope: ApiScope, projectId?: string) {
        await this.kv(scope, projectId).set(entity.id, entity);
    }

    async delete(id: string, scope: ApiScope, projectId?: string) {
        await this.kv(scope, projectId).delete(id);
    }


    // ---------------- private ----------------

    private kv(scope: ApiScope, projectId?: string) {
        const file = this.filePath(scope, projectId);
        return new JsonFileKvRepo<ApiCollectionEntity>(file);
    }

    private filePath(scope: ApiScope, projectId?: string) {
        if (scope === "global") {
            return path.join(this.rootDir, "global", this.fileName);
        }
        if (!projectId) {
            throw new ApiError(ApiErrorCodes.API_PROJECT_ID_REQUIRED, "projectId is required when scope=project");
        }
        return path.join(this.rootDir, "projects", projectId, this.fileName);
    }
}
