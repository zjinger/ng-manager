import { z } from "zod";

export const createUserSchema = z.object({
  username: z.string().trim().min(1),
  displayName: z.string().trim().optional(),
  email: z.string().trim().email().optional(),
  mobile: z.string().trim().optional(),
  titleCode: z.string().trim().optional(),
  remark: z.string().trim().optional()
});

export const updateUserSchema = z.object({
  displayName: z.string().trim().nullable().optional(),
  email: z.string().trim().email().nullable().optional(),
  mobile: z.string().trim().nullable().optional(),
  titleCode: z.string().trim().nullable().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  remark: z.string().trim().nullable().optional()
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  keyword: z.string().trim().optional(),
  status: z.enum(["active", "inactive"]).optional()
});
