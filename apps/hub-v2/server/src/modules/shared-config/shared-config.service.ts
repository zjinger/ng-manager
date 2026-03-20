import type { RequestContext } from "../../shared/context/request-context";
import { AppError } from "../../shared/errors/app-error";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import type { ProjectAccessContract } from "../project/project-access.contract";
import { requireAdmin } from "../utils/require-admin";
import type { SharedConfigCommandContract, SharedConfigQueryContract } from "./shared-config.contract";
import { SharedConfigRepo } from "./shared-config.repo";
import type {
  CreateSharedConfigInput,
  ListSharedConfigsQuery,
  PublicSharedConfigsQuery,
  SharedConfigEntity,
  SharedConfigListResult,
  UpdateSharedConfigInput
} from "./shared-config.types";

export class SharedConfigService implements SharedConfigCommandContract, SharedConfigQueryContract {
  constructor(
    private readonly repo: SharedConfigRepo,
    private readonly projectAccess: ProjectAccessContract
  ) {}

  async create(input: CreateSharedConfigInput, ctx: RequestContext): Promise<SharedConfigEntity> {
    requireAdmin(ctx);

    const projectId = input.projectId?.trim() || null;
    if (projectId) {
      await this.projectAccess.requireProjectAccess(projectId, ctx, "create shared config");
    }

    if (this.repo.findByProjectAndKey(projectId, input.configKey.trim())) {
      throw new AppError("SHARED_CONFIG_KEY_EXISTS", `config key already exists: ${input.configKey}`, 409);
    }

    const now = nowIso();
    const entity: SharedConfigEntity = {
      id: genId("cfg"),
      projectId,
      scope: input.scope ?? (projectId ? "project" : "global"),
      configKey: input.configKey.trim(),
      configName: input.configName.trim(),
      category: input.category?.trim() || "general",
      valueType: input.valueType?.trim() || "json",
      configValue: input.configValue,
      description: input.description?.trim() || null,
      isEncrypted: input.isEncrypted === true,
      priority: input.priority ?? 0,
      status: "active",
      createdAt: now,
      updatedAt: now
    };

    this.repo.create(entity);
    return entity;
  }

  async update(id: string, input: UpdateSharedConfigInput, ctx: RequestContext): Promise<SharedConfigEntity> {
    requireAdmin(ctx);
    const current = this.requireById(id);

    const projectId =
      input.projectId === undefined ? current.projectId : input.projectId?.trim() || null;
    if (projectId) {
      await this.projectAccess.requireProjectAccess(projectId, ctx, "update shared config");
    }

    const updated = this.repo.update(id, {
      projectId,
      scope: input.scope ?? current.scope,
      configName: input.configName?.trim() || current.configName,
      category: input.category?.trim() || current.category,
      valueType: input.valueType?.trim() || current.valueType,
      configValue: input.configValue ?? current.configValue,
      description: input.description === undefined ? current.description : input.description?.trim() || null,
      isEncrypted: input.isEncrypted ?? current.isEncrypted,
      priority: input.priority ?? current.priority,
      status: input.status ?? current.status,
      updatedAt: nowIso()
    });

    if (!updated) {
      throw new AppError("SHARED_CONFIG_UPDATE_FAILED", "failed to update shared config", 500);
    }

    return this.requireById(id);
  }

  async list(query: ListSharedConfigsQuery, ctx: RequestContext): Promise<SharedConfigListResult> {
    requireAdmin(ctx);
    return this.repo.list(query);
  }

  async getById(id: string, ctx: RequestContext): Promise<SharedConfigEntity> {
    requireAdmin(ctx);
    const entity = this.requireById(id);
    if (entity.projectId) {
      await this.projectAccess.requireProjectAccess(entity.projectId, ctx, "get shared config");
    }
    return entity;
  }

  async listPublic(query: PublicSharedConfigsQuery, _ctx: RequestContext): Promise<SharedConfigEntity[]> {
    return this.repo.listPublic(query);
  }

  private requireById(id: string): SharedConfigEntity {
    const entity = this.repo.findById(id);
    if (!entity) {
      throw new AppError("SHARED_CONFIG_NOT_FOUND", `shared config not found: ${id}`, 404);
    }
    return entity;
  }
}
