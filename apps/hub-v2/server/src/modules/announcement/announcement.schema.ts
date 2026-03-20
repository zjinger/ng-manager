import { z } from "zod";

export const createAnnouncementSchema = z.object({
  projectId: z.string().trim().optional().nullable(),
  title: z.string().trim().min(1),
  summary: z.string().trim().optional(),
  contentMd: z.string().min(1),
  scope: z.enum(["global", "project"]).optional(),
  pinned: z.boolean().optional(),
  expireAt: z.string().trim().optional()
});

export const updateAnnouncementSchema = z.object({
  projectId: z.string().trim().optional().nullable(),
  title: z.string().trim().optional(),
  summary: z.string().trim().optional(),
  contentMd: z.string().optional(),
  scope: z.enum(["global", "project"]).optional(),
  pinned: z.boolean().optional(),
  expireAt: z.string().trim().nullable().optional()
});

export const listAnnouncementsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  keyword: z.string().trim().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  projectId: z.string().trim().optional()
});
