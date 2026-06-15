export type MobileAppVersionStatus = 'published' | 'testing' | 'draft' | 'archived';
export type MobileAppPlatformType = 'ios' | 'android';

export interface MobileAppVersion {
  id: string;
  projectId: string;
  version: string;
  buildNumber: string;
  platform: MobileAppPlatformType;
  packageUploadId: string;
  packageName: string;
  sizeBytes: number;
  status: MobileAppVersionStatus;
  publishedAt: string | null;
  downloadCount: number;
  sha256: string;
  changelog: string[];
  releaseChannel: string;
  minOsVersion: string;
  createdBy: string | null;
  updatedBy: string | null;
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
  versionId?: string;
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
  packageUploadId?: string;
  packageFile?: File | null;
  changelog: string[];
  releaseChannel: string;
  minOsVersion: string;
}

export interface UpdateMobileAppVersionInput {
  version?: string;
  buildNumber?: string;
  platform?: MobileAppPlatformType;
  status?: MobileAppVersionStatus;
  packageUploadId?: string;
  packageFile?: File | null;
  changelog?: string[];
  releaseChannel?: string;
  minOsVersion?: string;
}

export interface PortalSettings {
  enabled: boolean;
  logoUrl: string | null;
  logoFile?: File | null;
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
  bannerStyle: 'info' | 'success' | 'brand' | 'warning';
  bannerLink: string;
}

export const DEFAULT_PORTAL_SETTINGS: PortalSettings = {
  enabled: false,
  logoUrl: null,
  name: 'Hub V2 Mobile',
  subtitle: '研发协作随身端',
  description: 'Hub V2 Mobile 是面向研发团队的移动端协作工具，支持查看待办、处理 Issue、跟进研发项和接收通知。',
  primaryColor: '#6366F1',
  accentColor: '#10B981',
  showQrcode: true,
  showInstallGuide: true,
  showVersionHistory: true,
  showSystemRequirements: false,
  showDownloadStats: false,
  bannerEnabled: true,
  bannerText: '移动端 APP 已开放下载',
  bannerStyle: 'brand',
  bannerLink: '',
};

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
