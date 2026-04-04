import { AppError } from "../../shared/errors/app-error";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { TokenRateLimiter } from "../../shared/auth/token-rate-limiter";
import type { RequestContext } from "../../shared/context/request-context";
import type { AppConfig } from "../../shared/env/env";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import { ProjectRepo } from "../project/project.repo";
import { ReportPublicRepo } from "./report-public.repo";
import type {
  ReportPublicBoardEntity,
  ReportPublicBoardPublishItemInput,
  ReportPublicBoardSummaryEntity,
  ReportPublicProjectEntity
} from "./report-public.types";

const SHARE_TOKEN_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
const PROJECT_SHARE_TOKEN_PREFIX = "rpt_";
const BOARD_SHARE_TOKEN_PREFIX = "rpb_";
const SHARE_TOKEN_LENGTH = 16;

export class ReportPublicService {
  private readonly publicLimiter: TokenRateLimiter;

  constructor(
    private readonly config: AppConfig,
    private readonly repo: ReportPublicRepo,
    private readonly projectRepo: ProjectRepo
  ) {
    this.publicLimiter = new TokenRateLimiter({
      limitPerWindow: Math.max(1, config.reportPublicRateLimit || 10),
      windowMs: 60 * 1000
    });
  }

  enforcePublicRateLimit(ip: string): void {
    const key = `report-public:${ip || "unknown"}`;
    const now = Date.now();
    this.publicLimiter.enforce(key, now);
    this.publicLimiter.cleanup(now);
  }

  getCapability(): { enabled: boolean } {
    return {
      enabled: Boolean(this.config.reportPublicEnabled)
    };
  }

  async listProjects(ctx: RequestContext): Promise<ReportPublicProjectEntity[]> {
    if (ctx.roles.includes("admin")) {
      return this.repo.listPublicProjects();
    }

    const manageableProjectIds = this.listManageableProjectIds(ctx);
    if (manageableProjectIds.length === 0) {
      return [];
    }
    return this.repo.listPublicProjectsByIds(manageableProjectIds);
  }

  async addProject(
    ctx: RequestContext,
    input: { projectId: string; allowAllProjects?: boolean }
  ): Promise<ReportPublicProjectEntity> {
    const normalizedProjectId = input.projectId.trim();
    if (!normalizedProjectId) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "projectId is required", 400);
    }
    const project = this.projectRepo.findById(normalizedProjectId);
    if (!project) {
      throw new AppError(ERROR_CODES.PROJECT_NOT_FOUND, `project not found: ${normalizedProjectId}`, 404);
    }
    if (project.status !== "active") {
      throw new AppError(ERROR_CODES.PROJECT_INACTIVE, "project is archived and read only", 400);
    }

    this.ensureCanManageProject(ctx, normalizedProjectId);

    const existing = this.repo.findPublicProjectByProjectId(normalizedProjectId);
    const allowAllProjects = input.allowAllProjects === true;
    if (existing) {
      this.repo.updatePublicProject(existing.id, {
        allowAllProjects,
        updatedAt: nowIso()
      });
      const updated = this.repo.findPublicProjectById(existing.id);
      if (!updated) {
        throw new AppError(ERROR_CODES.NOT_FOUND, "public project not found", 404);
      }
      return updated;
    }

    const now = nowIso();
    this.repo.createPublicProject({
      id: genId("rpp"),
      projectId: normalizedProjectId,
      shareToken: this.generateUniqueShareToken(),
      allowAllProjects,
      createdBy: this.resolveActorId(ctx),
      createdAt: now,
      updatedAt: now
    });

    const created = this.repo.findPublicProjectByProjectId(normalizedProjectId);
    if (!created) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "public project not found", 404);
    }
    return created;
  }

  async removeProject(ctx: RequestContext, id: string): Promise<void> {
    const entity = this.repo.findPublicProjectById(id);
    if (!entity) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "public project not found", 404);
    }
    this.ensureCanManageProject(ctx, entity.projectId);

    const deleted = this.repo.deletePublicProjectById(id);
    if (!deleted) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "public project not found", 404);
    }
  }

  async regenerateShareToken(ctx: RequestContext, id: string): Promise<ReportPublicProjectEntity> {
    const entity = this.repo.findPublicProjectById(id);
    if (!entity) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "public project not found", 404);
    }
    this.ensureCanManageProject(ctx, entity.projectId);

    this.repo.updateShareTokenById(id, this.generateUniqueShareToken(), nowIso());
    const updated = this.repo.findPublicProjectById(id);
    if (!updated) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "public project not found", 404);
    }
    return updated;
  }

  resolveVisibleProjects(shareToken?: string | null): ReportPublicProjectEntity[] {
    this.assertPublicEnabled();
    const normalizedShare = shareToken?.trim() || "";
    if (!normalizedShare) {
      return this.repo.listPublicProjects();
    }

    const matched = this.repo.findPublicProjectByShareToken(normalizedShare);
    if (!matched) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "share token invalid", 404);
    }

    if (matched.allowAllProjects) {
      return this.repo.listPublicProjects();
    }
    return [matched];
  }

  resolveAllowedProjectIds(shareToken?: string | null): string[] {
    const visible = this.resolveVisibleProjects(shareToken);
    return Array.from(new Set(visible.map((item) => item.projectId)));
  }

  resolvePreviewProjectIds(input: { projectId?: string | null; shareToken?: string | null }): string[] {
    const allowedProjectIds = this.resolveAllowedProjectIds(input.shareToken);
    if (allowedProjectIds.length === 0) {
      throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, "no public projects available", 403);
    }

    const targetProjectId = input.projectId?.trim();
    if (!targetProjectId) {
      return allowedProjectIds;
    }

    if (!allowedProjectIds.includes(targetProjectId)) {
      throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, "project is not publicly accessible", 403);
    }
    return [targetProjectId];
  }

  findTemplateById(id: string): { id: string; projectId: string; shareToken: string; title: string; naturalQuery: string } {
    this.assertPublicEnabled();
    const template = this.repo.findPublicTemplateById(id);
    if (!template) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "public report template not found", 404);
    }
    return template;
  }

  createPublicBoard(
    ctx: RequestContext,
    input: { title?: string; items: ReportPublicBoardPublishItemInput[] }
  ): ReportPublicBoardEntity {
    this.assertPublicEnabled();
    const itemNow = nowIso();
    const normalizedItems: Array<{
      id: string;
      sortOrder: number;
      title: string;
      naturalQuery: string;
      sql: string;
      params: string[];
      blocks: ReportPublicBoardPublishItemInput["blocks"];
      layoutSize: "compact" | "wide";
      createdAt: string;
      updatedAt: string;
    }> = input.items.map((item, index) => ({
      id: genId("rbi"),
      sortOrder: index,
      title: item.title.trim().slice(0, 120),
      naturalQuery: item.naturalQuery.trim().slice(0, 500),
      sql: item.sql.trim(),
      params: item.params,
      blocks: item.blocks,
      layoutSize: item.layoutSize === "compact" ? "compact" : "wide",
      createdAt: itemNow,
      updatedAt: itemNow
    }));
    if (normalizedItems.length === 0) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "board items are required", 400);
    }
    const fallbackTitle = normalizedItems[0]?.title || "公开积木看板";
    const boardTitle = (input.title?.trim() || fallbackTitle).slice(0, 120);
    const now = nowIso();
    const shareToken = this.generateUniqueBoardShareToken();
    this.repo.createPublicBoard({
      id: genId("rpb"),
      title: boardTitle,
      shareToken,
      createdBy: this.resolveActorId(ctx),
      createdAt: now,
      updatedAt: now,
      items: normalizedItems
    });

    const created = this.repo.findPublicBoardByShareToken(shareToken);
    if (!created) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "public board not found", 404);
    }
    return created;
  }

  resolvePublicBoardByShareToken(shareToken: string): ReportPublicBoardEntity {
    this.assertPublicEnabled();
    const normalizedShare = shareToken.trim();
    if (!normalizedShare) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "share token is required", 400);
    }

    const board = this.repo.findPublicBoardByShareToken(normalizedShare);
    if (!board) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "public board not found", 404);
    }
    return board;
  }

  listMyPublicBoards(ctx: RequestContext): ReportPublicBoardSummaryEntity[] {
    if (ctx.roles.includes("admin")) {
      return this.repo.listPublicBoards();
    }
    return this.repo.listPublicBoardsByCreator(this.resolveActorId(ctx));
  }

  deactivatePublicBoard(ctx: RequestContext, id: string): ReportPublicBoardSummaryEntity {
    const board = this.repo.findPublicBoardSummaryById(id);
    if (!board) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "public board not found", 404);
    }
    this.ensureCanManageBoard(ctx, board.createdBy);
    const updated = this.repo.updateBoardActiveById(id, false, nowIso());
    if (!updated) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "public board not found", 404);
    }
    const next = this.repo.findPublicBoardSummaryById(id);
    if (!next) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "public board not found", 404);
    }
    return next;
  }

  activatePublicBoard(ctx: RequestContext, id: string): ReportPublicBoardSummaryEntity {
    const board = this.repo.findPublicBoardSummaryById(id);
    if (!board) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "public board not found", 404);
    }
    this.ensureCanManageBoard(ctx, board.createdBy);
    const updated = this.repo.updateBoardActiveById(id, true, nowIso());
    if (!updated) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "public board not found", 404);
    }
    const next = this.repo.findPublicBoardSummaryById(id);
    if (!next) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "public board not found", 404);
    }
    return next;
  }

  removePublicBoard(ctx: RequestContext, id: string): void {
    const board = this.repo.findPublicBoardSummaryById(id);
    if (!board) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "public board not found", 404);
    }
    this.ensureCanManageBoard(ctx, board.createdBy);
    const deleted = this.repo.deletePublicBoardById(id);
    if (!deleted) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "public board not found", 404);
    }
  }

  assertPublicEnabled(): void {
    if (!this.config.reportPublicEnabled) {
      throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, "public report access is disabled", 403);
    }
  }

  private resolveActorId(ctx: RequestContext): string {
    return ctx.userId?.trim() || ctx.accountId;
  }

  private ensureCanManageProject(ctx: RequestContext, projectId: string): void {
    if (ctx.roles.includes("admin")) {
      return;
    }

    const userId = ctx.userId?.trim();
    if (!userId) {
      throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, "forbidden", 403);
    }

    const member = this.projectRepo.findMemberByProjectAndUserId(projectId, userId);
    if (!member || (!member.isOwner && member.roleCode !== "project_admin")) {
      throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, "forbidden", 403);
    }
  }

  private ensureCanManageBoard(ctx: RequestContext, createdBy: string): void {
    if (ctx.roles.includes("admin")) {
      return;
    }
    const actorId = this.resolveActorId(ctx);
    if (!actorId || actorId !== createdBy) {
      throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, "forbidden", 403);
    }
  }

  private listManageableProjectIds(ctx: RequestContext): string[] {
    const userId = ctx.userId?.trim();
    if (!userId) {
      return [];
    }
    const projectIds = this.projectRepo.listProjectIdsByUserId(userId);
    const manageable: string[] = [];
    for (const projectId of projectIds) {
      const project = this.projectRepo.findById(projectId);
      if (!project || project.status !== "active") {
        continue;
      }
      const member = this.projectRepo.findMemberByProjectAndUserId(projectId, userId);
      if (member && (member.isOwner || member.roleCode === "project_admin")) {
        manageable.push(projectId);
      }
    }
    return manageable;
  }

  private generateUniqueShareToken(): string {
    for (let i = 0; i < 10; i += 1) {
      const token = this.generateShareToken(PROJECT_SHARE_TOKEN_PREFIX);
      if (!this.repo.findPublicProjectByShareToken(token) && !this.repo.findPublicBoardByShareToken(token)) {
        return token;
      }
    }
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, "failed to generate share token", 500);
  }

  private generateUniqueBoardShareToken(): string {
    for (let i = 0; i < 10; i += 1) {
      const token = this.generateShareToken(BOARD_SHARE_TOKEN_PREFIX);
      if (!this.repo.findPublicBoardByShareToken(token) && !this.repo.findPublicProjectByShareToken(token)) {
        return token;
      }
    }
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, "failed to generate board share token", 500);
  }

  private generateShareToken(prefix: string): string {
    let token = "";
    for (let i = 0; i < SHARE_TOKEN_LENGTH; i += 1) {
      const randomIndex = Math.floor(Math.random() * SHARE_TOKEN_CHARSET.length);
      token += SHARE_TOKEN_CHARSET[randomIndex];
    }
    return `${prefix}${token}`;
  }
}
