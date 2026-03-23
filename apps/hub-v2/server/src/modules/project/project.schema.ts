import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  icon: z.string().trim().optional(),
  visibility: z.enum(["internal", "private"]).optional()
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().nullable().optional(),
  icon: z.string().trim().nullable().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  visibility: z.enum(["internal", "private"]).optional()
});

export const listProjectsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  keyword: z.string().trim().optional(),
  status: z.enum(["active", "inactive"]).optional()
});

export const addProjectMemberSchema = z.object({
  userId: z.string().trim().min(1),
  roleCode: z.enum(["member", "product", "ui", "frontend_dev", "backend_dev", "qa", "ops", "project_admin"]).optional(),
  isOwner: z.boolean().optional()
});

export const createProjectConfigItemSchema = z.object({
  name: z.string().trim().min(1),
  code: z.string().trim().optional(),
  enabled: z.boolean().optional(),
  sort: z.number().int().min(0).optional(),
  description: z.string().trim().optional()
});

export const updateProjectConfigItemSchema = z.object({
  name: z.string().trim().min(1).optional(),
  code: z.string().trim().nullable().optional(),
  enabled: z.boolean().optional(),
  sort: z.number().int().min(0).optional(),
  description: z.string().trim().nullable().optional()
});

export const createProjectVersionItemSchema = z.object({
  version: z.string().trim().min(1),
  code: z.string().trim().optional(),
  enabled: z.boolean().optional(),
  sort: z.number().int().min(0).optional(),
  description: z.string().trim().optional()
});

export const updateProjectVersionItemSchema = z.object({
  version: z.string().trim().min(1).optional(),
  code: z.string().trim().nullable().optional(),
  enabled: z.boolean().optional(),
  sort: z.number().int().min(0).optional(),
  description: z.string().trim().nullable().optional()
});
