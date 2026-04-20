import type { RequestContext } from "../../../shared/context/request-context";
import { AppError } from "../../../shared/errors/app-error";
import type { EventBus } from "../../../shared/event/event-bus";
import { ERROR_CODES } from "../../../shared/errors/error-codes";
import { genId } from "../../../shared/utils/id";
import { nowIso } from "../../../shared/utils/time";
import type { ProjectAccessContract } from "../../project/project-access.contract";
import { IssueRepo } from "../issue.repo";
import { requireIssueParticipantManageAccess } from "../issue.policy";
import type { IssueLogEntity } from "../issue.types";
import type { IssueParticipantCommandContract, IssueParticipantQueryContract } from "./issue-participant.contract";
import { IssueParticipantRepo } from "./issue-participant.repo";
import type {
  AddIssueParticipantInput,
  AddIssueParticipantsBatchInput,
  IssueParticipantEntity
} from "./issue-participant.types";

export class IssueParticipantService implements IssueParticipantCommandContract, IssueParticipantQueryContract {
  constructor(
    private readonly issueRepo: IssueRepo,
    private readonly participantRepo: IssueParticipantRepo,
    private readonly projectAccess: ProjectAccessContract,
    private readonly eventBus: EventBus
  ) {}

  async add(
    issueId: string,
    input: AddIssueParticipantInput,
    ctx: RequestContext
  ): Promise<IssueParticipantEntity> {
    const issue = await this.requireIssueWithAccess(issueId, ctx, "add issue participant");
    requireIssueParticipantManageAccess(issue, ctx, await this.isProjectAdmin(issue.projectId, ctx));
    const member = await this.projectAccess.requireProjectMember(issue.projectId, input.userId.trim(), "add issue participant");

    if (issue.assigneeId && issue.assigneeId === member.userId) {
      throw new AppError(ERROR_CODES.ISSUE_PARTICIPANT_EXISTS, "assignee cannot be participant", 409);
    }

    if (this.participantRepo.exists(issue.id, member.userId)) {
      throw new AppError(ERROR_CODES.ISSUE_PARTICIPANT_EXISTS, "participant already exists", 409);
    }

    const entity = this.createParticipantEntity(issue.id, member.userId, member.displayName);

    this.participantRepo.create(entity);
    this.issueRepo.createLog(this.createParticipantLog(issue.id, ctx, member.displayName, "participant.added", entity.createdAt));
    await this.eventBus.emit({
      type: "issue.updated",
      scope: "project",
      projectId: issue.projectId,
      entityType: "issue",
      entityId: issue.id,
      action: "participant.added",
      actorId: ctx.accountId,
      occurredAt: entity.createdAt,
      payload: {
        issueNo: issue.issueNo,
        participantId: entity.id,
        userId: entity.userId,
        userName: entity.userName,
        assigneeId: issue.assigneeId,
        reporterId: issue.reporterId,
        verifierId: issue.verifierId,
        participantUserIds: [entity.userId]
      }
    });

    return entity;
  }

  async addBatch(
    issueId: string,
    input: AddIssueParticipantsBatchInput,
    ctx: RequestContext
  ): Promise<IssueParticipantEntity[]> {
    const issue = await this.requireIssueWithAccess(issueId, ctx, "add issue participants");
    requireIssueParticipantManageAccess(issue, ctx, await this.isProjectAdmin(issue.projectId, ctx));

    const userIds = [...new Set(input.userIds.map((item) => item.trim()).filter(Boolean))];
    if (userIds.length === 0) {
      return [];
    }

    const entities: IssueParticipantEntity[] = [];
    const names: string[] = [];

    for (const userId of userIds) {
      const member = await this.projectAccess.requireProjectMember(issue.projectId, userId, "add issue participant");
      if (issue.assigneeId && issue.assigneeId === member.userId) {
        throw new AppError(ERROR_CODES.ISSUE_PARTICIPANT_EXISTS, "assignee cannot be participant", 409);
      }
      if (this.participantRepo.exists(issue.id, member.userId)) {
        throw new AppError(ERROR_CODES.ISSUE_PARTICIPANT_EXISTS, "participant already exists", 409);
      }
      const entity = this.createParticipantEntity(issue.id, member.userId, member.displayName);
      this.participantRepo.create(entity);
      entities.push(entity);
      names.push(member.displayName);
    }

    const createdAt = nowIso();
    this.issueRepo.createLog({
      id: genId("islog"),
      issueId: issue.id,
      actionType: "update",
      fromStatus: null,
      toStatus: null,
      operatorId: ctx.userId?.trim() || ctx.accountId,
      operatorName: ctx.nickname?.trim() || ctx.userId?.trim() || ctx.accountId,
      summary: `添加协作人 ${names.join("、")}`,
      metaJson: JSON.stringify({ kind: "participant.added.batch", userNames: names, userIds }),
      createdAt
    });

    await this.eventBus.emit({
      type: "issue.updated",
      scope: "project",
      projectId: issue.projectId,
      entityType: "issue",
      entityId: issue.id,
      action: "participant.added",
      actorId: ctx.accountId,
      occurredAt: createdAt,
      payload: {
        issueNo: issue.issueNo,
        participantIds: entities.map((item) => item.id),
        userIds,
        userNames: names,
        assigneeId: issue.assigneeId,
        reporterId: issue.reporterId,
        verifierId: issue.verifierId,
        participantUserIds: userIds
      }
    });

    return entities;
  }

  async list(issueId: string, ctx: RequestContext): Promise<IssueParticipantEntity[]> {
    await this.requireIssueWithAccess(issueId, ctx, "list issue participants");
    return this.participantRepo.listByIssueId(issueId);
  }

  async remove(issueId: string, participantId: string, ctx: RequestContext): Promise<{ ok: true }> {
    const issue = await this.requireIssueWithAccess(issueId, ctx, "remove issue participant");
    requireIssueParticipantManageAccess(issue, ctx, await this.isProjectAdmin(issue.projectId, ctx));
    const participant = this.participantRepo.findById(issue.id, participantId);
    if (!participant) {
      throw new AppError(ERROR_CODES.ISSUE_PARTICIPANT_NOT_FOUND, `participant not found: ${participantId}`, 404);
    }

    const deleted = this.participantRepo.delete(issue.id, participantId);
    if (!deleted) {
      throw new AppError(ERROR_CODES.ISSUE_PARTICIPANT_DELETE_FAILED, "failed to delete participant", 500);
    }

    const now = nowIso();
    this.issueRepo.createLog(this.createParticipantLog(issue.id, ctx, participant.userName, "participant.removed", now));
    await this.eventBus.emit({
      type: "issue.updated",
      scope: "project",
      projectId: issue.projectId,
      entityType: "issue",
      entityId: issue.id,
      action: "participant.removed",
      actorId: ctx.accountId,
      occurredAt: now,
      payload: {
        issueNo: issue.issueNo,
        participantId: participant.id,
        userId: participant.userId,
        userName: participant.userName,
        assigneeId: issue.assigneeId,
        reporterId: issue.reporterId,
        verifierId: issue.verifierId,
        participantUserIds: [participant.userId]
      }
    });

    return { ok: true };
  }

  private requireIssue(issueId: string) {
    const issue = this.issueRepo.findById(issueId);
    if (!issue) {
      throw new AppError(ERROR_CODES.ISSUE_NOT_FOUND, `issue not found: ${issueId}`, 404);
    }
    return issue;
  }

  private async requireIssueWithAccess(issueId: string, ctx: RequestContext, action: string) {
    const issue = this.requireIssue(issueId);
    await this.projectAccess.requireProjectAccess(issue.projectId, ctx, action);
    return issue;
  }

  private createParticipantLog(
    issueId: string,
    ctx: RequestContext,
    userName: string,
    kind: "participant.added" | "participant.removed",
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
      summary: `${kind === "participant.added" ? "添加协作人" : "移除协作人"} ${userName}`,
      metaJson: JSON.stringify({ kind, userName }),
      createdAt
    };
  }

  private createParticipantEntity(issueId: string, userId: string, userName: string): IssueParticipantEntity {
    return {
      id: genId("isp"),
      issueId,
      userId,
      userName,
      createdAt: nowIso()
    };
  }

  private async isProjectAdmin(projectId: string, ctx: RequestContext): Promise<boolean> {
    const userId = ctx.userId?.trim();
    if (!userId) {
      return false;
    }

    const member = await this.projectAccess.requireProjectMember(projectId, userId, "issue participant role check");
    return member.roleCode === "project_admin" || member.isOwner;
  }
}
