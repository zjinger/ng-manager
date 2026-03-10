import { z } from "zod";

const statusEnum = z.enum(["active", "archived"]);
const visibilityEnum = z.enum(["internal", "public"]);

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional(),
  icon: z.string().trim().max(255).optional(),
  visibility: visibilityEnum.default("internal")
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  icon: z.string().trim().max(255).nullable().optional(),
  status: statusEnum.optional(),
  visibility: visibilityEnum.optional()
});

export const listProjectQuerySchema = z.object({
  status: statusEnum.optional(),
  visibility: visibilityEnum.optional(),
  keyword: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export type CreateProjectDto = z.infer<typeof createProjectSchema>;
export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;
export type ListProjectQueryDto = z.infer<typeof listProjectQuerySchema>;
