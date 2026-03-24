import type { RequestContext } from "../../../shared/context/request-context";
import { AppError } from "../../../shared/errors/app-error";
import type { EventBus } from "../../../shared/event/event-bus";
import { genId } from "../../../shared/utils/id";
import { nowIso } from "../../../shared/utils/time";
import type { ProjectAccessContract } from "../../project/project-access.contract";
import { IssueRepo } from "../issue.repo";
import type { IssueLogEntity } from "../issue.types";
import type { IssueCommentCommandContract, IssueCommentQueryContract } from "./issue-comment.contract";
import { IssueCommentRepo } from "./issue-comment.repo";
import type { CreateIssueCommentInput, IssueCommentEntity } from "./issue-comment.types";

export class IssueCommentService implements IssueCommentCommandContract, IssueCommentQueryContract {
  constructor(
    private readonly issueRepo: IssueRepo,
    private readonly commentRepo: IssueCommentRepo,
    private readonly projectAccess: ProjectAccessContract,
    private readonly eventBus: EventBus
  ) {}

  async create(issueId: string, input: CreateIssueCommentInput, ctx: RequestContext): Promise<IssueCommentEntity> {
    const issue = await this.requireIssueWithAccess(issueId, ctx, "create issue comment");
    const now = nowIso();
    const entity: IssueCommentEntity = {
      id: genId("isc"),
      issueId: issue.id,
      authorId: ctx.userId?.trim() || ctx.accountId,
      authorName: ctx.nickname?.trim() || ctx.userId?.trim() || ctx.accountId,
      content: input.content.trim(),
      mentionsJson: input.mentions && input.mentions.length > 0 ? JSON.stringify(input.mentions) : null,
      createdAt: now,
      updatedAt: now
    };

    this.commentRepo.create(entity);
    this.issueRepo.createLog(this.createCommentLog(issue.id, ctx, entity.content));
    await this.eventBus.emit({
      type: "issue.commented",
      scope: "project",
      projectId: issue.projectId,
      entityType: "issue",
      entityId: issue.id,
      action: "commented",
      actorId: ctx.accountId,
      occurredAt: now,
      payload: {
        issueNo: issue.issueNo,
        commentId: entity.id
      }
    });

    return entity;
  }

  async list(issueId: string, ctx: RequestContext): Promise<IssueCommentEntity[]> {
    await this.requireIssueWithAccess(issueId, ctx, "list issue comments");
    return this.commentRepo.listByIssueId(issueId);
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

  private createCommentLog(issueId: string, ctx: RequestContext, content: string): IssueLogEntity {
    return {
      id: genId("islog"),
      issueId,
      actionType: "update",
      fromStatus: null,
      toStatus: null,
      operatorId: ctx.userId?.trim() || ctx.accountId,
      operatorName: ctx.nickname?.trim() || ctx.userId?.trim() || ctx.accountId,
      summary: content.length > 60 ? `${content.slice(0, 57)}...` : content,
      metaJson: JSON.stringify({ kind: "comment" }),
      createdAt: nowIso()
    };
  }
}
