import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { env } from "../../env";
import { AppError } from "../../utils/app-error";
import { genId } from "../../utils/id";
import { buildStoredFileName, ensureDirSync, getFileExt, safeBaseName } from "../../utils/storage";
import { nowIso } from "../../utils/time";
import { ProjectMemberService } from "../project/project-member.service";
import { ProjectRepo } from "../project/project.repo";
import type { ProjectMemberEntity, ProjectMemberRole } from "../project/project.types";
import { IssueRepo } from "./issue.repo";
import { isAllowedIssueAttachmentType } from "./issue.attachment-policy";
import type {
    AddIssueCommentInput,
    AssignIssueInput,
    CloseIssueInput,
    CreateIssueInput,
    IssueActionLogEntity,
    IssueActionType,
    IssueAttachmentEntity,
    IssueCloseReasonType,
    IssueDetailResult,
    IssueEntity,
    IssueListResult,
    IssueStatus,
    ListIssueQuery,
    MarkFixedInput,
    ReopenIssueInput,
    StartProgressInput,
    UpdateIssueInput,
    UpdateIssueRepoPatch,
    UploadIssueAttachmentInput,
    VerifyIssueInput,
} from "./issue.types";

const ISSUE_STATUS_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
    open: ["assigned", "in_progress", "closed"],
    assigned: ["in_progress"],
    in_progress: ["fixed"],
    fixed: ["verified", "reopened"],
    verified: ["closed", "reopened"],
    reopened: ["assigned", "in_progress"],
    closed: ["reopened"]
};

const MAX_ISSUE_NO_RETRY = 5;
export class IssueService {
    constructor(
        private readonly repo: IssueRepo,
        private readonly projectRepo: ProjectRepo,
        private readonly projectMemberService: ProjectMemberService
    ) { }

    create(input: CreateIssueInput): IssueEntity {
        const project = this.projectRepo.findById(input.projectId);
        if (!project) {
            throw new AppError("PROJECT_NOT_FOUND", `项目未找到: ${input.projectId}`, 404);
        }

        for (let attempt = 1; attempt <= MAX_ISSUE_NO_RETRY; attempt += 1) {
            const now = nowIso();
            const entity: IssueEntity = {
                id: genId("iss"),
                projectId: input.projectId,
                issueNo: this.generateIssueNo(),
                title: input.title.trim(),
                description: input.description?.trim() || "",
                type: input.type ?? "bug",
                status: "open",
                priority: input.priority ?? "medium",
                reporterId: input.reporterId?.trim() || null,
                reporterName: input.reporterName?.trim() || null,
                assigneeId: null,
                assigneeName: null,
                lastVerifiedResult: null,
                reopenCount: 0,
                module: input.module?.trim() || null,
                version: input.version?.trim() || null,
                environment: input.environment?.trim() || null,
                fixedAt: null,
                verifiedAt: null,
                closedAt: null,
                createdAt: now,
                updatedAt: now
            };

            try {
                this.repo.runInTransaction(() => {
                    this.repo.create(entity);
                    this.repo.createActionLog(
                        this.buildActionLog({
                            issueId: entity.id,
                            actionType: "create",
                            fromStatus: null,
                            toStatus: "open",
                            operatorId: entity.reporterId ?? null,
                            operatorName: entity.reporterName ?? null,
                            summary: "创建问题"
                        })
                    );
                });
                return entity;
            } catch (error) {
                if (this.isUniqueIssueNoError(error) && attempt < MAX_ISSUE_NO_RETRY) {
                    continue;
                }
                this.handleSqliteError(error, entity.issueNo);
            }
        }

        throw new AppError("ISSUE_CREATE_FAILED", "创建失败", 500);
    }

    getById(id: string): IssueEntity {
        const item = this.repo.findById(id);
        if (!item) {
            throw new AppError("ISSUE_NOT_FOUND", `问题未找到: ${id}`, 404);
        }
        return item;
    }

    getDetail(id: string): IssueDetailResult {
        const detail = this.repo.getDetail(id);
        if (!detail) {
            throw new AppError("ISSUE_NOT_FOUND", `问题未找到: ${id}`, 404);
        }
        return detail;
    }

    list(query: ListIssueQuery): IssueListResult {
        return this.repo.list(query);
    }

    update(id: string, input: UpdateIssueInput): IssueEntity {
        const existing = this.getById(id);

        const patch: UpdateIssueRepoPatch = {
            title: input.title?.trim(),
            description: input.description?.trim(),
            priority: input.priority,
            module: input.module === null ? null : input.module?.trim(),
            version: input.version === null ? null : input.version?.trim(),
            environment: input.environment === null ? null : input.environment?.trim(),
            updatedAt: nowIso()
        };

        this.repo.runInTransaction(() => {
            const changed = this.repo.update(id, patch);
            if (!changed) {
                throw new AppError("ISSUE_UPDATE_FAILED", "无法更新问题", 500);
            }

            this.repo.createActionLog(
                this.buildActionLog({
                    issueId: id,
                    actionType: "update",
                    fromStatus: existing.status,
                    toStatus: existing.status,
                    summary: "update issue"
                })
            );
        });

        return this.getById(id);
    }

    assign(id: string, input: AssignIssueInput): IssueEntity {
        const issue = this.getById(id);
        const nextStatus: IssueStatus = "assigned";
        if (issue.status !== "assigned") {
            this.assertTransition(issue.status, nextStatus);
        }

        const operatorId = this.requireOperatorId(input.operatorId, "assign");

        const assigneeIds = this.normalizeAssigneeIds(input);
        if (assigneeIds.length === 0) {
            throw new AppError("ISSUE_ASSIGNEE_REQUIRED", "分配问题时需要提供负责人", 400);
        }

        const assignees = assigneeIds.map((assigneeId) => this.requireProjectMember(issue.projectId, assigneeId, "【指派】"));
        const primaryAssignee = assignees[0]!;
        const assigneeName = assignees.map((item) => item.displayName).join("、");

        this.repo.runInTransaction(() => {
            const now = nowIso();
            const changed = this.repo.update(id, {
                assigneeId: primaryAssignee.userId,
                assigneeName,
                status: nextStatus,
                updatedAt: now
            });
            if (!changed) {
                throw new AppError("ISSUE_ASSIGN_FAILED", "无法分配问题", 500);
            }

            this.repo.replaceIssueAssignees(
                id,
                assignees.map((item) => ({
                    id: genId("ias"),
                    userId: item.userId,
                    userName: item.displayName,
                    createdAt: now
                }))
            );

            this.repo.createActionLog(
                this.buildActionLog({
                    issueId: id,
                    actionType: "assign",
                    fromStatus: issue.status,
                    toStatus: nextStatus,
                    operatorId,
                    operatorName: input.operatorName?.trim() || null,
                    summary: input.comment?.trim() || `指派给 ${assigneeName}`
                })
            );
        });

        return this.getById(id);
    }

    startProgress(id: string, input: StartProgressInput): IssueEntity {
        const issue = this.getById(id);
        const nextStatus: IssueStatus = "in_progress";
        this.assertTransition(issue.status, nextStatus);

        const operatorId = this.requireOperatorId(input.operatorId, "start progress");
        this.requireProjectMember(issue.projectId, operatorId, "【开始处理】");
        this.assertAssigneeOperator(issue, operatorId, "【开始处理】");
        if (issue.type === "bug") {
            this.requireProjectMemberRoles(issue.projectId, operatorId, ["frontend_dev", "backend_dev"], "【开始处理】");
        }

        this.repo.runInTransaction(() => {
            const now = nowIso();
            const changed = this.repo.update(id, {
                status: nextStatus,
                updatedAt: now
            });

            if (!changed) {
                throw new AppError("ISSUE_START_PROGRESS_FAILED", "无法开始处理问题", 500);
            }

            this.repo.createActionLog(
                this.buildActionLog({
                    issueId: id,
                    actionType: "start_progress",
                    fromStatus: issue.status,
                    toStatus: nextStatus,
                    operatorId,
                    operatorName: input.operatorName?.trim() || null,
                    summary: input.comment?.trim() || "开始处理问题"
                })
            );
        });

        return this.getById(id);
    }

    markFixed(id: string, input: MarkFixedInput): IssueEntity {
        const issue = this.getById(id);
        const nextStatus: IssueStatus = "fixed";
        this.assertTransition(issue.status, nextStatus);

        const operatorId = this.requireOperatorId(input.operatorId, "mark fixed");
        this.requireProjectMember(issue.projectId, operatorId, "【标记为已修复】");
        this.assertAssigneeOperator(issue, operatorId, "【标记为已修复】");
        if (issue.type === "bug") {
            this.requireProjectMemberRoles(issue.projectId, operatorId, ["frontend_dev", "backend_dev"], "【标记为已修复】");
        }

        this.repo.runInTransaction(() => {
            const now = nowIso();
            const changed = this.repo.update(id, {
                status: nextStatus,
                fixedAt: now,
                verifiedAt: null,
                lastVerifiedResult: null,
                closedAt: null,
                updatedAt: now
            });

            if (!changed) {
                throw new AppError("ISSUE_MARK_FIXED_FAILED", "无法标记为已修复", 500);
            }

            this.repo.createActionLog(
                this.buildActionLog({
                    issueId: id,
                    actionType: "mark_fixed",
                    fromStatus: issue.status,
                    toStatus: nextStatus,
                    operatorId,
                    operatorName: input.operatorName?.trim() || null,
                    summary: input.comment?.trim() || "标记为已修复"
                })
            );
        });

        return this.getById(id);
    }

    verify(id: string, input: VerifyIssueInput): IssueEntity {
        const issue = this.getById(id);
        const nextStatus: IssueStatus = "verified";
        this.assertTransition(issue.status, nextStatus);

        const operatorId = this.requireOperatorId(input.operatorId, "verify");
        const verifier = this.requireProjectMemberRoles(issue.projectId, operatorId, ["qa", "product"], "【验证】");

        this.repo.runInTransaction(() => {
            const now = nowIso();
            const changed = this.repo.update(id, {
                status: nextStatus,
                verifiedAt: now,
                lastVerifiedResult: "pass",
                verifierId: verifier.userId,
                verifierName: verifier.displayName,
                closedAt: null,
                updatedAt: now
            });

            if (!changed) {
                throw new AppError("ISSUE_VERIFY_FAILED", "没有通过验证", 500);
            }

            this.repo.createActionLog(
                this.buildActionLog({
                    issueId: id,
                    actionType: "verify",
                    fromStatus: issue.status,
                    toStatus: nextStatus,
                    operatorId,
                    operatorName: input.operatorName?.trim() || null,
                    summary: input.comment?.trim() || "验证通过"
                })
            );
        });

        return this.getById(id);
    }

    reopen(id: string, input: ReopenIssueInput): IssueEntity {
        const issue = this.getById(id);
        const nextStatus: IssueStatus = "reopened";
        this.assertTransition(issue.status, nextStatus);

        const operatorId = this.requireOperatorId(input.operatorId, "reopen");
        const verifier = this.requireProjectMemberRoles(issue.projectId, operatorId, ["qa", "product"], "【重新打开】");

        this.repo.runInTransaction(() => {
            const now = nowIso();
            const changed = this.repo.update(id, {
                status: nextStatus,
                reopenCount: issue.reopenCount + 1,
                lastVerifiedResult: "fail",
                verifierId: verifier.userId,
                verifierName: verifier.displayName,
                verifiedAt: null,
                closedAt: null,
                updatedAt: now
            });

            if (!changed) {
                throw new AppError("ISSUE_REOPEN_FAILED", "无法重开问题", 500);
            }

            this.repo.createActionLog(
                this.buildActionLog({
                    issueId: id,
                    actionType: "reopen",
                    fromStatus: issue.status,
                    toStatus: nextStatus,
                    operatorId,
                    operatorName: input.operatorName?.trim() || null,
                    summary: input.comment?.trim() || "重新打开问题"
                })
            );
        });

        return this.getById(id);
    }

    close(id: string, input: CloseIssueInput): IssueEntity {
        const issue = this.getById(id);
        const nextStatus: IssueStatus = "closed";
        this.assertTransition(issue.status, nextStatus);

        const operatorId = this.requireOperatorId(input.operatorId, "close");
        this.requireProjectMemberRoles(issue.projectId, operatorId, ["product", "qa"], "【关闭】");

        const closeComment = input.comment?.trim();
        if (issue.status === "open") {
            if (!input.closeReasonType) {
                throw new AppError("ISSUE_CLOSE_REASON_REQUIRED", "关闭未解决的问题时需要提供关闭原因", 400);
            }
            if (!closeComment) {
                throw new AppError("ISSUE_CLOSE_COMMENT_REQUIRED", "关闭未解决的问题时需要提供评论", 400);
            }
        }

        this.repo.runInTransaction(() => {
            const now = nowIso();
            const changed = this.repo.update(id, {
                status: nextStatus,
                closedAt: now,
                updatedAt: now
            });

            if (!changed) {
                throw new AppError("ISSUE_CLOSE_FAILED", "无法关闭问题", 500);
            }

            this.repo.createActionLog(
                this.buildActionLog({
                    issueId: id,
                    actionType: "close",
                    fromStatus: issue.status,
                    toStatus: nextStatus,
                    operatorId,
                    operatorName: input.operatorName?.trim() || null,
                    summary: this.buildCloseSummary(issue.status, input.closeReasonType, closeComment)
                })
            );
        });

        return this.getById(id);
    }

    addComment(id: string, input: AddIssueCommentInput) {
        const issue = this.getById(id);
        const now = nowIso();
        const mentions = this.normalizeCommentMentions(issue.projectId, input.mentions);

        this.repo.runInTransaction(() => {
            this.repo.createComment({
                id: genId("isc"),
                issueId: issue.id,
                authorId: input.authorId?.trim() || null,
                authorName: input.authorName?.trim() || null,
                content: input.content.trim(),
                mentions,
                createdAt: now,
                updatedAt: now
            });

            this.repo.createActionLog(
                this.buildActionLog({
                    issueId: id,
                    actionType: "comment",
                    fromStatus: issue.status,
                    toStatus: issue.status,
                    operatorId: input.authorId?.trim() || null,
                    operatorName: input.authorName?.trim() || null,
                    summary: "新增评论"
                })
            );
        });

        return this.getDetail(id);
    }

    listAttachments(issueId: string): IssueAttachmentEntity[] {
        this.getById(issueId);
        return this.repo.listAttachments(issueId);
    }

    async uploadAttachment(input: UploadIssueAttachmentInput): Promise<IssueAttachmentEntity> {
        const issue = this.getById(input.issueId);

        if (!fs.existsSync(input.tempFilePath)) {
            throw new AppError("ISSUE_ATTACHMENT_TEMP_FILE_NOT_FOUND", "没有找到临时文件", 400);
        }

        const issueDir = this.getIssueUploadDir(issue.id);
        ensureDirSync(issueDir);

        const originalName = safeBaseName(input.originalName || "file");
        const storedFileName = buildStoredFileName(originalName);
        const targetPath = path.join(issueDir, storedFileName);

        const stat = fs.statSync(input.tempFilePath);
        const fileSize = input.fileSize || stat.size;
        const mimeType = input.mimeType?.trim().toLowerCase() || "";
        const fileExt = getFileExt(originalName)?.toLowerCase() ?? null;

        if (fileSize > env.uploadMaxFileSize) {
            throw new AppError(
                "ISSUE_ATTACHMENT_TOO_LARGE",
                `文件太大, 最大支持 ${env.uploadMaxFileSize} bytes`,
                400
            );
        }

        if (!isAllowedIssueAttachmentType(mimeType, fileExt)) {
            throw new AppError("ISSUE_ATTACHMENT_INVALID_TYPE", "\u4ec5\u652f\u6301\u56fe\u7247\u548c\u89c6\u9891\u6587\u4ef6\u4e0a\u4f20", 400);
        }

        fs.copyFileSync(input.tempFilePath, targetPath);

        const attachment: IssueAttachmentEntity = {
            id: genId("iat"),
            issueId: issue.id,
            fileName: storedFileName,
            originalName,
            fileExt,
            mimeType: mimeType || null,
            fileSize,
            storagePath: targetPath,
            storageProvider: "local",
            uploaderId: input.uploaderId?.trim() || null,
            uploaderName: input.uploaderName?.trim() || null,
            createdAt: nowIso()
        };

        try {
            this.repo.runInTransaction(() => {
                this.repo.createAttachment(attachment);
                this.repo.createActionLog(
                    this.buildActionLog({
                        issueId: issue.id,
                        actionType: "upload_attachment",
                        fromStatus: issue.status,
                        toStatus: issue.status,
                        operatorId: input.uploaderId?.trim() || null,
                        operatorName: input.uploaderName?.trim() || null,
                        summary: `上传附件: ${attachment.originalName}`
                    })
                );
            });
            return attachment;
        } catch (error) {
            if (fs.existsSync(targetPath)) {
                fs.unlinkSync(targetPath);
            }
            throw error;
        }
    }

    removeAttachment(issueId: string, attachmentId: string, operator?: {
        operatorId?: string | null;
        operatorName?: string | null;
    }): IssueDetailResult {
        const issue = this.getById(issueId);

        const attachment = this.repo.findAttachmentById(attachmentId);
        if (!attachment || attachment.issueId !== issue.id) {
            throw new AppError("ISSUE_ATTACHMENT_NOT_FOUND", "附件未找到", 404);
        }

        if (attachment.storageProvider === "local" && attachment.storagePath) {
            try {
                if (fs.existsSync(attachment.storagePath)) {
                    fs.unlinkSync(attachment.storagePath);
                }
            } catch (_error) {
                throw new AppError(
                    "ISSUE_ATTACHMENT_DELETE_FILE_FAILED",
                    "删除附件文件失败",
                    500
                );
            }
        }

        this.repo.runInTransaction(() => {
            const deleted = this.repo.deleteAttachment(attachmentId);
            if (!deleted) {
                throw new AppError("ISSUE_ATTACHMENT_DELETE_FAILED", "删除附件记录失败", 500);
            }

            this.repo.createActionLog(
                this.buildActionLog({
                    issueId: issue.id,
                    actionType: "remove_attachment",
                    fromStatus: issue.status,
                    toStatus: issue.status,
                    operatorId: operator?.operatorId?.trim() || null,
                    operatorName: operator?.operatorName?.trim() || null,
                    summary: `删除附件: ${attachment.originalName}`
                })
            );
        });

        return this.getDetail(issue.id);
    }

    getAttachment(issueId: string, attachmentId: string): IssueAttachmentEntity {
        const issue = this.getById(issueId);
        const attachment = this.repo.findAttachmentById(attachmentId);

        if (!attachment || attachment.issueId !== issue.id) {
            throw new AppError("ISSUE_ATTACHMENT_NOT_FOUND", "附件未找到", 404);
        }

        if (attachment.storageProvider === "local" && !fs.existsSync(attachment.storagePath)) {
            throw new AppError("ISSUE_ATTACHMENT_FILE_NOT_FOUND", "附件文件未找到", 404);
        }

        return attachment;
    }

    private getIssueUploadDir(issueId: string): string {
        return path.join(env.uploadRoot, "issues", issueId);
    }

    private normalizeCommentMentions(
        projectId: string,
        mentions?: AddIssueCommentInput["mentions"]
    ): Array<{ userId: string; displayName: string }> {
        if (!mentions || mentions.length === 0) {
            return [];
        }

        const normalized: Array<{ userId: string; displayName: string }> = [];
        const seen = new Set<string>();

        for (const item of mentions) {
            const userId = item?.userId?.trim();
            if (!userId || seen.has(userId)) {
                continue;
            }

            const member = this.projectMemberService.findMemberByProjectAndUserId(projectId, userId);
            if (!member) {
                continue;
            }

            normalized.push({
                userId,
                displayName: member.displayName
            });
            seen.add(userId);
        }

        return normalized;
    }

    private assertTransition(from: IssueStatus, to: IssueStatus): void {
        const allowed = ISSUE_STATUS_TRANSITIONS[from] ?? [];
        if (!allowed.includes(to)) {
            throw new AppError(
                "ISSUE_INVALID_STATUS_TRANSITION",
                `无法将问题状态从 ${from} 更改为 ${to}`,
                400
            );
        }
    }

    private requireOperatorId(operatorId: string | null | undefined, action: string): string {
        const value = operatorId?.trim();
        if (!value) {
            throw new AppError("ISSUE_OPERATOR_REQUIRED", `执行 ${action} 操作时需要提供 operatorId`, 400);
        }
        return value;
    }

    private assertAssigneeOperator(issue: IssueEntity, operatorId: string, action: string): void {
        if (this.repo.isIssueAssignee(issue.id, operatorId)) {
            return;
        }

        if (issue.assigneeId && issue.assigneeId !== operatorId) {
            throw new AppError(
                "ISSUE_FORBIDDEN_OPERATOR",
                `只有当前负责人可以执行 ${action} 操作`,
                403
            );
        }
    }

    private normalizeAssigneeIds(input: AssignIssueInput): string[] {
        const source = (input.assigneeIds && input.assigneeIds.length > 0)
            ? input.assigneeIds
            : (input.assigneeId ? [input.assigneeId] : []);

        const seen = new Set<string>();
        const normalized: string[] = [];
        for (const raw of source) {
            const id = raw?.trim();
            if (!id || seen.has(id)) {
                continue;
            }
            normalized.push(id);
            seen.add(id);
        }
        return normalized;
    }
    private requireProjectMember(projectId: string, userId: string, action: string): ProjectMemberEntity {
        const member = this.projectMemberService.findMemberByProjectAndUserId(projectId, userId);
        if (!member) {
            throw new AppError(
                "ISSUE_FORBIDDEN_OPERATOR",
                `${action} 操作人不是项目成员`,
                403
            );
        }
        return member;
    }

    private requireProjectMemberRoles(
        projectId: string,
        userId: string,
        requiredRoles: readonly ProjectMemberRole[],
        action: string
    ): ProjectMemberEntity {
        const member = this.requireProjectMember(projectId, userId, action);
        const ok = member.roles.some((role) => requiredRoles.includes(role));
        if (!ok) {
            throw new AppError(
                "ISSUE_FORBIDDEN_OPERATOR",
                `${action} 操作人角色不符合要求`,
                403
            );
        }
        return member;
    }

    private buildCloseSummary(status: IssueStatus, reasonType?: IssueCloseReasonType, comment?: string): string {
        if (status === "open") {
            const reason = reasonType ?? "unknown";
            const text = comment ?? "";
            return `关闭未解决的问题 (${reason}): ${text}`;
        }

        return comment || "关闭问题";
    }

    private buildActionLog(input: {
        issueId: string;
        actionType: IssueActionType;
        fromStatus?: IssueStatus | null;
        toStatus?: IssueStatus | null;
        operatorId?: string | null;
        operatorName?: string | null;
        summary?: string | null;
    }): IssueActionLogEntity {
        return {
            id: genId("ial"),
            issueId: input.issueId,
            actionType: input.actionType,
            fromStatus: input.fromStatus ?? null,
            toStatus: input.toStatus ?? null,
            operatorId: input.operatorId ?? null,
            operatorName: input.operatorName ?? null,
            summary: input.summary ?? null,
            createdAt: nowIso()
        };
    }

    private generateIssueNo(): string {
        const now = new Date();
        const date =
            now.getFullYear().toString() +
            String(now.getMonth() + 1).padStart(2, "0") +
            String(now.getDate()).padStart(2, "0");

        const millis = String(now.getMilliseconds()).padStart(3, "0");
        const random = Math.floor(Math.random() * 1000)
            .toString()
            .padStart(3, "0");

        return `ISSUE-${date}-${millis}${random}`;
    }

    private isUniqueIssueNoError(error: unknown): boolean {
        return error instanceof Database.SqliteError &&
            error.code === "SQLITE_CONSTRAINT_UNIQUE";
    }

    private handleSqliteError(error: unknown, issueNo?: string): never {
        if (error instanceof AppError) {
            throw error;
        }

        if (error instanceof Database.SqliteError && error.code === "SQLITE_CONSTRAINT_UNIQUE") {
            throw new AppError(
                "ISSUE_NO_EXISTS",
                `问题编号已存在: ${issueNo ?? "未知"}`,
                409
            );
        }

        throw error;
    }
}
