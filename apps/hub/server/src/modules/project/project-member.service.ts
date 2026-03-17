import Database from "better-sqlite3";
import { AppError } from "../../utils/app-error";
import { AuthRepo } from "../auth/auth.repo";
import { genId } from "../../utils/id";
import { nowIso } from "../../utils/time";
import { ProjectRepo } from "./project.repo";
import type {
  CreateProjectMemberInput,
  ProjectMemberEntity,
  ProjectMemberRole,
  UpdateProjectMemberInput
} from "./project.types";
import { ProjectMemberRepo } from "./project-member.repo";

export class ProjectMemberService {
  constructor(
    private readonly projectRepo: ProjectRepo,
    private readonly memberRepo: ProjectMemberRepo,
    private readonly authRepo: AuthRepo
  ) {}

  listMembers(projectId: string): ProjectMemberEntity[] {
    this.requireProject(projectId);
    return this.memberRepo.listMembers(projectId);
  }

  addMember(projectId: string, input: Omit<CreateProjectMemberInput, "projectId">): ProjectMemberEntity {
    this.requireProject(projectId);
    const userId = input.userId.trim();
    const roles = this.normalizeRoles(input.roles);

    if (!userId) {
      throw new AppError("PROJECT_MEMBER_USER_REQUIRED", "userId is required", 400);
    }
    if (roles.length === 0) {
      throw new AppError("PROJECT_MEMBER_ROLE_REQUIRED", "at least one role is required", 400);
    }

    const user = this.memberRepo.findUserById(userId);
    if (!user) {
      throw new AppError("PROJECT_MEMBER_USER_NOT_FOUND", `user not found: ${userId}`, 404);
    }

    const now = nowIso();
    const memberId = genId("pm");

    try {
      this.memberRepo.runInTransaction(() => {
        this.memberRepo.createMember({
          id: memberId,
          projectId,
          userId,
          displayName: user.displayName,
          roles,
          createdAt: now,
          updatedAt: now
        });
      });
    } catch (error) {
      if (error instanceof Database.SqliteError && error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        throw new AppError("PROJECT_MEMBER_EXISTS", `member already exists in project: ${userId}`, 409);
      }
      throw error;
    }

    return this.requireMember(projectId, memberId);
  }

  updateMember(projectId: string, memberId: string, input: UpdateProjectMemberInput): ProjectMemberEntity {
    this.requireProject(projectId);
    const existing = this.requireMember(projectId, memberId);

    const nextRoles = input.roles !== undefined ? this.normalizeRoles(input.roles) : undefined;
    if (nextRoles !== undefined && nextRoles.length === 0) {
      throw new AppError("PROJECT_MEMBER_ROLE_REQUIRED", "at least one role is required", 400);
    }
    this.assertProjectAdminRetained(projectId, existing, nextRoles);

    const user = this.memberRepo.findUserById(existing.userId);
    const now = nowIso();

    this.memberRepo.runInTransaction(() => {
      const changed = this.memberRepo.updateMember(projectId, memberId, {
        displayName: user?.displayName,
        updatedAt: now
      });

      if (!changed) {
        throw new AppError("PROJECT_MEMBER_UPDATE_FAILED", "failed to update project member", 500);
      }

      if (nextRoles !== undefined) {
        this.memberRepo.replaceMemberRoles(memberId, nextRoles, now);
      }
    });

    return this.requireMember(projectId, existing.id);
  }

  removeMember(projectId: string, memberId: string): void {
    this.requireProject(projectId);
    const member = this.requireMember(projectId, memberId);
    this.assertProjectAdminRetained(projectId, member, null);

    const changed = this.memberRepo.deleteMember(projectId, memberId);
    if (!changed) {
      throw new AppError("PROJECT_MEMBER_DELETE_FAILED", "failed to remove project member", 500);
    }
  }

  findMemberByProjectAndUserId(projectId: string, userId: string): ProjectMemberEntity | null {
    return this.memberRepo.findMemberByProjectAndUserId(projectId, userId);
  }

  assertCanManageProject(projectId: string, operatorId: string, action: string): void {
    this.requireProject(projectId);
    if (this.canManageProject(projectId, operatorId)) {
      return;
    }
    throw new AppError("PROJECT_FORBIDDEN_OPERATOR", `no permission to ${action}`, 403);
  }

  canManageProject(projectId: string, operatorId: string): boolean {
    if (this.isAdmin(operatorId)) {
      return true;
    }
    const member = this.memberRepo.findMemberByProjectAndUserId(projectId, operatorId);
    return !!member && member.roles.includes("project_admin");
  }

  private requireProject(projectId: string): void {
    const project = this.projectRepo.findById(projectId);
    if (!project) {
      throw new AppError("PROJECT_NOT_FOUND", `project not found: ${projectId}`, 404);
    }
  }

  private requireMember(projectId: string, memberId: string): ProjectMemberEntity {
    const member = this.memberRepo.findMemberById(projectId, memberId);
    if (!member) {
      throw new AppError("PROJECT_MEMBER_NOT_FOUND", `member not found: ${memberId}`, 404);
    }
    return member;
  }

  private normalizeRoles(roles: readonly ProjectMemberRole[]): ProjectMemberRole[] {
    return Array.from(new Set(roles));
  }

  private assertProjectAdminRetained(
    projectId: string,
    member: ProjectMemberEntity,
    nextRoles: ProjectMemberRole[] | null | undefined
  ): void {
    if (!member.roles.includes("project_admin")) {
      return;
    }

    if (nextRoles && nextRoles.includes("project_admin")) {
      return;
    }

    if (this.countProjectAdmins(projectId) > 1) {
      return;
    }

    throw new AppError("PROJECT_ADMIN_REQUIRED", "project must keep at least one project admin", 400);
  }

  private countProjectAdmins(projectId: string): number {
    return this.memberRepo.listMembers(projectId).filter((item) => item.roles.includes("project_admin")).length;
  }

  private isAdmin(operatorId: string): boolean {
    const account = this.authRepo.findById(operatorId) ?? this.authRepo.findByUserId(operatorId);
    return !!account && account.status === "active" && account.role === "admin";
  }
}