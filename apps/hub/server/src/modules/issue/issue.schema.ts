import { z } from "zod";

const issueTypeEnum = z.enum([
    "bug", // 缺陷
    "requirement_change", //需求变更
    "feature", // 新功能(新需求)
    "improvement", // 改进
    "task", // 任务
    "test_record" // 测试记录
]);
const issueStatusEnum = z.enum([
    "open", // 待处理
    "assigned", // 已分配
    "in_progress", // 处理中
    "fixed", // 已修复
    "verified", // 已验证
    "reopened", // 已重开
    "closed" // 已关闭
]);
// 问题优先级
const issuePriorityEnum = z.enum(["low", "medium", "high", "critical"]);
// 问题关闭原因类型: 误报、重复、非问题
const issueCloseReasonTypeEnum = z.enum(["mistaken", "duplicate", "not_issue"]);

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
    reporterName: z.string().trim().max(120).optional()
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
    assigneeId: z.string().trim().min(1).max(64),
    operatorId: z.string().trim().max(64).nullable().optional(),
    operatorName: z.string().trim().min(1).max(120).nullable().optional(),
    comment: z.string().trim().max(2000).optional()
});

export const startProgressIssueSchema = actorSchema;
export const markFixedIssueSchema = actorWithRequiredCommentSchema;
export const verifyIssueSchema = actorSchema;
export const reopenIssueSchema = actorWithRequiredCommentSchema;
export const closeIssueSchema = actorSchema.extend({
    closeReasonType: issueCloseReasonTypeEnum.optional()
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
export type StartProgressIssueDto = z.infer<typeof startProgressIssueSchema>;
export type MarkFixedIssueDto = z.infer<typeof markFixedIssueSchema>;
export type VerifyIssueDto = z.infer<typeof verifyIssueSchema>;
export type ReopenIssueDto = z.infer<typeof reopenIssueSchema>;
export type CloseIssueDto = z.infer<typeof closeIssueSchema>;
export type AddIssueCommentDto = z.infer<typeof addIssueCommentSchema>;
