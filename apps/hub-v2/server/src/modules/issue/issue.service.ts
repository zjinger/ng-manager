import type { RequestContext } from "../../shared/context/request-context";
import { AppError } from "../../shared/errors/app-error";
import type { EventBus } from "../../shared/event/event-bus";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import type { ProjectAccessContract } from "../project/project-access.contract";
import type { UploadCommandContract } from "../upload/upload.contract";
import {
  requireIssueAssignAccess,
  requireIssueClaimAccess,
  requireIssueCloseAccess,
  requireIssueEditAccess,
  requireIssueReopenAccess,
  requireIssueResolveAccess,
  requireIssueStartAccess,
  requireIssueVerifyAccess
} from "./issue.policy";
import type { IssueCommandContract, IssueQueryContract } from "./issue.contract";
import { IssueRepo } from "./issue.repo";
import { transitionIssue } from "./issue-state-machine";
import type {
  AssignIssueInput,
  CloseIssueInput,
  CreateIssueInput,
  IssueAction,
  IssueDashboardActivity,
  IssueEntity,
  IssueDashboardTodo,
  IssueListResult,
  IssueLogEntity,
  ListIssuesQuery,
  ReopenIssueInput,
  ResolveIssueInput,
  UpdateIssueInput
} from "./issue.types";

type IssueMemberRef = {
  assigneeId: string | null;
  assigneeName: string | null;
  verifierId: string | null;
  verifierName: string | null;
};

export class IssueService implements IssueCommandContract, IssueQueryContract {
  constructor(
    private readonly repo: IssueRepo,
    private readonly projectAccess: ProjectAccessContract,
    private readonly eventBus: EventBus,
    private readonly uploadCommand: UploadCommandContract
  ) {}

  async create(input: CreateIssueInput, ctx: RequestContext): Promise<IssueEntity> {
    const projectId = input.projectId.trim();
    const issueType = input.type ?? "bug";
    await this.projectAccess.requireProjectAccess(projectId, ctx, "create issue");
    const members = await this.resolveMembers(projectId, input.assigneeId ?? null, input.verifierId ?? null);
    const reporterId = ctx.userId?.trim() || ctx.accountId;
    const reporterName = ctx.nickname?.trim() || ctx.userId?.trim() || ctx.accountId;
    const effectiveVerifierId = members.verifierId ?? reporterId;
    const effectiveVerifierName = members.verifierName ?? reporterName;
    const now = nowIso();
    const entity: IssueEntity = {
      id: genId("iss"),
      projectId,
      issueNo: this.repo.getNextIssueNo(projectId, issueType),
      title: input.title.trim(),
      description: input.description?.trim() || null,
      type: issueType,
      status: "open",
      priority: input.priority ?? "medium",
      reporterId,
      reporterName,
      assigneeId: members.assigneeId,
      assigneeName: members.assigneeName,
      verifierId: effectiveVerifierId,
      verifierName: effectiveVerifierName,
      moduleCode: input.moduleCode?.trim() || null,
      versionCode: input.versionCode?.trim() || null,
      environmentCode: input.environmentCode?.trim() || null,
      resolutionSummary: null,
      closeReason: null,
      closeRemark: null,
      reopenCount: 0,
      startedAt: null,
      resolvedAt: null,
      verifiedAt: null,
      closedAt: null,
      createdAt: now,
      updatedAt: now
    };

    this.repo.create(entity);
    await this.promoteTempMarkdownUploads(entity.id, entity.description, ctx);
    this.repo.createLog(this.createLog(entity.id, "create", null, entity.status, ctx, `创建问题 ${entity.issueNo}`));
    if (entity.assigneeId) {
      this.repo.createLog(
        this.createLog(
          entity.id,
          "assign",
          entity.status,
          entity.status,
          ctx,
          `创建时指派负责人：${entity.assigneeName || entity.assigneeId}`
        )
      );
    }
    await this.emitIssueEvent("issue.created", "created", entity, ctx);
    return entity;
  }

  async update(id: string, input: UpdateIssueInput, ctx: RequestContext): Promise<IssueEntity> {
    const current = await this.requireByIdWithAccess(id, ctx, "update issue");
    requireIssueEditAccess(current, ctx);

    const updatedAt = nowIso();
    const updated = this.repo.update(id, {
      title: input.title?.trim() || current.title,
      description: input.description === undefined ? current.description : input.description?.trim() || null,
      module_code: input.moduleCode === undefined ? current.moduleCode : input.moduleCode?.trim() || null,
      version_code: input.versionCode === undefined ? current.versionCode : input.versionCode?.trim() || null,
      environment_code:
        input.environmentCode === undefined ? current.environmentCode : input.environmentCode?.trim() || null,
      updated_at: updatedAt
    });

    if (!updated) {
      throw new AppError(ERROR_CODES.ISSUE_UPDATE_FAILED, "failed to update issue", 500);
    }

    const entity = this.requireById(id);
    this.repo.createLog(
      this.createLog(id, "update", current.status, entity.status, ctx, this.createUpdateSummary(current, input))
    );
    await this.emitIssueEvent("issue.updated", "updated", entity, ctx);
    return entity;
  }

  async assign(id: string, input: AssignIssueInput, ctx: RequestContext): Promise<IssueEntity> {
    const current = await this.requireByIdWithAccess(id, ctx, "assign issue");
    requireIssueAssignAccess(current, ctx, await this.isProjectAdmin(current.projectId, ctx));
    const member = await this.projectAccess.requireProjectMember(current.projectId, input.assigneeId.trim(), "assign issue");
    return this.applyAction(
      id,
      "assign",
      ctx,
      current,
      {
        assignee_id: member.userId,
        assignee_name: member.displayName
      },
      `指派给 ${member.displayName}`
    );
  }

  async claim(id: string, ctx: RequestContext): Promise<IssueEntity> {
    const current = await this.requireByIdWithAccess(id, ctx, "claim issue");
    requireIssueClaimAccess(current, ctx);

    const userId = ctx.userId?.trim();
    if (!userId) {
      throw new AppError(ERROR_CODES.ISSUE_CLAIM_FORBIDDEN, "issue claim forbidden", 403);
    }
    const member = await this.projectAccess.requireProjectMember(current.projectId, userId, "claim issue");

    return this.applyAction(
      id,
      "claim",
      ctx,
      current,
      {
        assignee_id: member.userId,
        assignee_name: member.displayName
      },
      `认领问题，负责人变更为 ${member.displayName}`
    );
  }

  async start(id: string, ctx: RequestContext): Promise<IssueEntity> {
    const current = await this.requireByIdWithAccess(id, ctx, "start issue");
    requireIssueStartAccess(current, ctx);
    const now = nowIso();
    return this.applyAction(
      id,
      "start",
      ctx,
      current,
      {
        started_at: current.startedAt ?? now
      },
      "开始处理问题",
      now
    );
  }

  async resolve(id: string, input: ResolveIssueInput, ctx: RequestContext): Promise<IssueEntity> {
    const current = await this.requireByIdWithAccess(id, ctx, "resolve issue");
    requireIssueResolveAccess(current, ctx);
    const now = nowIso();
    return this.applyAction(
      id,
      "resolve",
      ctx,
      current,
      {
        resolution_summary: input.resolutionSummary?.trim() || current.resolutionSummary,
        resolved_at: now,
        verified_at: null,
        closed_at: null
      },
      "标记问题已解决",
      now
    );
  }

  async verify(id: string, ctx: RequestContext): Promise<IssueEntity> {
    const current = await this.requireByIdWithAccess(id, ctx, "verify issue");
    requireIssueVerifyAccess(current, ctx);
    const now = nowIso();
    return this.applyAction(
      id,
      "verify",
      ctx,
      current,
      {
        verified_at: now,
        closed_at: null
      },
      "标记问题已验证",
      now
    );
  }

  async reopen(id: string, input: ReopenIssueInput, ctx: RequestContext): Promise<IssueEntity> {
    const current = await this.requireByIdWithAccess(id, ctx, "reopen issue");
    requireIssueReopenAccess(current, ctx);
    const reopenReason = input.remark?.trim() || null;
    return this.applyAction(
      id,
      "reopen",
      ctx,
      current,
      {
        close_remark: input.remark?.trim() || current.closeRemark,
        reopen_count: current.reopenCount + 1,
        resolved_at: null,
        verified_at: null,
        closed_at: null
      },
      reopenReason ? `重新打开问题：${reopenReason}` : "重新打开问题",
      undefined,
      reopenReason ? { reason: reopenReason } : undefined
    );
  }

  async close(id: string, input: CloseIssueInput, ctx: RequestContext): Promise<IssueEntity> {
    const current = await this.requireByIdWithAccess(id, ctx, "close issue");
    requireIssueCloseAccess(current, ctx);
    const now = nowIso();
    return this.applyAction(
      id,
      "close",
      ctx,
      current,
      {
        close_reason: input.reason?.trim() || current.closeReason,
        close_remark: input.remark?.trim() || current.closeRemark,
        closed_at: now
      },
      "关闭问题",
      now
    );
  }

  async list(query: ListIssuesQuery, ctx: RequestContext): Promise<IssueListResult> {
    const normalizedQuery: ListIssuesQuery = {
      ...query,
      reporterIds: query.reporterIds ?? [],
      assigneeIds: query.assigneeIds ?? (query.assigneeId?.trim() ? [query.assigneeId.trim()] : []),
      moduleCodes: query.moduleCodes ?? [],
      versionCodes: query.versionCodes ?? [],
      environmentCodes: query.environmentCodes ?? [],
      includeAssigneeParticipants: query.includeAssigneeParticipants ?? true,
      sortBy: query.sortBy ?? "updatedAt",
      sortOrder: query.sortOrder ?? "desc",
      assigneeId: query.assigneeIds && query.assigneeIds.length > 0 ? undefined : query.assigneeId,
    };

    if (query.projectId?.trim()) {
      await this.projectAccess.requireProjectAccess(query.projectId.trim(), ctx, "list issues");
      return this.repo.list(normalizedQuery, [query.projectId.trim()]);
    }

    if (ctx.roles.includes("admin")) {
      return this.repo.list(normalizedQuery);
    }

    const projectIds = await this.projectAccess.listAccessibleProjectIds(ctx);
    return this.repo.list(normalizedQuery, projectIds);
  }

  async getById(id: string, ctx: RequestContext): Promise<IssueEntity> {
    return this.requireByIdWithAccess(id, ctx, "get issue");
  }

  async listLogs(id: string, ctx: RequestContext): Promise<IssueLogEntity[]> {
    await this.requireByIdWithAccess(id, ctx, "list issue logs");
    return this.repo.listLogs(id);
  }

  async countAssignedForDashboard(projectIds: string[], userId: string, _ctx: RequestContext): Promise<number> {
    return this.repo.countAssignedForDashboard(projectIds, userId);
  }

  async countVerifyingForDashboard(projectIds: string[], userId: string, _ctx: RequestContext): Promise<number> {
    return this.repo.countVerifyingForDashboard(projectIds, userId);
  }

  async countReportedUnresolvedForDashboard(projectIds: string[], userId: string, _ctx: RequestContext): Promise<number> {
    return this.repo.countReportedUnresolvedForDashboard(projectIds, userId);
  }

  async listTodosForDashboard(
    projectIds: string[],
    userId: string,
    limit: number,
    _ctx: RequestContext
  ): Promise<IssueDashboardTodo[]> {
    return this.repo.listTodosForDashboard(projectIds, userId, limit);
  }

  async listActivitiesForDashboard(
    projectIds: string[],
    userId: string,
    limit: number,
    _ctx: RequestContext
  ): Promise<IssueDashboardActivity[]> {
    return this.repo.listActivitiesForDashboard(projectIds, userId, limit);
  }

  private async requireByIdWithAccess(id: string, ctx: RequestContext, action: string): Promise<IssueEntity> {
    const entity = this.requireById(id);
    await this.projectAccess.requireProjectAccess(entity.projectId, ctx, action);
    return entity;
  }

  private requireById(id: string): IssueEntity {
    const entity = this.repo.findById(id);
    if (!entity) {
      throw new AppError(ERROR_CODES.ISSUE_NOT_FOUND, `issue not found: ${id}`, 404);
    }
    return entity;
  }

  private async resolveMembers(
    projectId: string,
    assigneeId: string | null | undefined,
    verifierId: string | null | undefined
  ): Promise<IssueMemberRef> {
    let assigneeName: string | null = null;
    let verifierName: string | null = null;
    let normalizedAssigneeId = assigneeId?.trim() || null;
    let normalizedVerifierId = verifierId?.trim() || null;

    if (normalizedAssigneeId) {
      const assignee = await this.projectAccess.requireProjectMember(projectId, normalizedAssigneeId, "resolve assignee");
      normalizedAssigneeId = assignee.userId;
      assigneeName = assignee.displayName;
    }

    if (normalizedVerifierId) {
      const verifier = await this.projectAccess.requireProjectMember(projectId, normalizedVerifierId, "resolve verifier");
      normalizedVerifierId = verifier.userId;
      verifierName = verifier.displayName;
    }

    return {
      assigneeId: normalizedAssigneeId,
      assigneeName,
      verifierId: normalizedVerifierId,
      verifierName
    };
  }

  private async applyAction(
    id: string,
    action: Exclude<IssueAction, "create" | "update">,
    ctx: RequestContext,
    current: IssueEntity,
    extra: Record<string, unknown>,
    summary: string,
    actionAt?: string,
    meta?: Record<string, unknown>
  ): Promise<IssueEntity> {
    const nextStatus = transitionIssue(current.status, action);
    const updatedAt = actionAt ?? nowIso();
    const updated = this.repo.update(id, {
      status: nextStatus,
      updated_at: updatedAt,
      ...extra
    });

    if (!updated) {
      throw new AppError(ERROR_CODES.ISSUE_ACTION_FAILED, `failed to ${action} issue`, 500);
    }

    const entity = this.requireById(id);
    this.repo.createLog(this.createLog(id, action, current.status, entity.status, ctx, summary, meta));
    await this.emitIssueEvent("issue.updated", action, entity, ctx);
    return entity;
  }

  private createLog(
    issueId: string,
    action: IssueAction,
    fromStatus: IssueEntity["status"] | null,
    toStatus: IssueEntity["status"] | null,
    ctx: RequestContext,
    summary: string,
    meta?: Record<string, unknown>
  ): IssueLogEntity {
    return {
      id: genId("islog"),
      issueId,
      actionType: action,
      fromStatus,
      toStatus,
      operatorId: ctx.userId?.trim() || ctx.accountId,
      operatorName: ctx.nickname?.trim() || ctx.userId?.trim() || ctx.accountId,
      summary,
      metaJson: meta ? JSON.stringify(meta) : null,
      createdAt: nowIso()
    };
  }

  private createUpdateSummary(current: IssueEntity, input: UpdateIssueInput): string {
    const changes: string[] = [];

    if (input.title !== undefined && input.title.trim() !== current.title) {
      changes.push("更新标题");
    }
    if (input.description !== undefined && (input.description?.trim() || null) !== current.description) {
      changes.push("更新描述");
    }
    if (input.moduleCode !== undefined && (input.moduleCode?.trim() || null) !== current.moduleCode) {
      changes.push("更新模块");
    }
    if (input.versionCode !== undefined && (input.versionCode?.trim() || null) !== current.versionCode) {
      changes.push("更新版本");
    }
    if (input.environmentCode !== undefined && (input.environmentCode?.trim() || null) !== current.environmentCode) {
      changes.push("更新环境");
    }

    return changes.length > 0 ? changes.join("；") : "更新问题信息";
  }

  private async emitIssueEvent(type: string, action: string, entity: IssueEntity, ctx: RequestContext): Promise<void> {
    await this.eventBus.emit({
      type,
      scope: "project",
      projectId: entity.projectId,
      entityType: "issue",
      entityId: entity.id,
      action,
      actorId: ctx.accountId,
      occurredAt: entity.updatedAt,
      payload: {
        issueNo: entity.issueNo,
        title: entity.title,
        status: entity.status,
        priority: entity.priority
      }
    });
  }

  private async promoteTempMarkdownUploads(issueId: string, description: string | null, ctx: RequestContext): Promise<void> {
    if (!description) {
      return;
    }
    const uploadIds = this.extractUploadIdsFromMarkdown(description);
    if (uploadIds.length === 0) {
      return;
    }
    await this.uploadCommand.promoteIssueMarkdownUploads(uploadIds, issueId, ctx);
  }

  private extractUploadIdsFromMarkdown(content: string): string[] {
    const ids = new Set<string>();
    const pattern = /\/api\/admin\/uploads\/([a-zA-Z0-9_]+)\/raw/g;
    let match = pattern.exec(content);
    while (match) {
      const id = match[1]?.trim();
      if (id) {
        ids.add(id);
      }
      match = pattern.exec(content);
    }
    return Array.from(ids);
  }

  private async isProjectAdmin(projectId: string, ctx: RequestContext): Promise<boolean> {
    if (ctx.roles.includes("admin")) {
      return true;
    }

    const userId = ctx.userId?.trim();
    if (!userId) {
      return false;
    }

    const member = await this.projectAccess.requireProjectMember(projectId, userId, "issue role check");
    return member.roleCode === "project_admin" || member.isOwner;
  }
}
