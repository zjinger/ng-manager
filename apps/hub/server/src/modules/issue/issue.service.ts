import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { env } from "../../env";
import { AppError } from "../../utils/app-error";
import { genId } from "../../utils/id";
import { buildStoredFileName, ensureDirSync, getFileExt, safeBaseName } from "../../utils/storage";
import { nowIso } from "../../utils/time";
import { ProjectRepo } from "../project/project.repo";
import { IssueRepo } from "./issue.repo";
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
        private readonly projectRepo: ProjectRepo
    ) { }

    create(input: CreateIssueInput): IssueEntity {
        const project = this.projectRepo.findById(input.projectId);
        if (!project) {
            throw new AppError("PROJECT_NOT_FOUND", `project not found: ${input.projectId}`, 404);
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
                            summary: "create issue"
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

        throw new AppError("ISSUE_CREATE_FAILED", "failed to create issue", 500);
    }

    getById(id: string): IssueEntity {
        const item = this.repo.findById(id);
        if (!item) {
            throw new AppError("ISSUE_NOT_FOUND", `issue not found: ${id}`, 404);
        }
        return item;
    }

    getDetail(id: string): IssueDetailResult {
        const detail = this.repo.getDetail(id);
        if (!detail) {
            throw new AppError("ISSUE_NOT_FOUND", `issue not found: ${id}`, 404);
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
                throw new AppError("ISSUE_UPDATE_FAILED", "failed to update issue", 500);
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
        this.assertTransition(issue.status, nextStatus);

        const assigneeId = input.assigneeId?.trim() || null;
        const assigneeName = input.assigneeName?.trim() || null;
        if (!assigneeId || !assigneeName) {
            throw new AppError("ISSUE_ASSIGNEE_REQUIRED", "assignee is required", 400);
        }

        this.repo.runInTransaction(() => {
            const changed = this.repo.update(id, {
                assigneeId,
                assigneeName,
                status: nextStatus,
                updatedAt: nowIso()
            });
            if (!changed) {
                throw new AppError("ISSUE_ASSIGN_FAILED", "failed to assign issue", 500);
            }

            this.repo.createActionLog(
                this.buildActionLog({
                    issueId: id,
                    actionType: "assign",
                    fromStatus: issue.status,
                    toStatus: nextStatus,
                    operatorId: input.operatorId?.trim() || null,
                    operatorName: input.operatorName?.trim() || null,
                    summary: input.comment?.trim() || `assign to ${assigneeName}`
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
        this.assertAssigneeOperator(issue, operatorId, "start progress");

        this.repo.runInTransaction(() => {
            const changed = this.repo.update(id, {
                status: nextStatus,
                updatedAt: nowIso()
            });

            if (!changed) {
                throw new AppError("ISSUE_START_PROGRESS_FAILED", "failed to start progress", 500);
            }

            this.repo.createActionLog(
                this.buildActionLog({
                    issueId: id,
                    actionType: "start_progress",
                    fromStatus: issue.status,
                    toStatus: nextStatus,
                    operatorId,
                    operatorName: input.operatorName?.trim() || null,
                    summary: input.comment?.trim() || "start progress"
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
        this.assertAssigneeOperator(issue, operatorId, "mark fixed");

        this.repo.runInTransaction(() => {
            const now = nowIso();
            const changed = this.repo.update(id, {
                status: nextStatus,
                fixedAt: now,
                verifiedAt: null,
                closedAt: null,
                updatedAt: now
            });

            if (!changed) {
                throw new AppError("ISSUE_MARK_FIXED_FAILED", "failed to mark fixed", 500);
            }

            this.repo.createActionLog(
                this.buildActionLog({
                    issueId: id,
                    actionType: "mark_fixed",
                    fromStatus: issue.status,
                    toStatus: nextStatus,
                    operatorId,
                    operatorName: input.operatorName?.trim() || null,
                    summary: input.comment?.trim() || "mark issue fixed"
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
        this.assertReporterOperator(issue, operatorId, "verify");

        this.repo.runInTransaction(() => {
            const now = nowIso();
            const changed = this.repo.update(id, {
                status: nextStatus,
                verifiedAt: now,
                closedAt: null,
                updatedAt: now
            });

            if (!changed) {
                throw new AppError("ISSUE_VERIFY_FAILED", "failed to verify issue", 500);
            }

            this.repo.createActionLog(
                this.buildActionLog({
                    issueId: id,
                    actionType: "verify",
                    fromStatus: issue.status,
                    toStatus: nextStatus,
                    operatorId,
                    operatorName: input.operatorName?.trim() || null,
                    summary: input.comment?.trim() || "verify issue"
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
        this.assertReporterOperator(issue, operatorId, "reopen");

        this.repo.runInTransaction(() => {
            const changed = this.repo.update(id, {
                status: nextStatus,
                reopenCount: issue.reopenCount + 1,
                verifiedAt: null,
                closedAt: null,
                updatedAt: nowIso()
            });

            if (!changed) {
                throw new AppError("ISSUE_REOPEN_FAILED", "failed to reopen issue", 500);
            }

            this.repo.createActionLog(
                this.buildActionLog({
                    issueId: id,
                    actionType: "reopen",
                    fromStatus: issue.status,
                    toStatus: nextStatus,
                    operatorId,
                    operatorName: input.operatorName?.trim() || null,
                    summary: input.comment?.trim() || "reopen issue"
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
        this.assertReporterOperator(issue, operatorId, "close");

        const closeComment = input.comment?.trim();
        if (issue.status === "open") {
            if (!input.closeReasonType) {
                throw new AppError("ISSUE_CLOSE_REASON_REQUIRED", "closeReasonType is required when closing open issue", 400);
            }
            if (!closeComment) {
                throw new AppError("ISSUE_CLOSE_COMMENT_REQUIRED", "comment is required when closing open issue", 400);
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
                throw new AppError("ISSUE_CLOSE_FAILED", "failed to close issue", 500);
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

        this.repo.runInTransaction(() => {
            this.repo.createComment({
                id: genId("isc"),
                issueId: issue.id,
                authorId: input.authorId?.trim() || null,
                authorName: input.authorName?.trim() || null,
                content: input.content.trim(),
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
                    summary: "add comment"
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
            throw new AppError("ISSUE_ATTACHMENT_TEMP_FILE_NOT_FOUND", "temp file not found", 400);
        }

        const issueDir = this.getIssueUploadDir(issue.id);
        ensureDirSync(issueDir);

        const originalName = safeBaseName(input.originalName || "file");
        const storedFileName = buildStoredFileName(originalName);
        const targetPath = path.join(issueDir, storedFileName);

        const stat = fs.statSync(input.tempFilePath);
        const fileSize = input.fileSize || stat.size;

        if (fileSize > env.uploadMaxFileSize) {
            throw new AppError(
                "ISSUE_ATTACHMENT_TOO_LARGE",
                `file too large, max ${env.uploadMaxFileSize} bytes`,
                400
            );
        }

        fs.copyFileSync(input.tempFilePath, targetPath);

        const attachment: IssueAttachmentEntity = {
            id: genId("iat"),
            issueId: issue.id,
            fileName: storedFileName,
            originalName,
            fileExt: getFileExt(originalName),
            mimeType: input.mimeType ?? null,
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
                        summary: `upload attachment: ${attachment.originalName}`
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
            throw new AppError("ISSUE_ATTACHMENT_NOT_FOUND", "attachment not found", 404);
        }

        if (attachment.storageProvider === "local" && attachment.storagePath) {
            try {
                if (fs.existsSync(attachment.storagePath)) {
                    fs.unlinkSync(attachment.storagePath);
                }
            } catch (_error) {
                throw new AppError(
                    "ISSUE_ATTACHMENT_DELETE_FILE_FAILED",
                    "failed to delete attachment file",
                    500
                );
            }
        }

        this.repo.runInTransaction(() => {
            const deleted = this.repo.deleteAttachment(attachmentId);
            if (!deleted) {
                throw new AppError("ISSUE_ATTACHMENT_DELETE_FAILED", "failed to delete attachment record", 500);
            }

            this.repo.createActionLog(
                this.buildActionLog({
                    issueId: issue.id,
                    actionType: "remove_attachment",
                    fromStatus: issue.status,
                    toStatus: issue.status,
                    operatorId: operator?.operatorId?.trim() || null,
                    operatorName: operator?.operatorName?.trim() || null,
                    summary: `remove attachment: ${attachment.originalName}`
                })
            );
        });

        return this.getDetail(issue.id);
    }

    getAttachment(issueId: string, attachmentId: string): IssueAttachmentEntity {
        const issue = this.getById(issueId);
        const attachment = this.repo.findAttachmentById(attachmentId);

        if (!attachment || attachment.issueId !== issue.id) {
            throw new AppError("ISSUE_ATTACHMENT_NOT_FOUND", "attachment not found", 404);
        }

        if (attachment.storageProvider === "local" && !fs.existsSync(attachment.storagePath)) {
            throw new AppError("ISSUE_ATTACHMENT_FILE_NOT_FOUND", "attachment file not found", 404);
        }

        return attachment;
    }

    private getIssueUploadDir(issueId: string): string {
        return path.join(env.uploadRoot, "issues", issueId);
    }

    private assertTransition(from: IssueStatus, to: IssueStatus): void {
        const allowed = ISSUE_STATUS_TRANSITIONS[from] ?? [];
        if (!allowed.includes(to)) {
            throw new AppError(
                "ISSUE_INVALID_STATUS_TRANSITION",
                `cannot change issue status from ${from} to ${to}`,
                400
            );
        }
    }

    private requireOperatorId(operatorId: string | null | undefined, action: string): string {
        const value = operatorId?.trim();
        if (!value) {
            throw new AppError("ISSUE_OPERATOR_REQUIRED", `operatorId is required to ${action}`, 400);
        }
        return value;
    }

    private assertAssigneeOperator(issue: IssueEntity, operatorId: string, action: string): void {
        if (issue.assigneeId && issue.assigneeId !== operatorId) {
            throw new AppError(
                "ISSUE_FORBIDDEN_OPERATOR",
                `only current assignee can ${action}`,
                403
            );
        }
    }

    private assertReporterOperator(issue: IssueEntity, operatorId: string, action: string): void {
        if (issue.reporterId && issue.reporterId !== operatorId) {
            throw new AppError(
                "ISSUE_FORBIDDEN_OPERATOR",
                `only issue reporter can ${action}`,
                403
            );
        }
    }

    private buildCloseSummary(status: IssueStatus, reasonType?: IssueCloseReasonType, comment?: string): string {
        if (status === "open") {
            const reason = reasonType ?? "unknown";
            const text = comment ?? "";
            return `close open issue (${reason}): ${text}`;
        }

        return comment || "close issue";
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
                `issue no already exists: ${issueNo ?? "unknown"}`,
                409
            );
        }

        throw error;
    }
}
