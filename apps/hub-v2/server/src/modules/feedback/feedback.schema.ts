import { z } from "zod";

export const createFeedbackSchema = z.object({
  projectKey: z.string().trim().min(1).max(80).nullable().optional(),
  source: z.enum(["desktop", "cli", "web", "mobile", "applet"]),
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

export const listFeedbacksQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  keyword: z.string().trim().optional(),
  status: z.enum(["open", "processing", "resolved", "closed"]).optional(),
  category: z.enum(["bug", "suggestion", "feature", "other"]).optional(),
  source: z.enum(["desktop", "cli", "web", "mobile", "applet"]).optional(),
  projectId: z.string().trim().max(80).optional(),
  projectKey: z.string().trim().max(80).optional()
});
