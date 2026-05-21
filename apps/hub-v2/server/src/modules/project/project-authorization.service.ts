import type Database from "better-sqlite3";
import type { RequestContext } from "../../shared/context/request-context";
import { ProjectRepo } from "./project.repo";

export class ProjectAuthorizationService {
  constructor(
    private readonly db: Database.Database,
    private readonly repo: ProjectRepo
  ) {}

  canCreateProject(ctx: RequestContext): boolean {
    if (!ctx.userId?.trim()) {
      return false;
    }
    return this.hasSystemPermission(ctx, "project.manage");
  }

  canReadAllProjects(ctx: RequestContext): boolean {
    return this.hasSystemPermission(ctx, "project.read.all");
  }

  canManageAllProjects(ctx: RequestContext): boolean {
    return this.hasSystemPermission(ctx, "project.manage.all");
  }

  canArchiveAnyProject(ctx: RequestContext): boolean {
    return this.hasSystemPermission(ctx, "project.archive");
  }

  canTransferAnyProjectOwner(ctx: RequestContext): boolean {
    return this.hasSystemPermission(ctx, "project.owner.transfer");
  }

  isProjectOwner(projectId: string, userId: string): boolean {
    return this.repo.findMemberByProjectAndUserId(projectId, userId)?.isOwner === true;
  }

  hasSystemPermission(ctx: RequestContext, permissionCode: string): boolean {
    if (ctx.roles.includes("admin")) {
      return true;
    }

    const userId = ctx.userId?.trim();
    if (!userId) {
      return false;
    }

    const row = this.db
      .prepare(
        `
          SELECT 1
          FROM user_system_roles usr
          INNER JOIN system_roles sr ON sr.id = usr.role_id AND sr.status = 'active'
          INNER JOIN system_role_permissions srp ON srp.role_id = sr.id
          INNER JOIN system_permissions sp ON sp.id = srp.permission_id
          WHERE usr.user_id = ? AND sp.code = ?
          LIMIT 1
        `
      )
      .get(userId, permissionCode) as { 1: number } | undefined;

    return !!row;
  }
}
