import type { RequestContext } from "../../shared/context/request-context";
import type {
  CreateMobileAppVersionInput,
  MobileAppPlatform,
  MobileAppPortalSettings,
  MobileAppReleaseRecord,
  MobileAppVersionEntity,
  MobileAppVersionStats,
  UpdateMobileAppVersionInput
} from "./mobile-app-version.types";

export interface MobileAppVersionQueryContract {
  listVersions(projectId: string, ctx: RequestContext): Promise<MobileAppVersionEntity[]>;
  getVersion(projectId: string, versionId: string, ctx: RequestContext): Promise<MobileAppVersionEntity>;
  getLatestPublishedVersion(
    projectId: string,
    platform: MobileAppPlatform,
    ctx: RequestContext
  ): Promise<MobileAppVersionEntity | null>;
  listPublishedVersions(projectId: string, ctx: RequestContext): Promise<MobileAppVersionEntity[]>;
  listReleaseRecords(projectId: string, ctx: RequestContext): Promise<MobileAppReleaseRecord[]>;
  getStats(projectId: string, ctx: RequestContext): Promise<MobileAppVersionStats>;
  getPortalSettings(projectId: string, projectName: string, ctx: RequestContext): Promise<MobileAppPortalSettings>;
}

export interface MobileAppVersionCommandContract {
  createVersion(
    projectId: string,
    input: CreateMobileAppVersionInput,
    ctx: RequestContext
  ): Promise<MobileAppVersionEntity>;
  updateVersion(
    projectId: string,
    versionId: string,
    input: UpdateMobileAppVersionInput,
    ctx: RequestContext
  ): Promise<MobileAppVersionEntity>;
  deleteVersion(projectId: string, versionId: string, ctx: RequestContext): Promise<{ success: true }>;
  publishVersion(projectId: string, versionId: string, ctx: RequestContext): Promise<MobileAppVersionEntity>;
  archiveVersion(projectId: string, versionId: string, ctx: RequestContext): Promise<MobileAppVersionEntity>;
  recordDownload(projectId: string, versionId: string, ctx: RequestContext): Promise<void>;
  updatePortalSettings(
    projectId: string,
    projectName: string,
    input: unknown,
    ctx: RequestContext
  ): Promise<MobileAppPortalSettings>;
}
