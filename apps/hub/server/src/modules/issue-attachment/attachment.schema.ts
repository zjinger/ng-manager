import { z } from "zod";

export const issueAttachmentParamsSchema = z.object({
  projectId: z.string().trim().min(1).max(64),
  id: z.string().trim().min(1).max(64)
});

export const removeIssueAttachmentParamsSchema = z.object({
  projectId: z.string().trim().min(1).max(64),
  id: z.string().trim().min(1).max(64),
  attachmentId: z.string().trim().min(1).max(64)
});
