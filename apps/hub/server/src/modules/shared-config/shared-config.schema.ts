import { z } from "zod";

const valueTypeEnum = z.enum(["string", "json", "number", "boolean"]);
const scopeEnum = z.enum(["public", "admin"]);

export const createSharedConfigSchema = z.object({
  configKey: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/, {
      message: "configKey must be lowercase and use dot/underscore/hyphen separators"
    }),
  configValue: z.string().min(1).max(200000),
  valueType: valueTypeEnum,
  scope: scopeEnum.default("public"),
  description: z.string().trim().max(500).optional()
});

export const updateSharedConfigSchema = z.object({
  configValue: z.string().min(1).max(200000).optional(),
  valueType: valueTypeEnum.optional(),
  scope: scopeEnum.optional(),
  description: z.string().trim().max(500).nullable().optional()
});

export const listSharedConfigQuerySchema = z.object({
  scope: scopeEnum.optional(),
  keyword: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export type CreateSharedConfigDto = z.infer<typeof createSharedConfigSchema>;
export type UpdateSharedConfigDto = z.infer<typeof updateSharedConfigSchema>;
export type ListSharedConfigQueryDto = z.infer<typeof listSharedConfigQuerySchema>;