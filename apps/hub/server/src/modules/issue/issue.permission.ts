import { AuthRepo } from "../auth/auth.repo";
import { ProjectMemberService } from "../project/project-member.service";
import type { ProjectMemberEntity } from "../project/project.types";
import { AppError } from "../../utils/app-error";
import type { IssueAttachmentEntity, IssueEntity } from "./issue.types";

export class IssuePermissionService {
    constructor(
        private readonly projectMemberService: ProjectMemberService,
        private readonly authRepo: AuthRepo
    ) { }

    requireOperatorId(operatorId: string | null | undefined, action: string): string {
        const value = operatorId?.trim();
        if (!value) {
            throw new AppError("ISSUE_OPERATOR_REQUIRED", `执行 ${action} 操作时需要提供 operatorId`, 400);
        }
        return value;
    }

    requireProjectMember(projectId: string, userId: string, action: string): ProjectMemberEntity {
        const member = this.projectMemberService.findMemberByProjectAndUserId(projectId, userId);
        if (!member) {
            throw new AppError("ISSUE_FORBIDDEN_OPERATOR", `${action} 操作人不是项目成员`, 403);
        }
        return member;
    }

    assertCanCreate(projectId: string, operatorId: string): void {
        if (!this.canManageProject(projectId, operatorId)) {
            this.requireProjectMember(projectId, operatorId, "【创建】");
        }
    }

    assertCanAssign(issue: IssueEntity, operatorId: string): void {
        this.assertManageProject(issue.projectId, operatorId, "【指派】");
    }

    assertCanClaim(issue: IssueEntity, operatorId: string): void {
        if (!this.canManageProject(issue.projectId, operatorId)) {
            this.requireProjectMember(issue.projectId, operatorId, "【认领】");
        }
    }

    assertCanUnassign(issue: IssueEntity, operatorId: string): void {
        if (issue.assigneeId === operatorId) {
            return;
        }
        this.assertManageProject(issue.projectId, operatorId, "【释放负责人】");
    }

    assertCanReassign(issue: IssueEntity, operatorId: string): void {
        if (issue.assigneeId === operatorId) {
            return;
        }
        this.assertManageProject(issue.projectId, operatorId, "【转派】");
    }

    assertCanUpdate(issue: IssueEntity, operatorId: string): void {
        if (issue.reporterId === operatorId) {
            return;
        }
        this.assertManageProject(issue.projectId, operatorId, "【编辑】");
    }

    assertCanSetVerifier(issue: IssueEntity, operatorId: string): void {
        this.assertManageProject(issue.projectId, operatorId, "【设置验证人】");
    }

    assertCanManageParticipants(issue: IssueEntity, operatorId: string): void {
        if (issue.assigneeId === operatorId) {
            return;
        }
        this.assertManageProject(issue.projectId, operatorId, "【参与人管理】");
    }

    assertCanWatch(issue: IssueEntity, operatorId: string): void {
        if (!this.canManageProject(issue.projectId, operatorId)) {
            this.requireProjectMember(issue.projectId, operatorId, "【关注】");
        }
    }

    assertCanManageWatchers(issue: IssueEntity, operatorId: string): void {
        this.assertManageProject(issue.projectId, operatorId, "【关注人管理】");
    }

    assertCanStart(issue: IssueEntity, operatorId: string): void {
        if (issue.assigneeId === operatorId) {
            return;
        }
        this.assertManageProject(issue.projectId, operatorId, "【开始处理】");
    }

    assertCanResolve(issue: IssueEntity, operatorId: string): void {
        if (issue.assigneeId === operatorId) {
            return;
        }
        this.assertManageProject(issue.projectId, operatorId, "【标记已处理】");
    }

    assertCanRevokeResolve(issue: IssueEntity, operatorId: string): void {
        if (issue.assigneeId === operatorId) {
            return;
        }
        this.assertManageProject(issue.projectId, operatorId, "【撤回已处理】");
    }

    assertCanVerify(issue: IssueEntity, operatorId: string): void {
        if (this.canVerifyIssue(issue, operatorId)) {
            return;
        }
        throw new AppError("ISSUE_FORBIDDEN_OPERATOR", "没有执行验证动作的权限", 403);
    }

    assertCanReopen(issue: IssueEntity, operatorId: string): void {
        if (this.canVerifyIssue(issue, operatorId)) {
            return;
        }
        throw new AppError("ISSUE_FORBIDDEN_OPERATOR", "没有执行驳回或重开动作的权限", 403);
    }

    assertCanClose(issue: IssueEntity, operatorId: string): void {
        if (issue.reporterId === operatorId || issue.verifierId === operatorId) {
            return;
        }
        this.assertManageProject(issue.projectId, operatorId, "【关闭】");
    }

    assertCanComment(issue: IssueEntity, operatorId: string): void {
        if (!this.canManageProject(issue.projectId, operatorId)) {
            this.requireProjectMember(issue.projectId, operatorId, "【评论】");
        }
    }

    assertCanUploadAttachment(issue: IssueEntity, operatorId: string): void {
        if (!this.canManageProject(issue.projectId, operatorId)) {
            this.requireProjectMember(issue.projectId, operatorId, "【上传附件】");
        }
    }

    assertCanDeleteAttachment(issue: IssueEntity, attachment: IssueAttachmentEntity, operatorId: string): void {
        if (attachment.uploaderId === operatorId || issue.assigneeId === operatorId) {
            return;
        }
        this.assertManageProject(issue.projectId, operatorId, "【删除附件】");
    }

    canManageProject(projectId: string, operatorId: string): boolean {
        return this.isAdminOperator(operatorId) || this.isProjectManager(projectId, operatorId);
    }

    private canVerifyIssue(issue: IssueEntity, operatorId: string): boolean {
        if (this.canManageProject(issue.projectId, operatorId)) {
            return true;
        }
        if (issue.verifierId) {
            return issue.verifierId === operatorId;
        }
        return issue.reporterId === operatorId;
    }

    private assertManageProject(projectId: string, operatorId: string, action: string): void {
        if (!this.canManageProject(projectId, operatorId)) {
            throw new AppError("ISSUE_FORBIDDEN_OPERATOR", `${action} 仅管理员或项目管理员可执行`, 403);
        }
    }

    private isAdminOperator(operatorId: string): boolean {
        const user = this.authRepo.findById(operatorId);
        return !!user && user.status === "active" && user.role === "admin";
    }

    private isProjectManager(_projectId: string, _operatorId: string): boolean {
        return false;
    }
}
