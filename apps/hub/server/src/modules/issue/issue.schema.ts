import { z } from "zod";

const issueTypeEnum = z.enum([
    "bug",
    "requirement_change",
    "feature",
    "improvement",
    "task",
    "test_record"
]);

const issueStatusEnum = z.enum([
    "open",
    "assigned",
    "in_progress",
    "resolved",
    "verified",
    "reopened",
    "closed"
]);

const issuePriorityEnum = z.enum(["low", "medium", "high", "critical"]);
const issueCloseReasonTypeEnum = z.enum(["mistaken", "duplicate", "not_issue", "cancelled", "done_elsewhere"]);
const userIdSchema = z.string().trim().min(1).max(64);

const actorSchema = z.object({
    operatorId: z.string().trim().max(64).nullable().optional(),
    operatorName: z.string().trim().min(1).max(120).nullable().optional(),
    comment: z.string().trim().max(2000).optional()
});

const actorWithRequiredCommentSchema = actorSchema.extend({
    comment: z.string().trim().min(1).max(2000)
});

export const createIssueSchema = z.object({
    projectId: z.string().trim().min(1).max(64),
    title: z.string().trim().min(2).max(200),
    description: z.string().trim().max(10000).optional(),
    type: issueTypeEnum.optional(),
    priority: issuePriorityEnum.optional(),
    module: z.string().trim().max(120).optional(),
    version: z.string().trim().max(120).optional(),
    environment: z.string().trim().max(255).optional(),
    reporterId: z.string().trim().max(64).optional(),
    reporterName: z.string().trim().max(120).optional(),
    assigneeId: userIdSchema.nullable().optional(),
    verifierId: userIdSchema.nullable().optional()
});

export const updateIssueSchema = z.object({
    title: z.string().trim().min(2).max(200).optional(),
    description: z.string().trim().max(10000).optional(),
    priority: issuePriorityEnum.optional(),
    module: z.string().trim().max(120).nullable().optional(),
    version: z.string().trim().max(120).nullable().optional(),
    environment: z.string().trim().max(255).nullable().optional()
});

export const listIssueQuerySchema = z.object({
    projectId: z.string().trim().max(64).optional(),
    status: issueStatusEnum.optional(),
    type: issueTypeEnum.optional(),
    priority: issuePriorityEnum.optional(),
    keyword: z.string().trim().max(100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export const assignIssueSchema = z.object({
    assigneeId: userIdSchema.optional(),
    assigneeIds: z.array(userIdSchema).min(1).max(20).optional(),
    operatorId: z.string().trim().max(64).nullable().optional(),
    operatorName: z.string().trim().min(1).max(120).nullable().optional(),
    comment: z.string().trim().max(2000).optional()
}).transform((input) => ({
    ...input,
    assigneeId: input.assigneeId ?? input.assigneeIds?.[0]
})).refine((input) => !!input.assigneeId, {
    message: "assigneeId is required"
});

export const claimIssueSchema = actorSchema;
export const unassignIssueSchema = actorSchema;
export const reassignIssueSchema = assignIssueSchema;
export const setIssueVerifierSchema = actorSchema.extend({
    verifierId: userIdSchema.nullable().optional()
});
export const startIssueSchema = actorSchema;
export const resolveIssueSchema = actorWithRequiredCommentSchema;
export const revokeResolveIssueSchema = actorSchema;
export const verifyIssueSchema = actorSchema;
export const reopenIssueSchema = actorWithRequiredCommentSchema;
export const closeIssueSchema = actorSchema.extend({
    closeReasonType: issueCloseReasonTypeEnum.optional()
});
export const addIssueParticipantSchema = actorSchema.extend({
    userId: userIdSchema
});
export const removeIssueParticipantSchema = actorSchema.extend({
    userId: userIdSchema.optional()
});
export const addIssueWatcherSchema = actorSchema.extend({
    userId: userIdSchema.optional(),
    userName: z.string().trim().min(1).max(120).nullable().optional()
});
export const removeIssueWatcherSchema = actorSchema.extend({
    userId: userIdSchema.optional()
});

export const addIssueCommentSchema = z.object({
    authorId: z.string().trim().max(64).nullable().optional(),
    authorName: z.string().trim().min(1).max(120).nullable().optional(),
    content: z.string().trim().min(1).max(5000),
    mentions: z.array(z.object({
        userId: z.string().trim().min(1).max(64),
        displayName: z.string().trim().min(1).max(120)
    })).max(30).optional()
});

export const removeIssueAttachmentSchema = z.object({
    operatorId: z.string().trim().max(64).nullable().optional(),
    operatorName: z.string().trim().min(1).max(120).nullable().optional()
});

export type CreateIssueDto = z.infer<typeof createIssueSchema>;
export type UpdateIssueDto = z.infer<typeof updateIssueSchema>;
export type ListIssueQueryDto = z.infer<typeof listIssueQuerySchema>;
export type AssignIssueDto = z.infer<typeof assignIssueSchema>;
export type ClaimIssueDto = z.infer<typeof claimIssueSchema>;
export type UnassignIssueDto = z.infer<typeof unassignIssueSchema>;
export type ReassignIssueDto = z.infer<typeof reassignIssueSchema>;
export type SetIssueVerifierDto = z.infer<typeof setIssueVerifierSchema>;
export type StartIssueDto = z.infer<typeof startIssueSchema>;
export type ResolveIssueDto = z.infer<typeof resolveIssueSchema>;
export type RevokeResolveIssueDto = z.infer<typeof revokeResolveIssueSchema>;
export type VerifyIssueDto = z.infer<typeof verifyIssueSchema>;
export type ReopenIssueDto = z.infer<typeof reopenIssueSchema>;
export type CloseIssueDto = z.infer<typeof closeIssueSchema>;
export type AddIssueParticipantDto = z.infer<typeof addIssueParticipantSchema>;
export type AddIssueWatcherDto = z.infer<typeof addIssueWatcherSchema>;
export type AddIssueCommentDto = z.infer<typeof addIssueCommentSchema>;
