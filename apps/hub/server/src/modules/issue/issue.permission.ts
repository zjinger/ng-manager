import { AppError } from "../../utils/app-error";
import { AuthRepo } from "../auth/auth.repo";
import { ProjectMemberService } from "../project/project-member.service";
import { IssueParticipantRepo } from "../issue-participant/participant.repo";
import type { IssueEntity } from "./issue.types";

export class IssuePermissionService {
  constructor(
    private readonly projectMemberService: ProjectMemberService,
    private readonly participantRepo: IssueParticipantRepo,
    private readonly authRepo: AuthRepo
  ) {}

  requireOperatorId(operatorId: string | null | undefined, action: string): string {
    const value = operatorId?.trim();
    if (!value) {
      throw new AppError("ISSUE_OPERATOR_REQUIRED", `operatorId is required for ${action}`, 400);
    }
    return value;
  }

  requireProjectMember(projectId: string, userId: string, action: string) {
    const member = this.projectMemberService.findMemberByProjectAndUserId(projectId, userId);
    if (!member) {
      throw new AppError("ISSUE_FORBIDDEN_OPERATOR", `${action} requires a project member`, 403);
    }
    return member;
  }

  canManageProject(projectId: string, operatorId: string): boolean {
    if (this.isAdmin(operatorId)) {
      return true;
    }
    const member = this.projectMemberService.findMemberByProjectAndUserId(projectId, operatorId);
    return !!member && member.roles.includes("project_admin" as never);
  }

  assertCanCreate(projectId: string, operatorId: string): void {
    if (!this.canManageProject(projectId, operatorId)) {
      this.requireProjectMember(projectId, operatorId, "create issue");
    }
  }

  assertCanEdit(issue: IssueEntity, operatorId: string): void {
    if (this.canManageProject(issue.projectId, operatorId)) {
      return;
    }
    if (issue.reporterId === operatorId || issue.assigneeId === operatorId || this.participantRepo.hasParticipant(issue.id, operatorId)) {
      return;
    }
    throw new AppError("ISSUE_FORBIDDEN_OPERATOR", "no permission to edit issue", 403);
  }

  assertCanAssign(issue: IssueEntity, operatorId: string): void {
    if (this.canManageProject(issue.projectId, operatorId) || issue.reporterId === operatorId) {
      return;
    }
    throw new AppError("ISSUE_FORBIDDEN_OPERATOR", "no permission to assign issue", 403);
  }

  assertCanClaim(issue: IssueEntity, operatorId: string): void {
    if (!this.canManageProject(issue.projectId, operatorId)) {
      this.requireProjectMember(issue.projectId, operatorId, "claim issue");
    }
  }

  assertCanReassign(issue: IssueEntity, operatorId: string): void {
    if (this.canManageProject(issue.projectId, operatorId) || issue.assigneeId === operatorId) {
      return;
    }
    throw new AppError("ISSUE_FORBIDDEN_OPERATOR", "no permission to reassign issue", 403);
  }

  assertCanManageParticipants(issue: IssueEntity, operatorId: string): void {
    if (this.canManageProject(issue.projectId, operatorId) || issue.assigneeId === operatorId) {
      return;
    }
    throw new AppError("ISSUE_FORBIDDEN_OPERATOR", "no permission to manage participants", 403);
  }

  assertCanStart(issue: IssueEntity, operatorId: string): void {
    if (this.canManageProject(issue.projectId, operatorId) || issue.assigneeId === operatorId) {
      return;
    }
    throw new AppError("ISSUE_FORBIDDEN_OPERATOR", "no permission to start issue", 403);
  }

  assertCanResolve(issue: IssueEntity, operatorId: string): void {
    if (this.canManageProject(issue.projectId, operatorId) || issue.assigneeId === operatorId) {
      return;
    }
    throw new AppError("ISSUE_FORBIDDEN_OPERATOR", "no permission to resolve issue", 403);
  }

  assertCanVerify(issue: IssueEntity, operatorId: string): void {
    if (this.canManageProject(issue.projectId, operatorId) || issue.reporterId === operatorId) {
      return;
    }
    throw new AppError("ISSUE_FORBIDDEN_OPERATOR", "no permission to verify issue", 403);
  }

  assertCanReopen(issue: IssueEntity, operatorId: string): void {
    if (this.canManageProject(issue.projectId, operatorId) || issue.reporterId === operatorId) {
      return;
    }
    throw new AppError("ISSUE_FORBIDDEN_OPERATOR", "no permission to reopen issue", 403);
  }

  assertCanClose(issue: IssueEntity, operatorId: string): void {
    if (this.canManageProject(issue.projectId, operatorId) || issue.reporterId === operatorId) {
      return;
    }
    throw new AppError("ISSUE_FORBIDDEN_OPERATOR", "no permission to close issue", 403);
  }

  assertCanComment(issue: IssueEntity, operatorId: string): void {
    if (!this.canManageProject(issue.projectId, operatorId)) {
      this.requireProjectMember(issue.projectId, operatorId, "comment");
    }
  }

  assertCanUploadAttachment(issue: IssueEntity, operatorId: string): void {
    if (!this.canManageProject(issue.projectId, operatorId)) {
      this.requireProjectMember(issue.projectId, operatorId, "upload attachment");
    }
  }

  assertCanDeleteAttachment(issue: IssueEntity, operatorId: string, uploaderId?: string | null): void {
    if (this.canManageProject(issue.projectId, operatorId) || issue.assigneeId === operatorId || uploaderId === operatorId) {
      return;
    }
    throw new AppError("ISSUE_FORBIDDEN_OPERATOR", "no permission to delete attachment", 403);
  }

  private isAdmin(operatorId: string): boolean {
    const account = this.authRepo.findById(operatorId) ?? this.authRepo.findByUserId(operatorId);
    return !!account && account.status === "active" && account.role === "admin";
  }
}
