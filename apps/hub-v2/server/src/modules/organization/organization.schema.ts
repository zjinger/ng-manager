import { z } from "zod";

const codeSchema = z.string().trim().regex(/^[A-Za-z0-9_-]{2,48}$/, "code must be 2-48 chars and only contains letters, numbers, _ or -");
const statusSchema = z.enum(["active", "inactive"]);

export const listDepartmentsQuerySchema = z.object({
  keyword: z.string().trim().optional(),
  status: z.union([statusSchema, z.literal("")]).optional()
});

export const createDepartmentSchema = z.object({
  code: codeSchema,
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).nullable().optional(),
  parentId: z.string().trim().nullable().optional(),
  externalFinanceCode: z.string().trim().nullable().optional(),
  managerUserId: z.string().trim().nullable().optional(),
  status: statusSchema.optional(),
  sort: z.coerce.number().int().min(0).optional()
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

export const userDepartmentSchema = z.object({
  departmentId: z.string().trim().min(1),
  roleCode: z.string().trim().nullable().optional()
});

export const departmentTitleSchema = z.object({
  titleCode: z.string().trim().min(1),
  sort: z.coerce.number().int().min(0).optional()
});
