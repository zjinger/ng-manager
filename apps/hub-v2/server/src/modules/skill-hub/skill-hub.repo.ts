import type Database from "better-sqlite3";
import { normalizePage } from "../../shared/http/pagination";
import type {
  ListSkillsQuery,
  SkillDiscoveryMeta,
  SkillCommentEntity,
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
  description_md: string;
  category: string;
  tags_json: string;
  owner_user_id: string | null;
  owner_name: string | null;
  owner_avatar_url: string | null;
  status: SkillStatus;
  latest_version_id: string | null;
  latest_version: string | null;
  latest_published_at: string | null;
  favorite_count: number;
  review_count: number;
  rating_average: number | null;
  pending_review_count: number;
  is_favorited: number;
  my_rating: number | null;
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

type SkillCommentRow = {
  id: string;
  skill_id: string;
  author_id: string | null;
  author_name: string;
  content: string;
  created_at: string;
  updated_at: string;
};

const SKILL_COLUMNS = (ownerAvatarSelect: string) => `
  s.id, s.slug, s.name, s.description, s.description_md, s.category, s.tags_json, s.owner_user_id,
  COALESCE(NULLIF(owner.display_name, ''), NULLIF(owner.username, '')) AS owner_name,
  ${ownerAvatarSelect} AS owner_avatar_url,
  s.status, s.latest_version_id, latest.version AS latest_version, latest.published_at AS latest_published_at,
  (SELECT COUNT(1) FROM skill_favorites sf WHERE sf.skill_id = s.id) AS favorite_count,
  (SELECT COUNT(1) FROM skill_reviews sr WHERE sr.skill_id = s.id) AS review_count,
  (SELECT ROUND(AVG(sr.rating), 1) FROM skill_reviews sr WHERE sr.skill_id = s.id) AS rating_average,
  (SELECT COUNT(1) FROM skill_versions sv_pending WHERE sv_pending.skill_id = s.id AND sv_pending.status = 'submitted') AS pending_review_count,
  EXISTS(SELECT 1 FROM skill_favorites sf_user WHERE sf_user.skill_id = s.id AND sf_user.user_id = ?) AS is_favorited,
  (SELECT sr_user.rating FROM skill_reviews sr_user WHERE sr_user.skill_id = s.id AND sr_user.user_id = ?) AS my_rating,
  s.created_at, s.updated_at
`;

type CreateSkillRowInput = Omit<
  SkillEntity,
  | "ownerName"
  | "ownerAvatarUrl"
  | "latestVersion"
  | "latestPublishedAt"
  | "favoriteCount"
  | "reviewCount"
  | "ratingAverage"
  | "pendingReviewCount"
  | "isFavorited"
  | "myRating"
>;

type SkillVisibility = { userId: string | null; canReview: boolean };

export class SkillHubRepo {
  private readonly ownerAvatarSelect: string;
  private readonly ownerAccountJoin: string;

  constructor(private readonly db: Database.Database) {
    const hasAdminAccountAvatar = this.hasTableColumn("admin_accounts", "avatar_upload_id");
    const hasUserAvatar = this.hasTableColumn("users", "avatar_upload_id");
    const avatarExpressions = [
      hasAdminAccountAvatar
        ? "CASE WHEN owner_account.avatar_upload_id IS NOT NULL AND owner_account.avatar_upload_id != '' THEN '/api/admin/uploads/' || owner_account.avatar_upload_id || '/raw' ELSE NULL END"
        : null,
      hasUserAvatar
        ? "CASE WHEN owner.avatar_upload_id IS NOT NULL AND owner.avatar_upload_id != '' THEN '/api/admin/uploads/' || owner.avatar_upload_id || '/raw' ELSE NULL END"
        : null
    ].filter((item): item is string => !!item);
    this.ownerAccountJoin = hasAdminAccountAvatar ? "LEFT JOIN admin_accounts owner_account ON owner_account.user_id = owner.id" : "";
    this.ownerAvatarSelect = avatarExpressions.length > 1 ? `COALESCE(${avatarExpressions.join(", ")})` : avatarExpressions[0] ?? "NULL";
  }

  createSkill(entity: CreateSkillRowInput): void {
    this.db
      .prepare(
        `
        INSERT INTO skills (
          id, slug, name, description, description_md, category, tags_json, owner_user_id, status,
          latest_version_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        entity.id,
        entity.slug,
        entity.name,
        entity.description,
        entity.descriptionMd,
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

  findById(id: string, userId?: string | null): SkillEntity | null {
    const actor = userId || "";
    const row = this.db
      .prepare(
        `
        SELECT ${this.skillColumns()}
        FROM skills s
        LEFT JOIN users owner ON owner.id = s.owner_user_id
        ${this.ownerAccountJoin}
        LEFT JOIN skill_versions latest ON latest.id = s.latest_version_id
        WHERE s.id = ?
      `
      )
      .get(actor, actor, id) as SkillRow | undefined;
    return row ? this.mapSkillRow(row) : null;
  }

  findDetailById(id: string, userId?: string | null): SkillDetailEntity | null {
    const skill = this.findById(id, userId);
    if (!skill) {
      return null;
    }
    return {
      ...skill,
      versions: this.listVersions(id)
    };
  }

  findBySlug(slug: string, userId?: string | null): SkillEntity | null {
    const actor = userId || "";
    const row = this.db
      .prepare(
        `
        SELECT ${this.skillColumns()}
        FROM skills s
        LEFT JOIN users owner ON owner.id = s.owner_user_id
        ${this.ownerAccountJoin}
        LEFT JOIN skill_versions latest ON latest.id = s.latest_version_id
        WHERE s.slug = ?
      `
      )
      .get(actor, actor, slug) as SkillRow | undefined;
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
        SET slug = ?, name = ?, description = ?, description_md = ?, category = ?, tags_json = ?, owner_user_id = ?,
            status = ?, latest_version_id = ?, created_at = ?, updated_at = ?
        WHERE id = ?
      `
      )
      .run(
        next.slug,
        next.name,
        next.description,
        next.descriptionMd,
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

  deleteSkill(id: string): boolean {
    const result = this.db.prepare("DELETE FROM skills WHERE id = ?").run(id);
    return result.changes > 0;
  }

  list(query: ListSkillsQuery, visibility: SkillVisibility): SkillListResult {
    const { page, pageSize, offset } = normalizePage(query.page, query.pageSize);
    const { whereClause, params } = this.buildListWhere(query, visibility);
    const orderBy = this.buildListOrderBy(query.sort);

    const totalRow = this.db
      .prepare(`SELECT COUNT(1) as total FROM skills s ${whereClause}`)
      .get(...params) as { total: number };

    const rows = this.db
      .prepare(
        `
        SELECT ${this.skillColumns()}
        FROM skills s
        LEFT JOIN users owner ON owner.id = s.owner_user_id
        ${this.ownerAccountJoin}
        LEFT JOIN skill_versions latest ON latest.id = s.latest_version_id
        ${whereClause}
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
      `
      )
      .all(visibility.userId || "", visibility.userId || "", ...params, pageSize, offset) as SkillRow[];

    return {
      items: rows.map((row) => this.mapSkillRow(row)),
      page,
      pageSize,
      total: totalRow.total
    };
  }

  getMeta(query: ListSkillsQuery, visibility: SkillVisibility): SkillDiscoveryMeta {
    const { whereClause, params } = this.buildListWhere({ ...query, category: undefined, tag: undefined }, visibility);
    const categoryRows = this.db
      .prepare(
        `
        SELECT s.category AS name, COUNT(1) AS count
        FROM skills s
        ${whereClause}
        GROUP BY s.category
        ORDER BY count DESC, s.category ASC
      `
      )
      .all(...params) as Array<{ name: string; count: number }>;

    const tagRows = this.db.prepare(`SELECT s.tags_json FROM skills s ${whereClause}`).all(...params) as Array<{ tags_json: string }>;
    const tagCounts = new Map<string, number>();
    for (const row of tagRows) {
      for (const tag of this.parseStringArray(row.tags_json)) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }

    return {
      categories: categoryRows.map((row) => ({ name: row.name || "general", count: row.count })),
      tags: Array.from(tagCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    };
  }

  setFavorite(skillId: string, userId: string, favorite: boolean, now: string): void {
    if (favorite) {
      this.db
        .prepare("INSERT OR IGNORE INTO skill_favorites (skill_id, user_id, created_at) VALUES (?, ?, ?)")
        .run(skillId, userId, now);
      return;
    }
    this.db.prepare("DELETE FROM skill_favorites WHERE skill_id = ? AND user_id = ?").run(skillId, userId);
  }

  upsertReview(entity: { id: string; skillId: string; userId: string; rating: number; comment: string | null; now: string }): void {
    this.db
      .prepare(
        `
        INSERT INTO skill_reviews (id, skill_id, user_id, rating, comment, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(skill_id, user_id) DO UPDATE SET
          rating = excluded.rating,
          comment = excluded.comment,
          updated_at = excluded.updated_at
      `
      )
      .run(entity.id, entity.skillId, entity.userId, entity.rating, entity.comment, entity.now, entity.now);
  }

  createComment(entity: SkillCommentEntity): void {
    this.db
      .prepare(
        `
        INSERT INTO skill_comments (
          id, skill_id, author_id, author_name, content, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        entity.id,
        entity.skillId,
        entity.authorId,
        entity.authorName,
        entity.content,
        entity.createdAt,
        entity.updatedAt
      );
  }

  listComments(skillId: string): SkillCommentEntity[] {
    const rows = this.db
      .prepare(
        `
        SELECT *
        FROM skill_comments
        WHERE skill_id = ?
        ORDER BY datetime(created_at) ASC, id ASC
      `
      )
      .all(skillId) as SkillCommentRow[];
    return rows.map((row) => this.mapCommentRow(row));
  }

  runInTransaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  private findVersionById(id: string): SkillVersionEntity | null {
    const row = this.db.prepare("SELECT * FROM skill_versions WHERE id = ?").get(id) as SkillVersionRow | undefined;
    return row ? this.mapVersionRow(row) : null;
  }

  private skillColumns(): string {
    return SKILL_COLUMNS(this.ownerAvatarSelect);
  }

  private hasTableColumn(tableName: string, columnName: string): boolean {
    const rows = this.db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
    return rows.some((row) => row.name === columnName);
  }

  private buildListWhere(query: ListSkillsQuery, visibility: SkillVisibility): { whereClause: string; params: unknown[] } {
    const conditions: string[] = [];
    const params: unknown[] = [];

    const status = query.status === "active" || !query.status ? "published" : query.status;
    if (status === "submitted") {
      conditions.push("EXISTS (SELECT 1 FROM skill_versions sv_submitted WHERE sv_submitted.skill_id = s.id AND sv_submitted.status = 'submitted')");
    } else if (status === "draft") {
      conditions.push("s.status = 'draft'");
      conditions.push("NOT EXISTS (SELECT 1 FROM skill_versions sv_submitted WHERE sv_submitted.skill_id = s.id AND sv_submitted.status = 'submitted')");
    } else if (status) {
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
    } else if (status === "draft") {
      conditions.push("s.owner_user_id = ?");
      params.push(visibility.userId || "");
    }

    if (query.keyword?.trim()) {
      const keyword = `%${query.keyword.trim()}%`;
      conditions.push("(s.name LIKE ? OR s.description LIKE ? OR s.description_md LIKE ? OR s.slug LIKE ? OR s.tags_json LIKE ?)");
      params.push(keyword, keyword, keyword, keyword, keyword);
    }

    if (query.category?.trim()) {
      conditions.push("s.category = ?");
      params.push(query.category.trim());
    }

    if (query.tag?.trim()) {
      conditions.push("s.tags_json LIKE ?");
      params.push(`%"${query.tag.trim()}"%`);
    }

    return {
      whereClause: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
      params
    };
  }

  private buildListOrderBy(sort: ListSkillsQuery["sort"]): string {
    if (sort === "hot") {
      return "is_favorited DESC, favorite_count DESC, review_count DESC, COALESCE(latest.published_at, s.updated_at) DESC, s.created_at DESC";
    }
    if (sort === "rating") {
      return "is_favorited DESC, rating_average IS NULL ASC, rating_average DESC, review_count DESC, COALESCE(latest.published_at, s.updated_at) DESC, s.created_at DESC";
    }
    return "is_favorited DESC, COALESCE(latest.published_at, s.updated_at) DESC, s.created_at DESC";
  }

  private mapSkillRow(row: SkillRow): SkillEntity {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      descriptionMd: row.description_md,
      category: row.category,
      tags: this.parseStringArray(row.tags_json),
      ownerUserId: row.owner_user_id,
      ownerName: row.owner_name,
      ownerAvatarUrl: row.owner_avatar_url,
      status: row.status,
      latestVersionId: row.latest_version_id,
      latestVersion: row.latest_version,
      latestPublishedAt: row.latest_published_at,
      favoriteCount: row.favorite_count,
      reviewCount: row.review_count,
      ratingAverage: row.rating_average,
      pendingReviewCount: row.pending_review_count,
      isFavorited: row.is_favorited === 1,
      myRating: row.my_rating,
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

  private mapCommentRow(row: SkillCommentRow): SkillCommentEntity {
    return {
      id: row.id,
      skillId: row.skill_id,
      authorId: row.author_id,
      authorName: row.author_name,
      content: row.content,
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
