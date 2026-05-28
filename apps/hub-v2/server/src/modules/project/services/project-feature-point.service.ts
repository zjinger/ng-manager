import type { RequestContext } from "../../../shared/context/request-context";
import { ERROR_CODES } from "../../../shared/errors/error-codes";
import { AppError } from "../../../shared/errors/app-error";
import { genId } from "../../../shared/utils/id";
import { nowIso } from "../../../shared/utils/time";
import { ProjectRepo } from "../project.repo";
import { ProjectAccessService } from "../project-access.service";
import type {
  CreateProjectFeaturePointInput,
  ProjectFeaturePointEntity,
  ProjectFeaturePointUpdateResult,
  ProjectFeatureProgressIncrementalResult,
  UpdateProjectFeaturePointInput
} from "../project.types";
import { ProjectBaseService } from "./project-base.service";
import { ProjectFeaturePointGroupService } from "./project-feature-point-group.service";
import { ProjectFeatureProgressAggregateService } from "./project-feature-progress-aggregate.service";
import { getNextSort, trimToNull } from "./project-service-utils";

export class ProjectFeaturePointService {
  constructor(
    private readonly repo: ProjectRepo,
    private readonly access: ProjectAccessService,
    private readonly baseService: ProjectBaseService,
    private readonly groupService: ProjectFeaturePointGroupService,
    private readonly aggregate: ProjectFeatureProgressAggregateService
  ) {}

  async addFeaturePoint(
    projectId: string,
    input: CreateProjectFeaturePointInput,
    ctx: RequestContext
  ): Promise<ProjectFeaturePointEntity> {
    await this.access.requireProjectMaintainer(projectId, ctx, "add project feature point");
    await this.baseService.getById(projectId, ctx);
    const ownerUserIds = this.resolveFeatureOwnerUserIds(projectId, input.ownerUserIds ?? (input.ownerUserId ? [input.ownerUserId] : []));
    const groupSelection = this.resolveFeaturePointGroupsForCreate(projectId, input);

    const now = nowIso();
    const id = genId("pfp");
    this.repo.addFeaturePoint(projectId, {
      id,
      name: input.name.trim(),
      moduleId: null,
      moduleGroupId: groupSelection.moduleGroupId,
      submoduleGroupId: groupSelection.submoduleGroupId,
      groupTitle: trimToNull(input.groupTitle),
      moduleName: groupSelection.moduleName,
      submoduleName: groupSelection.submoduleName,
      ownerUserId: ownerUserIds[0] ?? null,
      ownerUserIds,
      status: input.status,
      progress: input.progress,
      enabled: input.enabled,
      sort: input.sort ?? getNextSort(this.repo.listFeaturePoints(projectId).map((item) => item.sort)),
      remark: trimToNull(input.remark),
      createdAt: now,
      updatedAt: now
    });

    const created = this.repo.findFeaturePointById(projectId, id);
    if (!created) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "功能点创建失败", 500);
    }
    return created;
  }

  async updateFeaturePoint(
    projectId: string,
    featurePointId: string,
    input: UpdateProjectFeaturePointInput,
    ctx: RequestContext
  ): Promise<ProjectFeaturePointUpdateResult> {
    await this.access.requireProjectMaintainer(projectId, ctx, "update project feature point");
    const project = await this.baseService.getById(projectId, ctx);
    const current = this.repo.findFeaturePointById(projectId, featurePointId);
    if (!current) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "功能点不存在", 404);
    }
    const groupSelection = this.resolveFeaturePointGroupsForUpdate(projectId, input);
    const ownerUserIds =
      input.ownerUserIds === undefined
        ? input.ownerUserId === undefined
          ? undefined
          : this.resolveFeatureOwnerUserIds(projectId, input.ownerUserId ? [input.ownerUserId] : [])
        : this.resolveFeatureOwnerUserIds(projectId, input.ownerUserIds);

    const changed = this.repo.updateFeaturePoint(projectId, featurePointId, {
      name: input.name?.trim(),
      moduleId: Object.keys(groupSelection).length > 0 ? null : input.moduleId === undefined ? undefined : null,
      moduleGroupId: groupSelection.moduleGroupId,
      submoduleGroupId: groupSelection.submoduleGroupId,
      groupTitle: input.groupTitle === undefined ? undefined : trimToNull(input.groupTitle),
      moduleName: groupSelection.moduleName,
      submoduleName: groupSelection.submoduleName,
      ownerUserId: ownerUserIds === undefined ? undefined : ownerUserIds[0] ?? null,
      ownerUserIds,
      status: input.status,
      progress: input.progress,
      enabled: input.enabled,
      sort: input.sort,
      remark: input.remark === undefined ? undefined : trimToNull(input.remark),
      updatedAt: nowIso()
    });
    if (!changed) {
      return {
        featurePoint: current,
        ...this.aggregate.buildIncrementalResult(project, {
          affectedFeaturePoints: [current]
        })
      };
    }

    const updated = this.repo.findFeaturePointById(projectId, featurePointId);
    if (!updated) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "功能点不存在", 404);
    }
    return {
      featurePoint: updated,
      ...this.aggregate.buildIncrementalResult(project, {
        affectedFeaturePoints: [updated]
      })
    };
  }

  async removeFeaturePoint(
    projectId: string,
    featurePointId: string,
    ctx: RequestContext
  ): Promise<ProjectFeatureProgressIncrementalResult> {
    await this.access.requireProjectMaintainer(projectId, ctx, "remove project feature point");
    const project = await this.baseService.getById(projectId, ctx);
    if (!this.repo.removeFeaturePoint(projectId, featurePointId)) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "功能点不存在", 404);
    }
    return this.aggregate.buildIncrementalResult(project, {
      removedFeaturePointIds: [featurePointId]
    });
  }

  private resolveFeaturePointGroupsForCreate(
    projectId: string,
    input: CreateProjectFeaturePointInput
  ): {
    moduleGroupId: string | null;
    submoduleGroupId: string | null;
    moduleName: string | null;
    submoduleName: string | null;
  } {
    return this.resolveFeaturePointGroups(projectId, {
      moduleGroupId: input.moduleGroupId,
      submoduleGroupId: input.submoduleGroupId,
      moduleName: input.moduleName,
      submoduleName: input.submoduleName
    });
  }

  private resolveFeaturePointGroupsForUpdate(
    projectId: string,
    input: UpdateProjectFeaturePointInput
  ): {
    moduleGroupId?: string | null;
    submoduleGroupId?: string | null;
    moduleName?: string | null;
    submoduleName?: string | null;
  } {
    const groupInputTouched =
      input.moduleGroupId !== undefined ||
      input.submoduleGroupId !== undefined ||
      input.moduleName !== undefined ||
      input.submoduleName !== undefined;
    if (!groupInputTouched) {
      return {};
    }
    return this.resolveFeaturePointGroups(projectId, {
      moduleGroupId: input.moduleGroupId,
      submoduleGroupId: input.submoduleGroupId,
      moduleName: input.moduleName,
      submoduleName: input.submoduleName
    });
  }

  private resolveFeaturePointGroups(
    projectId: string,
    input: {
      moduleGroupId?: string | null;
      submoduleGroupId?: string | null;
      moduleName?: string | null;
      submoduleName?: string | null;
    }
  ): {
    moduleGroupId: string | null;
    submoduleGroupId: string | null;
    moduleName: string | null;
    submoduleName: string | null;
  } {
    const explicitSubmoduleGroupId = trimToNull(input.submoduleGroupId);
    if (explicitSubmoduleGroupId) {
      const submoduleGroup = this.groupService.findFeaturePointGroup(projectId, explicitSubmoduleGroupId);
      if (!submoduleGroup.parentId) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, "子模块分组必须选择二级分组", 400);
      }
      const moduleGroup = this.groupService.findFeaturePointGroup(projectId, submoduleGroup.parentId);
      const explicitModuleGroupId = trimToNull(input.moduleGroupId);
      if (explicitModuleGroupId && explicitModuleGroupId !== moduleGroup.id) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, "模块和子模块分组不匹配", 400);
      }
      return {
        moduleGroupId: moduleGroup.id,
        submoduleGroupId: submoduleGroup.id,
        moduleName: moduleGroup.name,
        submoduleName: submoduleGroup.name
      };
    }

    const explicitModuleGroupId = trimToNull(input.moduleGroupId);
    if (explicitModuleGroupId) {
      const moduleGroup = this.groupService.findFeaturePointGroup(projectId, explicitModuleGroupId);
      if (moduleGroup.parentId) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, "模块分组必须选择一级分组", 400);
      }
      return {
        moduleGroupId: moduleGroup.id,
        submoduleGroupId: null,
        moduleName: moduleGroup.name,
        submoduleName: null
      };
    }

    const moduleName = trimToNull(input.moduleName);
    if (!moduleName) {
      return {
        moduleGroupId: null,
        submoduleGroupId: null,
        moduleName: null,
        submoduleName: null
      };
    }

    const moduleGroup = this.groupService.findOrCreateFeaturePointGroup(projectId, null, moduleName);
    const submoduleName = trimToNull(input.submoduleName);
    if (!submoduleName) {
      return {
        moduleGroupId: moduleGroup.id,
        submoduleGroupId: null,
        moduleName: moduleGroup.name,
        submoduleName: null
      };
    }
    const submoduleGroup = this.groupService.findOrCreateFeaturePointGroup(projectId, moduleGroup.id, submoduleName);
    return {
      moduleGroupId: moduleGroup.id,
      submoduleGroupId: submoduleGroup.id,
      moduleName: moduleGroup.name,
      submoduleName: submoduleGroup.name
    };
  }

  private resolveFeatureOwnerUserId(projectId: string, value: string | null | undefined): string | null {
    const ownerUserId = trimToNull(value);
    if (!ownerUserId) {
      return null;
    }
    const member = this.repo.findMemberByProjectAndUserId(projectId, ownerUserId);
    if (!member) {
      throw new AppError(ERROR_CODES.PROJECT_MEMBER_NOT_FOUND, "功能点负责人必须是项目成员", 400);
    }
    return ownerUserId;
  }

  private resolveFeatureOwnerUserIds(projectId: string, values: string[] | null | undefined): string[] {
    if (!values?.length) {
      return [];
    }
    const result: string[] = [];
    for (const value of values) {
      const ownerUserId = this.resolveFeatureOwnerUserId(projectId, value);
      if (ownerUserId && !result.includes(ownerUserId)) {
        result.push(ownerUserId);
      }
    }
    return result;
  }
}
