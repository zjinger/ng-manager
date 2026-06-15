import type { RequestContext } from "../../shared/context/request-context";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { AppError } from "../../shared/errors/app-error";
import type { UploadQueryContract } from "../upload/upload.contract";
import type { UploadEntity } from "../upload/upload.types";
import type {
  MobileAppVersionCommandContract,
  MobileAppVersionQueryContract
} from "./mobile-app-version.contract";
import { MOBILE_APP_PORTAL_SETTINGS_KEY, MobileAppPortalSettingsService } from "./mobile-app-portal-settings.service";
import type { MobileAppPortalSettings, MobileAppVersionEntity } from "./mobile-app-version.types";
import type {
  MobileAppDownloadInfo,
  MobileAppDownloadPlatform,
  MobileAppDownloadReleaseNote,
  MobileAppPlatform,
  MobileAppProjectConfigInfo,
  MobileAppProjectRef
} from "./mobile-app-download.types";

export const MOBILE_APP_PACKAGE_BUCKET = "mobile-apps";
export const MOBILE_APP_PACKAGE_CATEGORY = "package";

const DEFAULT_RELEASE_CHANNEL = "mobile-app";
const DEFAULT_CACHE_SECONDS = 120;

const DEFAULT_INSTALL_STEPS = [
  { title: "打开下载页", description: "在手机浏览器或企业微信中打开本页面，也可以用手机扫描桌面端二维码。" },
  { title: "选择平台", description: "按设备系统选择 Android APK 或 iOS 企业包，系统会展示对应安装包信息。" },
  { title: "完成安装", description: "下载后根据系统提示安装；iOS 首次安装可能需要在设备管理中信任企业证书。" },
  { title: "登录使用", description: "打开 App，填写服务器地址、用户名和密码后进入移动端工作台。" }
];

const DEFAULT_FAQ = [
  { question: "谁可以安装？", answer: "该下载页面向公司内部用户开放，具体使用范围由项目负责人维护。" },
  { question: "无法安装怎么办？", answer: "先确认系统版本、安装权限和企业证书信任状态，再联系项目负责人。" },
  { question: "如何确认安装包安全？", answer: "下载前核对版本号、构建号和 SHA256 校验值。" }
];

type MobileAppDownloadServiceDeps = {
  uploadQuery: UploadQueryContract;
  portalSettings: MobileAppPortalSettingsService;
  mobileAppVersionQuery: MobileAppVersionQueryContract;
  mobileAppVersionCommand: MobileAppVersionCommandContract;
};

export class MobileAppDownloadService {
  constructor(private readonly deps: MobileAppDownloadServiceDeps) {}

  async getPublicDownloadInfo(project: MobileAppProjectRef, ctx: RequestContext): Promise<MobileAppDownloadInfo> {
    return this.getVersionBackedPublicDownloadInfo(project, ctx);
  }

  async getPublicPackage(
    project: MobileAppProjectRef,
    platform: MobileAppPlatform,
    ctx: RequestContext
  ): Promise<{ upload: UploadEntity; versionId: string }> {
    const settings = await this.getPublicPortalSettings(project, ctx);
    if (!settings.enabled) {
      throwNotConfigured(project.projectKey);
    }
    const version = await this.deps.mobileAppVersionQuery.getLatestPublishedVersion(project.id, platform, ctx);
    if (!version?.packageUploadId) {
      throwPackageNotFound(project.projectKey, platform);
    }
    const upload = await this.deps.uploadQuery.getById(version.packageUploadId, ctx);
    if (!isActiveMobileAppPackage(upload)) {
      throwPackageNotFound(project.projectKey, platform);
    }
    return { upload, versionId: version.id };
  }

  async recordPublicDownload(project: MobileAppProjectRef, versionId: string, ctx: RequestContext): Promise<void> {
    await this.deps.mobileAppVersionCommand.recordDownload(project.id, versionId, ctx);
  }

  private async getVersionBackedPublicDownloadInfo(
    project: MobileAppProjectRef,
    ctx: RequestContext
  ): Promise<MobileAppProjectConfigInfo> {
    const settings = await this.getPublicPortalSettings(project, ctx);
    if (!settings.enabled) {
      throwNotConfigured(project.projectKey);
    }
    const platformVersions = await this.resolvePublishedPlatformVersions(project.id, ctx);
    const platforms = platformVersions.map(({ platform, version }) => toDownloadPlatform(project, platform, version));
    if (!platforms.some((item) => item.enabled && item.packageUploadId && item.downloadUrl)) {
      throwNotConfigured(project.projectKey);
    }

    const publishedVersions = await this.deps.mobileAppVersionQuery.listPublishedVersions(project.id, ctx);
    const releaseNotes = publishedVersions.slice(0, 10).map((version) => toVersionReleaseNote(project, version));
    const primary = resolvePrimaryPlatform(platforms);
    const channel = primary?.distributionType || DEFAULT_RELEASE_CHANNEL;

    return {
      project,
      enabled: true,
      downloadPageUrl: `/download/${encodeURIComponent(project.projectKey)}`,
      app: {
        name: settings.name || project.name,
        title: `${settings.name || project.name} APP 下载`,
        subtitle: settings.subtitle,
        description: settings.description,
        channel
      },
      current: {
        versionName: primary?.versionName ?? null,
        versionCode: primary?.versionCode ?? null,
        publishedAt: releaseNotes[0]?.publishedAt ?? null,
        channel,
        packageSizeBytes: primary?.packageSizeBytes ?? null,
        minOsVersion: primary?.minOsVersion ?? null,
        forceUpdate: false,
        gray: false,
        minSupportedVersion: null
      },
      platforms,
      releaseNotes,
      installSteps: settings.showInstallGuide ? DEFAULT_INSTALL_STEPS : [],
      faq: DEFAULT_FAQ,
      support: {
        owner: "项目负责人",
        contact: null,
        docsUrl: null
      },
      cache: {
        maxAgeSeconds: DEFAULT_CACHE_SECONDS
      },
      configured: true,
      source: {
        configKey: MOBILE_APP_PORTAL_SETTINGS_KEY,
        releaseChannel: channel
      }
    };
  }

  private async resolvePublishedPlatformVersions(projectId: string, ctx: RequestContext) {
    const items: Array<{ platform: MobileAppPlatform; version: MobileAppVersionEntity | null }> = [];
    for (const platform of ["android", "ios"] as const) {
      items.push({
        platform,
        version: await this.deps.mobileAppVersionQuery.getLatestPublishedVersion(projectId, platform, ctx)
      });
    }
    return items;
  }

  private async getPublicPortalSettings(
    project: MobileAppProjectRef,
    ctx: RequestContext
  ): Promise<MobileAppPortalSettings> {
    return this.deps.portalSettings.get(project.id, project.name, ctx);
  }
}

function toDownloadPlatform(
  project: MobileAppProjectRef,
  platform: MobileAppPlatform,
  version: MobileAppVersionEntity | null
): MobileAppDownloadPlatform {
  if (!version) {
    return emptyDownloadPlatform(platform);
  }
  return {
    platform,
    enabled: true,
    packageUploadId: version.packageUploadId,
    packageName: version.packageName,
    versionName: version.version,
    versionCode: parseBuildNumber(version.buildNumber),
    downloadUrl: `/api/public/mobile-app/projects/${encodeURIComponent(project.projectKey)}/packages/${platform}/download`,
    qrCodeUrl: null,
    packageSizeBytes: version.sizeBytes,
    minOsVersion: version.minOsVersion || null,
    checksum: {
      sha256: version.sha256 || null,
      md5: null
    },
    distributionType: version.releaseChannel || null,
    forceUpdate: false,
    gray: false,
    minSupportedVersion: null
  };
}

function toVersionReleaseNote(
  project: MobileAppProjectRef,
  version: MobileAppVersionEntity
): MobileAppDownloadReleaseNote {
  return {
    id: version.id,
    version: version.version,
    title: `${version.platform === "android" ? "Android" : "iOS"} ${version.version}`,
    publishedAt: version.publishedAt,
    summary: version.changelog.length ? version.changelog : [`${version.version} 已发布`],
    importantNotes: version.changelog.filter((line) => /^(重要|注意|warning|important)[:：]/i.test(line)),
    downloadUrl: `/api/public/mobile-app/projects/${encodeURIComponent(project.projectKey)}/packages/${version.platform}/download`
  };
}

function emptyDownloadPlatform(platform: MobileAppPlatform): MobileAppDownloadPlatform {
  return {
    platform,
    enabled: false,
    packageUploadId: null,
    packageName: null,
    versionName: null,
    versionCode: null,
    downloadUrl: null,
    qrCodeUrl: null,
    packageSizeBytes: null,
    minOsVersion: null,
    checksum: { sha256: null, md5: null },
    distributionType: null,
    forceUpdate: false,
    gray: false,
    minSupportedVersion: null
  };
}

function resolvePrimaryPlatform(platforms: MobileAppDownloadPlatform[]): MobileAppDownloadPlatform | null {
  return platforms.find((item) => item.enabled && item.downloadUrl) ?? platforms.find((item) => item.enabled) ?? null;
}

function parseBuildNumber(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function isActiveMobileAppPackage(upload: UploadEntity): boolean {
  return (
    upload.status === "active" &&
    upload.bucket === MOBILE_APP_PACKAGE_BUCKET &&
    upload.category === MOBILE_APP_PACKAGE_CATEGORY
  );
}

function throwNotConfigured(projectKey: string): never {
  throw new AppError(ERROR_CODES.MOBILE_APP_DOWNLOAD_NOT_CONFIGURED, "mobile app download is not configured", 404, {
    projectKey
  });
}

function throwPackageNotFound(projectKey: string, platform: MobileAppPlatform): never {
  throw new AppError(ERROR_CODES.MOBILE_APP_DOWNLOAD_PACKAGE_NOT_FOUND, "mobile app package not found", 404, {
    projectKey,
    platform
  });
}
