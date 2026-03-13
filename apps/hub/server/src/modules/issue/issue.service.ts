
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { env } from "../../env";
import { AppError } from "../../utils/app-error";
import { genId } from "../../utils/id";
import { nowIso } from "../../utils/time";
import { ProjectMemberService } from "../project/project-member.service";
import { ProjectRepo } from "../project/project.repo";
import { UploadService } from "../upload/upload.service";
import { IssueActivityService } from "./issue.activity";
import { isAllowedIssueAttachmentType } from "./issue.attachment-policy";
import { IssuePermissionService } from "./issue.permission";
import { IssueRepo } from "./issue.repo";
import type {
    AddIssueCommentInput,
    AddIssueParticipantInput,
    AddIssueWatcherInput,
    AssignIssueInput,
    ClaimIssueInput,
    CloseIssueInput,
    CreateIssueInput,
    IssueAttachmentEntity,
    IssueDetailResult,
    IssueEntity,
    IssueListResult,
    IssueStatus,
    ListIssueQuery,
    RemoveIssueParticipantInput,
    RemoveIssueWatcherInput,
    ReassignIssueInput,
    ResolveIssueInput,
    ReopenIssueInput,
    RevokeResolveIssueInput,
    SetIssueVerifierInput,
    StartIssueInput,
    UpdateIssueInput,
    UpdateIssueRepoPatch,
    UploadIssueAttachmentInput,
    UnassignIssueInput,
    VerifyIssueInput,
} from "./issue.types";

const MAX_ISSUE_NO_RETRY = 5;

export class IssueService {
    constructor(
        private readonly repo: IssueRepo,
        private readonly projectRepo: ProjectRepo,
        private readonly projectMemberService: ProjectMemberService,
        private readonly uploadService: UploadService,
        private readonly permission: IssuePermissionService,
        private readonly activity: IssueActivityService
    ) { }

    create(input: CreateIssueInput): IssueEntity {
        const project = this.projectRepo.findById(input.projectId);
        if (!project) {
            throw new AppError("PROJECT_NOT_FOUND", `项目未找到: ${input.projectId}`, 404);
        }

        const operatorId = this.permission.requireOperatorId(input.operatorId ?? input.reporterId, "create issue");
        this.permission.assertCanCreate(input.projectId, operatorId);

        let assigneeId: string | null = input.assigneeId?.trim() || null;
        let assigneeName: string | null = null;
        let verifierId: string | null = input.verifierId?.trim() || null;
        let verifierName: string | null = null;

        if (assigneeId || verifierId) {
            if (!this.permission.canManageProject(input.projectId, operatorId)) {
                throw new AppError("ISSUE_FORBIDDEN_OPERATOR", "创建时带负责人或验证人仅管理员可执行", 403);
            }
        }

        if (assigneeId) {
            const member = this.requireProjectMember(input.projectId, assigneeId, "【创建时设置负责人】");
            assigneeName = member.displayName;
        }

        if (verifierId) {
            const member = this.requireProjectMember(input.projectId, verifierId, "【创建时设置验证人】");
            verifierName = member.displayName;
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
                status: assigneeId ? "assigned" : "open",
                priority: input.priority ?? "medium",
                reporterId: input.reporterId?.trim() || operatorId,
                reporterName: input.reporterName?.trim() || input.operatorName?.trim() || null,
                assigneeId,
                assigneeName,
                verifierId,
                verifierName,
                lastVerifiedResult: null,
                closeReasonType: null,
                closeReasonText: null,
                reopenCount: 0,
                module: input.module?.trim() || null,
                version: input.version?.trim() || null,
                environment: input.environment?.trim() || null,
                resolvedAt: null,
                verifiedAt: null,
                closedAt: null,
                createdAt: now,
                updatedAt: now
            };

            try {
                this.repo.runInTransaction(() => {
                    this.repo.create(entity);
                    this.activity.record({
                        issueId: entity.id,
                        actionType: "create",
                        fromStatus: null,
                        toStatus: entity.status,
                        operatorId,
                        operatorName: input.operatorName?.trim() || entity.reporterName,
                        summary: assigneeName ? `创建并指派给 ${assigneeName}` : "创建问题",
                        meta: { assigneeId, verifierId }
                    });
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
        const issue = this.getById(id);
        const operatorId = this.permission.requireOperatorId(input.operatorId, "update issue");
        this.assertStatus(issue.status, ["open", "assigned", "reopened"], "编辑");
        this.permission.assertCanUpdate(issue, operatorId);

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
            this.activity.record({
                issueId: id,
                actionType: "update",
                fromStatus: issue.status,
                toStatus: issue.status,
                operatorId,
                operatorName: input.operatorName?.trim() || null,
                summary: "更新问题信息"
            });
        });

        return this.getById(id);
    }

    assign(id: string, input: AssignIssueInput): IssueEntity {
        const issue = this.getById(id);
        const operatorId = this.permission.requireOperatorId(input.operatorId, "assign");
        this.assertStatus(issue.status, ["open", "reopened"], "指派");
        this.permission.assertCanAssign(issue, operatorId);
        const assignee = this.requireProjectMember(issue.projectId, input.assigneeId.trim(), "【指派】");

        return this.applyAssigneeChange(issue, {
            actionType: "assign",
            operatorId,
            operatorName: input.operatorName,
            assigneeId: assignee.userId,
            assigneeName: assignee.displayName,
            nextStatus: "assigned",
            summary: input.comment?.trim() || `指派给 ${assignee.displayName}`
        });
    }

    claim(id: string, input: ClaimIssueInput): IssueEntity {
        const issue = this.getById(id);
        const operatorId = this.permission.requireOperatorId(input.operatorId, "claim");
        this.assertStatus(issue.status, ["open", "reopened"], "认领");
        this.permission.assertCanClaim(issue, operatorId);
        const member = this.requireProjectMember(issue.projectId, operatorId, "【认领】");

        return this.applyAssigneeChange(issue, {
            actionType: "claim",
            operatorId,
            operatorName: input.operatorName,
            assigneeId: member.userId,
            assigneeName: member.displayName,
            nextStatus: "assigned",
            summary: input.comment?.trim() || `认领为 ${member.displayName}`
        });
    }

    unassign(id: string, input: UnassignIssueInput): IssueEntity {
        const issue = this.getById(id);
        const operatorId = this.permission.requireOperatorId(input.operatorId, "unassign");
        this.assertStatus(issue.status, ["assigned"], "释放负责人");
        this.permission.assertCanUnassign(issue, operatorId);

        return this.applyAssigneeChange(issue, {
            actionType: "unassign",
            operatorId,
            operatorName: input.operatorName,
            assigneeId: null,
            assigneeName: null,
            nextStatus: "open",
            summary: input.comment?.trim() || "释放负责人"
        });
    }

    reassign(id: string, input: ReassignIssueInput): IssueEntity {
        const issue = this.getById(id);
        const operatorId = this.permission.requireOperatorId(input.operatorId, "reassign");
        this.assertStatus(issue.status, ["assigned", "in_progress", "reopened"], "转派");
        this.permission.assertCanReassign(issue, operatorId);
        const assignee = this.requireProjectMember(issue.projectId, input.assigneeId.trim(), "【转派】");

        return this.applyAssigneeChange(issue, {
            actionType: "reassign",
            operatorId,
            operatorName: input.operatorName,
            assigneeId: assignee.userId,
            assigneeName: assignee.displayName,
            nextStatus: "assigned",
            summary: input.comment?.trim() || `转派给 ${assignee.displayName}`
        });
    }

    setVerifier(id: string, input: SetIssueVerifierInput): IssueEntity {
        const issue = this.getById(id);
        const operatorId = this.permission.requireOperatorId(input.operatorId, "set verifier");
        this.assertStatus(issue.status, ["open", "assigned", "in_progress", "reopened"], "设置验证人");
        this.permission.assertCanSetVerifier(issue, operatorId);

        let verifierId = input.verifierId?.trim() || null;
        let verifierName: string | null = null;
        if (verifierId) {
            verifierName = this.requireProjectMember(issue.projectId, verifierId, "【设置验证人】").displayName;
        }

        this.repo.runInTransaction(() => {
            const now = nowIso();
            const changed = this.repo.update(id, {
                verifierId,
                verifierName,
                updatedAt: now
            });
            if (!changed) {
                throw new AppError("ISSUE_SET_VERIFIER_FAILED", "无法设置验证人", 500);
            }
            this.activity.record({
                issueId: id,
                actionType: "set_verifier",
                fromStatus: issue.status,
                toStatus: issue.status,
                operatorId,
                operatorName: input.operatorName?.trim() || null,
                summary: verifierName ? `设置验证人: ${verifierName}` : "清空验证人",
                meta: { verifierId }
            });
        });

        return this.getById(id);
    }

    addParticipant(id: string, input: AddIssueParticipantInput): IssueDetailResult {
        const issue = this.getById(id);
        const operatorId = this.permission.requireOperatorId(input.operatorId, "add participant");
        this.assertStatus(issue.status, ["assigned", "in_progress", "reopened"], "添加参与人");
        this.permission.assertCanManageParticipants(issue, operatorId);
        const member = this.requireProjectMember(issue.projectId, input.userId.trim(), "【添加参与人】");

        this.repo.runInTransaction(() => {
            if (!this.repo.hasParticipant(issue.id, member.userId)) {
                this.repo.addParticipant({
                    id: genId("ipt"),
                    issueId: issue.id,
                    userId: member.userId,
                    userName: member.displayName,
                    createdAt: nowIso()
                });
            }
            this.activity.record({
                issueId: issue.id,
                actionType: "add_participant",
                fromStatus: issue.status,
                toStatus: issue.status,
                operatorId,
                operatorName: input.operatorName?.trim() || null,
                summary: `添加参与人: ${member.displayName}`,
                meta: { userId: member.userId }
            });
        });

        return this.getDetail(issue.id);
    }

    removeParticipant(id: string, input: RemoveIssueParticipantInput): IssueDetailResult {
        const issue = this.getById(id);
        const operatorId = this.permission.requireOperatorId(input.operatorId, "remove participant");
        const userId = input.userId.trim();
        this.permission.assertCanManageParticipants(issue, operatorId);

        this.repo.runInTransaction(() => {
            this.repo.removeParticipant(issue.id, userId);
            this.activity.record({
                issueId: issue.id,
                actionType: "remove_participant",
                fromStatus: issue.status,
                toStatus: issue.status,
                operatorId,
                operatorName: input.operatorName?.trim() || null,
                summary: `移除参与人: ${userId}`,
                meta: { userId }
            });
        });

        return this.getDetail(issue.id);
    }

    addWatcher(id: string, input: AddIssueWatcherInput): IssueDetailResult {
        const issue = this.getById(id);
        const operatorId = this.permission.requireOperatorId(input.operatorId, "add watcher");
        const userId = input.userId?.trim() || operatorId;
        const userName = input.userName?.trim() || this.requireProjectMember(issue.projectId, userId, "【关注】").displayName;
        if (userId === operatorId) {
            this.permission.assertCanWatch(issue, operatorId);
        } else {
            this.permission.assertCanManageWatchers(issue, operatorId);
        }

        this.repo.runInTransaction(() => {
            if (!this.repo.hasWatcher(issue.id, userId)) {
                this.repo.addWatcher({
                    id: genId("iwt"),
                    issueId: issue.id,
                    userId,
                    userName,
                    createdAt: nowIso()
                });
            }
            this.activity.record({
                issueId: issue.id,
                actionType: "add_watcher",
                fromStatus: issue.status,
                toStatus: issue.status,
                operatorId,
                operatorName: input.operatorName?.trim() || null,
                summary: `添加关注人: ${userName}`,
                meta: { userId }
            });
        });

        return this.getDetail(issue.id);
    }

    removeWatcher(id: string, input: RemoveIssueWatcherInput): IssueDetailResult {
        const issue = this.getById(id);
        const operatorId = this.permission.requireOperatorId(input.operatorId, "remove watcher");
        const userId = input.userId.trim();
        if (userId !== operatorId) {
            this.permission.assertCanManageWatchers(issue, operatorId);
        } else {
            this.permission.assertCanWatch(issue, operatorId);
        }

        this.repo.runInTransaction(() => {
            this.repo.removeWatcher(issue.id, userId);
            this.activity.record({
                issueId: issue.id,
                actionType: "remove_watcher",
                fromStatus: issue.status,
                toStatus: issue.status,
                operatorId,
                operatorName: input.operatorName?.trim() || null,
                summary: `移除关注人: ${userId}`,
                meta: { userId }
            });
        });

        return this.getDetail(issue.id);
    }

    start(id: string, input: StartIssueInput): IssueEntity {
        const issue = this.getById(id);
        const operatorId = this.permission.requireOperatorId(input.operatorId, "start");
        this.assertStatus(issue.status, ["assigned", "reopened"], "开始处理");
        this.permission.assertCanStart(issue, operatorId);
        return this.applyStatusChange(issue, {
            actionType: "start",
            operatorId,
            operatorName: input.operatorName,
            nextStatus: "in_progress",
            summary: input.comment?.trim() || "开始处理"
        });
    }

    resolve(id: string, input: ResolveIssueInput): IssueEntity {
        const issue = this.getById(id);
        const operatorId = this.permission.requireOperatorId(input.operatorId, "resolve");
        this.assertStatus(issue.status, ["in_progress"], "标记已处理");
        this.permission.assertCanResolve(issue, operatorId);
        return this.applyStatusChange(issue, {
            actionType: "resolve",
            operatorId,
            operatorName: input.operatorName,
            nextStatus: "resolved",
            summary: input.comment.trim(),
            patch: {
                resolvedAt: nowIso(),
                verifiedAt: null,
                lastVerifiedResult: null,
                closedAt: null,
                closeReasonType: null,
                closeReasonText: null
            }
        });
    }

    revokeResolve(id: string, input: RevokeResolveIssueInput): IssueEntity {
        const issue = this.getById(id);
        const operatorId = this.permission.requireOperatorId(input.operatorId, "revoke resolve");
        this.assertStatus(issue.status, ["resolved"], "撤回已处理");
        this.permission.assertCanRevokeResolve(issue, operatorId);
        return this.applyStatusChange(issue, {
            actionType: "revoke_resolve",
            operatorId,
            operatorName: input.operatorName,
            nextStatus: "in_progress",
            summary: input.comment?.trim() || "撤回已处理",
            patch: {
                resolvedAt: null,
                verifiedAt: null,
                lastVerifiedResult: null,
                closedAt: null,
                closeReasonType: null,
                closeReasonText: null
            }
        });
    }

    verify(id: string, input: VerifyIssueInput): IssueEntity {
        const issue = this.getById(id);
        const operatorId = this.permission.requireOperatorId(input.operatorId, "verify");
        this.assertStatus(issue.status, ["resolved"], "验证通过");
        this.permission.assertCanVerify(issue, operatorId);
        return this.applyStatusChange(issue, {
            actionType: "verify",
            operatorId,
            operatorName: input.operatorName,
            nextStatus: "verified",
            summary: input.comment?.trim() || "验证通过",
            patch: {
                verifiedAt: nowIso(),
                lastVerifiedResult: "pass",
                closedAt: null
            }
        });
    }

    reopen(id: string, input: ReopenIssueInput): IssueEntity {
        const issue = this.getById(id);
        const operatorId = this.permission.requireOperatorId(input.operatorId, "reopen");
        this.assertStatus(issue.status, ["resolved", "verified", "closed"], "驳回或重开");
        this.permission.assertCanReopen(issue, operatorId);
        return this.applyStatusChange(issue, {
            actionType: "reopen",
            operatorId,
            operatorName: input.operatorName,
            nextStatus: "reopened",
            summary: input.comment.trim(),
            patch: {
                reopenCount: issue.reopenCount + 1,
                verifiedAt: null,
                lastVerifiedResult: "fail",
                closedAt: null,
                closeReasonType: null,
                closeReasonText: null
            }
        });
    }

    close(id: string, input: CloseIssueInput): IssueEntity {
        const issue = this.getById(id);
        const operatorId = this.permission.requireOperatorId(input.operatorId, "close");
        if (issue.status === "in_progress" && !this.permission.canManageProject(issue.projectId, operatorId)) {
            throw new AppError("ISSUE_FORBIDDEN_OPERATOR", "处理中状态仅管理员可关闭", 403);
        }
        this.assertStatus(issue.status, ["open", "assigned", "resolved", "verified", "reopened", "in_progress"], "关闭");
        this.permission.assertCanClose(issue, operatorId);

        const closeComment = input.comment?.trim() || null;
        if (issue.status !== "verified" && !input.closeReasonType && !closeComment) {
            throw new AppError("ISSUE_CLOSE_REASON_REQUIRED", "关闭未完成流转的问题时需要提供关闭原因或说明", 400);
        }

        return this.applyStatusChange(issue, {
            actionType: "close",
            operatorId,
            operatorName: input.operatorName,
            nextStatus: "closed",
            summary: closeComment || "关闭问题",
            patch: {
                closedAt: nowIso(),
                closeReasonType: input.closeReasonType ?? null,
                closeReasonText: closeComment
            },
            meta: { closeReasonType: input.closeReasonType ?? null }
        });
    }

    addComment(id: string, input: AddIssueCommentInput): IssueDetailResult {
        const issue = this.getById(id);
        const operatorId = this.permission.requireOperatorId(input.authorId, "comment");
        this.permission.assertCanComment(issue, operatorId);
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
            this.activity.record({
                issueId: id,
                actionType: "comment",
                fromStatus: issue.status,
                toStatus: issue.status,
                operatorId: input.authorId?.trim() || null,
                operatorName: input.authorName?.trim() || null,
                summary: "新增评论"
            });
        });

        return this.getDetail(id);
    }

    listAttachments(issueId: string): IssueAttachmentEntity[] {
        this.getById(issueId);
        return this.repo.listAttachments(issueId);
    }

    async uploadAttachment(input: UploadIssueAttachmentInput): Promise<IssueAttachmentEntity> {
        const issue = this.getById(input.issueId);
        const operatorId = this.permission.requireOperatorId(input.uploaderId, "upload attachment");
        this.permission.assertCanUploadAttachment(issue, operatorId);

        const mimeType = input.mimeType?.trim().toLowerCase() || "";
        const fileExt = path.extname(input.originalName || "").trim().toLowerCase() || null;
        if (input.fileSize > env.uploadMaxFileSize) {
            throw new AppError("ISSUE_ATTACHMENT_TOO_LARGE", `文件太大, 最大支持 ${env.uploadMaxFileSize} bytes`, 400);
        }
        if (!isAllowedIssueAttachmentType(mimeType, fileExt)) {
            throw new AppError("ISSUE_ATTACHMENT_INVALID_TYPE", "仅支持图片和视频文件上传", 400);
        }

        const upload = this.uploadService.createLocalUpload({
            category: "issue",
            originalName: input.originalName,
            mimeType: input.mimeType,
            fileSize: input.fileSize,
            tempFilePath: input.tempFilePath,
            storageDir: this.getIssueUploadDir(issue.id),
            visibility: "private",
            uploaderId: input.uploaderId,
            uploaderName: input.uploaderName
        });

        const attachment: IssueAttachmentEntity = {
            id: genId("iat"),
            issueId: issue.id,
            uploadId: upload.id,
            fileName: upload.fileName,
            originalName: upload.originalName,
            fileExt: upload.fileExt,
            mimeType: upload.mimeType,
            fileSize: upload.fileSize,
            storagePath: upload.storagePath,
            storageProvider: upload.storageProvider,
            uploaderId: upload.uploaderId,
            uploaderName: upload.uploaderName,
            createdAt: nowIso()
        };

        this.repo.runInTransaction(() => {
            this.repo.createAttachment(attachment);
            this.activity.record({
                issueId: issue.id,
                actionType: "upload_attachment",
                fromStatus: issue.status,
                toStatus: issue.status,
                operatorId: input.uploaderId?.trim() || null,
                operatorName: input.uploaderName?.trim() || null,
                summary: `上传附件: ${attachment.originalName}`,
                meta: { uploadId: upload.id }
            });
        });
        return attachment;
    }

    removeAttachment(issueId: string, attachmentId: string, operator?: { operatorId?: string | null; operatorName?: string | null; }): IssueDetailResult {
        const issue = this.getById(issueId);
        const attachment = this.repo.findAttachmentById(attachmentId);
        if (!attachment || attachment.issueId !== issue.id) {
            throw new AppError("ISSUE_ATTACHMENT_NOT_FOUND", "附件未找到", 404);
        }
        const operatorId = this.permission.requireOperatorId(operator?.operatorId, "remove attachment");
        this.permission.assertCanDeleteAttachment(issue, attachment, operatorId);

        const upload = this.uploadService.getById(attachment.uploadId);
        this.repo.runInTransaction(() => {
            const deleted = this.repo.deleteAttachment(attachmentId);
            if (!deleted) {
                throw new AppError("ISSUE_ATTACHMENT_DELETE_FAILED", "删除附件记录失败", 500);
            }
            this.uploadService.softDelete(attachment.uploadId);
            this.activity.record({
                issueId: issue.id,
                actionType: "remove_attachment",
                fromStatus: issue.status,
                toStatus: issue.status,
                operatorId,
                operatorName: operator?.operatorName?.trim() || null,
                summary: `删除附件: ${attachment.originalName}`,
                meta: { uploadId: attachment.uploadId }
            });
        });

        this.uploadService.deleteLocalFile(upload);
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

    private applyAssigneeChange(issue: IssueEntity, input: {
        actionType: "assign" | "claim" | "unassign" | "reassign";
        operatorId: string;
        operatorName?: string | null;
        assigneeId: string | null;
        assigneeName: string | null;
        nextStatus: IssueStatus;
        summary: string;
    }): IssueEntity {
        this.repo.runInTransaction(() => {
            const changed = this.repo.update(issue.id, {
                assigneeId: input.assigneeId,
                assigneeName: input.assigneeName,
                status: input.nextStatus,
                updatedAt: nowIso()
            });
            if (!changed) {
                throw new AppError("ISSUE_ASSIGN_FAILED", "无法更新负责人", 500);
            }
            this.activity.record({
                issueId: issue.id,
                actionType: input.actionType,
                fromStatus: issue.status,
                toStatus: input.nextStatus,
                operatorId: input.operatorId,
                operatorName: input.operatorName?.trim() || null,
                summary: input.summary,
                meta: { assigneeId: input.assigneeId }
            });
        });
        return this.getById(issue.id);
    }

    private applyStatusChange(issue: IssueEntity, input: {
        actionType: "start" | "resolve" | "revoke_resolve" | "verify" | "reopen" | "close";
        operatorId: string;
        operatorName?: string | null;
        nextStatus: IssueStatus;
        summary: string;
        patch?: Omit<UpdateIssueRepoPatch, "status" | "updatedAt">;
        meta?: Record<string, unknown> | null;
    }): IssueEntity {
        this.repo.runInTransaction(() => {
            const changed = this.repo.update(issue.id, {
                ...(input.patch ?? {}),
                status: input.nextStatus,
                updatedAt: nowIso()
            });
            if (!changed) {
                throw new AppError("ISSUE_STATUS_UPDATE_FAILED", "无法更新问题状态", 500);
            }
            this.activity.record({
                issueId: issue.id,
                actionType: input.actionType,
                fromStatus: issue.status,
                toStatus: input.nextStatus,
                operatorId: input.operatorId,
                operatorName: input.operatorName?.trim() || null,
                summary: input.summary,
                meta: input.meta ?? null
            });
        });
        return this.getById(issue.id);
    }

    private getIssueUploadDir(issueId: string): string {
        return path.join(env.uploadRoot, "issues", issueId);
    }

    private assertStatus(current: IssueStatus, allowed: readonly IssueStatus[], action: string): void {
        if (!allowed.includes(current)) {
            throw new AppError("ISSUE_INVALID_STATUS_TRANSITION", `${action} 操作不允许在当前状态执行: ${current}`, 400);
        }
    }

    private requireProjectMember(projectId: string, userId: string, action: string) {
        return this.permission.requireProjectMember(projectId, userId, action);
    }

    private normalizeCommentMentions(projectId: string, mentions?: AddIssueCommentInput["mentions"]): Array<{ userId: string; displayName: string }> {
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
            normalized.push({ userId, displayName: member.displayName });
            seen.add(userId);
        }
        return normalized;
    }

    private generateIssueNo(): string {
        const now = new Date();
        const date = now.getFullYear().toString() + String(now.getMonth() + 1).padStart(2, "0") + String(now.getDate()).padStart(2, "0");
        const millis = String(now.getMilliseconds()).padStart(3, "0");
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
        return `ISSUE-${date}-${millis}${random}`;
    }

    private isUniqueIssueNoError(error: unknown): boolean {
        return error instanceof Database.SqliteError && error.code === "SQLITE_CONSTRAINT_UNIQUE";
    }

    private handleSqliteError(error: unknown, issueNo?: string): never {
        if (error instanceof AppError) {
            throw error;
        }
        if (error instanceof Database.SqliteError && error.code === "SQLITE_CONSTRAINT_UNIQUE") {
            throw new AppError("ISSUE_NO_EXISTS", `问题编号已存在: ${issueNo ?? "未知"}`, 409);
        }
        throw error;
    }
}
