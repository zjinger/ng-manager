import Database from "better-sqlite3";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import type { RequestContext } from "../../shared/context/request-context";
import { customAlphabet } from "nanoid";
import { pinyin } from "pinyin-pro";
import { AppError } from "../../shared/errors/app-error";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import type { EventBus } from "../../shared/event/event-bus";
import type { ProjectCommandContract, ProjectQueryContract } from "./project.contract";
import type { ProjectAccessContract } from "./project-access.contract";
import { ProjectAuthorizationService } from "./project-authorization.service";
import { UserRepo } from "../user/user.repo";
import { RdRepo } from "../rd/rd.repo";
import { ProjectRepo } from "./project.repo";
import type {
  AddProjectModuleMemberInput,
  AddProjectMemberInput,
  CreateProjectFeaturePointInput,
  CreateProjectFeaturePointGroupInput,
  CreateProjectConfigItemInput,
  CreateProjectInput,
  CreateProjectVersionItemInput,
  ListProjectsQuery,
  ProjectFeaturePointEntity,
  ProjectFeaturePointGroupEntity,
  ProjectFeatureProgressMetric,
  ProjectFeatureProgressModuleNode,
  ProjectFeatureProgressOverrideEntity,
  ProjectFeatureProgressSettings,
  ProjectFeatureProgressView,
  ProjectConfigItemEntity,
  ProjectEntity,
  ProjectListResult,
  ProjectMemberCandidate,
  ProjectMemberEntity,
  ProjectMemberRole,
  ProjectModuleRdLinkEntity,
  ProjectModuleMemberEntity,
  ProjectType,
  ReplaceModuleRdLinksInput,
  DeleteProjectFeatureProgressOverrideInput,
  ProjectVersionItemEntity,
  UpdateProjectConfigItemInput,
  UpdateProjectFeaturePointInput,
  UpdateProjectFeaturePointGroupInput,
  UpdateProjectFeatureProgressSettingsInput,
  UpdateProjectMemberInput,
  UpdateProjectInput,
  UpsertProjectFeatureProgressOverrideInput,
  UpdateProjectVersionItemInput
} from "./project.types";
import type { RdStageEntity } from "../rd/rd.types";

const projectKeyNanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 24);
const DEFAULT_RD_STAGE_NAMES = [
  "需求确认",
  "方案设计",
  "功能开发",
  "测试验证",
  "交付上线",
  "项目结项"
] as const;

export class ProjectService implements ProjectCommandContract, ProjectQueryContract {
  constructor(
    private readonly repo: ProjectRepo,
    private readonly userRepo: UserRepo,
    private readonly rdRepo: RdRepo,
    private readonly access: ProjectAccessContract,
    private readonly authorization: ProjectAuthorizationService,
    private readonly eventBus: EventBus,
    private readonly db: Database.Database,
    private readonly initAdminUsername: string | null = null
  ) {}

  async create(input: CreateProjectInput, ctx: RequestContext): Promise<ProjectEntity> {
    const creatorId = ctx.userId?.trim();
    if (!creatorId || !this.authorization.canCreateProject(ctx)) {
      throw new AppError(ERROR_CODES.PROJECT_CREATE_FORBIDDEN, "create project forbidden", 403);
    }

    const creator = this.userRepo.findById(creatorId);
    if (!creator) {
      throw new AppError(ERROR_CODES.USER_NOT_FOUND, `user not found: ${creatorId}`, 404);
    }

    const projectName = input.name.trim();
    if (!projectName) {
      throw new AppError(ERROR_CODES.PROJECT_NAME_REQUIRED, "project name is required", 400);
    }
    const projectNo = this.resolveProjectNoForCreate(input.projectNo);
    const projectKey = this.generateUniqueProjectKey();

    const now = nowIso();
    const displayCode = this.resolveDisplayCodeForCreate(input.displayCode, projectName, projectKey);
    const typeFields = this.resolveProjectTypeFields(input);
    const entity: ProjectEntity = {
      id: genId("prj"),
      projectKey,
      projectNo,
      displayCode,
      name: projectName,
      description: input.description?.trim() || null,
      icon: input.icon?.trim() || null,
      avatarUploadId: input.avatarUploadId?.trim() || null,
      avatarUrl: input.avatarUploadId?.trim() ? `/api/admin/uploads/${input.avatarUploadId.trim()}/raw` : null,
      projectType: typeFields.projectType,
      contractNo: typeFields.contractNo,
      deliveryDate: typeFields.deliveryDate,
      productLine: typeFields.productLine,
      slaLevel: typeFields.slaLevel,
      status: "active",
      visibility: input.visibility ?? "internal",
      memberCount: 1,
      createdAt: now,
      updatedAt: now
    };

    const creatorMember: ProjectMemberEntity = {
      id: genId("pm"),
      projectId: entity.id,
      userId: creator.id,
      displayName: creator.displayName || creator.username,
      roleCode: "project_admin",
      isOwner: true,
      joinedAt: now,
      createdAt: now,
      updatedAt: now
    };

    try {
      this.db.transaction(() => {
        this.repo.create(entity);
        this.repo.createMember(creatorMember);
        for (const stage of this.buildDefaultRdStages(entity.id, now)) {
          this.rdRepo.createStage(stage);
        }
      })();
    } catch (error) {
      this.handleSqliteError(error);
    }

    return entity;
  }

  async update(projectId: string, input: UpdateProjectInput, ctx: RequestContext): Promise<ProjectEntity> {
    const current = this.repo.findById(projectId);
    if (!current) {
      throw new AppError(ERROR_CODES.PROJECT_NOT_FOUND, `project not found: ${projectId}`, 404);
    }
    const isStatusChanging = input.status !== undefined && input.status !== current.status;
    if (isStatusChanging) {
      await this.requireProjectArchiver(projectId, ctx, "archive project");
    } else {
      await this.requireProjectMaintainer(projectId, ctx, "update project");
    }

    const patch: UpdateProjectInput & { updatedAt: string } = {
      name: input.name?.trim(),
      projectNo: undefined,
      projectType: undefined,
      displayCode: undefined,
      description: input.description === undefined ? undefined : input.description?.trim() || null,
      icon: input.icon === undefined ? undefined : input.icon?.trim() || null,
      avatarUploadId: input.avatarUploadId === undefined ? undefined : input.avatarUploadId?.trim() || null,
      contractNo: undefined,
      deliveryDate: undefined,
      productLine: undefined,
      slaLevel: undefined,
      status: input.status,
      visibility: input.visibility,
      updatedAt: nowIso()
    };

    if (input.displayCode !== undefined) {
      const effectiveName = patch.name?.trim() || current.name;
      patch.displayCode = this.resolveDisplayCodeForUpdate(input.displayCode, effectiveName, projectId, current.projectKey);
    }
    if (input.projectNo !== undefined) {
      patch.projectNo = this.resolveProjectNoForUpdate(input.projectNo, projectId);
    }
    const typeFields = this.resolveProjectTypeFields(input, current);
    patch.projectType = typeFields.projectType;
    patch.contractNo = typeFields.contractNo;
    patch.deliveryDate = typeFields.deliveryDate;
    patch.productLine = typeFields.productLine;
    patch.slaLevel = typeFields.slaLevel;

    try {
      const changed = this.repo.update(projectId, patch);
      if (!changed) {
        throw new AppError(ERROR_CODES.PROJECT_UPDATE_FAILED, "failed to update project", 500);
      }
    } catch (error) {
      this.handleSqliteError(error);
    }

    const next = this.repo.findById(projectId);
    if (!next) {
      throw new AppError(ERROR_CODES.PROJECT_NOT_FOUND, `project not found: ${projectId}`, 404);
    }
    return next;
  }

  async list(query: ListProjectsQuery, ctx: RequestContext): Promise<ProjectListResult> {
    if (!this.authorization.canReadAllProjects(ctx)) {
      throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, "list projects forbidden", 403);
    }
    return this.repo.list(query);
  }

  async listAccessible(query: ListProjectsQuery, ctx: RequestContext): Promise<ProjectListResult> {
    const userId = ctx.userId?.trim();

    if (!userId) {
      return {
        items: [],
        page: query.page && query.page > 0 ? query.page : 1,
        pageSize: query.pageSize && query.pageSize > 0 ? query.pageSize : 20,
        total: 0
      };
    }

    if (this.authorization.canReadAllProjects(ctx) && query.scope !== "member_only") {
      return this.repo.list(query);
    }

    return this.repo.listAccessibleByUserId(userId, query);
  }

  async getById(projectId: string, ctx: RequestContext): Promise<ProjectEntity> {
    const project = this.repo.findById(projectId);
    if (!project) {
      throw new AppError(ERROR_CODES.PROJECT_NOT_FOUND, `project not found: ${projectId}`, 404);
    }

    await this.access.requireProjectAccess(projectId, ctx, "get project");
    return project;
  }

  async listMembers(projectId: string, ctx: RequestContext): Promise<ProjectMemberEntity[]> {
    await this.getById(projectId, ctx);
    return this.repo.listMembers(projectId);
  }

  async listMemberCandidates(projectId: string, ctx: RequestContext): Promise<ProjectMemberCandidate[]> {
    await this.requireProjectMaintainer(projectId, ctx, "list project member candidates");
    return this.repo.listActiveUserCandidates({ excludedUsername: this.initAdminUsername });
  }

  async addMember(projectId: string, input: AddProjectMemberInput, ctx: RequestContext): Promise<ProjectMemberEntity> {
    await this.requireProjectMaintainer(projectId, ctx, "add project member");
    const project = this.repo.findById(projectId);
    if (!project) {
      throw new AppError(ERROR_CODES.PROJECT_NOT_FOUND, `project not found: ${projectId}`, 404);
    }

    const user = this.userRepo.findById(input.userId.trim());
    if (!user) {
      throw new AppError(ERROR_CODES.USER_NOT_FOUND, `user not found: ${input.userId}`, 404);
    }

    if (this.repo.hasMember(project.id, user.id)) {
      throw new AppError(ERROR_CODES.PROJECT_MEMBER_EXISTS, "project member already exists", 409);
    }
    if (input.isOwner === true) {
      throw new AppError(ERROR_CODES.PROJECT_OWNER_IMMUTABLE, "owner is unique and cannot be reassigned", 400);
    }

    const now = nowIso();
    const member: ProjectMemberEntity = {
      id: genId("pm"),
      projectId: project.id,
      userId: user.id,
      displayName: user.displayName || user.username,
      roleCode: (input.roleCode ?? "member") as ProjectMemberRole,
      isOwner: false,
      joinedAt: now,
      createdAt: now,
      updatedAt: now
    };

    this.repo.createMember(member);
    await this.emitProjectMemberEvent(project, "member.added", member, ctx);
    return member;
  }

  async updateMember(
    projectId: string,
    memberId: string,
    input: UpdateProjectMemberInput,
    ctx: RequestContext
  ): Promise<ProjectMemberEntity> {
    const isOwnerTransfer = input.isOwner === true;
    if (!(isOwnerTransfer && this.authorization.canTransferAnyProjectOwner(ctx))) {
      await this.requireProjectMaintainer(projectId, ctx, "update project member");
    }
    const project = this.repo.findById(projectId);
    if (!project) {
      throw new AppError(ERROR_CODES.PROJECT_NOT_FOUND, `project not found: ${projectId}`, 404);
    }

    const current = this.repo.findMemberById(projectId, memberId);
    if (!current) {
      throw new AppError(ERROR_CODES.PROJECT_MEMBER_NOT_FOUND, `project member not found: ${memberId}`, 404);
    }

    const isRoleChanged = input.roleCode !== undefined && input.roleCode !== current.roleCode;
    const isOwnerChanged = input.isOwner !== undefined && input.isOwner !== current.isOwner;
    if (!isRoleChanged && !isOwnerChanged) {
      return current;
    }

    // Promote a member to owner: only current owner or global admin can transfer ownership.
    if (input.isOwner === true && !current.isOwner) {
      this.assertCanTransferOwner(projectId, ctx);
      const now = nowIso();
      const owners = this.repo.listMembers(projectId).filter((item) => item.isOwner && item.id !== current.id);

      this.db.transaction(() => {
        for (const owner of owners) {
          this.repo.updateMember(projectId, owner.id, {
            roleCode: "member",
            isOwner: false,
            updatedAt: now
          });
        }
        this.repo.updateMember(projectId, current.id, {
          roleCode: "project_admin",
          isOwner: true,
          updatedAt: now
        });
      })();

      const next = this.repo.findMemberById(projectId, memberId);
      if (!next) {
        throw new AppError(ERROR_CODES.PROJECT_MEMBER_NOT_FOUND, `project member not found: ${memberId}`, 404);
      }
      await this.emitProjectMemberEvent(project, "member.updated", next, ctx, current);
      return next;
    }

    if (input.isOwner === false && current.isOwner) {
      const ownerCount = this.repo.listMembers(projectId).filter((item) => item.isOwner).length;
      if (ownerCount <= 1) {
        throw new AppError(ERROR_CODES.PROJECT_OWNER_IMMUTABLE, "project must keep at least one owner", 400);
      }
    }

    const changed = this.repo.updateMember(projectId, memberId, {
      roleCode: input.roleCode,
      isOwner: input.isOwner,
      updatedAt: nowIso()
    });
    if (!changed) {
      return current;
    }

    const next = this.repo.findMemberById(projectId, memberId);
    if (!next) {
      throw new AppError(ERROR_CODES.PROJECT_MEMBER_NOT_FOUND, `project member not found: ${memberId}`, 404);
    }
    await this.emitProjectMemberEvent(project, "member.updated", next, ctx, current);
    return next;
  }

  async removeMember(projectId: string, memberId: string, ctx: RequestContext): Promise<void> {
    await this.requireProjectMaintainer(projectId, ctx, "remove project member");
    const project = this.repo.findById(projectId);
    if (!project) {
      throw new AppError(ERROR_CODES.PROJECT_NOT_FOUND, `project not found: ${projectId}`, 404);
    }

    const member = this.repo.findMemberById(projectId, memberId);
    if (!member) {
      throw new AppError(ERROR_CODES.PROJECT_MEMBER_NOT_FOUND, `project member not found: ${memberId}`, 404);
    }
    if (member.isOwner) {
      throw new AppError(ERROR_CODES.PROJECT_OWNER_IMMUTABLE, "project owner cannot be removed", 400);
    }

    if (!this.repo.deleteMember(projectId, memberId)) {
      throw new AppError(ERROR_CODES.PROJECT_MEMBER_DELETE_FAILED, "failed to remove project member", 500);
    }
    await this.emitProjectMemberEvent(project, "member.removed", member, ctx);
  }

  async listModules(projectId: string, ctx: RequestContext): Promise<ProjectConfigItemEntity[]> {
    await this.getById(projectId, ctx);
    return this.repo.listModules(projectId);
  }

  async getModule(projectId: string, moduleId: string, ctx: RequestContext): Promise<ProjectConfigItemEntity> {
    await this.getById(projectId, ctx);
    return this.findConfigById(this.repo.listModules(projectId), moduleId, ERROR_CODES.PROJECT_MODULE_NOT_FOUND);
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
    await this.getById(projectId, ctx);
    return this.repo.listProjectModuleRdLinks(projectId);
  }

  async addModule(projectId: string, input: CreateProjectConfigItemInput, ctx: RequestContext): Promise<ProjectConfigItemEntity> {
    await this.requireProjectMaintainer(projectId, ctx, "add project module");
    await this.getById(projectId, ctx);

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
        projectNo: this.trimToNull(input.projectNo) ?? undefined,
        parentId: input.parentId?.trim() || null,
        nodeType,
        ownerUserId: this.resolveModuleOwnerUserId(projectId, input.ownerUserId),
        iconCode: input.iconCode?.trim() || undefined,
        priority: input.priority,
        status: input.status,
        progress: input.progress,
        enabled: input.enabled,
        sort: input.sort ?? this.getNextSort(existingModules.map((item) => item.sort)),
        description: input.description?.trim(),
        createdAt: now,
        updatedAt: now
      });
    } catch (error) {
      this.handleSqliteError(error);
    }

    return this.findConfigById(this.repo.listModules(projectId), id, "PROJECT_MODULE_CREATE_FAILED");
  }

  async updateModule(
    projectId: string,
    moduleId: string,
    input: UpdateProjectConfigItemInput,
    ctx: RequestContext
  ): Promise<ProjectConfigItemEntity> {
    await this.requireProjectMaintainer(projectId, ctx, "update project module");
    const current = this.findConfigById(this.repo.listModules(projectId), moduleId, ERROR_CODES.PROJECT_MODULE_NOT_FOUND);
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
      projectNo: input.projectNo === undefined ? undefined : this.trimToNull(input.projectNo),
      parentId: input.parentId === undefined ? undefined : input.parentId?.trim() || null,
      nodeType: input.nodeType,
      ownerUserId:
        input.ownerUserId === undefined ? undefined : this.resolveModuleOwnerUserId(projectId, input.ownerUserId),
      iconCode: input.iconCode === undefined ? undefined : this.trimToNull(input.iconCode),
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
    return this.findConfigById(this.repo.listModules(projectId), moduleId, "PROJECT_MODULE_NOT_FOUND");
  }

  async removeModule(projectId: string, moduleId: string, ctx: RequestContext): Promise<void> {
    await this.requireProjectMaintainer(projectId, ctx, "remove project module");
    if (!this.repo.removeModule(projectId, moduleId)) {
      throw new AppError(ERROR_CODES.PROJECT_MODULE_NOT_FOUND, `module not found: ${moduleId}`, 404);
    }
  }

  async getFeatureProgressSettings(projectId: string, ctx: RequestContext): Promise<ProjectFeatureProgressSettings> {
    await this.getById(projectId, ctx);
    return this.resolveFeatureProgressSettings(projectId);
  }

  async updateFeatureProgressSettings(
    projectId: string,
    input: UpdateProjectFeatureProgressSettingsInput,
    ctx: RequestContext
  ): Promise<ProjectFeatureProgressSettings> {
    await this.requireProjectMaintainer(projectId, ctx, "update project feature progress settings");
    await this.getById(projectId, ctx);
    const now = nowIso();
    const current = this.repo.getFeatureProgressSettings(projectId);
    const settings: ProjectFeatureProgressSettings = {
      projectId,
      enabled: true,
      createdAt: current?.createdAt ?? now,
      updatedAt: now
    };
    this.repo.upsertFeatureProgressSettings(settings);
    return this.resolveFeatureProgressSettings(projectId);
  }

  async getFeatureProgress(projectId: string, ctx: RequestContext): Promise<ProjectFeatureProgressView> {
    const project = await this.getById(projectId, ctx);
    const settings = { ...this.resolveFeatureProgressSettings(projectId), enabled: true };
    const groups = this.repo.listFeaturePointGroups(projectId);
    const featurePoints = this.repo.listFeaturePoints(projectId).filter((item) => item.enabled);
    const overrides = this.repo.listFeatureProgressOverrides(projectId);
    return this.buildFeatureProgressView(project, settings, groups, featurePoints, overrides);
  }

  async addFeaturePoint(
    projectId: string,
    input: CreateProjectFeaturePointInput,
    ctx: RequestContext
  ): Promise<ProjectFeaturePointEntity> {
    await this.requireProjectMaintainer(projectId, ctx, "add project feature point");
    await this.getById(projectId, ctx);
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
      moduleName: groupSelection.moduleName,
      submoduleName: groupSelection.submoduleName,
      ownerUserId: ownerUserIds[0] ?? null,
      ownerUserIds,
      status: input.status,
      progress: input.progress,
      enabled: input.enabled,
      sort: input.sort ?? this.getNextSort(this.repo.listFeaturePoints(projectId).map((item) => item.sort)),
      remark: this.trimToNull(input.remark),
      createdAt: now,
      updatedAt: now
    });

    const created = this.repo.findFeaturePointById(projectId, id);
    if (!created) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "功能点创建失败", 500);
    }
    return created;
  }

  async addFeaturePointGroup(
    projectId: string,
    input: CreateProjectFeaturePointGroupInput,
    ctx: RequestContext
  ): Promise<ProjectFeaturePointGroupEntity> {
    await this.requireProjectMaintainer(projectId, ctx, "add project feature point group");
    await this.getById(projectId, ctx);
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
      sort: input.sort ?? this.getNextSort(groups.map((item) => item.sort)),
      remark: this.trimToNull(input.remark),
      createdAt: now,
      updatedAt: now
    });
    const created = this.repo.findFeaturePointGroupById(projectId, id);
    if (!created) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "功能点分组创建失败", 500);
    }
    return created;
  }

  async updateFeaturePointGroup(
    projectId: string,
    groupId: string,
    input: UpdateProjectFeaturePointGroupInput,
    ctx: RequestContext
  ): Promise<ProjectFeaturePointGroupEntity> {
    await this.requireProjectMaintainer(projectId, ctx, "update project feature point group");
    await this.getById(projectId, ctx);
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
      remark: input.remark === undefined ? undefined : this.trimToNull(input.remark),
      updatedAt: nowIso()
    });
    if (!changed) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "功能点分组不存在", 404);
    }
    return this.findFeaturePointGroup(projectId, groupId);
  }

  async removeFeaturePointGroup(projectId: string, groupId: string, ctx: RequestContext): Promise<void> {
    await this.requireProjectMaintainer(projectId, ctx, "remove project feature point group");
    await this.getById(projectId, ctx);
    this.findFeaturePointGroup(projectId, groupId);
    const childCount = this.repo.countFeaturePointGroupChildren(projectId, groupId);
    const featureCount = this.repo.countFeaturePointsByGroup(projectId, groupId);
    if (childCount > 0 || featureCount > 0) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "当前分组下仍有功能点，暂不支持删除", 400);
    }
    if (!this.repo.removeFeaturePointGroup(projectId, groupId)) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "功能点分组不存在", 404);
    }
  }

  async updateFeaturePoint(
    projectId: string,
    featurePointId: string,
    input: UpdateProjectFeaturePointInput,
    ctx: RequestContext
  ): Promise<ProjectFeaturePointEntity> {
    await this.requireProjectMaintainer(projectId, ctx, "update project feature point");
    await this.getById(projectId, ctx);
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
      moduleName: groupSelection.moduleName,
      submoduleName: groupSelection.submoduleName,
      ownerUserId: ownerUserIds === undefined ? undefined : ownerUserIds[0] ?? null,
      ownerUserIds,
      status: input.status,
      progress: input.progress,
      enabled: input.enabled,
      sort: input.sort,
      remark: input.remark === undefined ? undefined : this.trimToNull(input.remark),
      updatedAt: nowIso()
    });
    if (!changed) {
      return current;
    }

    const updated = this.repo.findFeaturePointById(projectId, featurePointId);
    if (!updated) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "功能点不存在", 404);
    }
    return updated;
  }

  async removeFeaturePoint(projectId: string, featurePointId: string, ctx: RequestContext): Promise<void> {
    await this.requireProjectMaintainer(projectId, ctx, "remove project feature point");
    await this.getById(projectId, ctx);
    if (!this.repo.removeFeaturePoint(projectId, featurePointId)) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "功能点不存在", 404);
    }
  }

  async upsertFeatureProgressOverride(
    projectId: string,
    input: UpsertProjectFeatureProgressOverrideInput,
    ctx: RequestContext
  ): Promise<ProjectFeatureProgressOverrideEntity> {
    await this.requireProjectMaintainer(projectId, ctx, "upsert project feature progress override");
    await this.getById(projectId, ctx);
    this.assertValidFeatureOverrideTarget(projectId, input.targetType, input.targetId);
    const now = nowIso();
    return this.repo.upsertFeatureProgressOverride({
      id: genId("pfpo"),
      projectId,
      targetType: input.targetType,
      targetId: input.targetId.trim(),
      progress: input.progress,
      remark: this.trimToNull(input.remark),
      createdAt: now,
      updatedAt: now
    });
  }

  async removeFeatureProgressOverride(
    projectId: string,
    input: DeleteProjectFeatureProgressOverrideInput,
    ctx: RequestContext
  ): Promise<void> {
    await this.requireProjectMaintainer(projectId, ctx, "remove project feature progress override");
    await this.getById(projectId, ctx);
    this.assertValidFeatureOverrideTarget(projectId, input.targetType, input.targetId);
    this.repo.removeFeatureProgressOverride(projectId, input.targetType, input.targetId.trim());
  }

  async addModuleMember(
    projectId: string,
    moduleId: string,
    input: AddProjectModuleMemberInput,
    ctx: RequestContext
  ): Promise<ProjectModuleMemberEntity> {
    await this.requireProjectMaintainer(projectId, ctx, "add project module member");
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
    await this.requireProjectMaintainer(projectId, ctx, "remove project module member");
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
    await this.requireProjectMaintainer(projectId, ctx, "replace project module rd links");
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
    await this.getById(projectId, ctx);
    return this.repo.listEnvironments(projectId);
  }

  async addEnvironment(
    projectId: string,
    input: CreateProjectConfigItemInput,
    ctx: RequestContext
  ): Promise<ProjectConfigItemEntity> {
    await this.requireProjectMaintainer(projectId, ctx, "add project environment");
    await this.getById(projectId, ctx);
    const now = nowIso();
    const id = genId("penv");
    try {
      this.repo.addEnvironment(projectId, {
        id,
        name: input.name.trim(),
        code: input.code?.trim(),
        enabled: input.enabled,
        sort: input.sort ?? this.getNextSort(this.repo.listEnvironments(projectId).map((item) => item.sort)),
        description: input.description?.trim(),
        createdAt: now,
        updatedAt: now
      });
    } catch (error) {
      this.handleSqliteError(error);
    }
    return this.findConfigById(this.repo.listEnvironments(projectId), id, "PROJECT_ENVIRONMENT_CREATE_FAILED");
  }

  async updateEnvironment(
    projectId: string,
    environmentId: string,
    input: UpdateProjectConfigItemInput,
    ctx: RequestContext
  ): Promise<ProjectConfigItemEntity> {
    await this.requireProjectMaintainer(projectId, ctx, "update project environment");
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
    return this.findConfigById(this.repo.listEnvironments(projectId), environmentId, "PROJECT_ENVIRONMENT_NOT_FOUND");
  }

  async removeEnvironment(projectId: string, environmentId: string, ctx: RequestContext): Promise<void> {
    await this.requireProjectMaintainer(projectId, ctx, "remove project environment");
    if (!this.repo.removeEnvironment(projectId, environmentId)) {
      throw new AppError(ERROR_CODES.PROJECT_ENVIRONMENT_NOT_FOUND, `environment not found: ${environmentId}`, 404);
    }
  }

  async listVersions(projectId: string, ctx: RequestContext): Promise<ProjectVersionItemEntity[]> {
    await this.getById(projectId, ctx);
    return this.repo.listVersions(projectId);
  }

  async addVersion(projectId: string, input: CreateProjectVersionItemInput, ctx: RequestContext): Promise<ProjectVersionItemEntity> {
    await this.requireProjectMaintainer(projectId, ctx, "add project version");
    await this.getById(projectId, ctx);
    const now = nowIso();
    const id = genId("pver");

    try {
      this.repo.addVersion(projectId, {
        id,
        version: input.version.trim(),
        code: input.code?.trim(),
        enabled: input.enabled,
        sort: input.sort ?? this.getNextSort(this.repo.listVersions(projectId).map((item) => item.sort)),
        description: input.description?.trim(),
        createdAt: now,
        updatedAt: now
      });
    } catch (error) {
      this.handleSqliteError(error);
    }

    return this.findVersionById(this.repo.listVersions(projectId), id, "PROJECT_VERSION_CREATE_FAILED");
  }

  async updateVersion(
    projectId: string,
    versionId: string,
    input: UpdateProjectVersionItemInput,
    ctx: RequestContext
  ): Promise<ProjectVersionItemEntity> {
    await this.requireProjectMaintainer(projectId, ctx, "update project version");
    const changed = this.repo.updateVersion(projectId, versionId, {
      version: input.version?.trim(),
      code: input.code === undefined ? undefined : input.code?.trim() || null,
      enabled: input.enabled,
      sort: input.sort,
      description: input.description === undefined ? undefined : input.description?.trim() || null,
      updatedAt: nowIso()
    });
    if (!changed) {
      throw new AppError(ERROR_CODES.PROJECT_VERSION_NOT_FOUND, `version not found: ${versionId}`, 404);
    }
    return this.findVersionById(this.repo.listVersions(projectId), versionId, "PROJECT_VERSION_NOT_FOUND");
  }

  async removeVersion(projectId: string, versionId: string, ctx: RequestContext): Promise<void> {
    await this.requireProjectMaintainer(projectId, ctx, "remove project version");
    if (!this.repo.removeVersion(projectId, versionId)) {
      throw new AppError(ERROR_CODES.PROJECT_VERSION_NOT_FOUND, `version not found: ${versionId}`, 404);
    }
  }

  private resolveFeatureProgressSettings(projectId: string): ProjectFeatureProgressSettings {
    const settings = this.repo.getFeatureProgressSettings(projectId);
    if (settings) {
      return settings;
    }
    const now = nowIso();
    return {
      projectId,
      enabled: true,
      createdAt: now,
      updatedAt: now
    };
  }

  private buildDisabledFeatureProgressView(
    projectId: string,
    settings: ProjectFeatureProgressSettings
  ): ProjectFeatureProgressView {
    return {
      projectId,
      enabled: false,
      settings,
      summary: {
        projectId,
        totalCount: 0,
        completedCount: 0,
        inProgressCount: 0,
        notStartedCount: 0,
        computedProgress: 0,
        manualProgress: null,
        overrideProgress: null,
        displayProgress: 0,
        overrideRemark: null
      },
      modules: [],
      ungrouped: {
        id: "ungrouped",
        name: "未分组",
        computedProgress: 0,
        manualProgress: null,
        overrideProgress: null,
        displayProgress: 0,
        overrideRemark: null,
        featureCount: 0,
        featurePoints: []
      }
    };
  }

  private buildFeatureProgressView(
    project: ProjectEntity,
    settings: ProjectFeatureProgressSettings,
    groups: ProjectFeaturePointGroupEntity[],
    featurePoints: ProjectFeaturePointEntity[],
    overrides: ProjectFeatureProgressOverrideEntity[]
  ): ProjectFeatureProgressView {
    const overrideMap = new Map(overrides.map((item) => [`${item.targetType}:${item.targetId}`, item]));
    const featuresByGroup = new Map<string, ProjectFeaturePointEntity[]>();
    const knownGroupIds = new Set(groups.map((item) => item.id));
    const ungroupedFeatures: ProjectFeaturePointEntity[] = [];

    for (const feature of featurePoints) {
      const groupId = feature.submoduleGroupId && knownGroupIds.has(feature.submoduleGroupId)
        ? feature.submoduleGroupId
        : feature.moduleGroupId && knownGroupIds.has(feature.moduleGroupId)
          ? feature.moduleGroupId
          : null;
      if (groupId) {
        featuresByGroup.set(groupId, [...(featuresByGroup.get(groupId) ?? []), feature]);
      } else {
        ungroupedFeatures.push(feature);
      }
    }

    const childGroups = new Map<string, ProjectFeaturePointGroupEntity[]>();
    const roots: ProjectFeaturePointGroupEntity[] = [];
    for (const group of [...groups].sort((left, right) => left.sort - right.sort || left.name.localeCompare(right.name))) {
      if (group.parentId && knownGroupIds.has(group.parentId)) {
        childGroups.set(group.parentId, [...(childGroups.get(group.parentId) ?? []), group]);
      } else {
        roots.push(group);
      }
    }

    const buildNode = (group: ProjectFeaturePointGroupEntity): ProjectFeatureProgressModuleNode => {
      const children = (childGroups.get(group.id) ?? [])
        .map(buildNode)
        .filter((child) => child.featureCount > 0);
      const directFeatures = featuresByGroup.get(group.id) ?? [];
      const descendantFeatures = [
        ...directFeatures,
        ...children.flatMap((child) => this.collectFeaturePointsFromNode(child))
      ];
      const computedProgress = this.averageProgress(descendantFeatures);
      const metric = this.applyFeatureGroupManualProgress(computedProgress, group.manualProgress, group.remark);
      return {
        ...metric,
        id: group.id,
        projectId: group.projectId,
        name: group.name,
        code: null,
        nodeType: group.parentId ? "module" : "subsystem",
        parentId: group.parentId,
        parentName: group.parentId ? groups.find((item) => item.id === group.parentId)?.name ?? null : null,
        sort: group.sort,
        featureCount: descendantFeatures.length,
        children,
        featurePoints: directFeatures
      };
    };

    const moduleNodes = roots.map(buildNode).filter((node) => node.featureCount > 0);
    const computedProgress = this.averageProgress(featurePoints);
    const summaryMetric = this.applyFeatureProgressOverride(
      computedProgress,
      overrideMap.get(`project:${project.id}`) ?? null
    );
    const ungroupedProgress = this.averageProgress(ungroupedFeatures);

    return {
      projectId: project.id,
      enabled: settings.enabled,
      settings,
      summary: {
        projectId: project.id,
        totalCount: featurePoints.length,
        completedCount: featurePoints.filter((item) => item.status === "done" || item.progress >= 100).length,
        inProgressCount: featurePoints.filter((item) => item.status === "in_progress" || (item.progress > 0 && item.progress < 100)).length,
        notStartedCount: featurePoints.filter((item) => item.status === "todo" || item.progress <= 0).length,
        ...summaryMetric
      },
      modules: moduleNodes,
      ungrouped: {
        id: "ungrouped",
        name: "未分组",
        computedProgress: ungroupedProgress,
        manualProgress: null,
        overrideProgress: null,
        displayProgress: ungroupedProgress,
        overrideRemark: null,
        featureCount: ungroupedFeatures.length,
        featurePoints: ungroupedFeatures
      }
    };
  }

  private collectFeaturePointsFromNode(node: ProjectFeatureProgressModuleNode): ProjectFeaturePointEntity[] {
    return [
      ...node.featurePoints,
      ...node.children.flatMap((child) => this.collectFeaturePointsFromNode(child))
    ];
  }

  private averageProgress(items: ProjectFeaturePointEntity[]): number {
    if (items.length === 0) {
      return 0;
    }
    return Math.round(items.reduce((sum, item) => sum + this.normalizeProgress(item.progress), 0) / items.length);
  }

  private applyFeatureProgressOverride(
    computedProgress: number,
    override: ProjectFeatureProgressOverrideEntity | null
  ): ProjectFeatureProgressMetric {
    const overrideProgress = override ? this.normalizeProgress(override.progress) : null;
    return {
      computedProgress,
      manualProgress: overrideProgress,
      overrideProgress,
      displayProgress: overrideProgress ?? computedProgress,
      overrideRemark: override?.remark ?? null
    };
  }

  private applyFeatureGroupManualProgress(
    computedProgress: number,
    manualProgress: number | null,
    remark: string | null
  ): ProjectFeatureProgressMetric {
    const normalizedManualProgress = manualProgress === null ? null : this.normalizeProgress(manualProgress);
    return {
      computedProgress,
      manualProgress: normalizedManualProgress,
      overrideProgress: normalizedManualProgress,
      displayProgress: normalizedManualProgress ?? computedProgress,
      overrideRemark: normalizedManualProgress === null ? null : remark
    };
  }

  private normalizeProgress(progress: number | null | undefined): number {
    const value = Number(progress ?? 0);
    return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0;
  }

  private findFeaturePointGroup(projectId: string, groupId: string): ProjectFeaturePointGroupEntity {
    const group = this.repo.findFeaturePointGroupById(projectId, groupId.trim());
    if (!group) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "功能点分组不存在", 404);
    }
    return group;
  }

  private resolveFeaturePointGroupParent(
    projectId: string,
    parentId: string | null | undefined,
    selfId: string | null
  ): string | null {
    const normalizedParentId = this.trimToNull(parentId);
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
    const explicitSubmoduleGroupId = this.trimToNull(input.submoduleGroupId);
    if (explicitSubmoduleGroupId) {
      const submoduleGroup = this.findFeaturePointGroup(projectId, explicitSubmoduleGroupId);
      if (!submoduleGroup.parentId) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, "子模块分组必须选择二级分组", 400);
      }
      const moduleGroup = this.findFeaturePointGroup(projectId, submoduleGroup.parentId);
      const explicitModuleGroupId = this.trimToNull(input.moduleGroupId);
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

    const explicitModuleGroupId = this.trimToNull(input.moduleGroupId);
    if (explicitModuleGroupId) {
      const moduleGroup = this.findFeaturePointGroup(projectId, explicitModuleGroupId);
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

    const moduleName = this.trimToNull(input.moduleName);
    if (!moduleName) {
      return {
        moduleGroupId: null,
        submoduleGroupId: null,
        moduleName: null,
        submoduleName: null
      };
    }

    const moduleGroup = this.findOrCreateFeaturePointGroup(projectId, null, moduleName);
    const submoduleName = this.trimToNull(input.submoduleName);
    if (!submoduleName) {
      return {
        moduleGroupId: moduleGroup.id,
        submoduleGroupId: null,
        moduleName: moduleGroup.name,
        submoduleName: null
      };
    }
    const submoduleGroup = this.findOrCreateFeaturePointGroup(projectId, moduleGroup.id, submoduleName);
    return {
      moduleGroupId: moduleGroup.id,
      submoduleGroupId: submoduleGroup.id,
      moduleName: moduleGroup.name,
      submoduleName: submoduleGroup.name
    };
  }

  private findOrCreateFeaturePointGroup(
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
      sort: this.getNextSort(groups.map((item) => item.sort)),
      remark: null,
      createdAt: now,
      updatedAt: now
    });
    const created = this.repo.findFeaturePointGroupById(projectId, id);
    if (!created) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "功能点分组创建失败", 500);
    }
    return created;
  }

  private resolveFeatureOwnerUserId(projectId: string, value: string | null | undefined): string | null {
    const ownerUserId = this.trimToNull(value);
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

  private async requireProjectMaintainer(projectId: string, ctx: RequestContext, action: string): Promise<void> {
    if (this.authorization.canManageAllProjects(ctx)) {
      return;
    }

    const userId = ctx.userId?.trim();
    if (!userId) {
      throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, `${action} forbidden`, 403);
    }

    let member: ProjectMemberEntity;
    try {
      member = await this.access.requireProjectMember(projectId, userId, action);
    } catch (error) {
      if (error instanceof AppError && error.code === ERROR_CODES.PROJECT_MEMBER_NOT_FOUND) {
        throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, "无权限执行该操作，需要项目管理员权限", 403);
      }
      throw error;
    }
    if (member.roleCode !== "project_admin" && !member.isOwner) {
      throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, "无权限执行该操作，需要项目管理员权限", 403);
    }
  }

  private assertCanTransferOwner(projectId: string, ctx: RequestContext): void {
    if (this.authorization.canTransferAnyProjectOwner(ctx)) {
      return;
    }
    const userId = ctx.userId?.trim();
    if (!userId) {
      throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, "无权限转移项目 Owner", 403);
    }
    const operator = this.repo.findMemberByProjectAndUserId(projectId, userId);
    if (!operator?.isOwner) {
      throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, "仅项目 Owner 可转移拥有者", 403);
    }
  }

  private async requireProjectArchiver(projectId: string, ctx: RequestContext, action: string): Promise<void> {
    if (this.authorization.canArchiveAnyProject(ctx)) {
      return;
    }

    const userId = ctx.userId?.trim();
    if (!userId) {
      throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, `${action} forbidden`, 403);
    }
    if (!this.authorization.isProjectOwner(projectId, userId)) {
      throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, "无权限执行该操作，需要项目 Owner 或全局归档权限", 403);
    }
  }

  private generateUniqueProjectKey(): string {
    let attempt = 0;
    while (attempt < 20) {
      const candidate = `prj_${projectKeyNanoid()}`;
      if (!this.repo.findByKey(candidate)) {
        return candidate;
      }
      attempt += 1;
    }
    throw new AppError(ERROR_CODES.PROJECT_KEY_GENERATE_FAILED, "failed to generate unique project key", 500);
  }

  private resolveProjectNoForCreate(value: string): string {
    const projectNo = value.trim();
    if (!projectNo) {
      throw new AppError(ERROR_CODES.PROJECT_NO_REQUIRED, "project number is required", 400);
    }
    if (this.repo.findByProjectNo(projectNo)) {
      throw new AppError(ERROR_CODES.PROJECT_NO_CONFLICT, `项目编号已存在：${projectNo}`, 409);
    }
    return projectNo;
  }

  private resolveProjectNoForUpdate(value: string, projectId: string): string {
    const projectNo = value.trim();
    if (!projectNo) {
      throw new AppError(ERROR_CODES.PROJECT_NO_REQUIRED, "project number is required", 400);
    }
    const hit = this.repo.findByProjectNo(projectNo);
    if (hit && hit.id !== projectId) {
      throw new AppError(ERROR_CODES.PROJECT_NO_CONFLICT, `项目编号已存在：${projectNo}`, 409);
    }
    return projectNo;
  }

  private normalizeDisplayCode(value: string | null | undefined, projectName: string): string | null {
    const explicit = value?.trim().toUpperCase() || "";
    if (explicit) {
      const normalized = explicit.replace(/[^A-Z0-9]/g, "").slice(0, 3);
      if (normalized) {
        return normalized;
      }
    }

    const pinyinAbbr = this.toPinyinAbbr(projectName);
    if (pinyinAbbr) {
      return pinyinAbbr;
    }

    const compactAscii = projectName
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    if (compactAscii.length >= 3) {
      return compactAscii.slice(0, 3);
    }
    if (compactAscii.length > 0) {
      return compactAscii.padEnd(3, "X");
    }

    const hash = this.hashName(projectName);
    return `P${hash.toString(36).toUpperCase().slice(0, 2).padEnd(2, "0")}`;
  }

  private resolveDisplayCodeForCreate(value: string | undefined, projectName: string, projectKey: string): string | null {
    const input = value?.trim() || "";
    if (input) {
      const normalized = this.normalizeDisplayCode(input, projectName);
      if (!normalized) {
        return null;
      }
      if (this.repo.findByDisplayCode(normalized)) {
        throw new AppError(ERROR_CODES.PROJECT_DISPLAY_CODE_CONFLICT, `项目标识已存在：${normalized}`, 409);
      }
      return normalized;
    }
    return this.resolveAutoUniqueDisplayCode(projectName, projectKey);
  }

  private resolveDisplayCodeForUpdate(
    value: string | null | undefined,
    projectName: string,
    projectId: string,
    projectKey: string
  ): string | null {
    if (value === null) {
      return null;
    }
    const input = value?.trim() || "";
    if (input) {
      const normalized = this.normalizeDisplayCode(input, projectName);
      if (!normalized) {
        return null;
      }
      const hit = this.repo.findByDisplayCode(normalized);
      if (hit && hit.id !== projectId) {
        throw new AppError(ERROR_CODES.PROJECT_DISPLAY_CODE_CONFLICT, `项目标识已存在：${normalized}`, 409);
      }
      return normalized;
    }
    return this.resolveAutoUniqueDisplayCode(projectName, projectKey, projectId);
  }

  private resolveAutoUniqueDisplayCode(projectName: string, projectKeySeed: string, excludeProjectId?: string): string | null {
    const base = this.normalizeDisplayCode(undefined, projectName);
    if (!base) {
      return null;
    }
    const candidates = this.buildAutoDisplayCodeCandidates(base, `${projectName}|${projectKeySeed}`);
    for (const candidate of candidates) {
      const hit = this.repo.findByDisplayCode(candidate);
      if (!hit || hit.id === excludeProjectId) {
        return candidate;
      }
    }
    throw new AppError(ERROR_CODES.PROJECT_DISPLAY_CODE_GENERATE_FAILED, "failed to generate unique displayCode", 500);
  }

  private buildAutoDisplayCodeCandidates(base: string, seed: string): string[] {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const normalizedBase = base.slice(0, 3).padEnd(3, "X");
    const hash = this.hashName(seed);
    const seen = new Set<string>();
    const result: string[] = [];

    const push = (value: string) => {
      const candidate = value.slice(0, 3).padEnd(3, "X").toUpperCase();
      if (!seen.has(candidate)) {
        seen.add(candidate);
        result.push(candidate);
      }
    };

    push(normalizedBase);
    push(`${normalizedBase.slice(0, 2)}${chars[hash % chars.length]}`);
    push(`${normalizedBase.slice(0, 1)}${chars[Math.floor(hash / 23) % chars.length]}${chars[Math.floor(hash / 529) % chars.length]}`);

    for (let i = 0; i < chars.length; i += 1) {
      push(`${normalizedBase.slice(0, 2)}${chars[(hash + i) % chars.length]}`);
    }
    for (let i = 0; i < chars.length * chars.length; i += 1) {
      const c1 = chars[(hash + i) % chars.length];
      const c2 = chars[(Math.floor(hash / chars.length) + i) % chars.length];
      push(`${normalizedBase.slice(0, 1)}${c1}${c2}`);
    }

    return result;
  }

  private toPinyinAbbr(projectName: string): string | null {
    if (!/[\u3400-\u9FFF]/.test(projectName)) {
      return null;
    }

    const result = pinyin(projectName, { toneType: "none", type: "array" }) as string[] | string;
    const syllables = Array.isArray(result)
      ? result
      : String(result)
          .split(/[\s,]+/)
          .map((item) => item.trim())
          .filter(Boolean);

    const letters = syllables
      .map((item) => item.replace(/[^a-zA-Z]/g, ""))
      .filter(Boolean)
      .map((item) => item[0].toUpperCase());

    if (letters.length === 0) {
      return null;
    }

    return letters.join("").slice(0, 3).padEnd(3, "X");
  }

  private hashName(value: string): number {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash >>> 0);
  }

  private getNextSort(values: number[]): number {
    const maxSort = values.length ? Math.max(...values) : 0;
    return maxSort + 10;
  }

  private resolveProjectTypeFields(
    input: Pick<UpdateProjectInput, "projectType" | "contractNo" | "deliveryDate" | "productLine" | "slaLevel">,
    current?: ProjectEntity
  ): {
    projectType: ProjectType;
    contractNo: string | null;
    deliveryDate: string | null;
    productLine: string | null;
    slaLevel: string | null;
  } {
    const projectType = input.projectType ?? current?.projectType;
    if (!projectType) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "项目类型不能为空", 400);
    }

    const contractNo = this.trimToNull(input.contractNo === undefined ? current?.contractNo : input.contractNo);
    const deliveryDate = this.trimToNull(input.deliveryDate === undefined ? current?.deliveryDate : input.deliveryDate);
    const productLine = this.trimToNull(input.productLine === undefined ? current?.productLine : input.productLine);
    const slaLevel = this.trimToNull(input.slaLevel === undefined ? current?.slaLevel : input.slaLevel);

    if (deliveryDate && !/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate)) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "交付日期格式必须为 yyyy-MM-dd", 400);
    }
    return {
      projectType,
      contractNo,
      deliveryDate,
      productLine: null,
      slaLevel: null
    };
  }

  private trimToNull(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private resolveModuleOwnerUserId(projectId: string, value: string | null | undefined): string | null {
    const ownerUserId = this.trimToNull(value);
    if (!ownerUserId) {
      return null;
    }
    const member = this.repo.findMemberByProjectAndUserId(projectId, ownerUserId);
    if (!member) {
      throw new AppError(ERROR_CODES.PROJECT_MEMBER_NOT_FOUND, "模块负责人必须是项目成员", 400);
    }
    return ownerUserId;
  }

  private findConfigById(items: ProjectConfigItemEntity[], id: string, code: string): ProjectConfigItemEntity {
    const hit = items.find((item) => item.id === id);
    if (!hit) {
      throw new AppError(code, "config item not found", 500);
    }
    return hit;
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

  private findVersionById(items: ProjectVersionItemEntity[], id: string, code: string): ProjectVersionItemEntity {
    const hit = items.find((item) => item.id === id);
    if (!hit) {
      throw new AppError(code, "version item not found", 500);
    }
    return hit;
  }

  private buildDefaultRdStages(projectId: string, timestamp: string): RdStageEntity[] {
    return DEFAULT_RD_STAGE_NAMES.map((name, index) => ({
      id: genId("rds"),
      projectId,
      name,
      sort: (index + 1) * 10,
      enabled: true,
      createdAt: timestamp,
      updatedAt: timestamp
    }));
  }

  private handleSqliteError(error: unknown): never {
    if (error instanceof AppError) {
      throw error;
    }
    if (error instanceof Database.SqliteError && error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      const message = error.message || "";
      if (message.includes("idx_projects_project_no") || message.includes("projects.project_no")) {
        throw new AppError(ERROR_CODES.PROJECT_NO_CONFLICT, "project number already exists", 409);
      }
      if (message.includes("uq_project_module_members_module_user")) {
        throw new AppError(ERROR_CODES.PROJECT_MODULE_MEMBER_EXISTS, "project module member already exists", 409);
      }
      throw new AppError(ERROR_CODES.PROJECT_CONFLICT, "resource already exists", 409);
    }
    throw error;
  }

  private async emitProjectMemberEvent(
    project: ProjectEntity,
    action: "member.added" | "member.updated" | "member.removed",
    target: ProjectMemberEntity,
    ctx: RequestContext,
    previous?: ProjectMemberEntity
  ): Promise<void> {
    await this.eventBus.emit({
      type: `project.${action}`,
      scope: "project",
      projectId: project.id,
      entityType: "project",
      entityId: project.id,
      action,
      actorId: ctx.userId?.trim() || ctx.accountId,
      occurredAt: nowIso(),
      payload: {
        projectName: project.name,
        targetUserId: target.userId,
        targetDisplayName: target.displayName,
        roleCode: target.roleCode,
        prevRoleCode: previous?.roleCode
      }
    });
  }
}
