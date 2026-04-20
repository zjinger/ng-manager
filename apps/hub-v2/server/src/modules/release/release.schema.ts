import { z } from "zod";

export const createReleaseSchema = z.object({
  projectId: z.string().trim().optional().nullable(),
  channel: z.string().trim().min(1),
  version: z.string().trim().min(1),
  title: z.string().trim().min(1),
  notes: z.string().optional(),
  downloadUrl: z.string().trim().url().optional(),
  syncToProjectVersion: z.boolean().optional()
});

export const updateReleaseSchema = z.object({
  projectId: z.string().trim().optional().nullable(),
  channel: z.string().trim().optional(),
  version: z.string().trim().optional(),
  title: z.string().trim().optional(),
  notes: z.string().nullable().optional(),
  downloadUrl: z.string().trim().url().nullable().optional(),
  syncToProjectVersion: z.boolean().optional()
});

export const listReleasesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  keyword: z.string().trim().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  projectId: z.string().trim().optional(),
  channel: z.string().trim().optional()
});
