import { z } from "zod";

const platformSchema = z.object({
  platform: z.enum(["android", "ios"]),
  enabled: z.boolean().optional(),
  packageUploadId: z.string().trim().optional().nullable(),
  packageName: z.string().trim().optional().nullable(),
  versionName: z.string().trim().optional().nullable(),
  versionCode: z.coerce.number().int().positive().optional().nullable(),
  downloadUrl: z.string().trim().optional().nullable(),
  qrCodeUrl: z.string().trim().optional().nullable(),
  packageSizeBytes: z.coerce.number().int().nonnegative().optional().nullable(),
  minOsVersion: z.string().trim().optional().nullable(),
  checksum: z
    .object({
      sha256: z.string().trim().optional().nullable(),
      md5: z.string().trim().optional().nullable()
    })
    .optional(),
  distributionType: z.string().trim().optional().nullable(),
  forceUpdate: z.boolean().optional(),
  gray: z.boolean().optional(),
  minSupportedVersion: z.string().trim().optional().nullable()
});

const releaseNoteSchema = z.object({
  id: z.string().trim().optional(),
  version: z.string().trim(),
  title: z.string().trim(),
  publishedAt: z.string().trim().optional().nullable(),
  summary: z.array(z.string().trim()).optional(),
  importantNotes: z.array(z.string().trim()).optional(),
  downloadUrl: z.string().trim().optional().nullable()
});

export const mobileAppDownloadConfigSchema = z.object({
  enabled: z.boolean().optional(),
  app: z
    .object({
      name: z.string().trim().optional(),
      title: z.string().trim().optional(),
      subtitle: z.string().trim().optional(),
      description: z.string().trim().optional(),
      channel: z.string().trim().optional()
    })
    .optional(),
  current: z
    .object({
      versionName: z.string().trim().optional().nullable(),
      versionCode: z.coerce.number().int().positive().optional().nullable(),
      publishedAt: z.string().trim().optional().nullable(),
      channel: z.string().trim().optional(),
      packageSizeBytes: z.coerce.number().int().nonnegative().optional().nullable(),
      minOsVersion: z.string().trim().optional().nullable(),
      forceUpdate: z.boolean().optional(),
      gray: z.boolean().optional(),
      minSupportedVersion: z.string().trim().optional().nullable()
    })
    .optional(),
  platforms: z.array(platformSchema).optional(),
  releaseNotes: z.array(releaseNoteSchema).optional(),
  installSteps: z.array(z.object({ title: z.string().trim(), description: z.string().trim() })).optional(),
  faq: z.array(z.object({ question: z.string().trim(), answer: z.string().trim() })).optional(),
  support: z
    .object({
      owner: z.string().trim().optional(),
      contact: z.string().trim().optional().nullable(),
      docsUrl: z.string().trim().optional().nullable()
    })
    .optional(),
  cache: z
    .object({
      maxAgeSeconds: z.coerce.number().int().min(0).max(3600).optional()
    })
    .optional(),
  releaseChannel: z.string().trim().optional()
});

export type MobileAppDownloadConfig = z.infer<typeof mobileAppDownloadConfigSchema>;
