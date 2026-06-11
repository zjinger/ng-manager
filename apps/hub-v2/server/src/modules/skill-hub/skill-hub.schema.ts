import { z } from "zod";

export const listSkillsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  keyword: z.string().trim().optional(),
  category: z.string().trim().optional(),
  tag: z.string().trim().optional(),
  status: z.enum(["active", "draft", "submitted", "published", "archived", ""]).optional(),
  sort: z.enum(["updated", "hot", "rating"]).optional()
});

export const rejectSkillVersionSchema = z.object({
  reviewComment: z.string().trim().min(1).max(1000)
});

export const favoriteSkillSchema = z.object({
  favorite: z.boolean()
});

export const reviewSkillSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional()
});

export const createSkillCommentSchema = z.object({
  content: z.string().trim().min(1).max(10000)
});

export const exportSkillQuerySchema = z.object({
  target: z.enum(["codex", "claude", "opencode"]).default("codex")
});
