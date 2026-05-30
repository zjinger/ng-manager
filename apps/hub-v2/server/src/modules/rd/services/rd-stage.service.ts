import type { RequestContext } from "../../../shared/context/request-context";
import { AppError } from "../../../shared/errors/app-error";
import { ERROR_CODES } from "../../../shared/errors/error-codes";
import { genId } from "../../../shared/utils/id";
import { nowIso } from "../../../shared/utils/time";
import type { CreateRdStageInput, ListRdStagesQuery, RdStageEntity, UpdateRdStageInput } from "../rd.types";
import type { RdPermissionService } from "./rd-permission.service";
import type { RdServiceContext } from "./rd-service-context";

export class RdStageService {
  constructor(
    private readonly context: RdServiceContext,
    private readonly permission: RdPermissionService
  ) {}

  async createStage(input: CreateRdStageInput, ctx: RequestContext): Promise<RdStageEntity> {
    const projectId = input.projectId.trim();
    await this.context.projectAccess.requireProjectAccess(projectId, ctx, "create rd stage");
    await this.permission.requireStageMaintainer(projectId, ctx, "create rd stage");

    if (this.context.repo.findStageByProjectAndName(projectId, input.name.trim())) {
      throw new AppError(ERROR_CODES.RD_STAGE_EXISTS, `rd stage already exists: ${input.name}`, 409);
    }

    const now = nowIso();
    const currentStages = this.context.repo.listStages(projectId);
    const entity: RdStageEntity = {
      id: genId("rds"),
      projectId,
      name: input.name.trim(),
      sort: input.sort ?? currentStages.length + 1,
      enabled: true,
      createdAt: now,
      updatedAt: now
    };

    this.context.repo.createStage(entity);
    return entity;
  }

  async updateStage(id: string, input: UpdateRdStageInput, ctx: RequestContext): Promise<RdStageEntity> {
    const stage = this.requireStage(id);
    await this.context.projectAccess.requireProjectAccess(stage.projectId, ctx, "update rd stage");
    await this.permission.requireStageMaintainer(stage.projectId, ctx, "update rd stage");

    if (input.name?.trim() && input.name.trim() !== stage.name) {
      const byName = this.context.repo.findStageByProjectAndName(stage.projectId, input.name.trim());
      if (byName && byName.id !== stage.id) {
        throw new AppError(ERROR_CODES.RD_STAGE_EXISTS, `rd stage already exists: ${input.name}`, 409);
      }
    }

    const updated = this.context.repo.updateStage(id, {
      name: input.name?.trim() || stage.name,
      sort: input.sort ?? stage.sort,
      enabled: input.enabled === undefined ? (stage.enabled ? 1 : 0) : input.enabled ? 1 : 0,
      updated_at: nowIso()
    });
    if (!updated) {
      throw new AppError(ERROR_CODES.RD_STAGE_UPDATE_FAILED, "failed to update rd stage", 500);
    }
    return this.requireStage(id);
  }

  async listStages(query: ListRdStagesQuery, ctx: RequestContext): Promise<RdStageEntity[]> {
    await this.context.projectAccess.requireProjectAccess(query.projectId.trim(), ctx, "list rd stages");
    return this.context.repo.listStages(query.projectId.trim());
  }

  requireStage(id: string): RdStageEntity {
    const stage = this.context.repo.findStageById(id);
    if (!stage) {
      throw new AppError(ERROR_CODES.RD_STAGE_NOT_FOUND, `rd stage not found: ${id}`, 404);
    }
    return stage;
  }
}
