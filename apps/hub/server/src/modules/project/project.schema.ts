import { z } from "zod";

const statusEnum = z.enum(["active", "archived"]);
const visibilityEnum = z.enum(["internal", "public"]);
const memberRoleEnum = z.enum(["product", "ui", "frontend_dev", "backend_dev", "qa", "ops", "project_admin"]);

const createConfigItemShape = {
  code: z.string().trim().max(64).optional(),
  enabled: z.coerce.boolean().default(true),
  sort: z.coerce.number().int().min(0).max(9999).optional()
};

const updateConfigItemShape = {
  code: z.string().trim().max(64).nullable().optional(),
  enabled: z.coerce.boolean().optional(),
  sort: z.coerce.number().int().min(0).max(9999).optional()
};

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
  pageSize: z.coerce.number().int().min(1).max(200).default(20)
});

export const createProjectMemberSchema = z.object({
  userId: z.string().trim().min(1).max(64),
  roles: z.array(memberRoleEnum).min(1).max(8)
});

export const updateProjectMemberSchema = z.object({
  roles: z.array(memberRoleEnum).min(1).max(8).optional()
});

export const createProjectConfigItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  ...createConfigItemShape
});

export const updateProjectConfigItemSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  ...updateConfigItemShape
});

export const createProjectVersionItemSchema = z.object({
  version: z.string().trim().min(1).max(60),
  ...createConfigItemShape
});

export const updateProjectVersionItemSchema = z.object({
  version: z.string().trim().min(1).max(60).optional(),
  ...updateConfigItemShape
});

export const updateProjectSortSchema = z.object({
  sort: z.coerce.number().int().min(0).max(9999)
});

export type CreateProjectDto = z.infer<typeof createProjectSchema>;
export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;
export type ListProjectQueryDto = z.infer<typeof listProjectQuerySchema>;
export type CreateProjectMemberDto = z.infer<typeof createProjectMemberSchema>;
export type UpdateProjectMemberDto = z.infer<typeof updateProjectMemberSchema>;
export type CreateProjectConfigItemDto = z.infer<typeof createProjectConfigItemSchema>;
export type UpdateProjectConfigItemDto = z.infer<typeof updateProjectConfigItemSchema>;
export type CreateProjectVersionItemDto = z.infer<typeof createProjectVersionItemSchema>;
export type UpdateProjectVersionItemDto = z.infer<typeof updateProjectVersionItemSchema>;
export type UpdateProjectSortDto = z.infer<typeof updateProjectSortSchema>;
