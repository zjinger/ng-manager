import type { RequestContext } from "../../shared/context/request-context";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { AppError } from "../../shared/errors/app-error";
import type { ProjectAccessContract } from "../project/project-access.contract";
import type { ReleaseQueryContract } from "../release/release.contract";
import type { ReleaseEntity } from "../release/release.types";
import type {
  SharedConfigCommandContract,
  SharedConfigQueryContract
} from "../shared-config/shared-config.contract";
import type { SharedConfigEntity } from "../shared-config/shared-config.types";
import type { UploadCommandContract, UploadQueryContract } from "../upload/upload.contract";
import type { UploadEntity } from "../upload/upload.types";
import { mobileAppDownloadConfigSchema, type MobileAppDownloadConfig } from "./mobile-app-download.schema";
import type {
  MobileAppDownloadInfo,
  MobileAppDownloadPlatform,
  MobileAppDownloadReleaseNote,
  MobileAppPlatform,
  MobileAppProjectConfigInfo,
  MobileAppProjectRef
} from "./mobile-app-download.types";

type MobileAppPlatformConfig = NonNullable<MobileAppDownloadConfig["platforms"]>[number];
type MobileAppReleaseNoteConfig = NonNullable<MobileAppDownloadConfig["releaseNotes"]>[number];

export const MOBILE_APP_DOWNLOAD_CONFIG_CATEGORY = "mobile-app-download";
export const MOBILE_APP_DOWNLOAD_CONFIG_KEY = "mobile-app.download";
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
  sharedConfigQuery: SharedConfigQueryContract;
  sharedConfigCommand?: SharedConfigCommandContract;
  releaseQuery: ReleaseQueryContract;
  uploadQuery: UploadQueryContract;
  uploadCommand?: UploadCommandContract;
  projectAccess?: ProjectAccessContract & ProjectMaintainerAccess;
};

type ProjectMaintainerAccess = {
  requireProjectMaintainer(projectId: string, ctx: RequestContext, action: string): Promise<void>;
};

export class MobileAppDownloadService {
  constructor(private readonly deps: MobileAppDownloadServiceDeps) {}

  async getProjectConfig(project: MobileAppProjectRef, ctx: RequestContext): Promise<MobileAppProjectConfigInfo> {
    await this.deps.projectAccess?.requireProjectAccess(project.id, ctx, "get mobile app config");
    const selectedConfig = await this.findProjectConfig(project.id, ctx);
    const config = selectedConfig ? this.parseConfig(selectedConfig) : this.createDefaultConfig(project);
    return this.buildInfo(project, config, selectedConfig, { publicOnly: false }, ctx);
  }

  async updateProjectConfig(
    project: MobileAppProjectRef,
    input: unknown,
    ctx: RequestContext
  ): Promise<MobileAppProjectConfigInfo> {
    if (!this.deps.sharedConfigCommand) {
      throw new AppError(ERROR_CODES.INTERNAL_ERROR, "shared config command is not available", 500);
    }
    await this.deps.projectAccess?.requireProjectMaintainer(project.id, ctx, "update mobile app config");

    const config = this.parseInputConfig(input);
    const current = await this.findProjectConfig(project.id, ctx);
    if (current) {
      await this.deps.sharedConfigCommand.update(
        current.id,
        {
          configName: `${project.name} 移动端 APP 下载配置`,
          category: MOBILE_APP_DOWNLOAD_CONFIG_CATEGORY,
          valueType: "json",
          configValue: JSON.stringify(config),
          description: "项目级移动端 APP 下载页配置",
          status: "active"
        },
        ctx
      );
    } else {
      await this.deps.sharedConfigCommand.create(
        {
          projectId: project.id,
          scope: "project",
          configKey: MOBILE_APP_DOWNLOAD_CONFIG_KEY,
          configName: `${project.name} 移动端 APP 下载配置`,
          category: MOBILE_APP_DOWNLOAD_CONFIG_CATEGORY,
          valueType: "json",
          configValue: JSON.stringify(config),
          description: "项目级移动端 APP 下载页配置",
          isEncrypted: false,
          priority: 0
        },
        ctx
      );
    }

    return this.getProjectConfig(project, ctx);
  }

  async attachPackage(
    project: MobileAppProjectRef,
    platform: MobileAppPlatform,
    upload: UploadEntity,
    ctx: RequestContext
  ): Promise<MobileAppProjectConfigInfo> {
    await this.deps.projectAccess?.requireProjectMaintainer(project.id, ctx, "upload mobile app package");
    const current = await this.findProjectConfig(project.id, ctx);
    const config = current ? this.parseConfig(current) : this.createDefaultConfig(project);
    const next = this.upsertPlatform(config, platform, {
      platform,
      enabled: true,
      packageUploadId: upload.id,
      packageName: upload.originalName || upload.fileName,
      versionName: this.findPlatform(config, platform)?.versionName ?? null,
      versionCode: this.findPlatform(config, platform)?.versionCode ?? null,
      downloadUrl: null,
      qrCodeUrl: null,
      packageSizeBytes: upload.fileSize,
      minOsVersion: this.findPlatform(config, platform)?.minOsVersion ?? null,
      checksum: { sha256: upload.checksum ?? null, md5: null },
      distributionType: this.findPlatform(config, platform)?.distributionType ?? "内测",
      forceUpdate: this.findPlatform(config, platform)?.forceUpdate ?? false,
      gray: this.findPlatform(config, platform)?.gray ?? false,
      minSupportedVersion: this.findPlatform(config, platform)?.minSupportedVersion ?? null
    });

    return this.updateProjectConfig(project, next, ctx);
  }

  async removePackage(
    project: MobileAppProjectRef,
    platform: MobileAppPlatform,
    ctx: RequestContext
  ): Promise<MobileAppProjectConfigInfo> {
    await this.deps.projectAccess?.requireProjectMaintainer(project.id, ctx, "remove mobile app package");
    const current = await this.findProjectConfig(project.id, ctx);
    const config = current ? this.parseConfig(current) : this.createDefaultConfig(project);
    const currentPlatform = this.findPlatform(config, platform);
    if (currentPlatform?.packageUploadId) {
      await this.deps.uploadCommand?.deactivateUpload(currentPlatform.packageUploadId, ctx);
    }
    const next = this.upsertPlatform(config, platform, {
      ...emptyPlatform(platform),
      enabled: false
    });
    return this.updateProjectConfig(project, next, ctx);
  }

  async getPublicDownloadInfo(project: MobileAppProjectRef, ctx: RequestContext): Promise<MobileAppDownloadInfo> {
    const selectedConfig = await this.findProjectConfig(project.id, ctx);
    if (!selectedConfig) {
      throwNotConfigured(project.projectKey);
    }
    const config = this.parseConfig(selectedConfig);
    if (config.enabled !== true) {
      throwNotConfigured(project.projectKey);
    }
    const data = await this.buildInfo(project, config, selectedConfig, { publicOnly: true }, ctx);
    if (!data.platforms.some((item) => item.enabled && item.packageUploadId && item.downloadUrl)) {
      throwNotConfigured(project.projectKey);
    }
    return data;
  }

  async getPublicPackage(
    project: MobileAppProjectRef,
    platform: MobileAppPlatform,
    ctx: RequestContext
  ): Promise<UploadEntity> {
    const data = await this.getPublicDownloadInfo(project, ctx);
    const selected = data.platforms.find((item) => item.platform === platform && item.enabled && item.packageUploadId);
    if (!selected?.packageUploadId) {
      throw new AppError(ERROR_CODES.MOBILE_APP_DOWNLOAD_PACKAGE_NOT_FOUND, "mobile app package not found", 404, {
        projectKey: project.projectKey,
        platform
      });
    }

    const upload = await this.deps.uploadQuery.getById(selected.packageUploadId, ctx);
    if (!isActiveMobileAppPackage(upload)) {
      throw new AppError(ERROR_CODES.MOBILE_APP_DOWNLOAD_PACKAGE_NOT_FOUND, "mobile app package not found", 404, {
        projectKey: project.projectKey,
        platform
      });
    }
    return upload;
  }

  private async buildInfo(
    project: MobileAppProjectRef,
    config: MobileAppDownloadConfig,
    selectedConfig: SharedConfigEntity | null,
    options: { publicOnly: boolean },
    ctx: RequestContext
  ): Promise<MobileAppProjectConfigInfo> {
    const releaseChannel = config.releaseChannel?.trim() || config.app?.channel?.trim() || DEFAULT_RELEASE_CHANNEL;
    const configuredReleaseNotes = normalizeConfiguredReleaseNotes(config.releaseNotes ?? []);
    const releaseResult =
      configuredReleaseNotes.length > 0
        ? null
        : await this.deps.releaseQuery.listPublic({ channel: releaseChannel, page: 1, pageSize: 10 }, ctx);
    const platforms = await this.normalizePlatforms(project, config, options, ctx);
    const primary = this.resolvePrimaryPlatform(platforms);
    const releaseNotes =
      configuredReleaseNotes.length > 0 ? configuredReleaseNotes : releaseResult?.items.map(toReleaseNote) ?? [];

    return {
      project,
      enabled: config.enabled === true,
      downloadPageUrl: `/download/${encodeURIComponent(project.projectKey)}`,
      app: {
        name: config.app?.name?.trim() || project.name,
        title: config.app?.title?.trim() || `${project.name} APP 下载`,
        subtitle: config.app?.subtitle?.trim() || "公司内部移动端",
        description:
          config.app?.description?.trim() ||
          "该页面用于下载项目对应的移动端安装包，请按设备系统选择 Android 或 iOS 版本。",
        channel: releaseChannel
      },
      current: {
        versionName: config.current?.versionName ?? primary?.versionName ?? null,
        versionCode: config.current?.versionCode ?? primary?.versionCode ?? null,
        publishedAt: config.current?.publishedAt ?? releaseNotes[0]?.publishedAt ?? null,
        channel: config.current?.channel?.trim() || releaseChannel,
        packageSizeBytes: config.current?.packageSizeBytes ?? primary?.packageSizeBytes ?? null,
        minOsVersion: config.current?.minOsVersion ?? primary?.minOsVersion ?? null,
        forceUpdate: config.current?.forceUpdate ?? primary?.forceUpdate ?? false,
        gray: config.current?.gray ?? primary?.gray ?? false,
        minSupportedVersion: config.current?.minSupportedVersion ?? primary?.minSupportedVersion ?? null
      },
      platforms,
      releaseNotes,
      installSteps: config.installSteps?.length ? config.installSteps : DEFAULT_INSTALL_STEPS,
      faq: config.faq?.length ? config.faq : DEFAULT_FAQ,
      support: {
        owner: config.support?.owner?.trim() || "项目负责人",
        contact: config.support?.contact ?? null,
        docsUrl: config.support?.docsUrl ?? null
      },
      cache: {
        maxAgeSeconds: config.cache?.maxAgeSeconds ?? DEFAULT_CACHE_SECONDS
      },
      configured: !!selectedConfig,
      source: {
        configKey: selectedConfig?.configKey ?? MOBILE_APP_DOWNLOAD_CONFIG_KEY,
        releaseChannel
      }
    };
  }

  private async findProjectConfig(projectId: string, ctx: RequestContext): Promise<SharedConfigEntity | null> {
    const result = await this.deps.sharedConfigQuery.list(
      {
        projectId,
        category: MOBILE_APP_DOWNLOAD_CONFIG_CATEGORY,
        page: 1,
        pageSize: 20
      },
      ctx
    );
    return result.items.find((item) => item.configKey === MOBILE_APP_DOWNLOAD_CONFIG_KEY && item.status === "active") ?? null;
  }

  private parseConfig(entity: SharedConfigEntity): MobileAppDownloadConfig {
    try {
      const value = JSON.parse(entity.configValue) as unknown;
      return this.parseInputConfig(value);
    } catch (_error) {
      throw new AppError(
        ERROR_CODES.MOBILE_APP_DOWNLOAD_CONFIG_INVALID,
        `mobile app download config invalid: ${entity.configKey}`,
        400,
        { configKey: entity.configKey }
      );
    }
  }

  private parseInputConfig(input: unknown): MobileAppDownloadConfig {
    try {
      const parsed = mobileAppDownloadConfigSchema.parse(input);
      return {
        ...parsed,
        platforms: this.normalizeConfigPlatforms(parsed.platforms ?? []),
        releaseNotes: normalizeConfigReleaseNotes(parsed.releaseNotes ?? [])
      };
    } catch (_error) {
      throw new AppError(ERROR_CODES.MOBILE_APP_DOWNLOAD_CONFIG_INVALID, "mobile app download config invalid", 400);
    }
  }

  private createDefaultConfig(project: MobileAppProjectRef): MobileAppDownloadConfig {
    return {
      enabled: false,
      app: {
        name: project.name,
        title: `${project.name} APP 下载`,
        subtitle: "公司内部移动端",
        description: ""
      },
      platforms: [emptyPlatform("android"), emptyPlatform("ios")],
      releaseNotes: [],
      installSteps: DEFAULT_INSTALL_STEPS,
      faq: DEFAULT_FAQ,
      support: {
        owner: "项目负责人",
        contact: null,
        docsUrl: null
      },
      cache: {
        maxAgeSeconds: DEFAULT_CACHE_SECONDS
      },
      releaseChannel: DEFAULT_RELEASE_CHANNEL
    };
  }

  private normalizeConfigPlatforms(platforms: MobileAppDownloadConfig["platforms"]): MobileAppPlatformConfig[] {
    return [
      this.findPlatform({ platforms }, "android") ?? emptyPlatform("android"),
      this.findPlatform({ platforms }, "ios") ?? emptyPlatform("ios")
    ];
  }

  private async normalizePlatforms(
    project: MobileAppProjectRef,
    config: MobileAppDownloadConfig,
    options: { publicOnly: boolean },
    ctx: RequestContext
  ): Promise<MobileAppDownloadPlatform[]> {
    const items: MobileAppDownloadPlatform[] = [];
    for (const platform of this.normalizeConfigPlatforms(config.platforms ?? [])) {
      const upload = platform.packageUploadId ? await this.resolveActivePackage(platform.packageUploadId, ctx) : null;
      const enabled = platform.enabled !== false && (!options.publicOnly || !!upload);
      items.push({
        platform: platform.platform,
        enabled,
        packageUploadId: upload?.id ?? platform.packageUploadId ?? null,
        packageName: upload?.originalName ?? platform.packageName ?? null,
        versionName: platform.versionName ?? null,
        versionCode: platform.versionCode ?? null,
        downloadUrl: enabled && upload ? `/api/public/mobile-app/projects/${encodeURIComponent(project.projectKey)}/packages/${platform.platform}/download` : null,
        qrCodeUrl: platform.qrCodeUrl ?? null,
        packageSizeBytes: upload?.fileSize ?? platform.packageSizeBytes ?? null,
        minOsVersion: platform.minOsVersion ?? null,
        checksum: {
          sha256: upload?.checksum ?? platform.checksum?.sha256 ?? null,
          md5: platform.checksum?.md5 ?? null
        },
        distributionType: platform.distributionType ?? null,
        forceUpdate: platform.forceUpdate ?? false,
        gray: platform.gray ?? false,
        minSupportedVersion: platform.minSupportedVersion ?? null
      });
    }
    return items;
  }

  private async resolveActivePackage(uploadId: string, ctx: RequestContext): Promise<UploadEntity | null> {
    try {
      const upload = await this.deps.uploadQuery.getById(uploadId, ctx);
      return isActiveMobileAppPackage(upload) ? upload : null;
    } catch {
      return null;
    }
  }

  private resolvePrimaryPlatform(platforms: MobileAppDownloadPlatform[]): MobileAppDownloadPlatform | null {
    return platforms.find((item) => item.enabled && item.downloadUrl) ?? platforms.find((item) => item.enabled) ?? null;
  }

  private upsertPlatform(
    config: MobileAppDownloadConfig,
    platform: MobileAppPlatform,
    value: MobileAppPlatformConfig
  ): MobileAppDownloadConfig {
    const platforms = this.normalizeConfigPlatforms(config.platforms ?? []).map((item) =>
      item.platform === platform ? value : item
    );
    return { ...config, platforms };
  }

  private findPlatform(config: Pick<MobileAppDownloadConfig, "platforms">, platform: MobileAppPlatform) {
    return config.platforms?.find((item) => item.platform === platform) ?? null;
  }
}

function normalizeConfigReleaseNotes(items: MobileAppReleaseNoteConfig[]): MobileAppReleaseNoteConfig[] {
  return items
    .map((item, index) => ({
      id: item.id?.trim() || `mobile-app-release-${index + 1}`,
      version: item.version.trim(),
      title: item.title.trim(),
      publishedAt: item.publishedAt?.trim() || null,
      summary: (item.summary ?? []).map((line) => line.trim()).filter(Boolean),
      importantNotes: (item.importantNotes ?? []).map((line) => line.trim()).filter(Boolean),
      downloadUrl: item.downloadUrl?.trim() || null
    }))
    .filter((item) => item.version && item.title);
}

function normalizeConfiguredReleaseNotes(items: MobileAppReleaseNoteConfig[]): MobileAppDownloadReleaseNote[] {
  return normalizeConfigReleaseNotes(items).map((item, index) => ({
    id: item.id ?? `mobile-app-release-${index + 1}`,
    version: item.version,
    title: item.title,
    publishedAt: item.publishedAt ?? null,
    summary: item.summary?.length ? item.summary : [item.title],
    importantNotes: item.importantNotes ?? [],
    downloadUrl: item.downloadUrl ?? null
  }));
}

function emptyPlatform(platform: MobileAppPlatform): MobileAppPlatformConfig {
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

function toReleaseNote(entity: ReleaseEntity): MobileAppDownloadReleaseNote {
  const lines = (entity.notes ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    id: entity.id,
    version: entity.version,
    title: entity.title,
    publishedAt: entity.publishedAt,
    summary: lines.length ? lines : [entity.title],
    importantNotes: lines.filter((line) => /^(重要|注意|warning|important)[:：]/i.test(line)),
    downloadUrl: entity.downloadUrl
  };
}
