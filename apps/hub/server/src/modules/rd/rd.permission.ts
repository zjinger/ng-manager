import { AppError } from "../../utils/app-error";
import { AuthRepo } from "../auth/auth.repo";
import { ProjectMemberService } from "../project/project-member.service";
import type { RdItemEntity } from "./rd.types";

export class RdPermissionService {
  constructor(
    private readonly projectMemberService: ProjectMemberService,
    private readonly authRepo: AuthRepo
  ) {}

  requireOperatorId(operatorId: string | null | undefined, action: string): string {
    const value = operatorId?.trim();
    if (!value) {
      throw new AppError("RD_OPERATOR_REQUIRED", `operatorId is required for ${action}`, 400);
    }
    return value;
  }

  requireProjectMember(projectId: string, userId: string, action: string) {
    const member = this.projectMemberService.findMemberByProjectAndUserId(projectId, userId);
    if (!member) {
      throw new AppError("RD_FORBIDDEN_OPERATOR", `${action} requires a project member`, 403);
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

  assertCanView(projectId: string, operatorId: string): void {
    if (this.canManageProject(projectId, operatorId)) {
      return;
    }
    this.requireProjectMember(projectId, operatorId, "view rd items");
  }

  assertCanCreate(projectId: string, operatorId: string): void {
    this.assertCanView(projectId, operatorId);
  }

  assertCanManageStage(projectId: string, operatorId: string): void {
    if (this.canManageProject(projectId, operatorId)) {
      return;
    }
    throw new AppError("RD_FORBIDDEN_OPERATOR", "no permission to manage rd stages", 403);
  }

  assertCanEdit(item: RdItemEntity, operatorId: string): void {
    if (this.canManageProject(item.projectId, operatorId)) {
      return;
    }
    if (item.creatorId === operatorId || item.assigneeId === operatorId) {
      return;
    }
    throw new AppError("RD_FORBIDDEN_OPERATOR", "no permission to edit rd item", 403);
  }

  assertCanDelete(item: RdItemEntity, operatorId: string): void {
    if (this.canManageProject(item.projectId, operatorId) || item.creatorId === operatorId) {
      return;
    }
    throw new AppError("RD_FORBIDDEN_OPERATOR", "no permission to delete rd item", 403);
  }

  private isAdmin(operatorId: string): boolean {
    const account = this.authRepo.findById(operatorId) ?? this.authRepo.findByUserId(operatorId);
    return !!account && account.status === "active" && account.role === "admin";
  }
}
