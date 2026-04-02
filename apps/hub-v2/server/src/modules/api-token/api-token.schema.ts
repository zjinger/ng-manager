import { z } from "zod";
import { listFeedbacksQuerySchema } from "../feedback/feedback.schema";
import { listIssuesQuerySchema } from "../issue/issue.schema";
import { listRdItemsQuerySchema } from "../rd/rd.schema";

export const projectParamSchema = z.object({
  projectKey: z.string().trim().min(1).max(80)
});

export const createProjectTokenSchema = z.object({
  name: z.string().trim().min(1).max(80),
  scopes: z
    .array(z.enum(["issues:read", "rd:read", "feedbacks:read"]))
    .min(1)
    .max(16),
  expiresAt: z.string().trim().min(1).optional().nullable()
});

export const tokenIdParamSchema = z.object({
  projectKey: z.string().trim().min(1).max(80),
  tokenId: z.string().trim().min(1)
});

export const tokenIssueListQuerySchema = listIssuesQuerySchema.omit({ projectId: true });
export const tokenRdListQuerySchema = listRdItemsQuerySchema.omit({ projectId: true });
export const tokenFeedbackListQuerySchema = listFeedbacksQuerySchema.omit({
  projectId: true,
  projectKey: true
});

export const issueIdParamSchema = z.object({
  projectKey: z.string().trim().min(1).max(80),
  issueId: z.string().trim().min(1)
});

export const issueAttachmentRawParamSchema = z.object({
  projectKey: z.string().trim().min(1).max(80),
  issueId: z.string().trim().min(1),
  attachmentId: z.string().trim().min(1)
});

export const rdItemIdParamSchema = z.object({
  projectKey: z.string().trim().min(1).max(80),
  itemId: z.string().trim().min(1)
});

export const feedbackIdParamSchema = z.object({
  projectKey: z.string().trim().min(1).max(80),
  feedbackId: z.string().trim().min(1)
});
