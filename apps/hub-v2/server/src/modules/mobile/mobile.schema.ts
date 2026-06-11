import { z } from "zod";

export const mobileTodoCategorySchema = z.enum(["all", "issue", "rd", "verify"]);
export const mobileMessageCategorySchema = z.enum(["all", "issue", "rd", "announcement", "document", "release"]);
export const mobileTargetTypeSchema = z.enum(["issue", "rd"]);
export const mobileMessageTypeSchema = z.enum(["announcement", "document", "release", "notification"]);

export const mobilePageQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional()
});

export const mobileTodoQuerySchema = mobilePageQuerySchema.extend({
  category: mobileTodoCategorySchema.optional(),
  projectId: z.string().trim().optional(),
  status: z.string().trim().optional(),
  priority: z.string().trim().optional(),
  keyword: z.string().trim().optional()
});

export const mobileTodoDetailParamsSchema = z.object({
  targetType: mobileTargetTypeSchema,
  targetId: z.string().trim().min(1)
});

export const mobileIssueCommentParamsSchema = z.object({
  issueId: z.string().trim().min(1)
});

export const mobileIssueCommentSchema = z.object({
  content: z.string().trim().min(1),
  mentions: z.array(z.string().trim().min(1)).optional()
});

export const mobileIssueActionParamsSchema = z.object({
  issueId: z.string().trim().min(1)
});

export const mobileIssueActionSchema = z.object({
  action: z.enum(["start", "wait_update", "resolve", "verify", "reopen", "close"]),
  note: z.string().trim().optional(),
  reason: z.string().trim().optional()
});

export const mobileRdItemParamsSchema = z.object({
  itemId: z.string().trim().min(1)
});

export const mobileRdProgressSchema = z.object({
  progress: z.coerce.number().int().min(0).max(100),
  note: z.string().trim().optional(),
  stageTaskId: z.string().trim().min(1).optional()
});

export const mobileRdActionSchema = z.object({
  action: z.enum(["start", "block", "resume", "complete", "accept", "reopen", "close"]),
  note: z.string().trim().optional(),
  reason: z.string().trim().optional()
});

export const mobileMessageQuerySchema = mobilePageQuerySchema.extend({
  category: mobileMessageCategorySchema.optional(),
  unreadOnly: z.coerce.boolean().optional()
});

export const mobileMessageDetailParamsSchema = z.object({
  messageType: mobileMessageTypeSchema,
  id: z.string().trim().min(1)
});

export const mobileMessageReadSchema = z.object({
  all: z.boolean().optional(),
  notificationIds: z.array(z.string().trim().min(1)).optional()
});
