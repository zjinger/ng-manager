import type Database from "better-sqlite3";
import type {
  MobileAppReleaseLogAction,
  MobileAppReleaseLogEntity,
  MobileAppVersionRecord,
  MobileAppVersionStatus
} from "./mobile-app-version.types";

type MobileAppVersionRow = {
  id: string;
  project_id: string;
  platform: "ios" | "android";
  version: string;
  build_number: string;
  status: MobileAppVersionStatus;
  package_upload_id: string;
  changelog_json: string;
  release_channel: string;
  min_os_version: string;
  published_at: string | null;
  download_count: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

type MobileAppReleaseLogRow = {
  id: string;
  project_id: string;
  version_id: string | null;
  action: MobileAppReleaseLogAction;
  actor_id: string | null;
  actor_name: string | null;
  snapshot_json: string;
  created_at: string;
};

export class MobileAppVersionRepo {
  constructor(private readonly db: Database.Database) {}

  listByProject(projectId: string): MobileAppVersionRecord[] {
    const rows = this.db
      .prepare(
        `
        SELECT * FROM mobile_app_versions
        WHERE project_id = ?
        ORDER BY datetime(updated_at) DESC, datetime(created_at) DESC
      `
      )
      .all(projectId) as MobileAppVersionRow[];
    return rows.map((row) => this.mapVersion(row));
  }

  findById(projectId: string, versionId: string): MobileAppVersionRecord | null {
    const row = this.db
      .prepare("SELECT * FROM mobile_app_versions WHERE project_id = ? AND id = ?")
      .get(projectId, versionId) as MobileAppVersionRow | undefined;
    return row ? this.mapVersion(row) : null;
  }

  findDuplicate(projectId: string, platform: string, version: string, buildNumber: string, excludeId?: string): MobileAppVersionRecord | null {
    const row = this.db
      .prepare(
        `
        SELECT * FROM mobile_app_versions
        WHERE project_id = ? AND platform = ? AND version = ? AND build_number = ?
          AND (? IS NULL OR id <> ?)
        LIMIT 1
      `
      )
      .get(projectId, platform, version, buildNumber, excludeId ?? null, excludeId ?? null) as MobileAppVersionRow | undefined;
    return row ? this.mapVersion(row) : null;
  }

  findLatestPublished(projectId: string, platform: string): MobileAppVersionRecord | null {
    const row = this.db
      .prepare(
        `
        SELECT * FROM mobile_app_versions
        WHERE project_id = ? AND platform = ? AND status = 'published'
        ORDER BY datetime(published_at) DESC, datetime(updated_at) DESC
        LIMIT 1
      `
      )
      .get(projectId, platform) as MobileAppVersionRow | undefined;
    return row ? this.mapVersion(row) : null;
  }

  listPublished(projectId: string): MobileAppVersionRecord[] {
    const rows = this.db
      .prepare(
        `
        SELECT * FROM mobile_app_versions
        WHERE project_id = ? AND status = 'published'
        ORDER BY datetime(published_at) DESC, datetime(updated_at) DESC
      `
      )
      .all(projectId) as MobileAppVersionRow[];
    return rows.map((row) => this.mapVersion(row));
  }

  create(entity: MobileAppVersionRecord): void {
    this.db
      .prepare(
        `
        INSERT INTO mobile_app_versions (
          id, project_id, platform, version, build_number, status, package_upload_id,
          changelog_json, release_channel, min_os_version, published_at, download_count,
          created_by, updated_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        entity.id,
        entity.projectId,
        entity.platform,
        entity.version,
        entity.buildNumber,
        entity.status,
        entity.packageUploadId,
        JSON.stringify(entity.changelog),
        entity.releaseChannel,
        entity.minOsVersion,
        entity.publishedAt,
        entity.downloadCount,
        entity.createdBy,
        entity.updatedBy,
        entity.createdAt,
        entity.updatedAt
      );
  }

  update(entity: MobileAppVersionRecord): boolean {
    const result = this.db
      .prepare(
        `
        UPDATE mobile_app_versions
        SET platform = ?, version = ?, build_number = ?, status = ?, package_upload_id = ?,
            changelog_json = ?, release_channel = ?, min_os_version = ?, published_at = ?,
            download_count = ?, updated_by = ?, updated_at = ?
        WHERE id = ? AND project_id = ?
      `
      )
      .run(
        entity.platform,
        entity.version,
        entity.buildNumber,
        entity.status,
        entity.packageUploadId,
        JSON.stringify(entity.changelog),
        entity.releaseChannel,
        entity.minOsVersion,
        entity.publishedAt,
        entity.downloadCount,
        entity.updatedBy,
        entity.updatedAt,
        entity.id,
        entity.projectId
      );
    return result.changes > 0;
  }

  incrementDownloadCount(projectId: string, versionId: string, updatedAt: string): boolean {
    const result = this.db
      .prepare(
        `
        UPDATE mobile_app_versions
        SET download_count = download_count + 1, updated_at = ?
        WHERE project_id = ? AND id = ?
      `
      )
      .run(updatedAt, projectId, versionId);
    return result.changes > 0;
  }

  delete(projectId: string, versionId: string): boolean {
    const result = this.db
      .prepare("DELETE FROM mobile_app_versions WHERE project_id = ? AND id = ?")
      .run(projectId, versionId);
    return result.changes > 0;
  }

  createLog(entity: MobileAppReleaseLogEntity): void {
    this.db
      .prepare(
        `
        INSERT INTO mobile_app_release_logs (
          id, project_id, version_id, action, actor_id, actor_name, snapshot_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        entity.id,
        entity.projectId,
        entity.versionId,
        entity.action,
        entity.actorId,
        entity.actorName,
        JSON.stringify(entity.snapshot),
        entity.createdAt
      );
  }

  listLogs(projectId: string, actions?: MobileAppReleaseLogAction[], limit = 100): MobileAppReleaseLogEntity[] {
    const actionFilter = actions?.length ? `AND action IN (${actions.map(() => "?").join(", ")})` : "";
    const rows = this.db
      .prepare(
        `
        SELECT * FROM mobile_app_release_logs
        WHERE project_id = ? ${actionFilter}
        ORDER BY datetime(created_at) DESC
        LIMIT ?
      `
      )
      .all(projectId, ...(actions ?? []), limit) as MobileAppReleaseLogRow[];
    return rows.map((row) => this.mapLog(row));
  }

  private mapVersion(row: MobileAppVersionRow): MobileAppVersionRecord {
    return {
      id: row.id,
      projectId: row.project_id,
      platform: row.platform,
      version: row.version,
      buildNumber: row.build_number,
      status: row.status,
      packageUploadId: row.package_upload_id,
      changelog: parseStringArray(row.changelog_json),
      releaseChannel: row.release_channel,
      minOsVersion: row.min_os_version,
      publishedAt: row.published_at,
      downloadCount: row.download_count,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapLog(row: MobileAppReleaseLogRow): MobileAppReleaseLogEntity {
    return {
      id: row.id,
      projectId: row.project_id,
      versionId: row.version_id,
      action: row.action,
      actorId: row.actor_id,
      actorName: row.actor_name,
      snapshot: parseObject(row.snapshot_json),
      createdAt: row.created_at
    };
  }
}

function parseStringArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function parseObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
