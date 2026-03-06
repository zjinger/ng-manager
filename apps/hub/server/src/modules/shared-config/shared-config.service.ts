import Database from "better-sqlite3";
import { AppError } from "../../utils/app-error";
import { genId } from "../../utils/id";
import { nowIso } from "../../utils/time";
import type {
    CreateSharedConfigInput,
    ListSharedConfigQuery,
    SharedConfigEntity,
    SharedConfigListResult,
    SharedConfigViewItem,
    UpdateSharedConfigInput
} from "./shared-config.types";
import { SharedConfigRepo } from "./shared-config.repo";

export class SharedConfigService {
    constructor(private readonly repo: SharedConfigRepo) { }

    create(input: CreateSharedConfigInput): SharedConfigViewItem {
        this.assertValueType(input.configValue, input.valueType);

        const now = nowIso();

        const entity: SharedConfigEntity = {
            id: genId("cfg"),
            configKey: input.configKey.trim(),
            configValue: input.configValue,
            valueType: input.valueType,
            scope: input.scope,
            description: input.description?.trim() || null,
            createdAt: now,
            updatedAt: now
        };

        try {
            this.repo.create(entity);
            return this.toView(entity);
        } catch (error) {
            this.handleSqliteError(error, input.configKey);
        }
    }

    getById(id: string): SharedConfigViewItem {
        const item = this.repo.findById(id);
        if (!item) {
            throw new AppError("SHARED_CONFIG_NOT_FOUND", `shared config not found: ${id}`, 404);
        }
        return this.toView(item);
    }

    getPublicByKey(configKey: string): SharedConfigViewItem {
        const item = this.repo.findPublicByKey(configKey);
        if (!item) {
            throw new AppError("SHARED_CONFIG_NOT_FOUND", `shared config not found: ${configKey}`, 404);
        }
        return this.toView(item);
    }

    list(query: ListSharedConfigQuery): SharedConfigListResult {
        const result = this.repo.list(query);
        return {
            items: result.items.map((item) => this.toView(item)),
            page: result.page,
            pageSize: result.pageSize,
            total: result.total
        };
    }

    listPublic(): Record<string, SharedConfigViewItem> {
        const items = this.repo.listPublic();
        const result: Record<string, SharedConfigViewItem> = {};

        for (const item of items) {
            result[item.configKey] = this.toView(item);
        }

        return result;
    }

    update(id: string, input: UpdateSharedConfigInput): SharedConfigViewItem {
        const existing = this.repo.findById(id);
        if (!existing) {
            throw new AppError("SHARED_CONFIG_NOT_FOUND", `shared config not found: ${id}`, 404);
        }

        const nextValue = input.configValue !== undefined ? input.configValue : existing.configValue;
        const nextType = input.valueType !== undefined ? input.valueType : existing.valueType;

        this.assertValueType(nextValue, nextType);

        const patch: UpdateSharedConfigInput & { updatedAt: string } = {
            ...input,
            description: input.description === null ? null : input.description?.trim(),
            updatedAt: nowIso()
        };

        const changed = this.repo.update(id, patch);
        if (!changed) {
            throw new AppError("SHARED_CONFIG_UPDATE_FAILED", "failed to update shared config", 500);
        }

        return this.getById(id);
    }

    remove(id: string): void {
        const existing = this.repo.findById(id);
        if (!existing) {
            throw new AppError("SHARED_CONFIG_NOT_FOUND", `shared config not found: ${id}`, 404);
        }

        const changed = this.repo.remove(id);
        if (!changed) {
            throw new AppError("SHARED_CONFIG_DELETE_FAILED", "failed to delete shared config", 500);
        }
    }

    private assertValueType(rawValue: string, valueType: SharedConfigEntity["valueType"]) {
        try {
            switch (valueType) {
                case "string":
                    return;
                case "json": {
                    JSON.parse(rawValue);
                    return;
                }
                case "number": {
                    const n = Number(rawValue);
                    if (!Number.isFinite(n)) {
                        throw new Error("invalid number");
                    }
                    return;
                }
                case "boolean": {
                    if (rawValue !== "true" && rawValue !== "false") {
                        throw new Error("invalid boolean");
                    }
                    return;
                }
            }
        } catch {
            throw new AppError(
                "SHARED_CONFIG_INVALID_VALUE",
                `configValue does not match valueType: ${valueType}`,
                400
            );
        }
    }

    private parseValue(entity: SharedConfigEntity): SharedConfigViewItem["value"] {
        switch (entity.valueType) {
            case "string":
                return entity.configValue;
            case "json":
                return JSON.parse(entity.configValue);
            case "number":
                return Number(entity.configValue);
            case "boolean":
                return entity.configValue === "true";
        }
    }

    private toView(entity: SharedConfigEntity): SharedConfigViewItem {
        return {
            id: entity.id,
            configKey: entity.configKey,
            value: this.parseValue(entity),
            rawValue: entity.configValue,
            valueType: entity.valueType,
            scope: entity.scope,
            description: entity.description,
            createdAt: entity.createdAt,
            updatedAt: entity.updatedAt
        };
    }

    private handleSqliteError(error: unknown, configKey?: string): never {
        if (error instanceof AppError) {
            throw error;
        }

        if (
            error instanceof Database.SqliteError &&
            error.code === "SQLITE_CONSTRAINT_UNIQUE"
        ) {
            throw new AppError(
                "SHARED_CONFIG_KEY_EXISTS",
                `shared config key already exists: ${configKey ?? "unknown"}`,
                409
            );
        }

        throw error;
    }
}