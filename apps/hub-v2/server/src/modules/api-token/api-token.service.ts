import { ERROR_CODES } from "../../shared/errors/error-codes";
import { createHash, randomBytes } from "node:crypto";
import type { RequestContext } from "../../shared/context/request-context";
import { AppError } from "../../shared/errors/app-error";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import type { FeedbackQueryContract } from "../feedback/feedback.contract";
import type { IssueQueryContract } from "../issue/issue.contract";
import type { ProjectAccessContract } from "../project/project-access.contract";
import { ProjectRepo } from "../project/project.repo";
import type { RdQueryContract } from "../rd/rd.contract";
import type { ApiTokenCommandContract, ApiTokenQueryContract } from "./api-token.contract";
import { ApiTokenRepo } from "./api-token.repo";
import type {
  ApiTokenScope,
  CreateProjectApiTokenInput,
  CreateProjectApiTokenResult,
  ListProjectApiTokensResult,
  TokenFeedbackDetail,
  TokenFeedbackListQuery,
  TokenFeedbackListResult,
  TokenIssueDetail,
  TokenIssueListQuery,
  TokenIssueListResult,
  TokenIssueLogsResult,
  TokenRdDetail,
  TokenRdListQuery,
  TokenRdListResult,
  TokenRdLogsResult,
  VerifyApiTokenResult
} from "./api-token.types";

const TOKEN_PREFIX = "ngm_ptk";
const TOKEN_PREFIX_LENGTH = 16;

export class ApiTokenService implements ApiTokenCommandContract, ApiTokenQueryContract {
  constructor(
    private readonly repo: ApiTokenRepo,
    private readonly projectRepo: ProjectRepo,
    private readonly projectAccess: ProjectAccessContract,
    private readonly issueQuery: IssueQueryContract,
    private readonly rdQuery: RdQueryContract,
    private readonly feedbackQuery: FeedbackQueryContract
  ) {}

  async createProjectToken(input: CreateProjectApiTokenInput, ctx: RequestContext): Promise<CreateProjectApiTokenResult> {
    const project = this.requireProjectByKey(input.projectKey);
    const projectId = project.id;
    await this.projectAccess.requireProjectAccess(projectId, ctx, "create project api token");
    await this.requireTokenManager(projectId, ctx, "create project api token");

    const name = input.name.trim();
    if (!name) {
      throw new AppError(ERROR_CODES.TOKEN_NAME_REQUIRED, "token name is required", 400);
    }

    const scopes = Array.from(new Set(input.scopes)).filter((scope) => this.isScope(scope));
    if (scopes.length === 0) {
      throw new AppError(ERROR_CODES.TOKEN_SCOPE_REQUIRED, "at least one scope is required", 400);
    }

    const now = nowIso();
    const tokenValue = this.generateTokenValue();
    const entityId = genId("tkn");
    const tokenPrefix = tokenValue.slice(0, TOKEN_PREFIX_LENGTH);
    const tokenHash = this.hashToken(tokenValue);

    this.repo.create({
      id: entityId,
      projectId,
      ownerUserId: ctx.accountId,
      name,
      tokenPrefix,
      tokenHash,
      scopes,
      expiresAt: input.expiresAt?.trim() || null,
      createdAt: now,
      updatedAt: now
    });

    const entity = this.repo.findById(entityId);
    if (!entity) {
      throw new AppError(ERROR_CODES.TOKEN_CREATE_FAILED, "failed to create token", 500);
    }
    return {
      token: tokenValue,
      entity: {
        id: entity.id,
        projectId: entity.projectId,
        ownerUserId: entity.ownerUserId,
        name: entity.name,
        tokenPrefix: entity.tokenPrefix,
        scopes: entity.scopes,
        status: entity.status,
        expiresAt: entity.expiresAt,
        lastUsedAt: entity.lastUsedAt,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt
      }
    };
  }

  async listProjectTokens(projectKey: string, ctx: RequestContext): Promise<ListProjectApiTokensResult> {
    const project = this.requireProjectByKey(projectKey);
    const normalizedProjectId = project.id;
    await this.projectAccess.requireProjectAccess(normalizedProjectId, ctx, "list project api tokens");
    await this.requireTokenManager(normalizedProjectId, ctx, "list project api tokens");
    return { items: this.repo.listByProject(normalizedProjectId) };
  }

  async revokeProjectToken(projectKey: string, tokenId: string, ctx: RequestContext): Promise<void> {
    const project = this.requireProjectByKey(projectKey);
    const normalizedProjectId = project.id;
    await this.projectAccess.requireProjectAccess(normalizedProjectId, ctx, "revoke project api token");
    await this.requireTokenManager(normalizedProjectId, ctx, "revoke project api token");

    const token = this.repo.findById(tokenId.trim());
    if (!token || token.projectId !== normalizedProjectId) {
      throw new AppError(ERROR_CODES.TOKEN_NOT_FOUND, "token not found", 404);
    }
    if (token.status === "revoked") {
      return;
    }
    this.repo.updateStatus(token.id, "revoked", nowIso());
  }

  async verifyToken(rawToken: string): Promise<VerifyApiTokenResult | null> {
    const tokenValue = rawToken.trim();
    if (!tokenValue.startsWith(`${TOKEN_PREFIX}_`) || tokenValue.length < TOKEN_PREFIX_LENGTH) {
      return null;
    }
    const tokenPrefix = tokenValue.slice(0, TOKEN_PREFIX_LENGTH);
    const entity = this.repo.findByPrefix(tokenPrefix);
    if (!entity || entity.status !== "active") {
      return null;
    }
    if (entity.expiresAt && entity.expiresAt <= nowIso()) {
      return null;
    }
    const expectedHash = this.hashToken(tokenValue);
    if (entity.tokenHash !== expectedHash) {
      return null;
    }
    this.repo.touchLastUsed(entity.id, nowIso());

    return {
      tokenId: entity.id,
      projectId: entity.projectId,
      ownerUserId: entity.ownerUserId,
      scopes: entity.scopes
    };
  }

  async listIssues(projectKey: string, query: TokenIssueListQuery, ctx: RequestContext): Promise<TokenIssueListResult> {
    const project = this.assertTokenProject(projectKey, ctx);
    return this.issueQuery.list({ ...query, projectId: project.id }, ctx);
  }

  async getIssueById(projectKey: string, issueId: string, ctx: RequestContext): Promise<TokenIssueDetail> {
    const project = this.assertTokenProject(projectKey, ctx);
    const entity = await this.issueQuery.getById(issueId, ctx);
    if (entity.projectId !== project.id) {
      throw new AppError(ERROR_CODES.ISSUE_NOT_FOUND, "issue not found", 404);
    }
    return entity;
  }

  async listIssueLogs(projectKey: string, issueId: string, ctx: RequestContext): Promise<TokenIssueLogsResult> {
    const project = this.assertTokenProject(projectKey, ctx);
    const issue = await this.issueQuery.getById(issueId, ctx);
    if (issue.projectId !== project.id) {
      throw new AppError(ERROR_CODES.ISSUE_NOT_FOUND, "issue not found", 404);
    }
    return { items: await this.issueQuery.listLogs(issueId, ctx) };
  }

  async listRdItems(projectKey: string, query: TokenRdListQuery, ctx: RequestContext): Promise<TokenRdListResult> {
    const project = this.assertTokenProject(projectKey, ctx);
    return this.rdQuery.listItems({ ...query, projectId: project.id }, ctx);
  }

  async getRdItemById(projectKey: string, itemId: string, ctx: RequestContext): Promise<TokenRdDetail> {
    const project = this.assertTokenProject(projectKey, ctx);
    const entity = await this.rdQuery.getItemById(itemId, ctx);
    if (entity.projectId !== project.id) {
      throw new AppError(ERROR_CODES.RD_ITEM_NOT_FOUND, "rd item not found", 404);
    }
    return entity;
  }

  async listRdLogs(projectKey: string, itemId: string, ctx: RequestContext): Promise<TokenRdLogsResult> {
    const project = this.assertTokenProject(projectKey, ctx);
    const item = await this.rdQuery.getItemById(itemId, ctx);
    if (item.projectId !== project.id) {
      throw new AppError(ERROR_CODES.RD_ITEM_NOT_FOUND, "rd item not found", 404);
    }
    return { items: await this.rdQuery.listLogs(itemId, ctx) };
  }

  async listFeedbacks(
    projectKey: string,
    query: TokenFeedbackListQuery,
    ctx: RequestContext
  ): Promise<TokenFeedbackListResult> {
    this.assertTokenProject(projectKey, ctx);
    return this.feedbackQuery.list({ ...query, projectKey }, ctx);
  }

  async getFeedbackById(projectKey: string, feedbackId: string, ctx: RequestContext): Promise<TokenFeedbackDetail> {
    this.assertTokenProject(projectKey, ctx);
    const feedback = await this.feedbackQuery.getById(feedbackId, ctx);
    if (projectKey && feedback.projectKey !== projectKey) {
      throw new AppError(ERROR_CODES.FEEDBACK_NOT_FOUND, "feedback not found", 404);
    }
    return feedback;
  }

  private requireProjectByKey(projectKey: string) {
    const normalizedProjectKey = projectKey.trim();
    const project = this.projectRepo.findByKey(normalizedProjectKey);
    if (!project) {
      throw new AppError(ERROR_CODES.PROJECT_NOT_FOUND, `project not found: ${projectKey}`, 404);
    }
    return project;
  }

  private async requireTokenManager(projectId: string, ctx: RequestContext, action: string): Promise<void> {
    if (ctx.roles.includes("admin")) {
      return;
    }
    const userId = ctx.userId?.trim();
    if (!userId) {
      throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, `${action} forbidden`, 403);
    }
    const member = await this.projectAccess.requireProjectMember(projectId, userId, action);
    const canManage = member.isOwner || member.roleCode === "project_admin";
    if (!canManage) {
      throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, `${action} forbidden`, 403);
    }
  }

  private generateTokenValue(): string {
    const raw = randomBytes(24).toString("hex");
    return `${TOKEN_PREFIX}_${raw}`;
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private isScope(scope: string): scope is ApiTokenScope {
    return scope === "issues:read" || scope === "rd:read" || scope === "feedbacks:read";
  }

  private assertTokenProject(projectKey: string, ctx: RequestContext) {
    if (ctx.authType !== "token") {
      throw new AppError(ERROR_CODES.TOKEN_UNAUTHORIZED, "token unauthorized", 401);
    }
    const project = this.requireProjectByKey(projectKey);
    if (!ctx.projectIds?.includes(project.id)) {
      throw new AppError(ERROR_CODES.TOKEN_PROJECT_FORBIDDEN, "token project forbidden", 403);
    }
    return project;
  }
}
