import { createHash, randomBytes } from "node:crypto";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import type { RequestContext } from "../../shared/context/request-context";
import { AppError } from "../../shared/errors/app-error";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import { PersonalTokenRepo } from "./personal-token.repo";
import type {
  CreatePersonalApiTokenInput,
  CreatePersonalApiTokenResult,
  ListPersonalApiTokensResult,
  PersonalProjectCapabilitiesResult,
  PersonalTokenIdentityResult,
  PersonalTokenScope,
  VerifyPersonalApiTokenResult
} from "./personal-token.types";
import type { PersonalTokenCommandContract, PersonalTokenQueryContract } from "./personal-token.contract";
import { ProjectRepo } from "../project/project.repo";
import { UserRepo } from "../user/user.repo";

const TOKEN_PREFIX = "ngm_uptk";
const TOKEN_PREFIX_LENGTH = 17;

export class PersonalTokenService implements PersonalTokenCommandContract, PersonalTokenQueryContract {
  constructor(
    private readonly repo: PersonalTokenRepo,
    private readonly projectRepo: ProjectRepo,
    private readonly userRepo: UserRepo
  ) {}

  async create(input: CreatePersonalApiTokenInput, ctx: RequestContext): Promise<CreatePersonalApiTokenResult> {
    const ownerUserId = ctx.userId?.trim();
    if (!ownerUserId) {
      throw new AppError(ERROR_CODES.TOKEN_OWNER_REQUIRED, "token owner required", 400);
    }

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
    const tokenId = genId("uptk");
    const tokenPrefix = tokenValue.slice(0, TOKEN_PREFIX_LENGTH);
    const tokenHash = this.hashToken(tokenValue);

    this.repo.create({
      id: tokenId,
      ownerUserId,
      name,
      tokenPrefix,
      tokenHash,
      scopes,
      expiresAt: input.expiresAt?.trim() || null,
      createdAt: now,
      updatedAt: now
    });

    const entity = this.repo.findById(tokenId);
    if (!entity) {
      throw new AppError(ERROR_CODES.TOKEN_CREATE_FAILED, "failed to create personal token", 500);
    }

    return {
      token: tokenValue,
      entity: {
        id: entity.id,
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

  async list(ctx: RequestContext): Promise<ListPersonalApiTokensResult> {
    const ownerUserId = ctx.userId?.trim();
    if (!ownerUserId) {
      throw new AppError(ERROR_CODES.TOKEN_OWNER_REQUIRED, "token owner required", 400);
    }
    return { items: this.repo.listByOwner(ownerUserId) };
  }

  async revoke(tokenId: string, ctx: RequestContext): Promise<void> {
    const ownerUserId = ctx.userId?.trim();
    if (!ownerUserId) {
      throw new AppError(ERROR_CODES.TOKEN_OWNER_REQUIRED, "token owner required", 400);
    }

    const token = this.repo.findById(tokenId.trim());
    if (!token || token.ownerUserId !== ownerUserId) {
      throw new AppError(ERROR_CODES.TOKEN_NOT_FOUND, "token not found", 404);
    }
    if (token.status === "revoked") {
      return;
    }
    this.repo.updateStatus(token.id, "revoked", nowIso());
  }

  async verifyToken(rawToken: string): Promise<VerifyPersonalApiTokenResult | null> {
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

    const owner = this.userRepo.findById(entity.ownerUserId);
    if (!owner || owner.status !== "active") {
      return null;
    }

    this.repo.touchLastUsed(entity.id, nowIso());
    return {
      tokenId: entity.id,
      ownerUserId: entity.ownerUserId,
      ownerNickname: owner?.displayName?.trim() || owner?.username?.trim() || entity.ownerUserId,
      scopes: entity.scopes
    };
  }

  resolveProjectId(projectKey: string): string {
    const normalizedProjectKey = projectKey.trim();
    const project = this.projectRepo.findByKey(normalizedProjectKey);
    if (!project) {
      throw new AppError(ERROR_CODES.PROJECT_NOT_FOUND, `project not found: ${projectKey}`, 404);
    }
    return project.id;
  }

  getIdentity(ctx: RequestContext): PersonalTokenIdentityResult {
    const userId = ctx.userId?.trim();
    if (!userId) {
      throw new AppError(ERROR_CODES.TOKEN_OWNER_REQUIRED, "token owner required", 400);
    }

    return {
      tokenId: ctx.tokenId ?? ctx.accountId,
      userId,
      nickname: ctx.nickname ?? null,
      scopes: (ctx.authScopes ?? []) as PersonalTokenScope[]
    };
  }

  getProjectCapabilities(projectKey: string, ctx: RequestContext): PersonalProjectCapabilitiesResult {
    const userId = ctx.userId?.trim();
    if (!userId) {
      throw new AppError(ERROR_CODES.TOKEN_OWNER_REQUIRED, "token owner required", 400);
    }

    const project = this.projectRepo.findByKey(projectKey.trim());
    if (!project) {
      throw new AppError(ERROR_CODES.PROJECT_NOT_FOUND, `project not found: ${projectKey}`, 404);
    }

    const member = this.projectRepo.findMemberByProjectAndUserId(project.id, userId);
    const scopeSet = new Set((ctx.authScopes ?? []) as PersonalTokenScope[]);

    const issueCaps = {
      canComment: scopeSet.has("issue:comment:write"),
      canTransition: scopeSet.has("issue:transition:write"),
      canAssign: scopeSet.has("issue:assign:write"),
      canManageParticipants: scopeSet.has("issue:participant:write")
    };

    const rdCaps = {
      canTransition: scopeSet.has("rd:transition:write"),
      canEdit: scopeSet.has("rd:edit:write"),
      canDelete: scopeSet.has("rd:delete:write")
    };

    const hasWriteScope =
      issueCaps.canComment ||
      issueCaps.canTransition ||
      issueCaps.canAssign ||
      issueCaps.canManageParticipants ||
      rdCaps.canTransition ||
      rdCaps.canEdit ||
      rdCaps.canDelete;

    const isProjectMember = !!member;
    const writable = project.status === "active" && isProjectMember && hasWriteScope;

    let readOnlyReason: string | null = null;
    if (project.status !== "active") {
      readOnlyReason = "project_archived";
    } else if (!isProjectMember) {
      readOnlyReason = "not_project_member";
    } else if (!hasWriteScope) {
      readOnlyReason = "scope_missing";
    }

    return {
      project: {
        id: project.id,
        key: project.projectKey,
        name: project.name,
        status: project.status,
        visibility: project.visibility
      },
      actor: {
        userId,
        nickname: ctx.nickname ?? null,
        isProjectMember,
        memberRole: member?.roleCode ?? null,
        isOwner: member?.isOwner ?? false,
        isProjectAdmin: member ? member.isOwner || member.roleCode === "project_admin" : false
      },
      scopes: {
        all: Array.from(scopeSet),
        issue: issueCaps,
        rd: rdCaps
      },
      writable,
      readOnlyReason
    };
  }

  private generateTokenValue(): string {
    const raw = randomBytes(24).toString("hex");
    return `${TOKEN_PREFIX}_${raw}`;
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private isScope(scope: string): scope is PersonalTokenScope {
    return (
      scope === "issue:comment:write" ||
      scope === "issue:transition:write" ||
      scope === "issue:assign:write" ||
      scope === "issue:participant:write" ||
      scope === "rd:transition:write" ||
      scope === "rd:edit:write" ||
      scope === "rd:delete:write"
    );
  }
}
