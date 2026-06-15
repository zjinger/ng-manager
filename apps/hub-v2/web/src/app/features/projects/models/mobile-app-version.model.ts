export type MobileAppVersionStatus = 'published' | 'testing' | 'draft' | 'archived';
export type MobileAppPlatformType = 'ios' | 'android';

export interface MobileAppVersion {
  id: string;
  version: string;
  buildNumber: string;
  platform: MobileAppPlatformType;
  packageName: string;
  sizeBytes: number;
  status: MobileAppVersionStatus;
  publishedAt: string | null;
  downloadCount: number;
  sha256: string;
  changelog: string[];
  releaseChannel: string;
  minOsVersion: string;
  createdAt: string;
  updatedAt: string;
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
  version: string;
  platform: MobileAppPlatformType;
  status: MobileAppVersionStatus;
  publishedAt: string;
  changelog: string[];
  downloadCount: number;
  releaseChannel: string;
}

export interface CreateMobileAppVersionInput {
  version: string;
  buildNumber: string;
  platform: MobileAppPlatformType;
  status: MobileAppVersionStatus;
  changelog: string[];
  releaseChannel: string;
  minOsVersion: string;
}

export interface UpdateMobileAppVersionInput {
  version?: string;
  buildNumber?: string;
  platform?: MobileAppPlatformType;
  status?: MobileAppVersionStatus;
  changelog?: string[];
  releaseChannel?: string;
  minOsVersion?: string;
}

export const MOBILE_APP_VERSION_STATUS_LABELS: Record<MobileAppVersionStatus, string> = {
  published: '已发布',
  testing: '测试中',
  draft: '草稿',
  archived: '已归档',
};

export const MOBILE_APP_PLATFORM_LABELS: Record<MobileAppPlatformType, string> = {
  ios: 'iOS',
  android: 'Android',
};
