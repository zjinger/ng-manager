import fs from "node:fs";
import path from "node:path";
import { AppError } from "../../shared/errors/app-error";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import type { RequestContext } from "../../shared/context/request-context";
import type { UploadCommandContract } from "../upload/upload.contract";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import { requirePermission } from "../utils/require-permission";
import type { SkillHubCommandContract, SkillHubQueryContract } from "./skill-hub.contract";
import { SkillHubRepo } from "./skill-hub.repo";
import type {
  CreateSkillCommentInput,
  CreateSkillInput,
  CreateSkillVersionInput,
  ListSkillsQuery,
  RejectSkillVersionInput,
  ReviewSkillInput,
  SkillDiscoveryMeta,
  SkillDetailEntity,
  SkillEntity,
  SkillExportConfig,
  SkillExportTarget,
  SkillCommentEntity,
  SkillListResult,
  SkillPackageManifest,
  SkillUploadInput,
  SkillVersionEntity
} from "./skill-hub.types";

const JSZip = require("jszip") as {
  new (data?: Buffer): {
    files: Record<string, { name: string; dir: boolean; asText(): string; _data?: { uncompressedSize?: number } }>;
  };
};

const MAX_SKILL_FILES = 500;
const MAX_FILE_PREVIEW_BYTES = 128 * 1024;
const MAX_SKILL_TAGS = 3;
const MAX_SKILL_TAG_LENGTH = 5;
const DEFAULT_VERSION = "0.1.0";
const AUTO_APPROVE_SKILL_UPLOADS = true;
const TEXT_PREVIEW_EXTENSIONS = new Set([
  ".md",
  ".mdx",
  ".txt",
  ".json",
  ".jsonc",
  ".yaml",
  ".yml",
  ".toml",
  ".ini",
  ".conf",
  ".config",
  ".xml",
  ".html",
  ".css",
  ".scss",
  ".less",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".py",
  ".sh",
  ".ps1",
  ".bat",
  ".cmd",
  ".env",
  ".gitignore"
]);

type ParsedSkillPackage = {
  manifest: SkillPackageManifest;
  readmeMd: string;
  packageVersion: string | null;
};

export class SkillHubService implements SkillHubCommandContract, SkillHubQueryContract {
  constructor(
    private readonly repo: SkillHubRepo,
    private readonly uploadCommand: UploadCommandContract
  ) {}

  async create(input: CreateSkillInput, ctx: RequestContext): Promise<SkillDetailEntity> {
    this.requireCreatePermission(ctx);
    const parsed = this.parsePackage(input);
    const skillName = this.normalizeSkillName(input.name || parsed.manifest.name);
    const slug = this.normalizeSlug(input.slug || parsed.manifest.name);
    const existing = this.repo.findBySlug(slug);
    if (existing) {
      throw new AppError(ERROR_CODES.SKILL_SLUG_EXISTS, `skill slug already exists: ${slug}`, 409);
    }

    const now = nowIso();
    const skillId = genId("skl");
    const version = this.resolveVersion(input.version, parsed.packageVersion, DEFAULT_VERSION);
    const tags = this.normalizeTags(input.tags);
    const descriptionMd = this.normalizeDescriptionMd(input.descriptionMd);
    const versionEntity = this.applyUploadApprovalStrategy(this.buildVersion(skillId, version, input, parsed, ctx, now), ctx, now);

    this.repo.runInTransaction(() => {
      this.repo.createSkill({
        id: skillId,
        slug,
        name: skillName,
        description: parsed.manifest.description,
        descriptionMd,
        category: input.category?.trim() || "general",
        tags,
        ownerUserId: this.actorUserId(ctx),
        status: versionEntity.status === "published" ? "published" : "draft",
        latestVersionId: versionEntity.status === "published" ? versionEntity.id : null,
        createdAt: now,
        updatedAt: now
      });
      this.repo.createVersion(versionEntity);
    });
    await this.promoteTempMarkdownUploads(skillId, descriptionMd, ctx);

    return this.requireDetail(skillId, this.actorUserId(ctx));
  }

  async createVersion(skillId: string, input: CreateSkillVersionInput, ctx: RequestContext): Promise<SkillDetailEntity> {
    this.requireCreatePermission(ctx);
    const skill = this.requireSkill(skillId);
    this.requireOwner(skill, ctx, "create skill version");

    const parsed = this.parsePackage(input);
    const packageName = parsed.manifest.name.trim();
    const allowedNames = new Set([skill.name.trim(), skill.slug.trim()].filter(Boolean));
    if (!allowedNames.has(packageName)) {
      throw new AppError(
        ERROR_CODES.SKILL_PACKAGE_INVALID,
        `上传包声明的 Skill 名称为「${packageName}」，必须与当前 Skill「${skill.name.trim()}」或 slug「${skill.slug.trim()}」一致。请确认 zip 包内 SKILL.md 的 name 字段。`,
        400
      );
    }
    const version = this.resolveVersion(input.version, parsed.packageVersion, this.nextDefaultVersion(skill));
    this.assertVersionCanBeAdded(skill.id, version);
    const now = nowIso();
    const versionEntity = this.applyUploadApprovalStrategy(this.buildVersion(skill.id, version, input, parsed, ctx, now), ctx, now);
    const descriptionMd = input.descriptionMd !== undefined ? this.normalizeDescriptionMd(input.descriptionMd) : skill.descriptionMd;

    this.repo.runInTransaction(() => {
      this.repo.createVersion(versionEntity);
      this.repo.updateSkill(skill.id, {
        descriptionMd,
        category: input.category?.trim() || skill.category,
        tags: input.tags?.length ? this.normalizeTags(input.tags) : skill.tags,
        status: versionEntity.status === "published" ? "published" : skill.status,
        latestVersionId: versionEntity.status === "published" ? versionEntity.id : skill.latestVersionId,
        updatedAt: now
      });
    });
    await this.promoteTempMarkdownUploads(skill.id, descriptionMd, ctx);

    return this.requireDetail(skill.id, this.actorUserId(ctx));
  }

  async submitVersion(skillId: string, versionId: string, ctx: RequestContext): Promise<SkillVersionEntity> {
    const skill = this.requireSkill(skillId);
    this.requireOwner(skill, ctx, "submit skill version");
    const version = this.requireVersion(skill.id, versionId);
    if (version.status !== "draft" && version.status !== "rejected") {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "only draft or rejected skill versions can be submitted", 400);
    }
    const now = nowIso();
    this.repo.updateVersion(version.id, {
      status: "submitted",
      submittedByUserId: this.actorUserId(ctx),
      reviewComment: null,
      updatedAt: now
    });
    return this.requireVersion(skill.id, version.id);
  }

  async publishVersion(skillId: string, versionId: string, ctx: RequestContext): Promise<SkillDetailEntity> {
    this.requireReviewPermission(ctx);
    const skill = this.requireSkill(skillId);
    const version = this.requireVersion(skill.id, versionId);
    if (version.status !== "submitted" && version.status !== "draft") {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "only submitted or draft skill versions can be published", 400);
    }
    this.assertVersionCanBePublished(skill.id, version.version, version.id);

    const now = nowIso();
    this.repo.runInTransaction(() => {
      this.repo.updateVersion(version.id, {
        status: "published",
        reviewedByUserId: this.actorUserId(ctx),
        reviewComment: null,
        publishedAt: now,
        updatedAt: now
      });
      this.repo.updateSkill(skill.id, {
        status: "published",
        latestVersionId: version.id,
        updatedAt: now
      });
    });

    return this.requireDetail(skill.id, this.actorUserId(ctx));
  }

  async rejectVersion(
    skillId: string,
    versionId: string,
    input: RejectSkillVersionInput,
    ctx: RequestContext
  ): Promise<SkillVersionEntity> {
    this.requireReviewPermission(ctx);
    const skill = this.requireSkill(skillId);
    const version = this.requireVersion(skill.id, versionId);
    if (version.status !== "submitted" && version.status !== "draft") {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "only submitted or draft skill versions can be rejected", 400);
    }
    this.repo.updateVersion(version.id, {
      status: "rejected",
      reviewedByUserId: this.actorUserId(ctx),
      reviewComment: input.reviewComment.trim(),
      updatedAt: nowIso()
    });
    return this.requireVersion(skill.id, version.id);
  }

  async archive(skillId: string, ctx: RequestContext): Promise<SkillEntity> {
    this.requireManagePermission(ctx);
    const skill = this.requireSkill(skillId);
    if (skill.status === "archived") {
      return skill;
    }
    const now = nowIso();
    this.repo.updateSkill(skill.id, {
      status: "archived",
      updatedAt: now
    });
    return this.requireSkill(skill.id);
  }

  async deleteSkill(skillId: string, ctx: RequestContext): Promise<{ id: string }> {
    const skill = this.requireSkill(skillId);
    if (skill.status === "archived") {
      this.requireManagePermission(ctx);
    } else {
      this.requireOwner(skill, ctx, "delete skill draft");
    }
    const versions = this.repo.listVersions(skill.id);
    const hasReviewedOrSubmittedVersion = versions.some((item) => item.status === "submitted" || item.status === "published");
    if (skill.status === "draft" && hasReviewedOrSubmittedVersion) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "only pure draft skills can be deleted", 400);
    }
    if (skill.status !== "draft" && skill.status !== "archived") {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "only draft or archived skills can be deleted", 400);
    }

    const uploadIds = Array.from(new Set(versions.map((item) => item.packageUploadId).filter(Boolean)));
    this.repo.runInTransaction(() => {
      this.repo.deleteSkill(skill.id);
    });

    for (const uploadId of uploadIds) {
      await this.uploadCommand.deactivateUpload(uploadId, ctx);
    }

    return { id: skill.id };
  }

  async deleteDraft(skillId: string, ctx: RequestContext): Promise<{ id: string }> {
    return this.deleteSkill(skillId, ctx);
  }

  async setFavorite(skillId: string, favorite: boolean, ctx: RequestContext): Promise<SkillDetailEntity> {
    this.requireViewPermission(ctx);
    const skill = this.requirePublishedSkill(skillId);
    const userId = this.requireActorUserId(ctx);
    this.repo.setFavorite(skill.id, userId, favorite, nowIso());
    return this.requireDetail(skill.id, userId);
  }

  async review(skillId: string, input: ReviewSkillInput, ctx: RequestContext): Promise<SkillDetailEntity> {
    this.requireViewPermission(ctx);
    const skill = this.requirePublishedSkill(skillId);
    const userId = this.requireActorUserId(ctx);
    this.repo.upsertReview({
      id: genId("skr"),
      skillId: skill.id,
      userId,
      rating: input.rating,
      comment: input.comment?.trim() || null,
      now: nowIso()
    });
    return this.requireDetail(skill.id, userId);
  }

  async createComment(skillId: string, input: CreateSkillCommentInput, ctx: RequestContext): Promise<SkillCommentEntity> {
    this.requireViewPermission(ctx);
    const detail = this.requireDetail(skillId, this.actorUserId(ctx));
    this.requireCanReadSkill(detail, ctx);
    const now = nowIso();
    const entity: SkillCommentEntity = {
      id: genId("skc"),
      skillId: detail.id,
      authorId: this.actorUserId(ctx),
      authorName: ctx.nickname?.trim() || ctx.userId?.trim() || ctx.accountId,
      content: input.content.trim(),
      createdAt: now,
      updatedAt: now
    };
    this.repo.createComment(entity);
    await this.uploadCommand.promoteMarkdownUploads(
      {
        content: entity.content,
        bucket: "skills",
        entityId: detail.id
      },
      ctx
    );
    return entity;
  }

  async list(query: ListSkillsQuery, ctx: RequestContext): Promise<SkillListResult> {
    return this.repo.list(query, {
      userId: this.actorUserId(ctx),
      canReview: this.canReview(ctx)
    });
  }

  async getMeta(query: ListSkillsQuery, ctx: RequestContext): Promise<SkillDiscoveryMeta> {
    return this.repo.getMeta(query, {
      userId: this.actorUserId(ctx),
      canReview: this.canReview(ctx)
    });
  }

  async getById(skillId: string, ctx: RequestContext): Promise<SkillDetailEntity> {
    const detail = this.requireDetail(skillId, this.actorUserId(ctx));
    this.requireCanReadSkill(detail, ctx);
    return detail;
  }

  async listComments(skillId: string, ctx: RequestContext): Promise<SkillCommentEntity[]> {
    this.requireViewPermission(ctx);
    const detail = this.requireDetail(skillId, this.actorUserId(ctx));
    this.requireCanReadSkill(detail, ctx);
    return this.repo.listComments(detail.id);
  }

  async getDownload(skillId: string, versionId: string, _ctx: RequestContext): Promise<SkillVersionEntity> {
    const skill = this.requireSkill(skillId);
    if (skill.status !== "published") {
      throw new AppError(ERROR_CODES.SKILL_NOT_FOUND, "skill not found", 404);
    }
    const version = this.requireVersion(skill.id, versionId);
    if (version.status !== "published") {
      throw new AppError(ERROR_CODES.SKILL_VERSION_NOT_FOUND, "skill version not found", 404);
    }
    return version;
  }

  async getExport(skillId: string, versionId: string, target: SkillExportTarget, ctx: RequestContext): Promise<SkillExportConfig> {
    const skill = this.requirePublishedSkill(skillId);
    const version = await this.getDownload(skill.id, versionId, ctx);
    const downloadUrl = `/api/admin/skills/${encodeURIComponent(skill.id)}/versions/${encodeURIComponent(version.id)}/download`;
    const base = {
      id: skill.id,
      slug: skill.slug,
      name: skill.name,
      description: skill.description,
      version: version.version,
      category: skill.category,
      tags: skill.tags,
      downloadUrl,
      skillMdPath: version.manifest.validation.skillMdPath,
      rootPrefix: version.manifest.rootPrefix
    };
    const content = this.buildExportContent(target, base);
    return {
      target,
      fileName: `${skill.slug}-${target}.json`,
      contentType: "application/json",
      content
    };
  }

  private buildVersion(
    skillId: string,
    version: string,
    input: SkillUploadInput,
    parsed: ParsedSkillPackage,
    ctx: RequestContext,
    now: string
  ): SkillVersionEntity {
    return {
      id: genId("skv"),
      skillId,
      version,
      status: "draft",
      manifest: parsed.manifest,
      readmeMd: parsed.readmeMd,
      packageUploadId: input.packageUploadId,
      checksum: input.checksum ?? null,
      fileCount: parsed.manifest.validation.fileCount,
      packageSize: input.packageSize,
      submittedByUserId: null,
      reviewedByUserId: null,
      reviewComment: null,
      publishedAt: null,
      createdAt: now,
      updatedAt: now
    };
  }

  private applyUploadApprovalStrategy(version: SkillVersionEntity, ctx: RequestContext, now: string): SkillVersionEntity {
    if (!AUTO_APPROVE_SKILL_UPLOADS) {
      return version;
    }
    const actor = this.actorUserId(ctx);
    return {
      ...version,
      status: "published",
      submittedByUserId: actor,
      reviewedByUserId: actor,
      reviewComment: null,
      publishedAt: now,
      updatedAt: now
    };
  }

  private parsePackage(input: SkillUploadInput): ParsedSkillPackage {
    if (!input.packagePath || !fs.existsSync(input.packagePath)) {
      throw new AppError(ERROR_CODES.UPLOAD_NOT_FOUND, "skill package upload not found", 404);
    }
    if (input.packageSize <= 0) {
      throw new AppError(ERROR_CODES.SKILL_PACKAGE_INVALID, "skill package is empty", 400);
    }

    let zip: InstanceType<typeof JSZip>;
    try {
      zip = new JSZip(fs.readFileSync(input.packagePath));
    } catch {
      throw new AppError(ERROR_CODES.SKILL_PACKAGE_INVALID, "skill package must be a readable zip file", 400);
    }

    const rawFiles = Object.values(zip.files);
    const files = rawFiles.filter((entry) => !entry.dir);
    if (files.length === 0) {
      throw new AppError(ERROR_CODES.SKILL_PACKAGE_INVALID, "skill package has no files", 400);
    }
    if (files.length > MAX_SKILL_FILES) {
      throw new AppError(ERROR_CODES.SKILL_PACKAGE_INVALID, `skill package cannot contain more than ${MAX_SKILL_FILES} files`, 400);
    }

    const normalizedFiles = files.map((entry) => ({
      original: entry,
      path: this.normalizeZipPath(entry.name),
      size: Number(entry._data?.uncompressedSize ?? 0)
    }));
    const skillMdPath = this.findSkillMdPath(normalizedFiles.map((entry) => entry.path));
    const skillMdEntry = normalizedFiles.find((entry) => entry.path === skillMdPath);
    if (!skillMdEntry) {
      throw new AppError(ERROR_CODES.SKILL_PACKAGE_INVALID, "skill package must contain SKILL.md", 400);
    }

    const readmeMd = skillMdEntry.original.asText();
    const frontMatter = this.parseFrontMatter(readmeMd);
    const name = frontMatter.name?.trim();
    const description = frontMatter.description?.trim();
    const packageVersion = frontMatter.version?.trim() || null;
    if (!name || !description) {
      throw new AppError(ERROR_CODES.SKILL_PACKAGE_INVALID, "SKILL.md front matter must include name and description", 400);
    }

    const rootPrefix = skillMdPath.endsWith("/SKILL.md") ? skillMdPath.slice(0, -"SKILL.md".length) : "";
    const manifest: SkillPackageManifest = {
      name,
      description,
      rootPrefix,
      files: normalizedFiles
        .map((entry) => ({
          path: entry.path,
          size: entry.size,
          ...this.buildFilePreview(entry.path, entry.size, entry.original)
        }))
        .sort((a, b) => a.path.localeCompare(b.path)),
      validation: {
        skillMdPath,
        fileCount: normalizedFiles.length,
        packageSize: input.packageSize
      }
    };
    return { manifest, readmeMd, packageVersion };
  }

  private buildFilePreview(pathName: string, size: number, entry: { asText(): string }): { content?: string; contentTruncated?: boolean } {
    if (!this.canPreviewTextFile(pathName, size)) {
      return {};
    }
    const content = entry.asText();
    if (content.length <= MAX_FILE_PREVIEW_BYTES) {
      return { content };
    }
    return {
      content: content.slice(0, MAX_FILE_PREVIEW_BYTES),
      contentTruncated: true
    };
  }

  private canPreviewTextFile(pathName: string, size: number): boolean {
    if (size > MAX_FILE_PREVIEW_BYTES * 2) {
      return false;
    }
    const baseName = path.basename(pathName);
    const ext = path.extname(baseName).toLowerCase();
    return TEXT_PREVIEW_EXTENSIONS.has(ext) || TEXT_PREVIEW_EXTENSIONS.has(baseName.toLowerCase());
  }

  private normalizeZipPath(rawPath: string): string {
    const normalized = rawPath.replace(/\\/g, "/").trim();
    if (!normalized || normalized.startsWith("/") || /^[a-zA-Z]:\//.test(normalized)) {
      throw new AppError(ERROR_CODES.SKILL_PACKAGE_INVALID, "skill package contains an invalid path", 400);
    }
    const segments = normalized.split("/");
    if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
      throw new AppError(ERROR_CODES.SKILL_PACKAGE_INVALID, "skill package contains an unsafe path", 400);
    }
    return normalized;
  }

  private findSkillMdPath(paths: string[]): string {
    if (paths.includes("SKILL.md")) {
      return "SKILL.md";
    }

    const topLevel = new Set(paths.map((item) => item.split("/")[0]).filter(Boolean));
    if (topLevel.size === 1) {
      const [root] = Array.from(topLevel);
      const candidate = `${root}/SKILL.md`;
      if (paths.includes(candidate)) {
        return candidate;
      }
    }

    throw new AppError(ERROR_CODES.SKILL_PACKAGE_INVALID, "skill package must contain root SKILL.md", 400);
  }

  private parseFrontMatter(content: string): Record<string, string> {
    const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content);
    if (!match) {
      return {};
    }
    const result: Record<string, string> = {};
    for (const line of match[1].split(/\r?\n/)) {
      const item = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
      if (!item) {
        continue;
      }
      const value = item[2].trim().replace(/^["']|["']$/g, "");
      result[item[1]] = value;
    }
    return result;
  }

  private assertVersionCanBeAdded(skillId: string, version: string): void {
    const versions = this.repo.listVersions(skillId);
    if (versions.some((item) => item.version === version)) {
      throw new AppError(ERROR_CODES.SKILL_VERSION_CONFLICT, `skill version already exists: ${version}`, 409);
    }
    const published = versions.filter((item) => item.status === "published");
    if (published.some((item) => this.compareVersions(version, item.version) <= 0)) {
      throw new AppError(ERROR_CODES.SKILL_VERSION_CONFLICT, "skill version must be greater than published versions", 409);
    }
  }

  private assertVersionCanBePublished(skillId: string, version: string, versionId: string): void {
    const published = this.repo.listPublishedVersions(skillId).filter((item) => item.id !== versionId);
    if (published.some((item) => this.compareVersions(version, item.version) <= 0)) {
      throw new AppError(ERROR_CODES.SKILL_VERSION_CONFLICT, "skill version must be greater than published versions", 409);
    }
  }

  private nextDefaultVersion(skill: SkillEntity): string {
    return skill.latestVersion ? this.bumpPatch(skill.latestVersion) : DEFAULT_VERSION;
  }

  private bumpPatch(version: string): string {
    const parts = this.parseVersionParts(version);
    if (!parts) {
      return DEFAULT_VERSION;
    }
    return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
  }

  private resolveVersion(input: string | undefined, packageVersion: string | null, fallback: string): string {
    const uploadedVersion = input?.trim() || "";
    const declaredVersion = packageVersion?.trim() || "";
    if (uploadedVersion && declaredVersion && uploadedVersion !== declaredVersion) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, "uploaded version must match SKILL.md version", 400);
    }
    return this.normalizeVersion(uploadedVersion || declaredVersion || fallback);
  }

  private normalizeVersion(input: string): string {
    const version = input.trim();
    if (!this.parseVersionParts(version)) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, "version must use x.y.z format", 400);
    }
    return version;
  }

  private compareVersions(left: string, right: string): number {
    const a = this.parseVersionParts(left) ?? [0, 0, 0];
    const b = this.parseVersionParts(right) ?? [0, 0, 0];
    for (let i = 0; i < 3; i += 1) {
      if (a[i] !== b[i]) {
        return a[i] - b[i];
      }
    }
    return 0;
  }

  private parseVersionParts(version: string): [number, number, number] | null {
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
    if (!match) {
      return null;
    }
    return [Number(match[1]), Number(match[2]), Number(match[3])];
  }

  private normalizeSlug(input: string): string {
    const normalized = input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!normalized) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, "skill slug is required", 400);
    }
    return normalized;
  }

  private normalizeSkillName(input: string): string {
    const normalized = input.trim();
    if (!normalized) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, "skill name is required", 400);
    }
    return normalized.slice(0, 120);
  }

  private normalizeTags(tags: string[] | undefined): string[] {
    const unique = new Set<string>();
    for (const tag of tags ?? []) {
      const normalized = tag.trim().slice(0, MAX_SKILL_TAG_LENGTH);
      if (normalized) {
        unique.add(normalized);
      }
    }
    return Array.from(unique).slice(0, MAX_SKILL_TAGS);
  }

  private normalizeDescriptionMd(value: string | undefined): string {
    return value?.trim().slice(0, 20000) || "";
  }

  private async promoteTempMarkdownUploads(skillId: string, descriptionMd: string, ctx: RequestContext): Promise<void> {
    await this.uploadCommand.promoteMarkdownUploads(
      {
        content: descriptionMd,
        bucket: "skills",
        entityId: skillId
      },
      ctx
    );
  }

  private requireSkill(skillId: string): SkillEntity {
    const skill = this.repo.findById(skillId.trim());
    if (!skill) {
      throw new AppError(ERROR_CODES.SKILL_NOT_FOUND, `skill not found: ${skillId}`, 404);
    }
    return skill;
  }

  private requirePublishedSkill(skillId: string): SkillEntity {
    const skill = this.requireSkill(skillId);
    if (skill.status !== "published") {
      throw new AppError(ERROR_CODES.SKILL_NOT_FOUND, "skill not found", 404);
    }
    return skill;
  }

  private requireDetail(skillId: string, userId?: string | null): SkillDetailEntity {
    const detail = this.repo.findDetailById(skillId.trim(), userId);
    if (!detail) {
      throw new AppError(ERROR_CODES.SKILL_NOT_FOUND, `skill not found: ${skillId}`, 404);
    }
    return detail;
  }

  private requireVersion(skillId: string, versionId: string): SkillVersionEntity {
    const version = this.repo.findVersion(skillId.trim(), versionId.trim());
    if (!version) {
      throw new AppError(ERROR_CODES.SKILL_VERSION_NOT_FOUND, `skill version not found: ${versionId}`, 404);
    }
    return version;
  }

  private requireCanReadSkill(skill: SkillEntity, ctx: RequestContext): void {
    if (skill.status === "published") {
      return;
    }
    if (this.canReview(ctx) || skill.ownerUserId === this.actorUserId(ctx)) {
      return;
    }
    throw new AppError(ERROR_CODES.SKILL_NOT_FOUND, "skill not found", 404);
  }

  private requireOwner(skill: SkillEntity, ctx: RequestContext, action: string): void {
    if (this.canManage(ctx)) {
      return;
    }
    const actor = this.actorUserId(ctx);
    if (actor && actor === skill.ownerUserId) {
      return;
    }
    throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, `${action} forbidden`, 403);
  }

  private requireCreatePermission(ctx: RequestContext): void {
    requirePermission(ctx, ["skill.create", "skill.manage"]);
  }

  private requireViewPermission(ctx: RequestContext): void {
    requirePermission(ctx, ["skill.view", "skill.create", "skill.review", "skill.manage"]);
  }

  private requireReviewPermission(ctx: RequestContext): void {
    requirePermission(ctx, ["skill.review", "skill.manage"]);
  }

  private requireManagePermission(ctx: RequestContext): void {
    requirePermission(ctx, "skill.manage");
  }

  private canReview(ctx: RequestContext): boolean {
    const scopes = new Set(ctx.authScopes ?? []);
    return scopes.has("skill.review") || scopes.has("skill.manage");
  }

  private canManage(ctx: RequestContext): boolean {
    return new Set(ctx.authScopes ?? []).has("skill.manage");
  }

  private actorUserId(ctx: RequestContext): string | null {
    return ctx.userId?.trim() || ctx.accountId?.trim() || null;
  }

  private requireActorUserId(ctx: RequestContext): string {
    const userId = this.actorUserId(ctx);
    if (!userId) {
      throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED, "user identity is required", 401);
    }
    return userId;
  }

  private buildExportContent(target: SkillExportTarget, skill: {
    id: string;
    slug: string;
    name: string;
    description: string;
    version: string;
    category: string;
    tags: string[];
    downloadUrl: string;
    skillMdPath: string;
    rootPrefix: string;
  }): string {
    if (target === "claude") {
      return JSON.stringify(
        {
          skill: {
            name: skill.slug,
            title: skill.name,
            description: skill.description,
            version: skill.version,
            source: {
              type: "hub-v2-skill-hub",
              downloadUrl: skill.downloadUrl,
              skillMdPath: skill.skillMdPath,
              rootPrefix: skill.rootPrefix
            }
          }
        },
        null,
        2
      );
    }

    if (target === "opencode") {
      return JSON.stringify(
        {
          skills: [
            {
              name: skill.slug,
              description: skill.description,
              version: skill.version,
              tags: skill.tags,
              source: skill.downloadUrl
            }
          ]
        },
        null,
        2
      );
    }

    return JSON.stringify(
      {
        codexSkills: {
          [skill.slug]: {
            title: skill.name,
            description: skill.description,
            version: skill.version,
            category: skill.category,
            tags: skill.tags,
            source: {
              type: "hub-v2-skill-hub",
              downloadUrl: skill.downloadUrl,
              skillMdPath: skill.skillMdPath,
              rootPrefix: skill.rootPrefix
            }
          }
        }
      },
      null,
      2
    );
  }
}
