import { z } from "zod";

const projectTitleStatusSchema = z.enum(["active", "inactive"]);
const titleCodeSchema = z.string().trim().regex(/^[a-z0-9_]{2,48}$/, "title code must be 2-48 chars and only contains lowercase letters, numbers or _");

export const listProjectTitlesQuerySchema = z.object({
  keyword: z.string().trim().optional(),
  status: z.union([projectTitleStatusSchema, z.literal("")]).optional()
});

export const createProjectTitleSchema = z.object({
  code: titleCodeSchema,
  name: z.string().trim().min(1).max(80),
  status: projectTitleStatusSchema.optional(),
  sort: z.coerce.number().int().min(0).optional(),
  remark: z.string().trim().max(255).nullable().optional()
});

export const updateProjectTitleSchema = createProjectTitleSchema.partial();
