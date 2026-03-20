import type { RequestContext } from "../../shared/context/request-context";
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
  CreateProjectInput,
  ListProjectsQuery,
  ProjectEntity,
  ProjectListResult,
  ProjectMemberEntity
} from "./project.types";

export class ProjectService implements ProjectCommandContract, ProjectQueryContract {
  constructor(
    private readonly repo: ProjectRepo,
    private readonly userRepo: UserRepo,
    private readonly access: ProjectAccessContract
  ) {}

  async create(input: CreateProjectInput, ctx: RequestContext): Promise<ProjectEntity> {
    requireAdmin(ctx);
    if (this.repo.findByKey(input.projectKey.trim())) {
      throw new AppError("PROJECT_KEY_EXISTS", `project key already exists: ${input.projectKey}`, 409);
    }

    const now = nowIso();
    const entity: ProjectEntity = {
      id: genId("prj"),
      projectKey: input.projectKey.trim(),
      name: input.name.trim(),
      description: input.description?.trim() || null,
      icon: input.icon?.trim() || null,
      status: "active",
      visibility: input.visibility ?? "internal",
      createdAt: now,
      updatedAt: now
    };

    this.repo.create(entity);
    return entity;
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

  async addMember(projectId: string, input: AddProjectMemberInput, ctx: RequestContext): Promise<ProjectMemberEntity> {
    requireAdmin(ctx);
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
      roleCode: input.roleCode?.trim() || "member",
      isOwner: input.isOwner === true,
      joinedAt: now,
      createdAt: now,
      updatedAt: now
    };

    this.repo.createMember(member);
    return member;
  }

  async removeMember(projectId: string, memberId: string, ctx: RequestContext): Promise<void> {
    requireAdmin(ctx);
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
}
