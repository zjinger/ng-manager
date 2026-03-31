import { z } from "zod";

export const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{4,24}$/, "username must be 4-24 chars and only contains letters/numbers"),
  displayName: z.string().trim().optional(),
  email: z.string().trim().email().optional(),
  mobile: z.string().trim().optional(),
  titleCode: z.string().trim().optional(),
  remark: z.string().trim().optional(),
  loginEnabled: z.boolean().optional()
});

export const updateUserSchema = z.object({
  displayName: z.string().trim().nullable().optional(),
  email: z.string().trim().email().nullable().optional(),
  mobile: z.string().trim().nullable().optional(),
  titleCode: z.string().trim().nullable().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  remark: z.string().trim().nullable().optional(),
  loginEnabled: z.boolean().optional()
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  keyword: z.string().trim().optional(),
  status: z.enum(["active", "inactive"]).optional()
});

export const resetUserPasswordSchema = z.object({
  newPassword: z.string().trim().min(8).max(64).optional()
});
