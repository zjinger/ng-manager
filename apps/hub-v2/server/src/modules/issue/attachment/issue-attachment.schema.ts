import { z } from "zod";

export const createIssueAttachmentSchema = z.object({
  uploadId: z.string().trim().min(1)
});
