import { z } from "zod";

export const createDocumentSchema = z.object({
  projectId: z.string().trim().optional().nullable(),
  slug: z.string().trim().min(1),
  title: z.string().trim().min(1),
  category: z.string().trim().optional(),
  summary: z.string().trim().optional(),
  contentMd: z.string().min(1),
  version: z.string().trim().optional()
});

export const updateDocumentSchema = z.object({
  projectId: z.string().trim().optional().nullable(),
  slug: z.string().trim().optional(),
  title: z.string().trim().optional(),
  category: z.string().trim().optional(),
  summary: z.string().trim().optional(),
  contentMd: z.string().optional(),
  version: z.string().trim().nullable().optional()
});

export const listDocumentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  keyword: z.string().trim().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  projectId: z.string().trim().optional(),
  category: z.string().trim().optional()
});

export const documentSlugParamSchema = z.object({
  slug: z.string().trim().min(1)
});

export const documentProjectSlugParamSchema = z.object({
  projectKey: z.string().trim().min(1),
  slug: z.string().trim().min(1)
});
