import type Database from "better-sqlite3";
import type { RequestContext } from "../../../shared/context/request-context";
import type { EventBus } from "../../../shared/event/event-bus";
import { ERROR_CODES } from "../../../shared/errors/error-codes";
import { AppError } from "../../../shared/errors/app-error";
import { genId } from "../../../shared/utils/id";
import { nowIso } from "../../../shared/utils/time";
import { UserRepo } from "../../user/user.repo";
import { ProjectRepo } from "../project.repo";
import { ProjectAccessService } from "../project-access.service";
import { ProjectAuthorizationService } from "../project-authorization.service";
import type {
  AddProjectMemberInput,
  ProjectEntity,
  ProjectMemberCandidate,
  ProjectMemberEntity,
  ProjectMemberRole,
  UpdateProjectMemberInput
} from "../project.types";
import { ProjectBaseService } from "./project-base.service";

export class ProjectMemberService {
  constructor(
    private readonly repo: ProjectRepo,
    private readonly userRepo: UserRepo,
    private readonly access: ProjectAccessService,
    private readonly authorization: ProjectAuthorizationService,
    private readonly eventBus: EventBus,
    private readonly db: Database.Database,
    private readonly baseService: ProjectBaseService,
    private readonly initAdminUsername: string | null = null
  ) {}

  async listMembers(projectId: string, ctx: RequestContext): Promise<ProjectMemberEntity[]> {
    await this.baseService.getById(projectId, ctx);
    return this.repo.listMembers(projectId);
  }

  async listMemberCandidates(projectId: string, ctx: RequestContext): Promise<ProjectMemberCandidate[]> {
    await this.access.requireProjectMaintainer(projectId, ctx, "list project member candidates");
    return this.repo.listActiveUserCandidates({ excludedUsername: this.initAdminUsername });
  }

  async addMember(projectId: string, input: AddProjectMemberInput, ctx: RequestContext): Promise<ProjectMemberEntity> {
    await this.access.requireProjectMaintainer(projectId, ctx, "add project member");
    const project = this.findProject(projectId);
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
      await this.access.requireProjectMaintainer(projectId, ctx, "update project member");
    }
    const project = this.findProject(projectId);
    const current = this.repo.findMemberById(projectId, memberId);
    if (!current) {
      throw new AppError(ERROR_CODES.PROJECT_MEMBER_NOT_FOUND, `project member not found: ${memberId}`, 404);
    }

    const isRoleChanged = input.roleCode !== undefined && input.roleCode !== current.roleCode;
    const isOwnerChanged = input.isOwner !== undefined && input.isOwner !== current.isOwner;
    if (!isRoleChanged && !isOwnerChanged) {
      return current;
    }

    if (input.isOwner === true && !current.isOwner) {
      this.access.assertCanTransferOwner(projectId, ctx);
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
    await this.access.requireProjectMaintainer(projectId, ctx, "remove project member");
    const project = this.findProject(projectId);
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

  private findProject(projectId: string): ProjectEntity {
    const project = this.repo.findById(projectId);
    if (!project) {
      throw new AppError(ERROR_CODES.PROJECT_NOT_FOUND, `project not found: ${projectId}`, 404);
    }
    return project;
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
