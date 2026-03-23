import { z } from "zod";

export const listFeedbacksQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  keyword: z.string().trim().optional(),
  status: z.string().trim().optional(),
  category: z.string().trim().optional(),
  source: z.string().trim().optional()
});
