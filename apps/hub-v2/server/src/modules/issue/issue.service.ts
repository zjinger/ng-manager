import type { RequestContext } from "../../shared/context/request-context";
import { AppError } from "../../shared/errors/app-error";
import type { EventBus } from "../../shared/event/event-bus";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import type { ProjectAccessContract } from "../project/project-access.contract";
import {
  requireIssueAssignAccess,
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
    private readonly eventBus: EventBus
  ) {}

  async create(input: CreateIssueInput, ctx: RequestContext): Promise<IssueEntity> {
    const projectId = input.projectId.trim();
    await this.projectAccess.requireProjectAccess(projectId, ctx, "create issue");
    const members = await this.resolveMembers(projectId, input.assigneeId ?? null, input.verifierId ?? null);
    const now = nowIso();
    const entity: IssueEntity = {
      id: genId("iss"),
      projectId,
      issueNo: this.repo.getNextIssueNo(),
      title: input.title.trim(),
      description: input.description?.trim() || null,
      type: input.type ?? "bug",
      status: "open",
      priority: input.priority ?? "medium",
      reporterId: ctx.userId?.trim() || ctx.accountId,
      reporterName: ctx.userId?.trim() || ctx.accountId,
      assigneeId: members.assigneeId,
      assigneeName: members.assigneeName,
      verifierId: members.verifierId,
      verifierName: members.verifierName,
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
    this.repo.createLog(this.createLog(entity.id, "create", null, entity.status, ctx, `created ${entity.issueNo}`));
    await this.emitIssueEvent("issue.created", "created", entity, ctx);
    return entity;
  }

  async update(id: string, input: UpdateIssueInput, ctx: RequestContext): Promise<IssueEntity> {
    const current = await this.requireByIdWithAccess(id, ctx, "update issue");
    requireIssueEditAccess(current, ctx);

    const members = await this.resolveMembers(
      current.projectId,
      input.assigneeId === undefined ? current.assigneeId : input.assigneeId,
      input.verifierId === undefined ? current.verifierId : input.verifierId
    );
    const updatedAt = nowIso();
    const updated = this.repo.update(id, {
      title: input.title?.trim() || current.title,
      description: input.description === undefined ? current.description : input.description?.trim() || null,
      type: input.type ?? current.type,
      priority: input.priority ?? current.priority,
      assignee_id: members.assigneeId,
      assignee_name: members.assigneeName,
      verifier_id: members.verifierId,
      verifier_name: members.verifierName,
      module_code: input.moduleCode === undefined ? current.moduleCode : input.moduleCode?.trim() || null,
      version_code: input.versionCode === undefined ? current.versionCode : input.versionCode?.trim() || null,
      environment_code:
        input.environmentCode === undefined ? current.environmentCode : input.environmentCode?.trim() || null,
      updated_at: updatedAt
    });

    if (!updated) {
      throw new AppError("ISSUE_UPDATE_FAILED", "failed to update issue", 500);
    }

    const entity = this.requireById(id);
    this.repo.createLog(this.createLog(id, "update", current.status, entity.status, ctx, "updated issue"));
    await this.emitIssueEvent("issue.updated", "updated", entity, ctx);
    return entity;
  }

  async assign(id: string, input: AssignIssueInput, ctx: RequestContext): Promise<IssueEntity> {
    const current = await this.requireByIdWithAccess(id, ctx, "assign issue");
    requireIssueAssignAccess(ctx);
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
      `assigned to ${member.displayName}`
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
      "started issue",
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
      "resolved issue",
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
      "verified issue",
      now
    );
  }

  async reopen(id: string, input: ReopenIssueInput, ctx: RequestContext): Promise<IssueEntity> {
    const current = await this.requireByIdWithAccess(id, ctx, "reopen issue");
    requireIssueReopenAccess(current, ctx);
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
      "reopened issue"
    );
  }

  async close(id: string, input: CloseIssueInput, ctx: RequestContext): Promise<IssueEntity> {
    const current = await this.requireByIdWithAccess(id, ctx, "close issue");
    requireIssueCloseAccess(ctx);
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
      "closed issue",
      now
    );
  }

  async list(query: ListIssuesQuery, ctx: RequestContext): Promise<IssueListResult> {
    if (query.projectId?.trim()) {
      await this.projectAccess.requireProjectAccess(query.projectId.trim(), ctx, "list issues");
      return this.repo.list(query, [query.projectId.trim()]);
    }

    if (ctx.roles.includes("admin")) {
      return this.repo.list(query);
    }

    const projectIds = await this.projectAccess.listAccessibleProjectIds(ctx);
    return this.repo.list(query, projectIds);
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

  async listTodosForDashboard(
    projectIds: string[],
    userId: string,
    limit: number,
    _ctx: RequestContext
  ): Promise<IssueDashboardTodo[]> {
    return this.repo.listTodosForDashboard(projectIds, userId, limit);
  }

  private async requireByIdWithAccess(id: string, ctx: RequestContext, action: string): Promise<IssueEntity> {
    const entity = this.requireById(id);
    await this.projectAccess.requireProjectAccess(entity.projectId, ctx, action);
    return entity;
  }

  private requireById(id: string): IssueEntity {
    const entity = this.repo.findById(id);
    if (!entity) {
      throw new AppError("ISSUE_NOT_FOUND", `issue not found: ${id}`, 404);
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
    actionAt?: string
  ): Promise<IssueEntity> {
    const nextStatus = transitionIssue(current.status, action);
    const updatedAt = actionAt ?? nowIso();
    const updated = this.repo.update(id, {
      status: nextStatus,
      updated_at: updatedAt,
      ...extra
    });

    if (!updated) {
      throw new AppError("ISSUE_ACTION_FAILED", `failed to ${action} issue`, 500);
    }

    const entity = this.requireById(id);
    this.repo.createLog(this.createLog(id, action, current.status, entity.status, ctx, summary));
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
      operatorName: ctx.userId?.trim() || ctx.accountId,
      summary,
      metaJson: meta ? JSON.stringify(meta) : null,
      createdAt: nowIso()
    };
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
}
