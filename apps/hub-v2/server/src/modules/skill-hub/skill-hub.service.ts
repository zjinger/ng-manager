import fs from "node:fs";
import path from "node:path";
import { AppError } from "../../shared/errors/app-error";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import type { RequestContext } from "../../shared/context/request-context";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import { requirePermission } from "../utils/require-permission";
import type { SkillHubCommandContract, SkillHubQueryContract } from "./skill-hub.contract";
import { SkillHubRepo } from "./skill-hub.repo";
import type {
  CreateSkillInput,
  CreateSkillVersionInput,
  ListSkillsQuery,
  RejectSkillVersionInput,
  SkillDetailEntity,
  SkillEntity,
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
const DEFAULT_VERSION = "0.1.0";

type ParsedSkillPackage = {
  manifest: SkillPackageManifest;
  readmeMd: string;
};

export class SkillHubService implements SkillHubCommandContract, SkillHubQueryContract {
  constructor(private readonly repo: SkillHubRepo) {}

  async create(input: CreateSkillInput, ctx: RequestContext): Promise<SkillDetailEntity> {
    this.requireCreatePermission(ctx);
    const parsed = this.parsePackage(input);
    const slug = this.normalizeSlug(input.slug || parsed.manifest.name);
    const existing = this.repo.findBySlug(slug);
    if (existing) {
      throw new AppError(ERROR_CODES.SKILL_SLUG_EXISTS, `skill slug already exists: ${slug}`, 409);
    }

    const now = nowIso();
    const skillId = genId("skl");
    const version = this.normalizeVersion(input.version, DEFAULT_VERSION);
    const tags = this.normalizeTags(input.tags);
    const versionEntity = this.buildVersion(skillId, version, input, parsed, ctx, now);

    this.repo.runInTransaction(() => {
      this.repo.createSkill({
        id: skillId,
        slug,
        name: parsed.manifest.name,
        description: parsed.manifest.description,
        category: input.category?.trim() || "general",
        tags,
        ownerUserId: this.actorUserId(ctx),
        status: "draft",
        latestVersionId: null,
        createdAt: now,
        updatedAt: now
      });
      this.repo.createVersion(versionEntity);
    });

    return this.requireDetail(skillId);
  }

  async createVersion(skillId: string, input: CreateSkillVersionInput, ctx: RequestContext): Promise<SkillDetailEntity> {
    this.requireCreatePermission(ctx);
    const skill = this.requireSkill(skillId);
    this.requireOwner(skill, ctx, "create skill version");

    const parsed = this.parsePackage(input);
    if (parsed.manifest.name.trim() !== skill.name.trim()) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, "skill package name must match the existing skill", 400);
    }
    const version = this.normalizeVersion(input.version, this.nextDefaultVersion(skill));
    this.assertVersionCanBeAdded(skill.id, version);
    const now = nowIso();
    const versionEntity = this.buildVersion(skill.id, version, input, parsed, ctx, now);

    this.repo.runInTransaction(() => {
      this.repo.createVersion(versionEntity);
      this.repo.updateSkill(skill.id, {
        category: input.category?.trim() || skill.category,
        tags: input.tags?.length ? this.normalizeTags(input.tags) : skill.tags,
        updatedAt: now
      });
    });

    return this.requireDetail(skill.id);
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

    return this.requireDetail(skill.id);
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

  async list(query: ListSkillsQuery, ctx: RequestContext): Promise<SkillListResult> {
    return this.repo.list(query, {
      userId: this.actorUserId(ctx),
      canReview: this.canReview(ctx)
    });
  }

  async getById(skillId: string, ctx: RequestContext): Promise<SkillDetailEntity> {
    const detail = this.requireDetail(skillId);
    this.requireCanReadSkill(detail, ctx);
    return detail;
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
    if (!name || !description) {
      throw new AppError(ERROR_CODES.SKILL_PACKAGE_INVALID, "SKILL.md front matter must include name and description", 400);
    }

    const rootPrefix = skillMdPath.endsWith("/SKILL.md") ? skillMdPath.slice(0, -"SKILL.md".length) : "";
    const manifest: SkillPackageManifest = {
      name,
      description,
      rootPrefix,
      files: normalizedFiles
        .map((entry) => ({ path: entry.path, size: entry.size }))
        .sort((a, b) => a.path.localeCompare(b.path)),
      validation: {
        skillMdPath,
        fileCount: normalizedFiles.length,
        packageSize: input.packageSize
      }
    };
    return { manifest, readmeMd };
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

  private normalizeVersion(input: string | undefined, fallback: string): string {
    const version = input?.trim() || fallback;
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

  private normalizeTags(tags: string[] | undefined): string[] {
    const unique = new Set<string>();
    for (const tag of tags ?? []) {
      const normalized = tag.trim();
      if (normalized) {
        unique.add(normalized);
      }
    }
    return Array.from(unique).slice(0, 20);
  }

  private requireSkill(skillId: string): SkillEntity {
    const skill = this.repo.findById(skillId.trim());
    if (!skill) {
      throw new AppError(ERROR_CODES.SKILL_NOT_FOUND, `skill not found: ${skillId}`, 404);
    }
    return skill;
  }

  private requireDetail(skillId: string): SkillDetailEntity {
    const detail = this.repo.findDetailById(skillId.trim());
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
}
