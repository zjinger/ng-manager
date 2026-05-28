import type Database from "better-sqlite3";
import type { RequestContext } from "../../../shared/context/request-context";
import { ERROR_CODES } from "../../../shared/errors/error-codes";
import { AppError } from "../../../shared/errors/app-error";
import { genId } from "../../../shared/utils/id";
import { nowIso } from "../../../shared/utils/time";
import { UserRepo } from "../../user/user.repo";
import { RdRepo } from "../../rd/rd.repo";
import { ProjectRepo } from "../project.repo";
import { ProjectAccessService } from "../project-access.service";
import type {
  AddProjectModuleMemberInput,
  CreateProjectConfigItemInput,
  ProjectConfigItemEntity,
  ProjectModuleMemberEntity,
  ProjectModuleRdLinkEntity,
  ReplaceModuleRdLinksInput,
  UpdateProjectConfigItemInput
} from "../project.types";
import { ProjectBaseService } from "./project-base.service";
import { findConfigById, getNextSort, handleProjectSqliteError, trimToNull } from "./project-service-utils";

export class ProjectMetaService {
  constructor(
    private readonly repo: ProjectRepo,
    private readonly userRepo: UserRepo,
    private readonly rdRepo: RdRepo,
    private readonly access: ProjectAccessService,
    private readonly db: Database.Database,
    private readonly baseService: ProjectBaseService
  ) {}

  async listModules(projectId: string, ctx: RequestContext): Promise<ProjectConfigItemEntity[]> {
    await this.baseService.getById(projectId, ctx);
    return this.repo.listModules(projectId);
  }

  async getModule(projectId: string, moduleId: string, ctx: RequestContext): Promise<ProjectConfigItemEntity> {
    await this.baseService.getById(projectId, ctx);
    return findConfigById(this.repo.listModules(projectId), moduleId, ERROR_CODES.PROJECT_MODULE_NOT_FOUND);
  }

  async listModuleMembers(projectId: string, moduleId: string, ctx: RequestContext): Promise<ProjectModuleMemberEntity[]> {
    await this.getModule(projectId, moduleId, ctx);
    return this.repo.listModuleMembers(projectId, moduleId);
  }

  async listModuleRdLinks(projectId: string, moduleId: string, ctx: RequestContext): Promise<ProjectModuleRdLinkEntity[]> {
    await this.getModule(projectId, moduleId, ctx);
    return this.repo.listModuleRdLinks(projectId, moduleId);
  }

  async listProjectModuleRdLinks(projectId: string, ctx: RequestContext): Promise<ProjectModuleRdLinkEntity[]> {
    await this.baseService.getById(projectId, ctx);
    return this.repo.listProjectModuleRdLinks(projectId);
  }

  async addModule(projectId: string, input: CreateProjectConfigItemInput, ctx: RequestContext): Promise<ProjectConfigItemEntity> {
    await this.access.requireProjectMaintainer(projectId, ctx, "add project module");
    await this.baseService.getById(projectId, ctx);

    const now = nowIso();
    const id = genId("pmod");
    const nodeType = input.nodeType ?? "module";
    const existingModules = this.repo.listModules(projectId);
    this.assertValidModuleParent(existingModules, input.parentId ?? null, null, nodeType);
    try {
      this.repo.addModule(projectId, {
        id,
        name: input.name.trim(),
        code: input.code?.trim(),
        projectNo: trimToNull(input.projectNo) ?? undefined,
        parentId: input.parentId?.trim() || null,
        nodeType,
        ownerUserId: this.resolveModuleOwnerUserId(projectId, input.ownerUserId),
        iconCode: input.iconCode?.trim() || undefined,
        priority: input.priority,
        status: input.status,
        progress: input.progress,
        enabled: input.enabled,
        sort: input.sort ?? getNextSort(existingModules.map((item) => item.sort)),
        description: input.description?.trim(),
        createdAt: now,
        updatedAt: now
      });
    } catch (error) {
      handleProjectSqliteError(error);
    }

    return findConfigById(this.repo.listModules(projectId), id, "PROJECT_MODULE_CREATE_FAILED");
  }

  async updateModule(
    projectId: string,
    moduleId: string,
    input: UpdateProjectConfigItemInput,
    ctx: RequestContext
  ): Promise<ProjectConfigItemEntity> {
    await this.access.requireProjectMaintainer(projectId, ctx, "update project module");
    const current = findConfigById(this.repo.listModules(projectId), moduleId, ERROR_CODES.PROJECT_MODULE_NOT_FOUND);
    const targetNodeType = input.nodeType ?? current.nodeType;
    this.assertValidModuleParent(
      this.repo.listModules(projectId),
      input.parentId === undefined ? current.parentId : input.parentId,
      moduleId,
      targetNodeType
    );
    const changed = this.repo.updateModule(projectId, moduleId, {
      name: input.name?.trim(),
      code: input.code === undefined ? undefined : input.code?.trim() || null,
      projectNo: input.projectNo === undefined ? undefined : trimToNull(input.projectNo),
      parentId: input.parentId === undefined ? undefined : input.parentId?.trim() || null,
      nodeType: input.nodeType,
      ownerUserId: input.ownerUserId === undefined ? undefined : this.resolveModuleOwnerUserId(projectId, input.ownerUserId),
      iconCode: input.iconCode === undefined ? undefined : trimToNull(input.iconCode),
      priority: input.priority,
      status: input.status,
      progress: input.progress,
      enabled: input.enabled,
      sort: input.sort,
      description: input.description === undefined ? undefined : input.description?.trim() || null,
      updatedAt: nowIso()
    });
    if (!changed) {
      throw new AppError(ERROR_CODES.PROJECT_MODULE_NOT_FOUND, `module not found: ${moduleId}`, 404);
    }
    return findConfigById(this.repo.listModules(projectId), moduleId, "PROJECT_MODULE_NOT_FOUND");
  }

  async removeModule(projectId: string, moduleId: string, ctx: RequestContext): Promise<void> {
    await this.access.requireProjectMaintainer(projectId, ctx, "remove project module");
    if (!this.repo.removeModule(projectId, moduleId)) {
      throw new AppError(ERROR_CODES.PROJECT_MODULE_NOT_FOUND, `module not found: ${moduleId}`, 404);
    }
  }

  async addModuleMember(
    projectId: string,
    moduleId: string,
    input: AddProjectModuleMemberInput,
    ctx: RequestContext
  ): Promise<ProjectModuleMemberEntity> {
    await this.access.requireProjectMaintainer(projectId, ctx, "add project module member");
    await this.getModule(projectId, moduleId, ctx);
    const userId = input.userId.trim();
    const user = this.userRepo.findById(userId);
    if (!user) {
      throw new AppError(ERROR_CODES.USER_NOT_FOUND, `user not found: ${input.userId}`, 404);
    }
    if (this.repo.hasModuleMember(projectId, moduleId, userId)) {
      throw new AppError(ERROR_CODES.PROJECT_MODULE_MEMBER_EXISTS, "module member already exists", 409);
    }
    const now = nowIso();
    const id = genId("pmm");
    this.repo.createModuleMember({
      id,
      projectId,
      moduleId,
      userId,
      roleCode: input.roleCode ?? "member",
      createdAt: now,
      updatedAt: now
    });
    const created = this.repo.findModuleMemberById(projectId, moduleId, id);
    if (!created) {
      throw new AppError(ERROR_CODES.PROJECT_MODULE_CREATE_FAILED, "project module member create failed", 500);
    }
    return created;
  }

  async removeModuleMember(projectId: string, moduleId: string, moduleMemberId: string, ctx: RequestContext): Promise<void> {
    await this.access.requireProjectMaintainer(projectId, ctx, "remove project module member");
    await this.getModule(projectId, moduleId, ctx);
    if (!this.repo.deleteModuleMember(projectId, moduleId, moduleMemberId)) {
      throw new AppError(ERROR_CODES.PROJECT_MODULE_MEMBER_NOT_FOUND, "project module member not found", 404);
    }
  }

  async replaceModuleRdLinks(
    projectId: string,
    moduleId: string,
    input: ReplaceModuleRdLinksInput,
    ctx: RequestContext
  ): Promise<ProjectModuleRdLinkEntity[]> {
    await this.access.requireProjectMaintainer(projectId, ctx, "replace project module rd links");
    await this.getModule(projectId, moduleId, ctx);

    const uniqueIds = Array.from(new Set((input.rdItemIds ?? []).map((item) => item.trim()).filter(Boolean)));
    for (const rdItemId of uniqueIds) {
      const rdItem = this.rdRepo.findItemById(rdItemId);
      if (!rdItem || rdItem.projectId !== projectId) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, "关联研发项不存在或不在当前项目", 400);
      }
      if (rdItem.status === "closed") {
        throw new AppError(ERROR_CODES.BAD_REQUEST, "已关闭研发项不允许新增子项目/模块关联", 400);
      }
    }

    const now = nowIso();
    this.db.transaction(() => {
      this.repo.removeModuleRdLinks(projectId, moduleId);
      uniqueIds.forEach((rdItemId, index) => {
        this.repo.addModuleRdLink({
          id: genId("pmrd"),
          projectId,
          moduleId,
          rdItemId,
          sort: index,
          createdAt: now,
          updatedAt: now
        });
      });
    })();

    return this.repo.listModuleRdLinks(projectId, moduleId);
  }

  async listEnvironments(projectId: string, ctx: RequestContext): Promise<ProjectConfigItemEntity[]> {
    await this.baseService.getById(projectId, ctx);
    return this.repo.listEnvironments(projectId);
  }

  async addEnvironment(
    projectId: string,
    input: CreateProjectConfigItemInput,
    ctx: RequestContext
  ): Promise<ProjectConfigItemEntity> {
    await this.access.requireProjectMaintainer(projectId, ctx, "add project environment");
    await this.baseService.getById(projectId, ctx);
    const now = nowIso();
    const id = genId("penv");
    try {
      this.repo.addEnvironment(projectId, {
        id,
        name: input.name.trim(),
        code: input.code?.trim(),
        enabled: input.enabled,
        sort: input.sort ?? getNextSort(this.repo.listEnvironments(projectId).map((item) => item.sort)),
        description: input.description?.trim(),
        createdAt: now,
        updatedAt: now
      });
    } catch (error) {
      handleProjectSqliteError(error);
    }
    return findConfigById(this.repo.listEnvironments(projectId), id, "PROJECT_ENVIRONMENT_CREATE_FAILED");
  }

  async updateEnvironment(
    projectId: string,
    environmentId: string,
    input: UpdateProjectConfigItemInput,
    ctx: RequestContext
  ): Promise<ProjectConfigItemEntity> {
    await this.access.requireProjectMaintainer(projectId, ctx, "update project environment");
    const changed = this.repo.updateEnvironment(projectId, environmentId, {
      name: input.name?.trim(),
      code: input.code === undefined ? undefined : input.code?.trim() || null,
      enabled: input.enabled,
      sort: input.sort,
      description: input.description === undefined ? undefined : input.description?.trim() || null,
      updatedAt: nowIso()
    });
    if (!changed) {
      throw new AppError(ERROR_CODES.PROJECT_ENVIRONMENT_NOT_FOUND, `environment not found: ${environmentId}`, 404);
    }
    return findConfigById(this.repo.listEnvironments(projectId), environmentId, "PROJECT_ENVIRONMENT_NOT_FOUND");
  }

  async removeEnvironment(projectId: string, environmentId: string, ctx: RequestContext): Promise<void> {
    await this.access.requireProjectMaintainer(projectId, ctx, "remove project environment");
    if (!this.repo.removeEnvironment(projectId, environmentId)) {
      throw new AppError(ERROR_CODES.PROJECT_ENVIRONMENT_NOT_FOUND, `environment not found: ${environmentId}`, 404);
    }
  }

  private resolveModuleOwnerUserId(projectId: string, value: string | null | undefined): string | null {
    const ownerUserId = trimToNull(value);
    if (!ownerUserId) {
      return null;
    }
    const member = this.repo.findMemberByProjectAndUserId(projectId, ownerUserId);
    if (!member) {
      throw new AppError(ERROR_CODES.PROJECT_MEMBER_NOT_FOUND, "模块负责人必须是项目成员", 400);
    }
    return ownerUserId;
  }

  private assertValidModuleParent(
    items: ProjectConfigItemEntity[],
    parentId: string | null | undefined,
    selfId: string | null,
    nodeType: "subsystem" | "module"
  ): void {
    const normalizedParentId = parentId?.trim() || null;
    if (!normalizedParentId) {
      return;
    }
    if (selfId && normalizedParentId === selfId) {
      throw new AppError(ERROR_CODES.PROJECT_MODULE_PARENT_INVALID, "不能选择自己作为父节点", 400);
    }
    const parent = items.find((item) => item.id === normalizedParentId);
    if (!parent) {
      throw new AppError(ERROR_CODES.PROJECT_MODULE_PARENT_INVALID, "父节点必须是同项目下的子项目/模块", 400);
    }
    if (nodeType === "subsystem" && parent.nodeType !== "subsystem") {
      throw new AppError(ERROR_CODES.PROJECT_MODULE_PARENT_INVALID, "子项目不能挂在模块下", 400);
    }
    if (selfId && this.isModuleDescendant(items, normalizedParentId, selfId)) {
      throw new AppError(ERROR_CODES.PROJECT_MODULE_PARENT_INVALID, "不能选择自己的下级作为父节点", 400);
    }
  }

  private isModuleDescendant(items: ProjectConfigItemEntity[], candidateId: string, ancestorId: string): boolean {
    let current = items.find((item) => item.id === candidateId);
    const visited = new Set<string>();
    while (current?.parentId) {
      if (current.parentId === ancestorId) {
        return true;
      }
      if (visited.has(current.parentId)) {
        return false;
      }
      visited.add(current.parentId);
      current = items.find((item) => item.id === current?.parentId);
    }
    return false;
  }
}
