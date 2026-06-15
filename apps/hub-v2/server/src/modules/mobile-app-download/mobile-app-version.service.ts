import { ERROR_CODES } from "../../shared/errors/error-codes";
import type { ErrorCode } from "../../shared/errors/error-codes";
import type { RequestContext } from "../../shared/context/request-context";
import { AppError } from "../../shared/errors/app-error";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import type { ProjectAccessContract } from "../project/project-access.contract";
import type { UploadQueryContract } from "../upload/upload.contract";
import type { UploadEntity } from "../upload/upload.types";
import {
  MOBILE_APP_PACKAGE_BUCKET,
  MOBILE_APP_PACKAGE_CATEGORY
} from "./mobile-app-download.service";
import type {
  MobileAppVersionCommandContract,
  MobileAppVersionQueryContract
} from "./mobile-app-version.contract";
import { MobileAppVersionRepo } from "./mobile-app-version.repo";
import {
  createMobileAppVersionSchema,
  updateMobileAppVersionSchema
} from "./mobile-app-version.schema";
import { MobileAppPortalSettingsService } from "./mobile-app-portal-settings.service";
import type {
  CreateMobileAppVersionInput,
  MobileAppPlatform,
  MobileAppPortalSettings,
  MobileAppReleaseLogAction,
  MobileAppReleaseRecord,
  MobileAppVersionEntity,
  MobileAppVersionRecord,
  MobileAppVersionStats,
  UpdateMobileAppVersionInput
} from "./mobile-app-version.types";

type ProjectMaintainerAccess = {
  requireProjectMaintainer(projectId: string, ctx: RequestContext, action: string): Promise<void>;
};

type MobileAppVersionServiceDeps = {
  repo: MobileAppVersionRepo;
  uploadQuery: UploadQueryContract;
  portalSettings: MobileAppPortalSettingsService;
  projectAccess: ProjectAccessContract & ProjectMaintainerAccess;
};

export class MobileAppVersionService implements MobileAppVersionQueryContract, MobileAppVersionCommandContract {
  constructor(private readonly deps: MobileAppVersionServiceDeps) {}

  async listVersions(projectId: string, ctx: RequestContext): Promise<MobileAppVersionEntity[]> {
    await this.deps.projectAccess.requireProjectAccess(projectId, ctx, "list mobile app versions");
    return Promise.all(this.deps.repo.listByProject(projectId).map((item) => this.hydrate(item, ctx)));
  }

  async getVersion(projectId: string, versionId: string, ctx: RequestContext): Promise<MobileAppVersionEntity> {
    await this.deps.projectAccess.requireProjectAccess(projectId, ctx, "get mobile app version");
    return this.hydrate(this.requireRecord(projectId, versionId), ctx);
  }

  async getLatestPublishedVersion(
    projectId: string,
    platform: MobileAppPlatform,
    ctx: RequestContext
  ): Promise<MobileAppVersionEntity | null> {
    const record = this.deps.repo.findLatestPublished(projectId, platform);
    return record ? this.hydrate(record, ctx) : null;
  }

  async listPublishedVersions(projectId: string, ctx: RequestContext): Promise<MobileAppVersionEntity[]> {
    return Promise.all(this.deps.repo.listPublished(projectId).map((item) => this.hydrate(item, ctx)));
  }

  async createVersion(
    projectId: string,
    input: CreateMobileAppVersionInput,
    ctx: RequestContext
  ): Promise<MobileAppVersionEntity> {
    await this.deps.projectAccess.requireProjectMaintainer(projectId, ctx, "create mobile app version");
    const parsed = createMobileAppVersionSchema.parse(input);
    if (!parsed.packageUploadId) {
      throw new AppError(ERROR_CODES.MOBILE_APP_VERSION_PACKAGE_REQUIRED, "mobile app package is required", 400);
    }
    const upload = await this.requireValidPackage(parsed.packageUploadId, parsed.platform, ctx);
    this.assertNoDuplicate(projectId, parsed.platform, parsed.version, parsed.buildNumber);

    const now = nowIso();
    const record: MobileAppVersionRecord = {
      id: genId("mav"),
      projectId,
      platform: parsed.platform,
      version: parsed.version,
      buildNumber: parsed.buildNumber,
      status: parsed.status,
      packageUploadId: upload.id,
      changelog: parsed.changelog,
      releaseChannel: parsed.releaseChannel,
      minOsVersion: parsed.minOsVersion,
      publishedAt: parsed.status === "published" ? now : null,
      downloadCount: 0,
      createdBy: actorId(ctx),
      updatedBy: actorId(ctx),
      createdAt: now,
      updatedAt: now
    };
    this.deps.repo.create(record);
    await this.writeLog(projectId, record.id, "create", record, ctx);
    if (record.status === "published") {
      await this.writeLog(projectId, record.id, "publish", record, ctx);
    }
    return this.toEntity(record, upload);
  }

  async updateVersion(
    projectId: string,
    versionId: string,
    input: UpdateMobileAppVersionInput,
    ctx: RequestContext
  ): Promise<MobileAppVersionEntity> {
    await this.deps.projectAccess.requireProjectMaintainer(projectId, ctx, "update mobile app version");
    const current = this.requireRecord(projectId, versionId);
    const parsed = updateMobileAppVersionSchema.parse(input);
    const nextPlatform = parsed.platform ?? current.platform;
    const upload =
      parsed.packageUploadId !== undefined
        ? await this.requireValidPackage(parsed.packageUploadId, nextPlatform, ctx)
        : await this.requireValidPackage(current.packageUploadId, nextPlatform, ctx);
    const nextStatus = parsed.status ?? current.status;
    const wasPublished = current.status === "published";
    const now = nowIso();
    const record: MobileAppVersionRecord = {
      ...current,
      platform: nextPlatform,
      version: parsed.version ?? current.version,
      buildNumber: parsed.buildNumber ?? current.buildNumber,
      status: nextStatus,
      packageUploadId: upload.id,
      changelog: parsed.changelog ?? current.changelog,
      releaseChannel: parsed.releaseChannel ?? current.releaseChannel,
      minOsVersion: parsed.minOsVersion ?? current.minOsVersion,
      publishedAt: nextStatus === "published" ? current.publishedAt ?? now : current.publishedAt,
      updatedBy: actorId(ctx),
      updatedAt: now
    };

    this.assertNoDuplicate(projectId, record.platform, record.version, record.buildNumber, record.id);
    this.updateRecord(record);
    await this.writeLog(projectId, record.id, "update", record, ctx);
    if (!wasPublished && record.status === "published") {
      await this.writeLog(projectId, record.id, "publish", record, ctx);
    }
    return this.toEntity(record, upload);
  }

  async deleteVersion(projectId: string, versionId: string, ctx: RequestContext): Promise<{ success: true }> {
    await this.deps.projectAccess.requireProjectMaintainer(projectId, ctx, "delete mobile app version");
    const current = this.requireRecord(projectId, versionId);
    await this.writeLog(projectId, current.id, "delete", current, ctx);
    if (!this.deps.repo.delete(projectId, versionId)) {
      throw new AppError(ERROR_CODES.MOBILE_APP_VERSION_NOT_FOUND, "mobile app version not found", 404);
    }
    return { success: true };
  }

  async publishVersion(projectId: string, versionId: string, ctx: RequestContext): Promise<MobileAppVersionEntity> {
    await this.deps.projectAccess.requireProjectMaintainer(projectId, ctx, "publish mobile app version");
    const current = this.requireRecord(projectId, versionId);
    const upload = await this.requireValidPackage(current.packageUploadId, current.platform, ctx);
    const now = nowIso();
    const record: MobileAppVersionRecord = {
      ...current,
      status: "published",
      publishedAt: current.publishedAt ?? now,
      updatedBy: actorId(ctx),
      updatedAt: now
    };
    this.updateRecord(record, ERROR_CODES.MOBILE_APP_VERSION_PUBLISH_FAILED);
    await this.writeLog(projectId, record.id, "publish", record, ctx);
    return this.toEntity(record, upload);
  }

  async archiveVersion(projectId: string, versionId: string, ctx: RequestContext): Promise<MobileAppVersionEntity> {
    await this.deps.projectAccess.requireProjectMaintainer(projectId, ctx, "archive mobile app version");
    const current = this.requireRecord(projectId, versionId);
    const upload = await this.requireValidPackage(current.packageUploadId, current.platform, ctx);
    const record: MobileAppVersionRecord = {
      ...current,
      status: "archived",
      updatedBy: actorId(ctx),
      updatedAt: nowIso()
    };
    this.updateRecord(record);
    await this.writeLog(projectId, record.id, "archive", record, ctx);
    return this.toEntity(record, upload);
  }

  async recordDownload(projectId: string, versionId: string, ctx: RequestContext): Promise<void> {
    const current = this.requireRecord(projectId, versionId);
    if (current.status !== "published") {
      return;
    }
    this.deps.repo.incrementDownloadCount(projectId, versionId, nowIso());
    await this.writeLog(projectId, versionId, "download", current, ctx);
  }

  async listReleaseRecords(projectId: string, ctx: RequestContext): Promise<MobileAppReleaseRecord[]> {
    await this.deps.projectAccess.requireProjectAccess(projectId, ctx, "list mobile app release logs");
    const records: MobileAppReleaseRecord[] = [];
    for (const log of this.deps.repo.listLogs(projectId, ["publish"], 100)) {
      const snapshot = log.snapshot;
      const versionId = typeof snapshot.id === "string" ? snapshot.id : log.versionId;
      if (!versionId) {
        continue;
      }
      const platform = snapshot.platform === "android" || snapshot.platform === "ios" ? snapshot.platform : null;
      const status =
        snapshot.status === "published" ||
        snapshot.status === "testing" ||
        snapshot.status === "draft" ||
        snapshot.status === "archived"
          ? snapshot.status
          : "published";
      const publishedAt = typeof snapshot.publishedAt === "string" ? snapshot.publishedAt : log.createdAt;
      records.push({
        id: log.id,
        versionId,
        version: typeof snapshot.version === "string" ? snapshot.version : "",
        platform: platform ?? "android",
        status,
        publishedAt,
        changelog: Array.isArray(snapshot.changelog)
          ? snapshot.changelog.filter((item): item is string => typeof item === "string")
          : [],
        downloadCount: typeof snapshot.downloadCount === "number" ? snapshot.downloadCount : 0,
        releaseChannel: typeof snapshot.releaseChannel === "string" ? snapshot.releaseChannel : ""
      });
    }
    return records;
  }

  async getStats(projectId: string, ctx: RequestContext): Promise<MobileAppVersionStats> {
    await this.deps.projectAccess.requireProjectAccess(projectId, ctx, "get mobile app stats");
    const versions = this.deps.repo.listByProject(projectId);
    const published = versions.filter((item) => item.status === "published");
    const current = published
      .slice()
      .sort((a, b) => Date.parse(b.publishedAt ?? b.updatedAt) - Date.parse(a.publishedAt ?? a.updatedAt))[0];
    return {
      totalVersions: versions.length,
      publishedCount: published.length,
      testingCount: versions.filter((item) => item.status === "testing").length,
      totalDownloads: versions.reduce((sum, item) => sum + item.downloadCount, 0),
      currentVersion: current?.version ?? null
    };
  }

  async getPortalSettings(projectId: string, projectName: string, ctx: RequestContext): Promise<MobileAppPortalSettings> {
    await this.deps.projectAccess.requireProjectAccess(projectId, ctx, "get mobile app portal settings");
    return this.deps.portalSettings.get(projectId, projectName, ctx);
  }

  async updatePortalSettings(
    projectId: string,
    projectName: string,
    input: unknown,
    ctx: RequestContext
  ): Promise<MobileAppPortalSettings> {
    await this.deps.projectAccess.requireProjectMaintainer(projectId, ctx, "update mobile app portal settings");
    return this.deps.portalSettings.update(projectId, projectName, input, ctx);
  }

  private requireRecord(projectId: string, versionId: string): MobileAppVersionRecord {
    const record = this.deps.repo.findById(projectId, versionId);
    if (!record) {
      throw new AppError(ERROR_CODES.MOBILE_APP_VERSION_NOT_FOUND, "mobile app version not found", 404);
    }
    return record;
  }

  private assertNoDuplicate(
    projectId: string,
    platform: MobileAppPlatform,
    version: string,
    buildNumber: string,
    excludeId?: string
  ): void {
    if (this.deps.repo.findDuplicate(projectId, platform, version, buildNumber, excludeId)) {
      throw new AppError(ERROR_CODES.MOBILE_APP_VERSION_CONFLICT, "mobile app version already exists", 409);
    }
  }

  private updateRecord(record: MobileAppVersionRecord, code: ErrorCode = ERROR_CODES.MOBILE_APP_VERSION_NOT_FOUND): void {
    if (!this.deps.repo.update(record)) {
      throw new AppError(code, "failed to update mobile app version", code === ERROR_CODES.MOBILE_APP_VERSION_NOT_FOUND ? 404 : 500);
    }
  }

  private async hydrate(record: MobileAppVersionRecord, ctx: RequestContext): Promise<MobileAppVersionEntity> {
    const upload = await this.requireValidPackage(record.packageUploadId, record.platform, ctx);
    return this.toEntity(record, upload);
  }

  private toEntity(record: MobileAppVersionRecord, upload: UploadEntity): MobileAppVersionEntity {
    return {
      ...record,
      packageName: upload.originalName || upload.fileName,
      sizeBytes: upload.fileSize,
      sha256: upload.checksum ?? ""
    };
  }

  private async requireValidPackage(
    uploadId: string,
    platform: MobileAppPlatform,
    ctx: RequestContext
  ): Promise<UploadEntity> {
    let upload: UploadEntity;
    try {
      upload = await this.deps.uploadQuery.getById(uploadId, ctx);
    } catch {
      throw new AppError(ERROR_CODES.MOBILE_APP_VERSION_PACKAGE_INVALID, "mobile app package is invalid", 400);
    }
    if (
      upload.status !== "active" ||
      upload.bucket !== MOBILE_APP_PACKAGE_BUCKET ||
      upload.category !== MOBILE_APP_PACKAGE_CATEGORY ||
      !isExpectedPackageExtension(upload, platform)
    ) {
      throw new AppError(ERROR_CODES.MOBILE_APP_VERSION_PACKAGE_INVALID, "mobile app package is invalid", 400);
    }
    return upload;
  }

  private async writeLog(
    projectId: string,
    versionId: string | null,
    action: MobileAppReleaseLogAction,
    snapshot: MobileAppVersionRecord,
    ctx: RequestContext
  ): Promise<void> {
    this.deps.repo.createLog({
      id: genId("malog"),
      projectId,
      versionId,
      action,
      actorId: actorId(ctx),
      actorName: ctx.nickname ?? null,
      snapshot: { ...snapshot },
      createdAt: nowIso()
    });
  }
}

function actorId(ctx: RequestContext): string | null {
  return ctx.userId ?? ctx.accountId ?? null;
}

function isExpectedPackageExtension(upload: UploadEntity, platform: MobileAppPlatform): boolean {
  const ext = (upload.fileExt || "").toLowerCase();
  const originalName = (upload.originalName || upload.fileName || "").toLowerCase();
  return platform === "ios" ? ext === ".ipa" || originalName.endsWith(".ipa") : ext === ".apk" || originalName.endsWith(".apk");
}
