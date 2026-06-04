import type Database from "better-sqlite3";
import { normalizePage } from "../../shared/http/pagination";
import type {
  ListSkillsQuery,
  SkillDetailEntity,
  SkillEntity,
  SkillListResult,
  SkillPackageManifest,
  SkillStatus,
  SkillVersionEntity,
  SkillVersionStatus
} from "./skill-hub.types";

type SkillRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  tags_json: string;
  owner_user_id: string | null;
  owner_name: string | null;
  status: SkillStatus;
  latest_version_id: string | null;
  latest_version: string | null;
  latest_published_at: string | null;
  created_at: string;
  updated_at: string;
};

type SkillVersionRow = {
  id: string;
  skill_id: string;
  version: string;
  status: SkillVersionStatus;
  manifest_json: string;
  readme_md: string;
  package_upload_id: string;
  checksum: string | null;
  file_count: number;
  package_size: number;
  submitted_by_user_id: string | null;
  reviewed_by_user_id: string | null;
  review_comment: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

const SKILL_COLUMNS = `
  s.id, s.slug, s.name, s.description, s.category, s.tags_json, s.owner_user_id,
  COALESCE(NULLIF(owner.display_name, ''), NULLIF(owner.username, '')) AS owner_name,
  s.status, s.latest_version_id, latest.version AS latest_version, latest.published_at AS latest_published_at,
  s.created_at, s.updated_at
`;

export class SkillHubRepo {
  constructor(private readonly db: Database.Database) {}

  createSkill(entity: Omit<SkillEntity, "ownerName" | "latestVersion" | "latestPublishedAt">): void {
    this.db
      .prepare(
        `
        INSERT INTO skills (
          id, slug, name, description, category, tags_json, owner_user_id, status,
          latest_version_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        entity.id,
        entity.slug,
        entity.name,
        entity.description,
        entity.category,
        JSON.stringify(entity.tags),
        entity.ownerUserId,
        entity.status,
        entity.latestVersionId,
        entity.createdAt,
        entity.updatedAt
      );
  }

  createVersion(entity: SkillVersionEntity): void {
    this.db
      .prepare(
        `
        INSERT INTO skill_versions (
          id, skill_id, version, status, manifest_json, readme_md, package_upload_id,
          checksum, file_count, package_size, submitted_by_user_id, reviewed_by_user_id,
          review_comment, published_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        entity.id,
        entity.skillId,
        entity.version,
        entity.status,
        JSON.stringify(entity.manifest),
        entity.readmeMd,
        entity.packageUploadId,
        entity.checksum,
        entity.fileCount,
        entity.packageSize,
        entity.submittedByUserId,
        entity.reviewedByUserId,
        entity.reviewComment,
        entity.publishedAt,
        entity.createdAt,
        entity.updatedAt
      );
  }

  findById(id: string): SkillEntity | null {
    const row = this.db
      .prepare(
        `
        SELECT ${SKILL_COLUMNS}
        FROM skills s
        LEFT JOIN users owner ON owner.id = s.owner_user_id
        LEFT JOIN skill_versions latest ON latest.id = s.latest_version_id
        WHERE s.id = ?
      `
      )
      .get(id) as SkillRow | undefined;
    return row ? this.mapSkillRow(row) : null;
  }

  findDetailById(id: string): SkillDetailEntity | null {
    const skill = this.findById(id);
    if (!skill) {
      return null;
    }
    return {
      ...skill,
      versions: this.listVersions(id)
    };
  }

  findBySlug(slug: string): SkillEntity | null {
    const row = this.db
      .prepare(
        `
        SELECT ${SKILL_COLUMNS}
        FROM skills s
        LEFT JOIN users owner ON owner.id = s.owner_user_id
        LEFT JOIN skill_versions latest ON latest.id = s.latest_version_id
        WHERE s.slug = ?
      `
      )
      .get(slug) as SkillRow | undefined;
    return row ? this.mapSkillRow(row) : null;
  }

  findVersion(skillId: string, versionId: string): SkillVersionEntity | null {
    const row = this.db
      .prepare("SELECT * FROM skill_versions WHERE skill_id = ? AND id = ?")
      .get(skillId, versionId) as SkillVersionRow | undefined;
    return row ? this.mapVersionRow(row) : null;
  }

  listVersions(skillId: string): SkillVersionEntity[] {
    const rows = this.db
      .prepare("SELECT * FROM skill_versions WHERE skill_id = ? ORDER BY created_at DESC")
      .all(skillId) as SkillVersionRow[];
    return rows.map((row) => this.mapVersionRow(row));
  }

  listPublishedVersions(skillId: string): SkillVersionEntity[] {
    const rows = this.db
      .prepare("SELECT * FROM skill_versions WHERE skill_id = ? AND status = 'published' ORDER BY published_at DESC, created_at DESC")
      .all(skillId) as SkillVersionRow[];
    return rows.map((row) => this.mapVersionRow(row));
  }

  updateVersion(id: string, changes: Partial<SkillVersionEntity>): boolean {
    const current = this.findVersionById(id);
    if (!current) {
      return false;
    }
    const next: SkillVersionEntity = { ...current, ...changes };
    const result = this.db
      .prepare(
        `
        UPDATE skill_versions
        SET status = ?, manifest_json = ?, readme_md = ?, package_upload_id = ?,
            checksum = ?, file_count = ?, package_size = ?, submitted_by_user_id = ?,
            reviewed_by_user_id = ?, review_comment = ?, published_at = ?, created_at = ?, updated_at = ?
        WHERE id = ?
      `
      )
      .run(
        next.status,
        JSON.stringify(next.manifest),
        next.readmeMd,
        next.packageUploadId,
        next.checksum,
        next.fileCount,
        next.packageSize,
        next.submittedByUserId,
        next.reviewedByUserId,
        next.reviewComment,
        next.publishedAt,
        next.createdAt,
        next.updatedAt,
        id
      );
    return result.changes > 0;
  }

  updateSkill(id: string, changes: Partial<SkillEntity>): boolean {
    const current = this.findById(id);
    if (!current) {
      return false;
    }
    const next: SkillEntity = { ...current, ...changes };
    const result = this.db
      .prepare(
        `
        UPDATE skills
        SET slug = ?, name = ?, description = ?, category = ?, tags_json = ?, owner_user_id = ?,
            status = ?, latest_version_id = ?, created_at = ?, updated_at = ?
        WHERE id = ?
      `
      )
      .run(
        next.slug,
        next.name,
        next.description,
        next.category,
        JSON.stringify(next.tags),
        next.ownerUserId,
        next.status,
        next.latestVersionId,
        next.createdAt,
        next.updatedAt,
        id
      );
    return result.changes > 0;
  }

  list(query: ListSkillsQuery, visibility: { userId: string | null; canReview: boolean }): SkillListResult {
    const { page, pageSize, offset } = normalizePage(query.page, query.pageSize);
    const conditions: string[] = [];
    const params: unknown[] = [];

    const status = query.status === "active" || !query.status ? "published" : query.status;
    if (status) {
      conditions.push("s.status = ?");
      params.push(status);
    }

    if (!visibility.canReview) {
      if (status === "published") {
        conditions.push("s.status = 'published'");
      } else {
        conditions.push("s.owner_user_id = ?");
        params.push(visibility.userId || "");
      }
    }

    if (query.keyword?.trim()) {
      const keyword = `%${query.keyword.trim()}%`;
      conditions.push("(s.name LIKE ? OR s.description LIKE ? OR s.slug LIKE ?)");
      params.push(keyword, keyword, keyword);
    }

    if (query.category?.trim()) {
      conditions.push("s.category = ?");
      params.push(query.category.trim());
    }

    if (query.tag?.trim()) {
      conditions.push("s.tags_json LIKE ?");
      params.push(`%"${query.tag.trim()}"%`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const totalRow = this.db
      .prepare(`SELECT COUNT(1) as total FROM skills s ${whereClause}`)
      .get(...params) as { total: number };

    const rows = this.db
      .prepare(
        `
        SELECT ${SKILL_COLUMNS}
        FROM skills s
        LEFT JOIN users owner ON owner.id = s.owner_user_id
        LEFT JOIN skill_versions latest ON latest.id = s.latest_version_id
        ${whereClause}
        ORDER BY COALESCE(latest.published_at, s.updated_at) DESC, s.created_at DESC
        LIMIT ? OFFSET ?
      `
      )
      .all(...params, pageSize, offset) as SkillRow[];

    return {
      items: rows.map((row) => this.mapSkillRow(row)),
      page,
      pageSize,
      total: totalRow.total
    };
  }

  runInTransaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  private findVersionById(id: string): SkillVersionEntity | null {
    const row = this.db.prepare("SELECT * FROM skill_versions WHERE id = ?").get(id) as SkillVersionRow | undefined;
    return row ? this.mapVersionRow(row) : null;
  }

  private mapSkillRow(row: SkillRow): SkillEntity {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      category: row.category,
      tags: this.parseStringArray(row.tags_json),
      ownerUserId: row.owner_user_id,
      ownerName: row.owner_name,
      status: row.status,
      latestVersionId: row.latest_version_id,
      latestVersion: row.latest_version,
      latestPublishedAt: row.latest_published_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapVersionRow(row: SkillVersionRow): SkillVersionEntity {
    return {
      id: row.id,
      skillId: row.skill_id,
      version: row.version,
      status: row.status,
      manifest: this.parseManifest(row.manifest_json),
      readmeMd: row.readme_md,
      packageUploadId: row.package_upload_id,
      checksum: row.checksum,
      fileCount: row.file_count,
      packageSize: row.package_size,
      submittedByUserId: row.submitted_by_user_id,
      reviewedByUserId: row.reviewed_by_user_id,
      reviewComment: row.review_comment,
      publishedAt: row.published_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private parseStringArray(raw: string): string[] {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
    } catch {
      return [];
    }
  }

  private parseManifest(raw: string): SkillPackageManifest {
    try {
      return JSON.parse(raw) as SkillPackageManifest;
    } catch {
      return {
        name: "",
        description: "",
        rootPrefix: "",
        files: [],
        validation: { skillMdPath: "", fileCount: 0, packageSize: 0 }
      };
    }
  }
}
