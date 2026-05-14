import { z } from "zod";
import { SETTINGS_CATEGORIES } from "./system-settings.types";

export const categorySchema = z.enum(SETTINGS_CATEGORIES);

export const generalSettingsSchema = z.object({
  platformName: z.string().trim().min(1).max(100),
  platformDesc: z.string().trim().max(200),
  defaultLanguage: z.string().trim().min(1),
  timezone: z.string().trim().min(1),
  dateFormat: z.string().trim().min(1),
  openRegistration: z.boolean(),
  emailWhitelist: z.string(),
  defaultRole: z.string().trim().min(1),
  requireApproval: z.boolean()
});

export const securitySettingsSchema = z.object({
  minPasswordLength: z.number().int().min(6).max(12),
  requireComplexity: z.boolean(),
  passwordExpiry: z.number().int().min(0),
  loginFailureLock: z.number().int().min(0),
  globalForce2FA: z.boolean(),
  adminForce2FA: z.boolean(),
  sessionTimeout: z.number().int().min(15).max(120)
});

export const notificationSettingsSchema = z.object({
  emailEnabled: z.boolean(),
  wechatWorkEnabled: z.boolean(),
  feishuEnabled: z.boolean(),
  dingtalkEnabled: z.boolean(),
  browserPushEnabled: z.boolean()
});

export const integrationItemSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string(),
  status: z.enum(['active', 'inactive']),
  icon: z.string()
});

export const apiKeyItemSchema = z.object({
  name: z.string().trim().min(1),
  key: z.string(),
  scope: z.string(),
  createdAt: z.string(),
  lastUsed: z.string(),
  status: z.enum(['active', 'inactive'])
});

export const integrationSettingsSchema = z.object({
  integrations: z.array(integrationItemSchema),
  apiKeys: z.array(apiKeyItemSchema)
});
