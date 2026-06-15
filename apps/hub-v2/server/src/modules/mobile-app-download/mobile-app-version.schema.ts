import { z } from "zod";
import type { MobileAppPortalSettings } from "./mobile-app-version.types";

export const mobileAppVersionStatusSchema = z.enum(["published", "testing", "draft", "archived"]);
export const mobileAppPlatformSchema = z.enum(["ios", "android"]);

export const createMobileAppVersionSchema = z.object({
  version: z.string().trim().min(1).max(80),
  buildNumber: z.string().trim().min(1).max(80),
  platform: mobileAppPlatformSchema,
  status: mobileAppVersionStatusSchema.default("draft"),
  packageUploadId: z.string().trim().min(1).optional(),
  changelog: z.array(z.string().trim().min(1).max(500)).default([]),
  releaseChannel: z.string().trim().max(120).default(""),
  minOsVersion: z.string().trim().max(80).default("")
});

export const updateMobileAppVersionSchema = z
  .object({
    version: z.string().trim().min(1).max(80).optional(),
    buildNumber: z.string().trim().min(1).max(80).optional(),
    platform: mobileAppPlatformSchema.optional(),
    status: mobileAppVersionStatusSchema.optional(),
    packageUploadId: z.string().trim().min(1).optional(),
    changelog: z.array(z.string().trim().min(1).max(500)).optional(),
    releaseChannel: z.string().trim().max(120).optional(),
    minOsVersion: z.string().trim().max(80).optional()
  })
  .strict();

export const portalSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  logoUrl: z.string().trim().max(500).nullable().default(null),
  name: z.string().trim().min(1).max(80),
  subtitle: z.string().trim().max(120).default(""),
  description: z.string().trim().max(1000).default(""),
  primaryColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).default("#6366F1"),
  accentColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).default("#10B981"),
  showQrcode: z.boolean().default(true),
  showInstallGuide: z.boolean().default(true),
  showVersionHistory: z.boolean().default(true),
  showSystemRequirements: z.boolean().default(false),
  showDownloadStats: z.boolean().default(false),
  bannerEnabled: z.boolean().default(true),
  bannerText: z.string().trim().max(160).default(""),
  bannerStyle: z.enum(["info", "success", "brand", "warning"]).default("brand"),
  bannerLink: z.string().trim().max(500).default("")
});

export function createDefaultPortalSettings(projectName: string): MobileAppPortalSettings {
  const name = projectName.trim() || "Hub V2 Mobile";
  return {
    enabled: false,
    logoUrl: null,
    name,
    subtitle: "研发协作随身端",
    description: `${name} 是面向研发团队的移动端协作工具，支持查看待办、处理 Issue、跟进研发项和接收通知。`,
    primaryColor: "#6366F1",
    accentColor: "#10B981",
    showQrcode: true,
    showInstallGuide: true,
    showVersionHistory: true,
    showSystemRequirements: false,
    showDownloadStats: false,
    bannerEnabled: true,
    bannerText: "移动端 APP 已开放下载",
    bannerStyle: "brand",
    bannerLink: ""
  };
}

export type CreateMobileAppVersionPayload = z.infer<typeof createMobileAppVersionSchema>;
export type UpdateMobileAppVersionPayload = z.infer<typeof updateMobileAppVersionSchema>;
