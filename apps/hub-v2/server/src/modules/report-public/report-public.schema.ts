import { z } from "zod";

export const reportPublicProjectCreateSchema = z.object({
  projectId: z.string().trim().min(1).max(80),
  allowAllProjects: z.boolean().optional()
});

export const reportPublicProjectIdParamSchema = z.object({
  id: z.string().trim().min(1).max(80)
});

export const reportPublicProjectsQuerySchema = z.object({
  share: z.string().trim().max(80).optional()
});

export const reportPublicPreviewBodySchema = z.object({
  query: z.string().trim().min(1).max(500),
  projectId: z.string().trim().max(80).optional().nullable(),
  share: z.string().trim().max(80).optional().nullable()
});

export const reportPublicTemplateIdParamSchema = z.object({
  id: z.string().trim().min(1).max(80)
});

export const reportPublicTemplateQuerySchema = z.object({
  share: z.string().trim().max(80).optional()
});

export const reportPublicBoardPublishBodySchema = z.object({
  title: z.string().trim().max(120).optional(),
  items: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(120),
        naturalQuery: z.string().trim().min(1).max(500),
        sql: z.string().trim().min(1).max(20000),
        layoutSize: z.enum(["compact", "wide"]).optional()
      })
    )
    .min(1)
    .max(20)
});

export const reportPublicBoardQuerySchema = z.object({
  share: z.string().trim().min(1).max(80)
});

export const reportPublicBoardIdParamSchema = z.object({
  id: z.string().trim().min(1).max(80)
});
