import { z } from "zod";

export const createIssueCommentSchema = z.object({
  content: z.string().min(1),
  mentions: z.array(z.string().trim().min(1)).optional()
});
