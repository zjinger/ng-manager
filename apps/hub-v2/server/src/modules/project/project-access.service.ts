import { ERROR_CODES } from "../../shared/errors/error-codes";
import type { RequestContext } from "../../shared/context/request-context";
import { AppError } from "../../shared/errors/app-error";
import { ProjectAuthorizationService } from "./project-authorization.service";
import { ProjectRepo } from "./project.repo";
import type { ProjectMemberEntity } from "./project.types";

export class ProjectAccessService {
  constructor(
    private readonly repo: ProjectRepo,
    private readonly authorization: ProjectAuthorizationService
  ) {}

  async listAccessibleProjectIds(ctx: RequestContext): Promise<string[]> {
    if (ctx.projectIds?.length) {
      const activeIds = ctx.projectIds
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .filter((item) => this.repo.findById(item)?.status === "active");
      return Array.from(new Set(activeIds));
    }

    const candidates = Array.from(
      new Set([ctx.userId?.trim(), ctx.accountId?.trim()].filter((item): item is string => !!item))
    );
    if (candidates.length === 0) {
      return [];
    }

    if (this.authorization.canReadAllProjects(ctx) || this.authorization.canManageAllProjects(ctx)) {
      return this.repo
        .listAllProjectIds()
        .filter((projectId) => this.repo.findById(projectId)?.status === "active");
    }

    const collected = new Set<string>();
    for (const userId of candidates) {
      for (const projectId of this.repo.listProjectIdsByUserId(userId)) {
        const normalizedProjectId = projectId.trim();
        if (!normalizedProjectId) {
          continue;
        }
        const project = this.repo.findById(normalizedProjectId);
        if (project?.status === "active") {
          collected.add(normalizedProjectId);
        }
      }
    }
    return Array.from(collected);
  }

  async requireProjectAccess(projectId: string, ctx: RequestContext, action: string): Promise<void> {
    const project = this.repo.findById(projectId);
    if (!project) {
      throw new AppError(ERROR_CODES.PROJECT_NOT_FOUND, `project not found: ${projectId}`, 404);
    }

    if (project.status !== "active" && !this.isReadAction(action)) {
      throw new AppError(ERROR_CODES.PROJECT_INACTIVE, `${action} forbidden: project is archived`, 400);
    }

    const userId = ctx.userId?.trim() || ctx.accountId?.trim();
    if (!userId) {
      throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, `${action} forbidden`, 403);
    }

    if (this.authorization.canReadAllProjects(ctx)) {
      return;
    }

    if (ctx.projectIds?.includes(projectId) || this.repo.findMemberByProjectAndUserId(projectId, userId)) {
      return;
    }

    if (project.visibility === "internal" && this.isReadAction(action)) {
      return;
    }

    throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, `${action} forbidden`, 403);
  }

  async requireProjectMember(projectId: string, userId: string, action: string): Promise<ProjectMemberEntity> {
    const member = this.repo.findMemberByProjectAndUserId(projectId, userId);
    if (!member) {
      throw new AppError(ERROR_CODES.PROJECT_MEMBER_NOT_FOUND, `${action}: project member not found`, 404);
    }

    return member;
  }

  async requireProjectMaintainer(projectId: string, ctx: RequestContext, action: string): Promise<void> {
    if (this.authorization.canManageAllProjects(ctx)) {
      return;
    }

    const userId = ctx.userId?.trim();
    if (!userId) {
      throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, `${action} forbidden`, 403);
    }

    let member: ProjectMemberEntity;
    try {
      member = await this.requireProjectMember(projectId, userId, action);
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

  assertCanTransferOwner(projectId: string, ctx: RequestContext): void {
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

  async requireProjectArchiver(projectId: string, ctx: RequestContext, action: string): Promise<void> {
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

  private isReadAction(action: string): boolean {
    const normalized = action.trim().toLowerCase();
    return normalized.startsWith("list ") || normalized.startsWith("get ") || normalized.startsWith("view ");
  }
}
