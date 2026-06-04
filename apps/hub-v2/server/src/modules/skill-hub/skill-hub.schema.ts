import { z } from "zod";

export const listSkillsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  keyword: z.string().trim().optional(),
  category: z.string().trim().optional(),
  tag: z.string().trim().optional(),
  status: z.enum(["active", "draft", "published", "archived", ""]).optional()
});

export const rejectSkillVersionSchema = z.object({
  reviewComment: z.string().trim().min(1).max(1000)
});
