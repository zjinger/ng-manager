import { z } from "zod";

const categoryEnum = z.enum([
  "guide",
  "faq",
  "release-note",
  "spec",
  "policy",
  "other"
]);

const statusEnum = z.enum(["draft", "published", "archived"]);

export const createDocumentSchema = z.object({
  projectId: z.string().trim().min(1).max(40).nullable().optional(),
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "slug must be kebab-case"
  }),
  title: z.string().trim().min(1).max(160),
  category: categoryEnum,
  summary: z.string().trim().max(500).optional(),
  contentMd: z.string().trim().min(1).max(100000),
  version: z.string().trim().max(60).optional(),
  createdBy: z.string().trim().max(80).optional()
});

export const updateDocumentSchema = z.object({
  projectId: z.string().trim().min(1).max(40).nullable().optional(),
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "slug must be kebab-case"
  }).optional(),
  title: z.string().trim().min(1).max(160).optional(),
  category: categoryEnum.optional(),
  summary: z.string().trim().max(500).optional(),
  contentMd: z.string().trim().min(1).max(100000).optional(),
  version: z.string().trim().max(60).nullable().optional()
});

export const listDocumentQuerySchema = z.object({
  projectId: z.string().trim().min(1).max(40).optional(),
  status: statusEnum.optional(),
  category: categoryEnum.optional(),
  keyword: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export const publicListDocumentQuerySchema = z.object({
  projectKey: z.string().trim().min(1).max(80).optional(),
  includeGlobal: z.coerce.boolean().default(true),
  category: categoryEnum.optional(),
  keyword: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export const publicDocumentDetailQuerySchema = z.object({
  projectKey: z.string().trim().min(1).max(80).optional()
});

export const publishDocumentSchema = z.object({});

export type CreateDocumentDto = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentDto = z.infer<typeof updateDocumentSchema>;
export type ListDocumentQueryDto = z.infer<typeof listDocumentQuerySchema>;
export type PublicListDocumentQueryDto = z.infer<typeof publicListDocumentQuerySchema>;
export type PublicDocumentDetailQueryDto = z.infer<typeof publicDocumentDetailQuerySchema>;
export type PublishDocumentDto = z.infer<typeof publishDocumentSchema>;