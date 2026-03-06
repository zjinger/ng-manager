import { z } from "zod";

const scopeEnum = z.enum(["all", "desktop", "cli"]);
const statusEnum = z.enum(["draft", "published", "archived"]);

const optionalDateTime = z.string().datetime().optional();
const nullableDateTime = z.string().datetime().nullable().optional();

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().max(500).optional(),
  contentMd: z.string().trim().min(1).max(50000),
  scope: scopeEnum.default("all"),
  pinned: z.boolean().optional(),
  publishAt: optionalDateTime,
  expireAt: optionalDateTime,
  createdBy: z.string().trim().max(80).optional()
});

export const updateAnnouncementSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  summary: z.string().trim().max(500).optional(),
  contentMd: z.string().trim().min(1).max(50000).optional(),
  scope: scopeEnum.optional(),
  pinned: z.boolean().optional(),
  publishAt: nullableDateTime,
  expireAt: nullableDateTime
});

export const publishAnnouncementSchema = z.object({
  publishAt: optionalDateTime
});

export const listAnnouncementQuerySchema = z.object({
  status: statusEnum.optional(),
  scope: scopeEnum.optional(),
  pinned: z.coerce.boolean().optional(),
  keyword: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export type CreateAnnouncementDto = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementDto = z.infer<typeof updateAnnouncementSchema>;
export type PublishAnnouncementDto = z.infer<typeof publishAnnouncementSchema>;
export type ListAnnouncementQueryDto = z.infer<typeof listAnnouncementQuerySchema>;