import type { RequestContext } from "../../../shared/context/request-context";
import { ERROR_CODES } from "../../../shared/errors/error-codes";
import { AppError } from "../../../shared/errors/app-error";
import { genId } from "../../../shared/utils/id";
import { nowIso } from "../../../shared/utils/time";
import { ProjectRepo } from "../project.repo";
import { ProjectAccessService } from "../project-access.service";
import type {
  DeleteProjectFeatureProgressOverrideInput,
  ProjectFeatureProgressOverrideDeleteResult,
  ProjectFeatureProgressOverrideUpdateResult,
  ProjectFeatureProgressSettings,
  ProjectFeatureProgressView,
  UpdateProjectFeatureProgressSettingsInput,
  UpsertProjectFeatureProgressOverrideInput
} from "../project.types";
import { ProjectBaseService } from "./project-base.service";
import { ProjectFeatureProgressAggregateService } from "./project-feature-progress-aggregate.service";
import { trimToNull } from "./project-service-utils";

export class ProjectFeatureProgressService {
  constructor(
    private readonly repo: ProjectRepo,
    private readonly access: ProjectAccessService,
    private readonly baseService: ProjectBaseService,
    private readonly aggregate: ProjectFeatureProgressAggregateService
  ) {}

  async getFeatureProgressSettings(projectId: string, ctx: RequestContext): Promise<ProjectFeatureProgressSettings> {
    await this.baseService.getById(projectId, ctx);
    return this.aggregate.resolveSettings(projectId);
  }

  async updateFeatureProgressSettings(
    projectId: string,
    input: UpdateProjectFeatureProgressSettingsInput,
    ctx: RequestContext
  ): Promise<ProjectFeatureProgressSettings> {
    await this.access.requireProjectMaintainer(projectId, ctx, "update project feature progress settings");
    await this.baseService.getById(projectId, ctx);
    const now = nowIso();
    const current = this.repo.getFeatureProgressSettings(projectId);
    const settings: ProjectFeatureProgressSettings = {
      projectId,
      enabled: input.enabled ?? current?.enabled ?? true,
      statusOptions: this.aggregate.normalizeStatusOptions(input.statusOptions ?? current?.statusOptions),
      createdAt: current?.createdAt ?? now,
      updatedAt: now
    };
    this.repo.upsertFeatureProgressSettings(settings);
    return this.aggregate.resolveSettings(projectId);
  }

  async getFeatureProgress(projectId: string, ctx: RequestContext): Promise<ProjectFeatureProgressView> {
    const project = await this.baseService.getById(projectId, ctx);
    return this.aggregate.buildView(project);
  }

  async upsertFeatureProgressOverride(
    projectId: string,
    input: UpsertProjectFeatureProgressOverrideInput,
    ctx: RequestContext
  ): Promise<ProjectFeatureProgressOverrideUpdateResult> {
    await this.access.requireProjectMaintainer(projectId, ctx, "upsert project feature progress override");
    const project = await this.baseService.getById(projectId, ctx);
    this.assertValidFeatureOverrideTarget(projectId, input.targetType, input.targetId);
    const now = nowIso();
    const override = this.repo.upsertFeatureProgressOverride({
      id: genId("pfpo"),
      projectId,
      targetType: input.targetType,
      targetId: input.targetId.trim(),
      progress: input.progress,
      remark: trimToNull(input.remark),
      createdAt: now,
      updatedAt: now
    });
    return {
      override,
      ...this.aggregate.buildIncrementalResult(project, {
        projectOverride: override.targetType === "project" ? override : undefined
      })
    };
  }

  async removeFeatureProgressOverride(
    projectId: string,
    input: DeleteProjectFeatureProgressOverrideInput,
    ctx: RequestContext
  ): Promise<ProjectFeatureProgressOverrideDeleteResult> {
    await this.access.requireProjectMaintainer(projectId, ctx, "remove project feature progress override");
    const project = await this.baseService.getById(projectId, ctx);
    this.assertValidFeatureOverrideTarget(projectId, input.targetType, input.targetId);
    this.repo.removeFeatureProgressOverride(projectId, input.targetType, input.targetId.trim());
    return {
      removedOverride: {
        targetType: input.targetType,
        targetId: input.targetId.trim()
      },
      ...this.aggregate.buildIncrementalResult(project, {
        projectOverride: input.targetType === "project" ? null : undefined
      })
    };
  }

  private assertValidFeatureOverrideTarget(projectId: string, targetType: "project" | "module", targetId: string): void {
    const normalizedTargetId = targetId.trim();
    if (targetType === "project") {
      if (normalizedTargetId !== projectId) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, "项目进度覆盖目标必须是当前项目", 400);
      }
      return;
    }
    const exists = this.repo.listFeaturePointGroups(projectId).some((item) => item.id === normalizedTargetId);
    if (!exists) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "模块进度覆盖目标必须属于当前功能点分组", 400);
    }
  }
}
