import type { RequestContext } from "../../shared/context/request-context";
import { AppError } from "../../shared/errors/app-error";
import { ProjectRepo } from "./project.repo";
import type { ProjectMemberEntity } from "./project.types";

export class ProjectAccessService {
  constructor(private readonly repo: ProjectRepo) {}

  async listAccessibleProjectIds(ctx: RequestContext): Promise<string[]> {
    if (ctx.roles.includes("admin")) {
      return this.repo.listAllProjectIds();
    }

    const userId = ctx.userId?.trim();
    if (!userId) {
      return [];
    }

    return this.repo.listProjectIdsByUserId(userId);
  }

  async requireProjectAccess(projectId: string, ctx: RequestContext, action: string): Promise<void> {
    if (ctx.roles.includes("admin")) {
      return;
    }

    const userId = ctx.userId?.trim();
    if (!userId || !this.repo.findMemberByProjectAndUserId(projectId, userId)) {
      throw new AppError("PROJECT_ACCESS_DENIED", `${action} forbidden`, 403);
    }
  }

  async requireProjectMember(projectId: string, userId: string, action: string): Promise<ProjectMemberEntity> {
    const member = this.repo.findMemberByProjectAndUserId(projectId, userId);
    if (!member) {
      throw new AppError("PROJECT_MEMBER_NOT_FOUND", `${action}: project member not found`, 404);
    }

    return member;
  }
}
