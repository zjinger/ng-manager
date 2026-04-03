import { ERROR_CODES } from "../../shared/errors/error-codes";
import type { RequestContext } from "../../shared/context/request-context";
import { AppError } from "../../shared/errors/app-error";
import { ProjectRepo } from "./project.repo";
import type { ProjectMemberEntity } from "./project.types";

export class ProjectAccessService {
  constructor(private readonly repo: ProjectRepo) {}

  async listAccessibleProjectIds(ctx: RequestContext): Promise<string[]> {
    if (ctx.projectIds?.length) {
      return Array.from(new Set(ctx.projectIds.map((item) => item.trim()).filter((item) => item.length > 0)));
    }

    const candidates = Array.from(
      new Set([ctx.userId?.trim(), ctx.accountId?.trim()].filter((item): item is string => !!item))
    );
    if (candidates.length === 0) {
      return [];
    }

    const collected = new Set<string>();
    for (const userId of candidates) {
      for (const projectId of this.repo.listProjectIdsByUserId(userId)) {
        const normalizedProjectId = projectId.trim();
        if (normalizedProjectId) {
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

  private isReadAction(action: string): boolean {
    const normalized = action.trim().toLowerCase();
    return normalized.startsWith("list ") || normalized.startsWith("get ") || normalized.startsWith("view ");
  }
}
