import { z } from "zod";

export const createFeedbackSchema = z.object({
  projectKey: z.string().trim().min(1).max(80).nullable().optional(),
  source: z.enum(["desktop", "cli", "web"]),
  category: z.enum(["bug", "suggestion", "feature", "other"]),
  title: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1).max(5000),
  contact: z.string().trim().max(120).optional(),
  clientName: z.string().trim().max(120).optional(),
  clientVersion: z.string().trim().max(60).optional(),
  osInfo: z.string().trim().max(200).optional(),
  clientIp: z.string().trim().max(80).optional()
});

export const updateFeedbackStatusSchema = z.object({
  status: z.enum(["open", "processing", "resolved", "closed"])
});

export const listFeedbackQuerySchema = z.object({
  projectKey: z.string().trim().min(1).max(80).optional(),
  status: z.enum(["open", "processing", "resolved", "closed"]).optional(),
  category: z.enum(["bug", "suggestion", "feature", "other"]).optional(),
  keyword: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export type CreateFeedbackDto = z.infer<typeof createFeedbackSchema>;
export type UpdateFeedbackStatusDto = z.infer<typeof updateFeedbackStatusSchema>;
export type ListFeedbackQueryDto = z.infer<typeof listFeedbackQuerySchema>;
