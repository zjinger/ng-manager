import type { RequestContext } from "../../../shared/context/request-context";
import { ERROR_CODES } from "../../../shared/errors/error-codes";
import { AppError } from "../../../shared/errors/app-error";
import { genId } from "../../../shared/utils/id";
import { nowIso } from "../../../shared/utils/time";
import { ProjectRepo } from "../project.repo";
import { ProjectAccessService } from "../project-access.service";
import type {
  CreateProjectFeaturePointGroupInput,
  ProjectFeaturePointGroupEntity,
  ProjectFeaturePointGroupUpdateResult,
  ProjectFeatureProgressIncrementalResult,
  UpdateProjectFeaturePointGroupInput
} from "../project.types";
import { ProjectBaseService } from "./project-base.service";
import { ProjectFeatureProgressAggregateService } from "./project-feature-progress-aggregate.service";
import { getNextSort, trimToNull } from "./project-service-utils";

export class ProjectFeaturePointGroupService {
  constructor(
    private readonly repo: ProjectRepo,
    private readonly access: ProjectAccessService,
    private readonly baseService: ProjectBaseService,
    private readonly aggregate: ProjectFeatureProgressAggregateService
  ) {}

  async addFeaturePointGroup(
    projectId: string,
    input: CreateProjectFeaturePointGroupInput,
    ctx: RequestContext
  ): Promise<ProjectFeaturePointGroupEntity> {
    await this.access.requireProjectMaintainer(projectId, ctx, "add project feature point group");
    await this.baseService.getById(projectId, ctx);
    const parentId = this.resolveFeaturePointGroupParent(projectId, input.parentId ?? null, null);
    const name = input.name.trim();
    const existing = this.repo.findFeaturePointGroupByName(projectId, parentId, name);
    if (existing) {
      throw new AppError(ERROR_CODES.PROJECT_CONFLICT, "同级模块/子模块名称已存在", 409);
    }
    const groups = this.repo.listFeaturePointGroups(projectId).filter((item) => item.parentId === parentId);
    const now = nowIso();
    const id = genId("pfpg");
    this.repo.addFeaturePointGroup(projectId, {
      id,
      name,
      parentId,
      manualProgress: input.manualProgress === undefined ? null : input.manualProgress,
      sort: input.sort ?? getNextSort(groups.map((item) => item.sort)),
      remark: trimToNull(input.remark),
      createdAt: now,
      updatedAt: now
    });
    return this.findFeaturePointGroup(projectId, id);
  }

  async updateFeaturePointGroup(
    projectId: string,
    groupId: string,
    input: UpdateProjectFeaturePointGroupInput,
    ctx: RequestContext
  ): Promise<ProjectFeaturePointGroupUpdateResult> {
    await this.access.requireProjectMaintainer(projectId, ctx, "update project feature point group");
    const project = await this.baseService.getById(projectId, ctx);
    const current = this.findFeaturePointGroup(projectId, groupId);
    const parentId =
      input.parentId === undefined ? current.parentId : this.resolveFeaturePointGroupParent(projectId, input.parentId, groupId);
    if (input.name !== undefined) {
      const existing = this.repo.findFeaturePointGroupByName(projectId, parentId, input.name.trim());
      if (existing && existing.id !== groupId) {
        throw new AppError(ERROR_CODES.PROJECT_CONFLICT, "同级模块/子模块名称已存在", 409);
      }
    }
    const changed = this.repo.updateFeaturePointGroup(projectId, groupId, {
      name: input.name?.trim(),
      parentId: input.parentId === undefined ? undefined : parentId,
      manualProgress: input.manualProgress,
      sort: input.sort,
      remark: input.remark === undefined ? undefined : trimToNull(input.remark),
      updatedAt: nowIso()
    });
    if (!changed) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "功能点分组不存在", 404);
    }
    return this.aggregate.buildGroupUpdateResult(project, this.findFeaturePointGroup(projectId, groupId));
  }

  async removeFeaturePointGroup(
    projectId: string,
    groupId: string,
    ctx: RequestContext
  ): Promise<ProjectFeatureProgressIncrementalResult> {
    await this.access.requireProjectMaintainer(projectId, ctx, "remove project feature point group");
    const project = await this.baseService.getById(projectId, ctx);
    this.findFeaturePointGroup(projectId, groupId);
    const childCount = this.repo.countFeaturePointGroupChildren(projectId, groupId);
    const featureCount = this.repo.countFeaturePointsByGroup(projectId, groupId);
    if (childCount > 0 || featureCount > 0) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "当前分组下仍有功能点，暂不支持删除", 400);
    }
    if (!this.repo.removeFeaturePointGroup(projectId, groupId)) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "功能点分组不存在", 404);
    }
    return this.aggregate.buildIncrementalResult(project, {
      removedGroupIds: [groupId]
    });
  }

  findFeaturePointGroup(projectId: string, groupId: string): ProjectFeaturePointGroupEntity {
    const group = this.repo.findFeaturePointGroupById(projectId, groupId.trim());
    if (!group) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "功能点分组不存在", 404);
    }
    return group;
  }

  resolveFeaturePointGroupParent(
    projectId: string,
    parentId: string | null | undefined,
    selfId: string | null
  ): string | null {
    const normalizedParentId = trimToNull(parentId);
    if (!normalizedParentId) {
      return null;
    }
    if (selfId && normalizedParentId === selfId) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "不能选择自己作为上级分组", 400);
    }
    const parent = this.findFeaturePointGroup(projectId, normalizedParentId);
    if (parent.parentId) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "功能点分组最多支持模块和子模块两级", 400);
    }
    return parent.id;
  }

  findOrCreateFeaturePointGroup(
    projectId: string,
    parentId: string | null,
    name: string
  ): ProjectFeaturePointGroupEntity {
    const existing = this.repo.findFeaturePointGroupByName(projectId, parentId, name);
    if (existing) {
      return existing;
    }
    const now = nowIso();
    const groups = this.repo.listFeaturePointGroups(projectId).filter((item) => item.parentId === parentId);
    const id = genId("pfpg");
    this.repo.addFeaturePointGroup(projectId, {
      id,
      name,
      parentId,
      manualProgress: null,
      sort: getNextSort(groups.map((item) => item.sort)),
      remark: null,
      createdAt: now,
      updatedAt: now
    });
    return this.findFeaturePointGroup(projectId, id);
  }
}
