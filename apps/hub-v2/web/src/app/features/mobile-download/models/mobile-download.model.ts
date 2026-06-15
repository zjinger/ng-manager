export type MobileAppPlatform = 'android' | 'ios';

export interface MobileAppDownloadPlatform {
  platform: MobileAppPlatform;
  enabled: boolean;
  packageUploadId: string | null;
  packageName: string | null;
  versionName: string | null;
  versionCode: number | null;
  downloadUrl: string | null;
  qrCodeUrl: string | null;
  packageSizeBytes: number | null;
  minOsVersion: string | null;
  checksum: {
    sha256: string | null;
    md5: string | null;
  };
  distributionType: string | null;
  forceUpdate: boolean;
  gray: boolean;
  minSupportedVersion: string | null;
}

export interface MobileAppDownloadReleaseNote {
  id: string;
  version: string;
  title: string;
  publishedAt: string | null;
  summary: string[];
  importantNotes: string[];
  downloadUrl: string | null;
}

export interface MobileAppDownloadInfo {
  project: {
    id: string;
    projectKey: string;
    name: string;
  };
  enabled: boolean;
  downloadPageUrl: string;
  app: {
    name: string;
    title: string;
    subtitle: string;
    description: string;
    channel: string;
  };
  current: {
    versionName: string | null;
    versionCode: number | null;
    publishedAt: string | null;
    channel: string;
    packageSizeBytes: number | null;
    minOsVersion: string | null;
    forceUpdate: boolean;
    gray: boolean;
    minSupportedVersion: string | null;
  };
  platforms: MobileAppDownloadPlatform[];
  releaseNotes: MobileAppDownloadReleaseNote[];
  installSteps: Array<{ title: string; description: string }>;
  faq: Array<{ question: string; answer: string }>;
  support: {
    owner: string;
    contact: string | null;
    docsUrl: string | null;
  };
  cache: {
    maxAgeSeconds: number;
  };
  configured: boolean;
  source: {
    configKey: string | null;
    releaseChannel: string;
  };
}
