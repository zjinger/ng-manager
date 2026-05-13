import { z } from "zod";

const codeSchema = z.string().trim().regex(/^[A-Za-z0-9_-]{2,48}$/, "code must be 2-48 chars and only contains letters, numbers, _ or -");
const statusSchema = z.enum(["active", "inactive"]);
const relationTypeSchema = z.enum(["primary", "secondary"]);

export const listDepartmentsQuerySchema = z.object({
  keyword: z.string().trim().optional(),
  status: z.union([statusSchema, z.literal("")]).optional()
});

export const createDepartmentSchema = z.object({
  code: codeSchema,
  name: z.string().trim().min(1).max(80),
  parentId: z.string().trim().nullable().optional(),
  externalFinanceCode: z.string().trim().nullable().optional(),
  status: statusSchema.optional(),
  sort: z.coerce.number().int().min(0).optional()
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

export const userDepartmentSchema = z.object({
  departmentId: z.string().trim().min(1),
  relationType: relationTypeSchema.optional(),
  roleCode: z.string().trim().nullable().optional()
});

export const listFinanceRolesQuerySchema = z.object({
  keyword: z.string().trim().optional(),
  status: z.union([statusSchema, z.literal("")]).optional()
});

export const createFinanceRoleSchema = z.object({
  code: codeSchema,
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().nullable().optional(),
  status: statusSchema.optional(),
  sort: z.coerce.number().int().min(0).optional()
});

export const updateFinanceRoleSchema = createFinanceRoleSchema.partial();

export const userFinanceRoleSchema = z.object({
  roleId: z.string().trim().min(1)
});
