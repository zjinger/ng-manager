import { z } from "zod";

export const issueCommentParamsSchema = z.object({
  projectId: z.string().trim().min(1).max(64),
  id: z.string().trim().min(1).max(64)
});

export const createIssueCommentSchema = z.object({
  operatorId: z.string().trim().max(64).nullable().optional(),
  operatorName: z.string().trim().min(1).max(120).nullable().optional(),
  content: z.string().trim().min(1).max(5000),
  mentions: z.array(z.object({
    userId: z.string().trim().min(1).max(64),
    displayName: z.string().trim().min(1).max(120)
  })).max(30).optional()
});
