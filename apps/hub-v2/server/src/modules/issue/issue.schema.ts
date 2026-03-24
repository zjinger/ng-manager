import { z } from "zod";

const issueTypeSchema = z.enum(["bug", "feature", "change", "improvement", "task", "test"]);

export const createIssueSchema = z.object({
  projectId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: z.string().optional(),
  type: issueTypeSchema.optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  assigneeId: z.string().trim().optional().nullable(),
  verifierId: z.string().trim().optional().nullable(),
  moduleCode: z.string().trim().optional(),
  versionCode: z.string().trim().optional(),
  environmentCode: z.string().trim().optional()
});

export const updateIssueSchema = z.object({
  title: z.string().trim().optional(),
  description: z.string().nullable().optional(),
  type: issueTypeSchema.optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  assigneeId: z.string().trim().nullable().optional(),
  verifierId: z.string().trim().nullable().optional(),
  moduleCode: z.string().trim().nullable().optional(),
  versionCode: z.string().trim().nullable().optional(),
  environmentCode: z.string().trim().nullable().optional()
});

export const assignIssueSchema = z.object({
  assigneeId: z.string().trim().min(1)
});

export const resolveIssueSchema = z.object({
  resolutionSummary: z.string().optional()
});

export const reopenIssueSchema = z.object({
  remark: z.string().optional()
});

export const closeIssueSchema = z.object({
  reason: z.string().trim().optional(),
  remark: z.string().optional()
});

export const listIssuesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  keyword: z.string().trim().optional(),
  projectId: z.string().trim().optional(),
  status: z.enum(["open", "in_progress", "resolved", "verified", "closed", "reopened"]).optional(),
  type: issueTypeSchema.optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  assigneeId: z.string().trim().optional(),
  verifierId: z.string().trim().optional()
});
