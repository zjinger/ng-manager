import { z } from "zod";

const codeSchema = z.string().trim().regex(/^[A-Za-z0-9_-]{2,48}$/, "code must be 2-48 chars, alphanumeric, hyphen or underscore");
const statusSchema = z.enum(["active", "inactive"]);

export const listSystemRolesQuerySchema = z.object({
  keyword: z.string().trim().optional(),
  status: z.union([statusSchema, z.literal("")]).optional()
});

export const createSystemRoleSchema = z.object({
  code: codeSchema,
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().nullable().optional(),
  purposeCode: z.string().trim().min(1).max(48).optional(),
  purposeName: z.string().trim().min(1).max(80).optional(),
  status: statusSchema.optional(),
  sort: z.coerce.number().int().min(0).optional(),
  permissionTemplateRoleId: z.string().trim().optional()
});

export const updateSystemRoleSchema = createSystemRoleSchema
  .omit({ permissionTemplateRoleId: true })
  .partial();

export const updateRolePermissionsSchema = z.object({
  permissionIds: z.array(z.string().trim().min(1))
});

export const addRoleUsersSchema = z.object({
  userIds: z.array(z.string().trim().min(1)).min(1)
});

export const listSystemPermissionsQuerySchema = z.object({
  keyword: z.string().trim().optional(),
  status: z.union([statusSchema, z.literal("")]).optional()
});

export const createSystemPermissionSchema = z.object({
  code: codeSchema,
  name: z.string().trim().min(1).max(80),
  status: statusSchema.optional(),
  isBuiltin: z.boolean().optional(),
  groupCode: z.string().trim().min(1).max(48),
  groupName: z.string().trim().min(1).max(80),
  domainCode: z.string().trim().min(1).max(48).optional(),
  domainName: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().nullable().optional(),
  sort: z.coerce.number().int().min(0).optional()
});

export const updateSystemPermissionSchema = createSystemPermissionSchema
  .omit({ isBuiltin: true })
  .partial();
