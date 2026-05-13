import type { ApiCollectionEntity, ApiEnvironmentEntity, ApiRequestEntity } from "../../../domain/models";
import type { ApiScope } from "../../../domain/models/types";
import type { CollectionRepo, EnvRepo, RequestRepo } from "../../../domain/services";
import type { SqliteDatabase } from "@yinuo-ngm/storage";

type JsonValue = ApiRequestEntity | ApiEnvironmentEntity | ApiCollectionEntity;

interface ScopedRow {
    scope: ApiScope;
    projectId: string;
    id: string;
    value: string;
}

function scopeKey(scope: ApiScope, projectId?: string) {
    return scope === "project" ? String(projectId ?? "").trim() : "";
}

function normalizeScopeProjectId(scope: ApiScope, projectId?: string) {
    if (scope === "project" && !String(projectId ?? "").trim()) {
        throw new Error("projectId is required when scope=project");
    }
    return scopeKey(scope, projectId);
}

abstract class SqliteScopedJsonRepoBase<T extends JsonValue> {
    protected constructor(
        protected readonly db: SqliteDatabase,
        private readonly tableName: string
    ) {}

    async list(scope: ApiScope, projectId?: string): Promise<T[]> {
        const rows = this.db
            .prepare(`SELECT value FROM ${this.tableName} WHERE scope = ? AND project_id = ? ORDER BY rowid ASC`)
            .all(scope, normalizeScopeProjectId(scope, projectId)) as Array<Pick<ScopedRow, "value">>;
        return rows.map((row) => JSON.parse(row.value) as T);
    }

    async get(id: string, scope: ApiScope, projectId?: string): Promise<T | null> {
        const row = this.db
            .prepare(`SELECT value FROM ${this.tableName} WHERE scope = ? AND project_id = ? AND id = ? LIMIT 1`)
            .get(scope, normalizeScopeProjectId(scope, projectId), id) as Pick<ScopedRow, "value"> | undefined;
        if (!row) return null;
        return JSON.parse(row.value) as T;
    }

    async save(value: T, scope: ApiScope, projectId?: string): Promise<void> {
        const id = String((value as any)?.id ?? "").trim();
        if (!id) throw new Error("id is required");
        const stmt = this.db.prepare(`
            INSERT INTO ${this.tableName} (scope, project_id, id, value)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(scope, project_id, id) DO UPDATE SET value = excluded.value
        `);
        stmt.run(scope, normalizeScopeProjectId(scope, projectId), id, JSON.stringify(value));
    }

    async delete(id: string, scope: ApiScope, projectId?: string): Promise<void> {
        this.db.prepare(`DELETE FROM ${this.tableName} WHERE scope = ? AND project_id = ? AND id = ?`)
            .run(scope, normalizeScopeProjectId(scope, projectId), id);
    }
}

export class SqliteRequestRepo extends SqliteScopedJsonRepoBase<ApiRequestEntity> implements RequestRepo {
    constructor(db: SqliteDatabase) {
        super(db, "api_requests");
    }

    override async list(scope: ApiScope, projectId?: string): Promise<ApiRequestEntity[]> {
        return super.list(scope, projectId);
    }

    override async get(id: string, scope: ApiScope, projectId?: string): Promise<ApiRequestEntity | null> {
        return super.get(id, scope, projectId);
    }

    override async save(req: ApiRequestEntity, scope: ApiScope, projectId?: string): Promise<void> {
        return super.save(req, scope, projectId);
    }

    async remove(id: string, scope: ApiScope, projectId?: string): Promise<void> {
        return super.delete(id, scope, projectId);
    }
}

export class SqliteEnvRepo extends SqliteScopedJsonRepoBase<ApiEnvironmentEntity> implements EnvRepo {
    constructor(db: SqliteDatabase) {
        super(db, "api_envs");
    }

    override async list(scope: ApiScope, projectId?: string): Promise<ApiEnvironmentEntity[]> {
        return super.list(scope, projectId);
    }

    override async get(id: string, scope: ApiScope, projectId?: string): Promise<ApiEnvironmentEntity | null> {
        return super.get(id, scope, projectId);
    }

    override async save(env: ApiEnvironmentEntity, scope: ApiScope, projectId?: string): Promise<void> {
        return super.save(env, scope, projectId);
    }

    async remove(id: string, scope: ApiScope, projectId?: string): Promise<void> {
        return super.delete(id, scope, projectId);
    }
}

export class SqliteCollectionRepo extends SqliteScopedJsonRepoBase<ApiCollectionEntity> implements CollectionRepo {
    constructor(db: SqliteDatabase) {
        super(db, "api_collections");
    }

    override async get(id: string, scope: ApiScope, projectId?: string): Promise<ApiCollectionEntity | null> {
        return super.get(id, scope, projectId);
    }

    override async list(scope: ApiScope, projectId?: string): Promise<ApiCollectionEntity[]> {
        return super.list(scope, projectId);
    }

    override async save(entity: ApiCollectionEntity, scope: ApiScope, projectId?: string): Promise<void> {
        return super.save(entity, scope, projectId);
    }

    override async delete(id: string, scope: ApiScope, projectId?: string): Promise<void> {
        return super.delete(id, scope, projectId);
    }
}
