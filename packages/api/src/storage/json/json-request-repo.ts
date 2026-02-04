// packages/api-client/src/infra/storage/json/json-request-repo.ts
import * as path from "node:path";
import type { ApiRequestEntity } from "../../domain/models/api-request";
import type { RequestRepo } from "../../domain/services/request-repo";
import { JsonFileKvRepo } from "@yinuo-ngm/storage";

export interface JsonRequestRepoOptions {
    /**
     * api 数据根目录，例如：
     * <appData>/api
     */
    rootDir: string;

    /**
     * kv 文件名（可选）
     * 默认：requests.kv.json
     */
    fileName?: string;
}

/**
 * RequestRepo 的 JSON(KV) 实现：
 * - 单文件：{version:1, items:{[id]: ApiRequestEntity}}
 * - 进程内串行：FileLock（由 JsonFileKvRepo 内部实现）
 * - 原子写：atomicWrite（由 JsonFileKvRepo 内部实现）
 *
 * 路径约定：
 * - global:  <rootDir>/global/requests.kv.json
 * - project: <rootDir>/projects/<projectId>/requests.kv.json
 */
export class JsonRequestRepo implements RequestRepo {
    private readonly rootDir: string;
    private readonly fileName: string;

    constructor(opts: JsonRequestRepoOptions) {
        this.rootDir = opts.rootDir;
        this.fileName = opts.fileName ?? "requests.kv.json";
    }

    async list(scope: "global" | "project", projectId?: string): Promise<ApiRequestEntity[]> {
        const repo = this.kv(scope, projectId);
        return repo.list();
    }

    async get(id: string, scope: "global" | "project", projectId?: string): Promise<ApiRequestEntity | null> {
        const repo = this.kv(scope, projectId);
        return repo.get(id);
    }

    async save(req: ApiRequestEntity, scope: "global" | "project", projectId?: string): Promise<void> {
        // 可选：做一些轻量校验，避免写入脏数据
        if (!req?.id) throw new Error("request.id is required");
        const repo = this.kv(scope, projectId);
        await repo.set(req.id, req);
    }

    async remove(id: string, scope: "global" | "project", projectId?: string): Promise<void> {
        const repo = this.kv(scope, projectId);
        await repo.delete(id);
    }

    // ---------------- private ----------------

    private kv(scope: "global" | "project", projectId?: string) {
        const file = this.filePath(scope, projectId);
        return new JsonFileKvRepo<ApiRequestEntity>(file);
    }

    private filePath(scope: "global" | "project", projectId?: string) {
        if (scope === "global") {
            return path.join(this.rootDir, "global", this.fileName);
        }
        if (!projectId) {
            throw new Error("projectId is required when scope=project");
        }
        return path.join(this.rootDir, "projects", projectId, this.fileName);
    }
}
