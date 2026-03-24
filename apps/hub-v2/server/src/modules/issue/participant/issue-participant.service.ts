import type { RequestContext } from "../../../shared/context/request-context";
import { AppError } from "../../../shared/errors/app-error";
import type { EventBus } from "../../../shared/event/event-bus";
import { genId } from "../../../shared/utils/id";
import { nowIso } from "../../../shared/utils/time";
import type { ProjectAccessContract } from "../../project/project-access.contract";
import { IssueRepo } from "../issue.repo";
import type { IssueLogEntity } from "../issue.types";
import type { IssueParticipantCommandContract, IssueParticipantQueryContract } from "./issue-participant.contract";
import { IssueParticipantRepo } from "./issue-participant.repo";
import type { AddIssueParticipantInput, IssueParticipantEntity } from "./issue-participant.types";

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
    const member = await this.projectAccess.requireProjectMember(issue.projectId, input.userId.trim(), "add issue participant");

    if (this.participantRepo.exists(issue.id, member.userId)) {
      throw new AppError("ISSUE_PARTICIPANT_EXISTS", "participant already exists", 409);
    }

    const entity: IssueParticipantEntity = {
      id: genId("isp"),
      issueId: issue.id,
      userId: member.userId,
      userName: member.displayName,
      createdAt: nowIso()
    };

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
        userName: entity.userName
      }
    });

    return entity;
  }

  async list(issueId: string, ctx: RequestContext): Promise<IssueParticipantEntity[]> {
    await this.requireIssueWithAccess(issueId, ctx, "list issue participants");
    return this.participantRepo.listByIssueId(issueId);
  }

  async remove(issueId: string, participantId: string, ctx: RequestContext): Promise<{ ok: true }> {
    const issue = await this.requireIssueWithAccess(issueId, ctx, "remove issue participant");
    const participant = this.participantRepo.findById(issue.id, participantId);
    if (!participant) {
      throw new AppError("ISSUE_PARTICIPANT_NOT_FOUND", `participant not found: ${participantId}`, 404);
    }

    const deleted = this.participantRepo.delete(issue.id, participantId);
    if (!deleted) {
      throw new AppError("ISSUE_PARTICIPANT_DELETE_FAILED", "failed to delete participant", 500);
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
        userName: participant.userName
      }
    });

    return { ok: true };
  }

  private requireIssue(issueId: string) {
    const issue = this.issueRepo.findById(issueId);
    if (!issue) {
      throw new AppError("ISSUE_NOT_FOUND", `issue not found: ${issueId}`, 404);
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
      summary: `${kind === "participant.added" ? "added" : "removed"} participant ${userName}`,
      metaJson: JSON.stringify({ kind, userName }),
      createdAt
    };
  }
}
