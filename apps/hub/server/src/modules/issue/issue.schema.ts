import { z } from "zod";

export const issueTypeSchema = z.enum(["bug", "feature", "change", "improvement", "task", "test"]);
export const issueStatusSchema = z.enum(["open", "in_progress", "resolved", "verified", "closed", "reopened"]);
export const issuePrioritySchema = z.enum(["low", "medium", "high", "critical"]);

const operatorSchema = z.object({
  operatorId: z.string().trim().max(64).nullable().optional(),
  operatorName: z.string().trim().min(1).max(120).nullable().optional()
});

export const issueIdParamsSchema = z.object({
  projectId: z.string().trim().min(1).max(64),
  id: z.string().trim().min(1).max(64)
});

export const listIssuesQuerySchema = z.object({
  status: issueStatusSchema.optional(),
  priority: issuePrioritySchema.optional(),
  type: issueTypeSchema.optional(),
  assigneeId: z.string().trim().max(64).optional(),
  keyword: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export const createIssueSchema = operatorSchema.extend({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(10000).optional(),
  type: issueTypeSchema.optional(),
  priority: issuePrioritySchema.optional(),
  assigneeId: z.string().trim().min(1).max(64).nullable().optional(),
  moduleCode: z.string().trim().max(64).nullable().optional(),
  versionCode: z.string().trim().max(64).nullable().optional(),
  environmentCode: z.string().trim().max(64).nullable().optional()
});

export const updateIssueSchema = operatorSchema.extend({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(10000).optional(),
  type: issueTypeSchema.optional(),
  priority: issuePrioritySchema.optional(),
  moduleCode: z.string().trim().max(64).nullable().optional(),
  versionCode: z.string().trim().max(64).nullable().optional(),
  environmentCode: z.string().trim().max(64).nullable().optional()
});

export const assignIssueSchema = operatorSchema.extend({
  assigneeId: z.string().trim().min(1).max(64)
});

export const claimIssueSchema = operatorSchema;
export const startIssueSchema = operatorSchema.extend({
  comment: z.string().trim().max(2000).optional()
});
export const resolveIssueSchema = operatorSchema.extend({
  comment: z.string().trim().max(2000).optional()
});
export const verifyIssueSchema = operatorSchema.extend({
  comment: z.string().trim().max(2000).optional()
});
export const reopenIssueSchema = operatorSchema.extend({
  comment: z.string().trim().max(2000).optional()
});
export const closeIssueSchema = operatorSchema.extend({
  closeReason: z.string().trim().max(2000).optional()
});
export const reassignIssueSchema = assignIssueSchema;
