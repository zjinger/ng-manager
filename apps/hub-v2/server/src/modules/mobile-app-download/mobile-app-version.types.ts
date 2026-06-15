export type MobileAppPlatform = "android" | "ios";
export type MobileAppVersionStatus = "published" | "testing" | "draft" | "archived";
export type MobileAppReleaseLogAction = "create" | "update" | "publish" | "archive" | "delete" | "download";

export interface MobileAppVersionEntity {
  id: string;
  projectId: string;
  platform: MobileAppPlatform;
  version: string;
  buildNumber: string;
  status: MobileAppVersionStatus;
  packageUploadId: string;
  packageName: string;
  sizeBytes: number;
  sha256: string;
  changelog: string[];
  releaseChannel: string;
  minOsVersion: string;
  publishedAt: string | null;
  downloadCount: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MobileAppVersionRecord {
  id: string;
  projectId: string;
  platform: MobileAppPlatform;
  version: string;
  buildNumber: string;
  status: MobileAppVersionStatus;
  packageUploadId: string;
  changelog: string[];
  releaseChannel: string;
  minOsVersion: string;
  publishedAt: string | null;
  downloadCount: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MobileAppReleaseLogEntity {
  id: string;
  projectId: string;
  versionId: string | null;
  action: MobileAppReleaseLogAction;
  actorId: string | null;
  actorName: string | null;
  snapshot: Record<string, unknown>;
  createdAt: string;
}

export interface CreateMobileAppVersionInput {
  version: string;
  buildNumber: string;
  platform: MobileAppPlatform;
  status: MobileAppVersionStatus;
  packageUploadId?: string;
  changelog?: string[];
  releaseChannel?: string;
  minOsVersion?: string;
}

export interface UpdateMobileAppVersionInput {
  version?: string;
  buildNumber?: string;
  platform?: MobileAppPlatform;
  status?: MobileAppVersionStatus;
  packageUploadId?: string;
  changelog?: string[];
  releaseChannel?: string;
  minOsVersion?: string;
}

export interface MobileAppVersionStats {
  totalVersions: number;
  publishedCount: number;
  testingCount: number;
  totalDownloads: number;
  currentVersion: string | null;
}

export interface MobileAppReleaseRecord {
  id: string;
  versionId: string;
  version: string;
  platform: MobileAppPlatform;
  status: MobileAppVersionStatus;
  publishedAt: string;
  changelog: string[];
  downloadCount: number;
  releaseChannel: string;
}

export interface MobileAppPortalSettings {
  enabled: boolean;
  logoUrl: string | null;
  name: string;
  subtitle: string;
  description: string;
  primaryColor: string;
  accentColor: string;
  showQrcode: boolean;
  showInstallGuide: boolean;
  showVersionHistory: boolean;
  showSystemRequirements: boolean;
  showDownloadStats: boolean;
  bannerEnabled: boolean;
  bannerText: string;
  bannerStyle: "info" | "success" | "brand" | "warning";
  bannerLink: string;
}
