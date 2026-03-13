import { z } from "zod";
import { USER_TITLE_VALUES } from "./user.constants";

const statusEnum = z.enum(["active", "inactive"]);
const sourceEnum = z.enum(["local", "imported"]);
const titleCodeEnum = z.enum(USER_TITLE_VALUES);
const usernameSchema = z.string().trim().min(1).max(60).regex(/^[A-Za-z0-9]+$/, "username must contain only letters and numbers");

export const listUserQuerySchema = z.object({
  status: statusEnum.optional(),
  keyword: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export const createUserSchema = z.object({
  username: usernameSchema,
  displayName: z.string().trim().max(120).optional(),
  email: z.string().trim().email().max(120).optional(),
  mobile: z.string().trim().max(30).optional(),
  titleCode: titleCodeEnum.nullable().optional(),
  status: statusEnum.optional().default("active"),
  source: sourceEnum.default("local"),
  remark: z.string().trim().max(1000).optional()
});

export const updateUserSchema = z.object({
  username: usernameSchema.optional(),
  displayName: z.string().trim().max(120).nullable().optional(),
  email: z.string().trim().email().max(120).nullable().optional(),
  mobile: z.string().trim().max(30).nullable().optional(),
  titleCode: titleCodeEnum.nullable().optional(),
  status: statusEnum.optional(),
  source: sourceEnum.optional(),
  remark: z.string().trim().max(1000).nullable().optional()
});

export const enableUserLoginAccountSchema = z.object({
  username: usernameSchema.optional(),
  password: z.string().min(8).max(200).optional(),
  mustChangePassword: z.boolean().optional().default(true)
});

export const resetUserPasswordSchema = z.object({
  newPassword: z.string().min(8).max(200),
  mustChangePassword: z.boolean().optional().default(true)
});

export type ListUserQueryDto = z.infer<typeof listUserQuerySchema>;
export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type EnableUserLoginAccountDto = z.infer<typeof enableUserLoginAccountSchema>;
export type ResetUserPasswordDto = z.infer<typeof resetUserPasswordSchema>;
