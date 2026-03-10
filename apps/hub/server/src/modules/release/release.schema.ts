import { z } from "zod";

const channelEnum = z.enum(["desktop", "cli"]);
const statusEnum = z.enum(["draft", "published", "deprecated"]);

export const createReleaseSchema = z.object({
  projectId: z.string().trim().min(1).max(40).nullable().optional(),
  channel: channelEnum,
  version: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(160),
  notes: z.string().trim().max(20000).optional(),
  downloadUrl: z.string().trim().max(1000).optional()
});

export const updateReleaseSchema = z.object({
  projectId: z.string().trim().min(1).max(40).nullable().optional(),
  channel: channelEnum.optional(),
  version: z.string().trim().min(1).max(80).optional(),
  title: z.string().trim().min(1).max(160).optional(),
  notes: z.string().trim().max(20000).nullable().optional(),
  downloadUrl: z.string().trim().max(1000).nullable().optional(),
  status: statusEnum.optional()
});

export const publishReleaseSchema = z.object({
  publishedAt: z.string().datetime().optional()
});

export const listReleaseQuerySchema = z.object({
  projectId: z.string().trim().min(1).max(40).optional(),
  channel: channelEnum.optional(),
  status: statusEnum.optional(),
  keyword: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export type CreateReleaseDto = z.infer<typeof createReleaseSchema>;
export type UpdateReleaseDto = z.infer<typeof updateReleaseSchema>;
export type PublishReleaseDto = z.infer<typeof publishReleaseSchema>;
export type ListReleaseQueryDto = z.infer<typeof listReleaseQuerySchema>;