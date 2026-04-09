import { ERROR_CODES } from "../../shared/errors/error-codes";
import { AppError } from "../../shared/errors/app-error";
import type { RequestContext } from "../../shared/context/request-context";
import type { IssueEntity } from "./issue.types";

function matchActor(ctx: RequestContext, actorId: string | null): boolean {
  return !!actorId && !!ctx.userId && actorId === ctx.userId;
}

export function requireIssueEditAccess(issue: IssueEntity, ctx: RequestContext): void {
  if (matchActor(ctx, issue.reporterId)) {
    return;
  }

  throw new AppError(ERROR_CODES.ISSUE_EDIT_FORBIDDEN, "issue edit forbidden", 403);
}

export function requireIssueAssignAccess(issue: IssueEntity, ctx: RequestContext, isProjectAdmin = false): void {
  if (isProjectAdmin) {
    return;
  }

  // 当前负责人可在 open/reopened/in_progress 执行转派。
  if (
    matchActor(ctx, issue.assigneeId) &&
    (issue.status === "open" ||
      issue.status === "reopened" ||
      issue.status === "in_progress" ||
      issue.status === "pending_update")
  ) {
    return;
  }

  // 提报人仅能在“开始处理前”执行重新指派。
  if (matchActor(ctx, issue.reporterId) && (issue.status === "open" || issue.status === "reopened")) {
    return;
  }

  throw new AppError(ERROR_CODES.ISSUE_ASSIGN_FORBIDDEN, "issue assign forbidden", 403);
}

export function requireIssueClaimAccess(issue: IssueEntity, ctx: RequestContext): void {
  if (!ctx.userId?.trim()) {
    throw new AppError(ERROR_CODES.ISSUE_CLAIM_FORBIDDEN, "issue claim forbidden", 403);
  }

  if (issue.assigneeId) {
    throw new AppError(ERROR_CODES.ISSUE_ALREADY_ASSIGNED, "issue already assigned", 409);
  }
}

export function requireIssueParticipantManageAccess(
  issue: IssueEntity,
  ctx: RequestContext,
  isProjectAdmin = false
): void {
  // 仅在“未处理(open)”“处理中(in_progress)”或“待提测(pending_update)”允许管理协作人。
  if (issue.status !== "open" && issue.status !== "in_progress" && issue.status !== "pending_update") {
    throw new AppError(ERROR_CODES.ISSUE_PARTICIPANT_FORBIDDEN, "issue participant manage forbidden", 403);
  }

  if (isProjectAdmin || matchActor(ctx, issue.reporterId) || matchActor(ctx, issue.assigneeId)) {
    return;
  }

  throw new AppError(ERROR_CODES.ISSUE_PARTICIPANT_FORBIDDEN, "issue participant manage forbidden", 403);
}

export function requireIssueStartAccess(issue: IssueEntity, ctx: RequestContext): void {
  if (matchActor(ctx, issue.assigneeId)) {
    return;
  }

  throw new AppError(ERROR_CODES.ISSUE_START_FORBIDDEN, "issue start forbidden", 403);
}

export function requireIssueResolveAccess(issue: IssueEntity, ctx: RequestContext): void {
  if (matchActor(ctx, issue.assigneeId)) {
    return;
  }

  throw new AppError(ERROR_CODES.ISSUE_RESOLVE_FORBIDDEN, "issue resolve forbidden", 403);
}

export function requireIssueVerifyAccess(issue: IssueEntity, ctx: RequestContext): void {
  if (matchActor(ctx, issue.verifierId) || matchActor(ctx, issue.reporterId)) {
    return;
  }

  throw new AppError(ERROR_CODES.ISSUE_VERIFY_FORBIDDEN, "issue verify forbidden", 403);
}

export function requireIssueReopenAccess(issue: IssueEntity, ctx: RequestContext): void {
  if (matchActor(ctx, issue.verifierId) || matchActor(ctx, issue.reporterId)) {
    return;
  }

  throw new AppError(ERROR_CODES.ISSUE_REOPEN_FORBIDDEN, "issue reopen forbidden", 403);
}

export function requireIssueCloseAccess(issue: IssueEntity, ctx: RequestContext): void {
  // 提报人可在未进入处理流程前关闭（open/reopened），或验证通过后关闭（verified）。
  if (
    matchActor(ctx, issue.reporterId) &&
    (issue.status === "open" || issue.status === "reopened" || issue.status === "verified")
  ) {
    return;
  }

  throw new AppError(ERROR_CODES.ISSUE_CLOSE_FORBIDDEN, "issue close forbidden", 403);
}
