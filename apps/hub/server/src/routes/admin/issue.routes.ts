import type { FastifyInstance } from "fastify";
import fs from "node:fs";
import { z } from "zod";
import {
  assignIssueSchema,
  claimIssueSchema,
  closeIssueSchema,
  createIssueSchema,
  issueIdParamsSchema,
  listIssuesQuerySchema,
  reassignIssueSchema,
  reopenIssueSchema,
  resolveIssueSchema,
  startIssueSchema,
  updateIssueSchema,
  verifyIssueSchema
} from "../../modules/issue/issue.schema";
import { createIssueCommentSchema } from "../../modules/issue-comment/comment.schema";
import type { IssueEntity } from "../../modules/issue/issue.types";
import type { IssueParticipantEntity } from "../../modules/issue-participant/participant.types";
import { AppError } from "../../utils/app-error";
import { cleanupTempFiles, parseMultipartUpload } from "../../utils/multipart";
import { ok } from "../../utils/response";

const participantBodySchema = z.object({
  userId: z.string().trim().min(1).max(64)
});

const listCurrentUserIssuesQuerySchema = listIssuesQuerySchema.extend({
  projectId: z.string().trim().min(1).max(64).optional()
});

const listMyPendingIssuesQuerySchema = listIssuesQuerySchema.omit({
  status: true,
  assigneeId: true
}).extend({
  projectId: z.string().trim().min(1).max(64).optional()
});

type IssueRealtimeAction =
  | "created"
  | "edited"
  | "assigned"
  | "claimed"
  | "reassigned"
  | "started"
  | "resolved"
  | "verified"
  | "reopened"
  | "closed"
  | "comment_add"
  | "add_participant"
  | "remove_participant"
  | "attachment_add"
  | "attachment_remove";

function getOperator(request: { adminUser: { id: string; userId?: string | null; nickname?: string | null; username: string } | null }) {
  if (!request.adminUser) {
    throw new AppError("AUTH_UNAUTHORIZED", "unauthorized", 401);
  }
  return {
    operatorId: request.adminUser.userId?.trim() || request.adminUser.id,
    operatorName: request.adminUser.nickname?.trim() || request.adminUser.username
  };
}

function collectIssueRealtimeUsers(
  current: IssueEntity,
  currentParticipants: IssueParticipantEntity[],
  previous?: IssueEntity | null,
  extraUserIds: string[] = []
): string[] {
  return Array.from(
    new Set(
      [
        current.reporterId,
        current.assigneeId ?? null,
        previous?.reporterId ?? null,
        previous?.assigneeId ?? null,
        ...currentParticipants.map((item) => item.userId),
        ...extraUserIds
      ]
        .map((item) => item?.trim())
        .filter((item): item is string => !!item)
    )
  );
}

function emitIssueRealtimeEvent(
  fastify: FastifyInstance,
  item: IssueEntity,
  action: IssueRealtimeAction,
  options?: {
    previous?: IssueEntity | null;
    extraUserIds?: string[];
    actorId?: string | null;
    actorName?: string | null;
    commentId?: string | null;
    mentionedUserIds?: string[];
    changedUserIds?: string[];
  }
): void {
  const eventType = action === "created" ? "issue.created" : "issue.updated";
  const currentParticipants = fastify.services.issue.listParticipants(item.projectId, item.id);
  const userIds = collectIssueRealtimeUsers(
    item,
    currentParticipants,
    options?.previous,
    options?.extraUserIds ?? []
  );

  fastify.log.info(
    {
      event: eventType,
      id: item.id,
      issueNo: item.issueNo,
      title: item.title,
      status: item.status,
      action,
      projectId: item.projectId,
      assigneeId: item.assigneeId ?? null,
      actorId: options?.actorId ?? null,
      actorName: options?.actorName ?? null,
      commentId: options?.commentId ?? null,
      mentionedUserIds: options?.mentionedUserIds ?? [],
      changedUserIds: options?.changedUserIds ?? [],
      userIds
    },
    "[hub-ws] emit issue event"
  );

  if (action === "created") {
    fastify.hubWsEvents.issueCreated({
      id: item.id,
      issueNo: item.issueNo,
      title: item.title,
      status: item.status,
      assigneeId: item.assigneeId ?? null,
      assigneeName: item.assigneeName ?? null,
      projectId: item.projectId,
      userIds
    });
    return;
  }

  fastify.hubWsEvents.issueUpdated({
    id: item.id,
    issueNo: item.issueNo,
    title: item.title,
    status: item.status,
    action,
    assigneeId: item.assigneeId ?? null,
    assigneeName: item.assigneeName ?? null,
    projectId: item.projectId,
    userIds,
    actorId: options?.actorId ?? null,
    actorName: options?.actorName ?? null,
    commentId: options?.commentId ?? null,
    mentionedUserIds: options?.mentionedUserIds ?? [],
    changedUserIds: options?.changedUserIds ?? []
  });
}

export default async function issueRoutes(fastify: FastifyInstance) {
  fastify.get("/issues/todo", async (request) => {
    const query = listMyPendingIssuesQuerySchema.parse(request.query);
    const operator = getOperator(request);
    return ok(fastify.services.issue.listMyPendingIssues(operator.operatorId, query));
  });

  fastify.get("/issues", async (request) => {
    const query = listCurrentUserIssuesQuerySchema.parse(request.query);
    const operator = getOperator(request);
    return ok(fastify.services.issue.listCurrentUserIssues(operator.operatorId, query));
  });

  fastify.get("/projects/:projectId/issues", async (request) => {
    const params = request.params as { projectId: string };
    const query = listIssuesQuerySchema.parse(request.query);
    return ok(fastify.services.issue.list(params.projectId, query));
  });

  fastify.get("/projects/:projectId/issues/:id", async (request) => {
    const params = issueIdParamsSchema.parse(request.params);
    return ok(fastify.services.issue.getDetail(params.projectId, params.id));
  });

  fastify.post("/projects/:projectId/issues", async (request) => {
    const params = request.params as { projectId: string };
    const body = createIssueSchema.parse(request.body);
    const operator = getOperator(request);
    const item = fastify.services.issue.create({ ...body, projectId: params.projectId, ...operator });
    emitIssueRealtimeEvent(fastify, item, "created", {
      actorId: operator.operatorId,
      actorName: operator.operatorName
    });
    return ok(item);
  });

  fastify.patch("/projects/:projectId/issues/:id", async (request) => {
    const params = issueIdParamsSchema.parse(request.params);
    const body = updateIssueSchema.parse(request.body);
    const operator = getOperator(request);
    const previous = fastify.services.issue.getById(params.projectId, params.id);
    const item = fastify.services.issue.update(params.projectId, params.id, { ...body, ...operator });
    emitIssueRealtimeEvent(fastify, item, "edited", {
      previous,
      actorId: operator.operatorId,
      actorName: operator.operatorName
    });
    return ok(item);
  });

  fastify.post("/projects/:projectId/issues/:id/assign", async (request) => {
    const params = issueIdParamsSchema.parse(request.params);
    const body = assignIssueSchema.parse(request.body);
    const operator = getOperator(request);
    const previous = fastify.services.issue.getById(params.projectId, params.id);
    const item = fastify.services.issue.assign(params.projectId, params.id, { ...body, ...operator });
    emitIssueRealtimeEvent(fastify, item, "assigned", {
      previous,
      actorId: operator.operatorId,
      actorName: operator.operatorName,
      changedUserIds: [item.assigneeId ?? ""]
    });
    return ok(item);
  });

  fastify.post("/projects/:projectId/issues/:id/claim", async (request) => {
    const params = issueIdParamsSchema.parse(request.params);
    const body = claimIssueSchema.parse(request.body);
    const operator = getOperator(request);
    const previous = fastify.services.issue.getById(params.projectId, params.id);
    const item = fastify.services.issue.claim(params.projectId, params.id, { ...body, ...operator });
    emitIssueRealtimeEvent(fastify, item, "claimed", {
      previous,
      actorId: operator.operatorId,
      actorName: operator.operatorName,
      changedUserIds: [item.assigneeId ?? ""]
    });
    return ok(item);
  });

  fastify.post("/projects/:projectId/issues/:id/reassign", async (request) => {
    const params = issueIdParamsSchema.parse(request.params);
    const body = reassignIssueSchema.parse(request.body);
    const operator = getOperator(request);
    const previous = fastify.services.issue.getById(params.projectId, params.id);
    const item = fastify.services.issue.reassign(params.projectId, params.id, { ...body, ...operator });
    emitIssueRealtimeEvent(fastify, item, "reassigned", {
      previous,
      actorId: operator.operatorId,
      actorName: operator.operatorName,
      changedUserIds: [previous.assigneeId ?? "", item.assigneeId ?? ""]
    });
    return ok(item);
  });

  fastify.post("/projects/:projectId/issues/:id/start", async (request) => {
    const params = issueIdParamsSchema.parse(request.params);
    const body = startIssueSchema.parse(request.body);
    const operator = getOperator(request);
    const previous = fastify.services.issue.getById(params.projectId, params.id);
    const item = fastify.services.issue.start(params.projectId, params.id, { ...body, ...operator });
    emitIssueRealtimeEvent(fastify, item, "started", {
      previous,
      actorId: operator.operatorId,
      actorName: operator.operatorName
    });
    return ok(item);
  });

  fastify.post("/projects/:projectId/issues/:id/resolve", async (request) => {
    const params = issueIdParamsSchema.parse(request.params);
    const body = resolveIssueSchema.parse(request.body);
    const operator = getOperator(request);
    const previous = fastify.services.issue.getById(params.projectId, params.id);
    const item = fastify.services.issue.resolve(params.projectId, params.id, { ...body, ...operator });
    emitIssueRealtimeEvent(fastify, item, "resolved", {
      previous,
      actorId: operator.operatorId,
      actorName: operator.operatorName
    });
    return ok(item);
  });

  fastify.post("/projects/:projectId/issues/:id/verify", async (request) => {
    const params = issueIdParamsSchema.parse(request.params);
    const body = verifyIssueSchema.parse(request.body);
    const operator = getOperator(request);
    const previous = fastify.services.issue.getById(params.projectId, params.id);
    const item = fastify.services.issue.verify(params.projectId, params.id, { ...body, ...operator });
    emitIssueRealtimeEvent(fastify, item, "verified", {
      previous,
      actorId: operator.operatorId,
      actorName: operator.operatorName
    });
    return ok(item);
  });

  fastify.post("/projects/:projectId/issues/:id/reopen", async (request) => {
    const params = issueIdParamsSchema.parse(request.params);
    const body = reopenIssueSchema.parse(request.body);
    const operator = getOperator(request);
    const previous = fastify.services.issue.getById(params.projectId, params.id);
    const item = fastify.services.issue.reopen(params.projectId, params.id, { ...body, ...operator });
    emitIssueRealtimeEvent(fastify, item, "reopened", {
      previous,
      actorId: operator.operatorId,
      actorName: operator.operatorName
    });
    return ok(item);
  });

  fastify.post("/projects/:projectId/issues/:id/close", async (request) => {
    const params = issueIdParamsSchema.parse(request.params);
    const body = closeIssueSchema.parse(request.body);
    const operator = getOperator(request);
    const previous = fastify.services.issue.getById(params.projectId, params.id);
    const item = fastify.services.issue.close(params.projectId, params.id, { ...body, ...operator });
    emitIssueRealtimeEvent(fastify, item, "closed", {
      previous,
      actorId: operator.operatorId,
      actorName: operator.operatorName
    });
    return ok(item);
  });

  fastify.get("/projects/:projectId/issues/:id/participants", async (request) => {
    const params = issueIdParamsSchema.parse(request.params);
    return ok({ items: fastify.services.issue.listParticipants(params.projectId, params.id) });
  });

  fastify.post("/projects/:projectId/issues/:id/participants", async (request) => {
    const params = issueIdParamsSchema.parse(request.params);
    const body = participantBodySchema.parse(request.body);
    const operator = getOperator(request);
    const previous = fastify.services.issue.getById(params.projectId, params.id);
    const items = fastify.services.issue.addParticipant({ projectId: params.projectId, issueId: params.id, userId: body.userId, ...operator });
    const item = fastify.services.issue.getById(params.projectId, params.id);
    emitIssueRealtimeEvent(fastify, item, "add_participant", {
      previous,
      actorId: operator.operatorId,
      actorName: operator.operatorName,
      extraUserIds: [body.userId],
      changedUserIds: [body.userId]
    });
    return ok({ items });
  });

  fastify.delete("/projects/:projectId/issues/:id/participants/:userId", async (request) => {
    const params = request.params as { projectId: string; id: string; userId: string };
    const operator = getOperator(request);
    const previous = fastify.services.issue.getById(params.projectId, params.id);
    const items = fastify.services.issue.removeParticipant({ projectId: params.projectId, issueId: params.id, userId: params.userId, ...operator });
    const item = fastify.services.issue.getById(params.projectId, params.id);
    emitIssueRealtimeEvent(fastify, item, "remove_participant", {
      previous,
      actorId: operator.operatorId,
      actorName: operator.operatorName,
      extraUserIds: [params.userId],
      changedUserIds: [params.userId]
    });
    return ok({ items });
  });

  fastify.get("/projects/:projectId/issues/:id/comments", async (request) => {
    const params = issueIdParamsSchema.parse(request.params);
    return ok({ items: fastify.services.issue.listComments(params.projectId, params.id) });
  });

  fastify.post("/projects/:projectId/issues/:id/comments", async (request) => {
    const params = issueIdParamsSchema.parse(request.params);
    const body = createIssueCommentSchema.parse(request.body);
    const operator = getOperator(request);
    const previous = fastify.services.issue.getById(params.projectId, params.id);
    const comment = fastify.services.issue.addComment({ projectId: params.projectId, issueId: params.id, content: body.content, mentions: body.mentions, ...operator });
    const item = fastify.services.issue.getById(params.projectId, params.id);
    emitIssueRealtimeEvent(fastify, item, "comment_add", {
      previous,
      actorId: operator.operatorId,
      actorName: operator.operatorName,
      commentId: comment.id,
      extraUserIds: comment.mentions.map((mention) => mention.userId),
      mentionedUserIds: comment.mentions.map((mention) => mention.userId)
    });
    return ok(comment);
  });

  fastify.get("/projects/:projectId/issues/:id/attachments", async (request) => {
    const params = issueIdParamsSchema.parse(request.params);
    return ok({ items: fastify.services.issue.listAttachments(params.projectId, params.id) });
  });

  fastify.post("/projects/:projectId/issues/:id/attachments", async (request) => {
    const params = issueIdParamsSchema.parse(request.params);
    const { files } = await parseMultipartUpload(request);
    const operator = getOperator(request);

    if (!files.length) {
      throw new AppError("ISSUE_ATTACHMENT_NO_FILE", "no file uploaded", 400);
    }

    try {
      const items = [];
      for (const file of files) {
        const item = await fastify.services.issue.createAttachment({
          projectId: params.projectId,
          issueId: params.id,
          originalName: file.originalName,
          mimeType: file.mimeType,
          fileSize: file.fileSize,
          tempFilePath: file.tempFilePath,
          ...operator
        });
        items.push(item);
      }
      const issue = fastify.services.issue.getById(params.projectId, params.id);
      emitIssueRealtimeEvent(fastify, issue, "attachment_add", {
        actorId: operator.operatorId,
        actorName: operator.operatorName
      });
      return ok({ items });
    } finally {
      await cleanupTempFiles(files);
    }
  });

  fastify.delete("/projects/:projectId/issues/:id/attachments/:attachmentId", async (request) => {
    const params = request.params as { projectId: string; id: string; attachmentId: string };
    const operator = getOperator(request);
    const previous = fastify.services.issue.getById(params.projectId, params.id);
    const items = fastify.services.issue.deleteAttachment({ projectId: params.projectId, issueId: params.id, attachmentId: params.attachmentId, ...operator });
    const item = fastify.services.issue.getById(params.projectId, params.id);
    emitIssueRealtimeEvent(fastify, item, "attachment_remove", {
      previous,
      actorId: operator.operatorId,
      actorName: operator.operatorName
    });
    return ok({ items });
  });

  fastify.get("/projects/:projectId/issues/:id/attachments/:attachmentId/download", async (request, reply) => {
    const params = request.params as { projectId: string; id: string; attachmentId: string };
    const attachment = fastify.services.issue.getAttachment(params.projectId, params.id, params.attachmentId);
    reply.header("Content-Type", attachment.mimeType || "application/octet-stream");
    reply.header("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`);
    return reply.send(fs.createReadStream(attachment.storagePath));
  });

  fastify.get("/projects/:projectId/issues/:id/action-logs", async (request) => {
    const params = issueIdParamsSchema.parse(request.params);
    return ok({ items: fastify.services.issue.listActionLogs(params.projectId, params.id) });
  });
}
