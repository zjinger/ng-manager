import type { FastifyInstance } from "fastify";
import fs from "node:fs";
import {
    addIssueCommentSchema,
    addIssueParticipantSchema,
    addIssueWatcherSchema,
    assignIssueSchema,
    claimIssueSchema,
    closeIssueSchema,
    createIssueSchema,
    listIssueQuerySchema,
    removeIssueAttachmentSchema,
    removeIssueParticipantSchema,
    removeIssueWatcherSchema,
    reopenIssueSchema,
    resolveIssueSchema,
    reassignIssueSchema,
    revokeResolveIssueSchema,
    setIssueVerifierSchema,
    startIssueSchema,
    unassignIssueSchema,
    updateIssueSchema,
    verifyIssueSchema
} from "../../modules/issue/issue.schema";
import type {
    IssueAttachmentEntity,
    IssueDetailResult,
    IssueParticipantEntity
} from "../../modules/issue/issue.types";
import { AppError } from "../../utils/app-error";
import {
    getIssueAttachmentAcceptString,
    ISSUE_ATTACHMENT_EXT_ALLOWLIST,
    ISSUE_ATTACHMENT_MIME_PREFIX_ALLOWLIST
} from "../../modules/issue/issue.attachment-policy";
import { cleanupTempFiles, parseMultipartUpload } from "../../utils/multipart";
import { ok } from "../../utils/response";

interface IssueAttachmentDto {
    id: string;
    originalName: string;
    fileExt?: string | null;
    mimeType?: string | null;
    fileSize: number;
    storageProvider: "local";
    uploaderId?: string | null;
    uploaderName?: string | null;
    createdAt: string;
    downloadUrl: string;
}

function getOperator(request: { adminUser: { id: string; userId?: string | null; nickname?: string | null; username: string } | null }) {
    if (!request.adminUser) {
        throw new AppError("AUTH_UNAUTHORIZED", "unauthorized", 401);
    }

    return {
        operatorId: request.adminUser.userId?.trim() || request.adminUser.id,
        operatorName: request.adminUser.nickname?.trim() || request.adminUser.username
    };
}

function toAttachmentDto(issueId: string, attachment: IssueAttachmentEntity): IssueAttachmentDto {
    return {
        id: attachment.id,
        originalName: attachment.originalName,
        fileExt: attachment.fileExt,
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize,
        storageProvider: attachment.storageProvider,
        uploaderId: attachment.uploaderId,
        uploaderName: attachment.uploaderName,
        createdAt: attachment.createdAt,
        downloadUrl: `/api/admin/issues/${issueId}/attachments/${attachment.id}/download`
    };
}

function toLegacyAssignees(detail: IssueDetailResult): IssueParticipantEntity[] {
    if (!detail.issue.assigneeId) {
        return [];
    }
    return [{
        id: `legacy-${detail.issue.id}-${detail.issue.assigneeId}`,
        issueId: detail.issue.id,
        userId: detail.issue.assigneeId,
        userName: detail.issue.assigneeName,
        createdAt: detail.issue.updatedAt
    }];
}

function toIssueDetailDto(detail: IssueDetailResult) {
    return {
        issue: detail.issue,
        participants: detail.participants,
        watchers: detail.watchers,
        assignees: toLegacyAssignees(detail),
        comments: detail.comments,
        attachments: detail.attachments.map((item) => toAttachmentDto(detail.issue.id, item)),
        logs: detail.logs
    };
}

export default async function adminIssueRoutes(fastify: FastifyInstance) {
    fastify.get("/issues/attachment-policy", async () => {
        return ok({
            accept: getIssueAttachmentAcceptString(),
            mimePrefixes: [...ISSUE_ATTACHMENT_MIME_PREFIX_ALLOWLIST],
            exts: [...ISSUE_ATTACHMENT_EXT_ALLOWLIST]
        });
    });

    fastify.get("/issues", async (request) => {
        const query = listIssueQuerySchema.parse(request.query);
        const result = fastify.services.issue.list(query);
        return ok(result);
    });

    fastify.get("/issues/:id", async (request) => {
        const params = request.params as { id: string };
        const result = fastify.services.issue.getDetail(params.id);
        return ok(toIssueDetailDto(result));
    });

    fastify.post("/issues", async (request) => {
        const body = createIssueSchema.parse(request.body);
        const operator = getOperator(request);
        const result = fastify.services.issue.create({
            ...body,
            reporterId: body.reporterId ?? operator.operatorId,
            reporterName: body.reporterName ?? operator.operatorName,
            operatorId: operator.operatorId,
            operatorName: operator.operatorName
        });
        return ok(result);
    });

    fastify.patch("/issues/:id", async (request) => {
        const params = request.params as { id: string };
        const body = updateIssueSchema.parse(request.body);
        const operator = getOperator(request);
        const result = fastify.services.issue.update(params.id, {
            ...body,
            operatorId: operator.operatorId,
            operatorName: operator.operatorName
        });
        return ok(result);
    });

    fastify.post("/issues/:id/assign", async (request) => {
        const params = request.params as { id: string };
        const body = assignIssueSchema.parse(request.body);
        const operator = getOperator(request);
        const result = fastify.services.issue.assign(params.id, {
            ...body,
            assigneeId: body.assigneeId!,
            operatorId: operator.operatorId,
            operatorName: operator.operatorName
        });
        return ok(result);
    });

    fastify.post("/issues/:id/claim", async (request) => {
        const params = request.params as { id: string };
        const body = claimIssueSchema.parse(request.body);
        const operator = getOperator(request);
        const result = fastify.services.issue.claim(params.id, {
            ...body,
            operatorId: operator.operatorId,
            operatorName: operator.operatorName
        });
        return ok(result);
    });

    fastify.post("/issues/:id/unassign", async (request) => {
        const params = request.params as { id: string };
        const body = unassignIssueSchema.parse(request.body);
        const operator = getOperator(request);
        const result = fastify.services.issue.unassign(params.id, {
            ...body,
            operatorId: operator.operatorId,
            operatorName: operator.operatorName
        });
        return ok(result);
    });

    fastify.post("/issues/:id/reassign", async (request) => {
        const params = request.params as { id: string };
        const body = reassignIssueSchema.parse(request.body);
        const operator = getOperator(request);
        const result = fastify.services.issue.reassign(params.id, {
            ...body,
            assigneeId: body.assigneeId!,
            operatorId: operator.operatorId,
            operatorName: operator.operatorName
        });
        return ok(result);
    });

    fastify.post("/issues/:id/verifier", async (request) => {
        const params = request.params as { id: string };
        const body = setIssueVerifierSchema.parse(request.body);
        const operator = getOperator(request);
        const result = fastify.services.issue.setVerifier(params.id, {
            ...body,
            operatorId: operator.operatorId,
            operatorName: operator.operatorName
        });
        return ok(result);
    });

    fastify.post("/issues/:id/participants", async (request) => {
        const params = request.params as { id: string };
        const body = addIssueParticipantSchema.parse(request.body);
        const operator = getOperator(request);
        const result = fastify.services.issue.addParticipant(params.id, {
            ...body,
            operatorId: operator.operatorId,
            operatorName: operator.operatorName
        });
        return ok(toIssueDetailDto(result));
    });

    fastify.delete("/issues/:id/participants/:userId", async (request) => {
        const params = request.params as { id: string; userId: string };
        removeIssueParticipantSchema.parse({ userId: params.userId });
        const operator = getOperator(request);
        const result = fastify.services.issue.removeParticipant(params.id, {
            userId: params.userId,
            operatorId: operator.operatorId,
            operatorName: operator.operatorName
        });
        return ok(toIssueDetailDto(result));
    });

    fastify.post("/issues/:id/watch", async (request) => {
        const params = request.params as { id: string };
        const body = addIssueWatcherSchema.parse(request.body);
        const operator = getOperator(request);
        const result = fastify.services.issue.addWatcher(params.id, {
            ...body,
            userId: body.userId ?? operator.operatorId,
            userName: body.userName ?? operator.operatorName,
            operatorId: operator.operatorId,
            operatorName: operator.operatorName
        });
        return ok(toIssueDetailDto(result));
    });

    fastify.delete("/issues/:id/watch", async (request) => {
        const params = request.params as { id: string };
        const operator = getOperator(request);
        const result = fastify.services.issue.removeWatcher(params.id, {
            userId: operator.operatorId,
            operatorId: operator.operatorId,
            operatorName: operator.operatorName
        });
        return ok(toIssueDetailDto(result));
    });

    fastify.delete("/issues/:id/watchers/:userId", async (request) => {
        const params = request.params as { id: string; userId: string };
        removeIssueWatcherSchema.parse({ userId: params.userId });
        const operator = getOperator(request);
        const result = fastify.services.issue.removeWatcher(params.id, {
            userId: params.userId,
            operatorId: operator.operatorId,
            operatorName: operator.operatorName
        });
        return ok(toIssueDetailDto(result));
    });

    fastify.post("/issues/:id/start", async (request) => {
        const params = request.params as { id: string };
        const body = startIssueSchema.parse(request.body);
        const operator = getOperator(request);
        const result = fastify.services.issue.start(params.id, {
            ...body,
            operatorId: operator.operatorId,
            operatorName: operator.operatorName
        });
        return ok(result);
    });

    fastify.post("/issues/:id/start-progress", async (request) => {
        const params = request.params as { id: string };
        const body = startIssueSchema.parse(request.body);
        const operator = getOperator(request);
        const result = fastify.services.issue.start(params.id, {
            ...body,
            operatorId: operator.operatorId,
            operatorName: operator.operatorName
        });
        return ok(result);
    });

    fastify.post("/issues/:id/resolve", async (request) => {
        const params = request.params as { id: string };
        const body = resolveIssueSchema.parse(request.body);
        const operator = getOperator(request);
        const result = fastify.services.issue.resolve(params.id, {
            ...body,
            operatorId: operator.operatorId,
            operatorName: operator.operatorName
        });
        return ok(result);
    });

    fastify.post("/issues/:id/mark-fixed", async (request) => {
        const params = request.params as { id: string };
        const body = startIssueSchema.parse(request.body);
        const operator = getOperator(request);
        const result = fastify.services.issue.resolve(params.id, {
            ...body,
            comment: body.comment?.trim() || "标记已处理",
            operatorId: operator.operatorId,
            operatorName: operator.operatorName
        });
        return ok(result);
    });

    fastify.post("/issues/:id/revoke-resolve", async (request) => {
        const params = request.params as { id: string };
        const body = revokeResolveIssueSchema.parse(request.body);
        const operator = getOperator(request);
        const result = fastify.services.issue.revokeResolve(params.id, {
            ...body,
            operatorId: operator.operatorId,
            operatorName: operator.operatorName
        });
        return ok(result);
    });

    fastify.post("/issues/:id/verify", async (request) => {
        const params = request.params as { id: string };
        const body = verifyIssueSchema.parse(request.body);
        const operator = getOperator(request);
        const result = fastify.services.issue.verify(params.id, {
            ...body,
            operatorId: operator.operatorId,
            operatorName: operator.operatorName
        });
        return ok(result);
    });

    fastify.post("/issues/:id/reopen", async (request) => {
        const params = request.params as { id: string };
        const body = reopenIssueSchema.parse(request.body);
        const operator = getOperator(request);
        const result = fastify.services.issue.reopen(params.id, {
            ...body,
            operatorId: operator.operatorId,
            operatorName: operator.operatorName
        });
        return ok(result);
    });

    fastify.post("/issues/:id/close", async (request) => {
        const params = request.params as { id: string };
        const body = closeIssueSchema.parse(request.body);
        const operator = getOperator(request);
        const result = fastify.services.issue.close(params.id, {
            ...body,
            operatorId: operator.operatorId,
            operatorName: operator.operatorName
        });
        return ok(result);
    });

    fastify.post("/issues/:id/comments", async (request) => {
        const params = request.params as { id: string };
        const body = addIssueCommentSchema.parse(request.body);
        const operator = getOperator(request);
        const result = fastify.services.issue.addComment(params.id, {
            ...body,
            authorId: operator.operatorId,
            authorName: operator.operatorName
        });
        return ok(toIssueDetailDto(result));
    });

    fastify.post("/issues/:id/attachments", async (request) => {
        const params = request.params as { id: string };
        const { files } = await parseMultipartUpload(request);
        const operator = getOperator(request);

        if (!files.length) {
            throw new AppError("ISSUE_ATTACHMENT_NO_FILE", "no file uploaded", 400);
        }

        try {
            const items: IssueAttachmentDto[] = [];
            for (const file of files) {
                const item = await fastify.services.issue.uploadAttachment({
                    issueId: params.id,
                    originalName: file.originalName,
                    mimeType: file.mimeType,
                    fileSize: file.fileSize,
                    tempFilePath: file.tempFilePath,
                    uploaderId: operator.operatorId,
                    uploaderName: operator.operatorName
                });
                items.push(toAttachmentDto(params.id, item));
            }

            return ok({ items });
        } finally {
            await cleanupTempFiles(files);
        }
    });

    fastify.get("/issues/:id/attachments", async (request) => {
        const params = request.params as { id: string };
        const result = fastify.services.issue.listAttachments(params.id);
        return ok(result.map((item) => toAttachmentDto(params.id, item)));
    });

    fastify.get("/issues/:id/attachments/:attachmentId/download", async (request, reply) => {
        const params = request.params as { id: string; attachmentId: string };
        const attachment = fastify.services.issue.getAttachment(params.id, params.attachmentId);

        reply.header("Content-Type", attachment.mimeType || "application/octet-stream");
        reply.header("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`);
        return reply.send(fs.createReadStream(attachment.storagePath));
    });

    fastify.delete("/issues/:id/attachments/:attachmentId", async (request) => {
        const params = request.params as { id: string; attachmentId: string };
        removeIssueAttachmentSchema.parse(request.body ?? {});
        const operator = getOperator(request);
        const result = fastify.services.issue.removeAttachment(params.id, params.attachmentId, operator);
        return ok(toIssueDetailDto(result));
    });
}


