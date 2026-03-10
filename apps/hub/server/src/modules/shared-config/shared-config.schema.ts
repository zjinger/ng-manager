import { z } from "zod";

export const sharedConfigScopeSchema = z.enum(["global", "project"]);
export const sharedConfigStatusSchema = z.enum(["active", "disabled"]);
export const sharedConfigValueTypeSchema = z.enum(["json", "text", "number", "boolean"]);

export const createSharedConfigSchema = z.object({
  projectId: z.string().trim().min(1).nullable().optional(),
  scope: sharedConfigScopeSchema.optional(),
  configKey: z.string().trim().min(1).max(100),
  configName: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(50),
  valueType: sharedConfigValueTypeSchema.optional().default("json"),
  configValue: z.string(),
  description: z.string().trim().max(500).optional().default(""),
  isEncrypted: z.boolean().optional().default(false),
  priority: z.coerce.number().int().optional().default(0),
  status: sharedConfigStatusSchema.optional().default("active")
});

export const updateSharedConfigSchema = z.object({
  configName: z.string().trim().min(1).max(100).optional(),
  category: z.string().trim().min(1).max(50).optional(),
  valueType: sharedConfigValueTypeSchema.optional(),
  configValue: z.string().optional(),
  description: z.string().trim().max(500).optional(),
  isEncrypted: z.boolean().optional(),
  priority: z.coerce.number().int().optional(),
  status: sharedConfigStatusSchema.optional()
});

export const listSharedConfigQuerySchema = z.object({
  projectId: z.string().trim().min(1).optional(),
  scope: sharedConfigScopeSchema.optional(),
  category: z.string().trim().min(1).optional(),
  keyword: z.string().trim().min(1).optional(),
  status: sharedConfigStatusSchema.optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20)
});

export const resolveSharedConfigQuerySchema = z.object({
  projectId: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional()
});