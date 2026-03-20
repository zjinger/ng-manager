import { z } from "zod";

export const createProjectSchema = z.object({
  projectKey: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  icon: z.string().trim().optional(),
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
  roleCode: z.string().trim().optional(),
  isOwner: z.boolean().optional()
});
