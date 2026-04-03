import { z } from "zod";

const issueTypeSchema = z.enum(["bug", "feature", "change", "improvement", "task", "test"]);
const issueStatusSchema = z.enum(["open", "in_progress", "resolved", "verified", "closed", "reopened"]);
const issuePrioritySchema = z.enum(["low", "medium", "high", "critical"]);

function csvEnumArray<T extends [string, ...string[]]>(values: T) {
  const itemSchema = z.enum(values);
  return z.preprocess((value) => {
    if (value === undefined || value === null || value === "") {
      return [];
    }
    if (Array.isArray(value)) {
      return value
        .flatMap((item) => String(item).split(","))
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }, z.array(itemSchema).optional());
}

function csvStringArray() {
  return z.preprocess((value) => {
    if (value === undefined || value === null || value === "") {
      return [];
    }
    if (Array.isArray(value)) {
      return value
        .flatMap((item) => String(item).split(","))
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }, z.array(z.string().trim().min(1)).optional());
}

export const createIssueSchema = z.object({
  projectId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: z.string().optional(),
  type: issueTypeSchema.optional(),
  priority: issuePrioritySchema.optional(),
  assigneeId: z.string().trim().optional().nullable(),
  verifierId: z.string().trim().optional().nullable(),
  moduleCode: z.string().trim().optional(),
  versionCode: z.string().trim().optional(),
  environmentCode: z.string().trim().optional()
});

export const updateIssueSchema = z.object({
  title: z.string().trim().optional(),
  description: z.string().nullable().optional(),
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
  status: csvEnumArray(["open", "in_progress", "resolved", "verified", "closed", "reopened"]),
  types: csvEnumArray(["bug", "feature", "change", "improvement", "task", "test"]),
  type: issueTypeSchema.optional(),
  priority: csvEnumArray(["low", "medium", "high", "critical"]),
  reporterIds: csvStringArray(),
  assigneeIds: csvStringArray(),
  moduleCodes: csvStringArray(),
  versionCodes: csvStringArray(),
  environmentCodes: csvStringArray(),
  includeAssigneeParticipants: z.coerce.boolean().optional(),
  sortBy: z.enum(["updatedAt", "createdAt"]).optional(),
  sortOrder: z.enum(["desc", "asc"]).optional(),
  assigneeId: z.string().trim().optional(),
  verifierId: z.string().trim().optional()
});
