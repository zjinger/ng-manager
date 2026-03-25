import Database from "better-sqlite3";
import type { RequestContext } from "../../shared/context/request-context";
import { customAlphabet } from "nanoid";
import { AppError } from "../../shared/errors/app-error";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import type { ProjectCommandContract, ProjectQueryContract } from "./project.contract";
import type { ProjectAccessContract } from "./project-access.contract";
import { UserRepo } from "../user/user.repo";
import { requireAdmin } from "../utils/require-admin";
import { ProjectRepo } from "./project.repo";
import type {
  AddProjectMemberInput,
  CreateProjectConfigItemInput,
  CreateProjectInput,
  CreateProjectVersionItemInput,
  ListProjectsQuery,
  ProjectConfigItemEntity,
  ProjectEntity,
  ProjectListResult,
  ProjectMemberCandidate,
  ProjectMemberEntity,
  ProjectMemberRole,
  ProjectVersionItemEntity,
  UpdateProjectConfigItemInput,
  UpdateProjectInput,
  UpdateProjectVersionItemInput
} from "./project.types";

const projectKeyNanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 24);

export class ProjectService implements ProjectCommandContract, ProjectQueryContract {
  constructor(
    private readonly repo: ProjectRepo,
    private readonly userRepo: UserRepo,
    private readonly access: ProjectAccessContract
  ) {}

  async create(input: CreateProjectInput, ctx: RequestContext): Promise<ProjectEntity> {
    const creatorId = ctx.userId?.trim();
    if (!creatorId) {
      throw new AppError("PROJECT_CREATE_FORBIDDEN", "create project forbidden", 403);
    }

    const creator = this.userRepo.findById(creatorId);
    if (!creator) {
      throw new AppError("USER_NOT_FOUND", `user not found: ${creatorId}`, 404);
    }

    const projectName = input.name.trim();
    if (!projectName) {
      throw new AppError("PROJECT_NAME_REQUIRED", "project name is required", 400);
    }
    const projectKey = this.generateUniqueProjectKey();

    const now = nowIso();
    const entity: ProjectEntity = {
      id: genId("prj"),
      projectKey,
      displayCode: this.normalizeDisplayCode(input.displayCode, projectName),
      name: projectName,
      description: input.description?.trim() || null,
      icon: input.icon?.trim() || null,
      avatarUploadId: input.avatarUploadId?.trim() || null,
      avatarUrl: input.avatarUploadId?.trim() ? `/api/admin/uploads/${input.avatarUploadId.trim()}/raw` : null,
      status: "active",
      visibility: input.visibility ?? "internal",
      createdAt: now,
      updatedAt: now
    };

    this.repo.create(entity);

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
    this.repo.createMember(creatorMember);

    return entity;
  }

  async update(projectId: string, input: UpdateProjectInput, ctx: RequestContext): Promise<ProjectEntity> {
    await this.requireProjectMaintainer(projectId, ctx, "update project");
    const current = this.repo.findById(projectId);
    if (!current) {
      throw new AppError("PROJECT_NOT_FOUND", `project not found: ${projectId}`, 404);
    }

    const patch: UpdateProjectInput & { updatedAt: string } = {
      name: input.name?.trim(),
      displayCode:
        input.displayCode === undefined
          ? undefined
          : input.displayCode === null
            ? null
            : this.normalizeDisplayCode(input.displayCode, current.name),
      description: input.description === undefined ? undefined : input.description?.trim() || null,
      icon: input.icon === undefined ? undefined : input.icon?.trim() || null,
      avatarUploadId: input.avatarUploadId === undefined ? undefined : input.avatarUploadId?.trim() || null,
      status: input.status,
      visibility: input.visibility,
      updatedAt: nowIso()
    };

    try {
      const changed = this.repo.update(projectId, patch);
      if (!changed) {
        throw new AppError("PROJECT_UPDATE_FAILED", "failed to update project", 500);
      }
    } catch (error) {
      this.handleSqliteError(error);
    }

    const next = this.repo.findById(projectId);
    if (!next) {
      throw new AppError("PROJECT_NOT_FOUND", `project not found: ${projectId}`, 404);
    }
    return next;
  }

  async list(query: ListProjectsQuery, ctx: RequestContext): Promise<ProjectListResult> {
    requireAdmin(ctx);
    return this.repo.list(query);
  }

  async listAccessible(query: ListProjectsQuery, ctx: RequestContext): Promise<ProjectListResult> {
    if (ctx.roles.includes("admin")) {
      return this.repo.list(query);
    }

    const userId = ctx.userId?.trim();
    if (!userId) {
      return {
        items: [],
        page: query.page && query.page > 0 ? query.page : 1,
        pageSize: query.pageSize && query.pageSize > 0 ? query.pageSize : 20,
        total: 0
      };
    }

    return this.repo.listAccessibleByUserId(userId, query);
  }

  async getById(projectId: string, ctx: RequestContext): Promise<ProjectEntity> {
    const project = this.repo.findById(projectId);
    if (!project) {
      throw new AppError("PROJECT_NOT_FOUND", `project not found: ${projectId}`, 404);
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
    return this.repo.listActiveUserCandidates();
  }

  async addMember(projectId: string, input: AddProjectMemberInput, ctx: RequestContext): Promise<ProjectMemberEntity> {
    await this.requireProjectMaintainer(projectId, ctx, "add project member");
    const project = this.repo.findById(projectId);
    if (!project) {
      throw new AppError("PROJECT_NOT_FOUND", `project not found: ${projectId}`, 404);
    }

    const user = this.userRepo.findById(input.userId.trim());
    if (!user) {
      throw new AppError("USER_NOT_FOUND", `user not found: ${input.userId}`, 404);
    }

    if (this.repo.hasMember(project.id, user.id)) {
      throw new AppError("PROJECT_MEMBER_EXISTS", "project member already exists", 409);
    }

    const now = nowIso();
    const member: ProjectMemberEntity = {
      id: genId("pm"),
      projectId: project.id,
      userId: user.id,
      displayName: user.displayName || user.username,
      roleCode: (input.roleCode ?? "member") as ProjectMemberRole,
      isOwner: input.isOwner === true,
      joinedAt: now,
      createdAt: now,
      updatedAt: now
    };

    this.repo.createMember(member);
    return member;
  }

  async removeMember(projectId: string, memberId: string, ctx: RequestContext): Promise<void> {
    await this.requireProjectMaintainer(projectId, ctx, "remove project member");
    const project = this.repo.findById(projectId);
    if (!project) {
      throw new AppError("PROJECT_NOT_FOUND", `project not found: ${projectId}`, 404);
    }

    const member = this.repo.findMemberById(projectId, memberId);
    if (!member) {
      throw new AppError("PROJECT_MEMBER_NOT_FOUND", `project member not found: ${memberId}`, 404);
    }

    if (!this.repo.deleteMember(projectId, memberId)) {
      throw new AppError("PROJECT_MEMBER_DELETE_FAILED", "failed to remove project member", 500);
    }
  }

  async listModules(projectId: string, ctx: RequestContext): Promise<ProjectConfigItemEntity[]> {
    await this.getById(projectId, ctx);
    return this.repo.listModules(projectId);
  }

  async addModule(projectId: string, input: CreateProjectConfigItemInput, ctx: RequestContext): Promise<ProjectConfigItemEntity> {
    await this.requireProjectMaintainer(projectId, ctx, "add project module");
    await this.getById(projectId, ctx);

    const now = nowIso();
    const id = genId("pmod");
    try {
      this.repo.addModule(projectId, {
        id,
        name: input.name.trim(),
        code: input.code?.trim(),
        enabled: input.enabled,
        sort: input.sort ?? this.getNextSort(this.repo.listModules(projectId).map((item) => item.sort)),
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
    const changed = this.repo.updateModule(projectId, moduleId, {
      name: input.name?.trim(),
      code: input.code === undefined ? undefined : input.code?.trim() || null,
      enabled: input.enabled,
      sort: input.sort,
      description: input.description === undefined ? undefined : input.description?.trim() || null,
      updatedAt: nowIso()
    });
    if (!changed) {
      throw new AppError("PROJECT_MODULE_NOT_FOUND", `module not found: ${moduleId}`, 404);
    }
    return this.findConfigById(this.repo.listModules(projectId), moduleId, "PROJECT_MODULE_NOT_FOUND");
  }

  async removeModule(projectId: string, moduleId: string, ctx: RequestContext): Promise<void> {
    await this.requireProjectMaintainer(projectId, ctx, "remove project module");
    if (!this.repo.removeModule(projectId, moduleId)) {
      throw new AppError("PROJECT_MODULE_NOT_FOUND", `module not found: ${moduleId}`, 404);
    }
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
      throw new AppError("PROJECT_ENVIRONMENT_NOT_FOUND", `environment not found: ${environmentId}`, 404);
    }
    return this.findConfigById(this.repo.listEnvironments(projectId), environmentId, "PROJECT_ENVIRONMENT_NOT_FOUND");
  }

  async removeEnvironment(projectId: string, environmentId: string, ctx: RequestContext): Promise<void> {
    await this.requireProjectMaintainer(projectId, ctx, "remove project environment");
    if (!this.repo.removeEnvironment(projectId, environmentId)) {
      throw new AppError("PROJECT_ENVIRONMENT_NOT_FOUND", `environment not found: ${environmentId}`, 404);
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
      throw new AppError("PROJECT_VERSION_NOT_FOUND", `version not found: ${versionId}`, 404);
    }
    return this.findVersionById(this.repo.listVersions(projectId), versionId, "PROJECT_VERSION_NOT_FOUND");
  }

  async removeVersion(projectId: string, versionId: string, ctx: RequestContext): Promise<void> {
    await this.requireProjectMaintainer(projectId, ctx, "remove project version");
    if (!this.repo.removeVersion(projectId, versionId)) {
      throw new AppError("PROJECT_VERSION_NOT_FOUND", `version not found: ${versionId}`, 404);
    }
  }

  private async requireProjectMaintainer(projectId: string, ctx: RequestContext, action: string): Promise<void> {
    if (ctx.roles.includes("admin")) {
      return;
    }

    const userId = ctx.userId?.trim();
    if (!userId) {
      throw new AppError("PROJECT_ACCESS_DENIED", `${action} forbidden`, 403);
    }

    const member = await this.access.requireProjectMember(projectId, userId, action);
    if (member.roleCode !== "project_admin" && !member.isOwner) {
      throw new AppError("PROJECT_ACCESS_DENIED", `${action} forbidden`, 403);
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
    throw new AppError("PROJECT_KEY_GENERATE_FAILED", "failed to generate unique project key", 500);
  }

  private normalizeDisplayCode(value: string | null | undefined, projectName: string): string | null {
    const input = value?.trim();
    if (input) {
      return input.slice(0, 24);
    }
    const words = projectName
      .split(/[\s\-_.]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }
    if (/^[a-z0-9\s\-_.]+$/i.test(projectName)) {
      const compact = projectName.replace(/[\s\-_.]+/g, "");
      return compact.slice(0, 2).toUpperCase() || null;
    }
    return projectName.slice(0, 2) || null;
  }

  private getNextSort(values: number[]): number {
    const maxSort = values.length ? Math.max(...values) : 0;
    return maxSort + 10;
  }

  private findConfigById(items: ProjectConfigItemEntity[], id: string, code: string): ProjectConfigItemEntity {
    const hit = items.find((item) => item.id === id);
    if (!hit) {
      throw new AppError(code, "config item not found", 500);
    }
    return hit;
  }

  private findVersionById(items: ProjectVersionItemEntity[], id: string, code: string): ProjectVersionItemEntity {
    const hit = items.find((item) => item.id === id);
    if (!hit) {
      throw new AppError(code, "version item not found", 500);
    }
    return hit;
  }

  private handleSqliteError(error: unknown): never {
    if (error instanceof AppError) {
      throw error;
    }
    if (error instanceof Database.SqliteError && error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      throw new AppError("PROJECT_CONFLICT", "resource already exists", 409);
    }
    throw error;
  }
}
