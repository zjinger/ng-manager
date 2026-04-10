import type { RequestContext } from "../../../shared/context/request-context";
import { AppError } from "../../../shared/errors/app-error";
import { ERROR_CODES } from "../../../shared/errors/error-codes";
import type { EventBus } from "../../../shared/event/event-bus";
import { genId } from "../../../shared/utils/id";
import { nowIso } from "../../../shared/utils/time";
import type { ProjectAccessContract } from "../../project/project-access.contract";
import { IssueParticipantRepo } from "../participant/issue-participant.repo";
import { IssueRepo } from "../issue.repo";
import type { IssueLogEntity } from "../issue.types";
import { IssueBranchRepo } from "./issue-branch.repo";
import type { IssueBranchCommandContract, IssueBranchQueryContract } from "./issue-branch.contract";
import type {
  CompleteIssueBranchInput,
  CreateIssueBranchInput,
  IssueBranchEntity,
  StartOwnIssueBranchInput
} from "./issue-branch.types";

export class IssueBranchService implements IssueBranchCommandContract, IssueBranchQueryContract {
  constructor(
    private readonly issueRepo: IssueRepo,
    private readonly branchRepo: IssueBranchRepo,
    private readonly participantRepo: IssueParticipantRepo,
    private readonly projectAccess: ProjectAccessContract,
    private readonly eventBus: EventBus
  ) {}

  async list(issueId: string, ctx: RequestContext): Promise<IssueBranchEntity[]> {
    await this.requireIssueWithAccess(issueId, ctx, "list issue branches");
    return this.branchRepo.listByIssueId(issueId);
  }

  async create(issueId: string, input: CreateIssueBranchInput, ctx: RequestContext): Promise<IssueBranchEntity> {
    const issue = await this.requireIssueWithAccess(issueId, ctx, "create issue branch");
    this.assertIssueBranchEditable(issue.status);
    await this.requireAssigneeOrAdmin(issue.projectId, issue.assigneeId, ctx, "create issue branch");

    const ownerUserId = input.ownerUserId.trim();
    if (!this.participantRepo.exists(issue.id, ownerUserId)) {
      throw new AppError(ERROR_CODES.ISSUE_PARTICIPANT_NOT_FOUND, "issue participant not found", 404);
    }

    const participant = this.participantRepo.listByIssueId(issue.id).find((item) => item.userId === ownerUserId);
    if (!participant) {
      throw new AppError(ERROR_CODES.ISSUE_PARTICIPANT_NOT_FOUND, "issue participant not found", 404);
    }

    const now = nowIso();
    const entity: IssueBranchEntity = {
      id: genId("isb"),
      issueId: issue.id,
      ownerUserId: participant.userId,
      ownerUserName: participant.userName,
      title: input.title.trim(),
      status: "todo",
      summary: null,
      startedAt: null,
      finishedAt: null,
      createdById: ctx.userId?.trim() || ctx.accountId,
      createdByName: ctx.nickname?.trim() || ctx.userId?.trim() || ctx.accountId,
      createdAt: now,
      updatedAt: now
    };

    this.branchRepo.create(entity);
    this.issueRepo.createLog(this.createLog(issue.id, ctx, `创建协作分支：${entity.title} -> ${entity.ownerUserName}`, {
      kind: "issue_branch.created",
      branchId: entity.id,
      ownerUserId: entity.ownerUserId,
      ownerUserName: entity.ownerUserName,
      title: entity.title
    }, now));
    await this.emitIssueUpdated(issue, ctx, now, [entity.ownerUserId]);
    return entity;
  }

  async start(issueId: string, branchId: string, ctx: RequestContext): Promise<IssueBranchEntity> {
    const issue = await this.requireIssueWithAccess(issueId, ctx, "start issue branch");
    this.assertIssueBranchStartable(issue.status);
    const branch = this.requireBranch(issue.id, branchId);
    this.requireBranchOwner(branch, ctx);

    if (branch.status === "in_progress") {
      return branch;
    }
    if (branch.status === "done") {
      throw new AppError(ERROR_CODES.ISSUE_ACTION_FAILED, "issue branch already completed", 409);
    }

    const now = nowIso();
    const updated = this.branchRepo.update(issue.id, branch.id, {
      status: "in_progress",
      started_at: branch.startedAt ?? now,
      updated_at: now
    });
    if (!updated) {
      throw new AppError(ERROR_CODES.ISSUE_ACTION_FAILED, "failed to start issue branch", 500);
    }

    const entity = this.requireBranch(issue.id, branch.id);
    this.issueRepo.createLog(this.createLog(issue.id, ctx, `开始协作分支：${entity.title}`, {
      kind: "issue_branch.started",
      branchId: entity.id,
      title: entity.title
    }, now));
    await this.emitIssueUpdated(issue, ctx, now, [entity.ownerUserId]);
    return entity;
  }

  async startMine(issueId: string, input: StartOwnIssueBranchInput, ctx: RequestContext): Promise<IssueBranchEntity> {
    const issue = await this.requireIssueWithAccess(issueId, ctx, "start my issue branch");
    this.assertIssueBranchStartable(issue.status);

    const userId = ctx.userId?.trim();
    if (!userId) {
      throw new AppError(ERROR_CODES.ISSUE_ACTION_FAILED, "current user missing", 403);
    }
    if (!this.participantRepo.exists(issue.id, userId)) {
      throw new AppError(ERROR_CODES.ISSUE_PARTICIPANT_FORBIDDEN, "issue participant manage forbidden", 403);
    }

    const existing = this.branchRepo.findLatestOwnUnfinished(issue.id, userId);
    if (existing) {
      if (existing.status === "todo") {
        return this.start(issue.id, existing.id, ctx);
      }
      return existing;
    }

    const participant = this.participantRepo.listByIssueId(issue.id).find((item) => item.userId === userId);
    if (!participant) {
      throw new AppError(ERROR_CODES.ISSUE_PARTICIPANT_NOT_FOUND, "issue participant not found", 404);
    }

    const now = nowIso();
    const title = input.title.trim();
    const entity: IssueBranchEntity = {
      id: genId("isb"),
      issueId: issue.id,
      ownerUserId: participant.userId,
      ownerUserName: participant.userName,
      title,
      status: "in_progress",
      summary: null,
      startedAt: now,
      finishedAt: null,
      createdById: ctx.userId?.trim() || ctx.accountId,
      createdByName: ctx.nickname?.trim() || ctx.userId?.trim() || ctx.accountId,
      createdAt: now,
      updatedAt: now
    };

    this.branchRepo.create(entity);
    this.issueRepo.createLog(this.createLog(issue.id, ctx, `领取协作分支：${entity.title}`, {
      kind: "issue_branch.claimed",
      branchId: entity.id,
      title: entity.title
    }, now));
    await this.emitIssueUpdated(issue, ctx, now, [entity.ownerUserId]);
    return entity;
  }

  async complete(issueId: string, branchId: string, input: CompleteIssueBranchInput, ctx: RequestContext): Promise<IssueBranchEntity> {
    const issue = await this.requireIssueWithAccess(issueId, ctx, "complete issue branch");
    this.assertIssueBranchEditable(issue.status);
    const branch = this.requireBranch(issue.id, branchId);
    this.requireBranchOwner(branch, ctx);

    if (branch.status === "done") {
      return branch;
    }

    const now = nowIso();
    const updated = this.branchRepo.update(issue.id, branch.id, {
      status: "done",
      summary: input.summary?.trim() || branch.summary,
      started_at: branch.startedAt ?? now,
      finished_at: now,
      updated_at: now
    });
    if (!updated) {
      throw new AppError(ERROR_CODES.ISSUE_ACTION_FAILED, "failed to complete issue branch", 500);
    }

    const entity = this.requireBranch(issue.id, branch.id);
    this.issueRepo.createLog(this.createLog(issue.id, ctx, `完成协作分支：${entity.title}`, {
      kind: "issue_branch.completed",
      branchId: entity.id,
      title: entity.title
    }, now));
    await this.emitIssueUpdated(
      issue,
      ctx,
      now,
      [entity.ownerUserId],
      "branch.completed",
      {
        branchId: entity.id,
        branchTitle: entity.title,
        branchOwnerUserId: entity.ownerUserId,
        branchOwnerUserName: entity.ownerUserName,
        operatorName: ctx.nickname?.trim() || ctx.userId?.trim() || ctx.accountId
      }
    );
    return entity;
  }

  private async requireIssueWithAccess(issueId: string, ctx: RequestContext, action: string) {
    const issue = this.issueRepo.findById(issueId);
    if (!issue) {
      throw new AppError(ERROR_CODES.ISSUE_NOT_FOUND, `issue not found: ${issueId}`, 404);
    }
    await this.projectAccess.requireProjectAccess(issue.projectId, ctx, action);
    return issue;
  }

  private requireBranch(issueId: string, branchId: string): IssueBranchEntity {
    const branch = this.branchRepo.findById(issueId, branchId);
    if (!branch) {
      throw new AppError(ERROR_CODES.ISSUE_NOT_FOUND, `issue branch not found: ${branchId}`, 404);
    }
    return branch;
  }

  private assertIssueBranchEditable(status: string): void {
    if (status === "verified" || status === "closed") {
      throw new AppError(ERROR_CODES.ISSUE_ACTION_FAILED, "issue branches are locked", 409);
    }
  }

  private assertIssueBranchStartable(status: string): void {
    if (status === "resolved" || status === "verified" || status === "closed") {
      throw new AppError(ERROR_CODES.ISSUE_ACTION_FAILED, "issue branch start is locked", 409);
    }
  }

  private async requireAssigneeOrAdmin(projectId: string, assigneeId: string | null, ctx: RequestContext, action: string): Promise<void> {
    const userId = ctx.userId?.trim();
    if (!userId) {
      throw new AppError(ERROR_CODES.ISSUE_ASSIGN_FORBIDDEN, `${action} forbidden`, 403);
    }
    const member = await this.projectAccess.requireProjectMember(projectId, userId, action);
    if (member.roleCode === "project_admin" || member.isOwner || assigneeId === userId) {
      return;
    }
    throw new AppError(ERROR_CODES.ISSUE_ASSIGN_FORBIDDEN, `${action} forbidden`, 403);
  }

  private requireBranchOwner(branch: IssueBranchEntity, ctx: RequestContext): void {
    const userId = ctx.userId?.trim();
    const accountId = ctx.accountId?.trim();
    if (branch.ownerUserId === userId || branch.ownerUserId === accountId) {
      return;
    }
    throw new AppError(ERROR_CODES.ISSUE_ACTION_FAILED, "issue branch operation forbidden", 403);
  }

  private createLog(
    issueId: string,
    ctx: RequestContext,
    summary: string,
    meta: Record<string, unknown>,
    createdAt: string
  ): IssueLogEntity {
    return {
      id: genId("islog"),
      issueId,
      actionType: "update",
      fromStatus: null,
      toStatus: null,
      operatorId: ctx.userId?.trim() || ctx.accountId,
      operatorName: ctx.nickname?.trim() || ctx.userId?.trim() || ctx.accountId,
      summary,
      metaJson: JSON.stringify(meta),
      createdAt
    };
  }

  private async emitIssueUpdated(
    issue: { id: string; projectId: string; issueNo: string; title: string; status: string; priority: string; assigneeId: string | null; reporterId: string; verifierId: string | null; },
    ctx: RequestContext,
    occurredAt: string,
    affectedUserIds: string[],
    action = "updated",
    extraPayload: Record<string, unknown> = {}
  ): Promise<void> {
    await this.eventBus.emit({
      type: "issue.updated",
      scope: "project",
      projectId: issue.projectId,
      entityType: "issue",
      entityId: issue.id,
      action,
      actorId: ctx.accountId,
      occurredAt,
      payload: {
        issueNo: issue.issueNo,
        title: issue.title,
        status: issue.status,
        priority: issue.priority,
        assigneeId: issue.assigneeId,
        reporterId: issue.reporterId,
        verifierId: issue.verifierId,
        affectedUserIds,
        ...extraPayload
      }
    });
  }
}
