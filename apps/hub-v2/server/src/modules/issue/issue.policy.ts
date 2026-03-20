import { AppError } from "../../shared/errors/app-error";
import type { RequestContext } from "../../shared/context/request-context";
import type { IssueEntity } from "./issue.types";

function isAdmin(ctx: RequestContext): boolean {
  return ctx.roles.includes("admin");
}

function matchActor(ctx: RequestContext, actorId: string | null): boolean {
  return !!actorId && !!ctx.userId && actorId === ctx.userId;
}

export function requireIssueEditAccess(issue: IssueEntity, ctx: RequestContext): void {
  if (
    isAdmin(ctx) ||
    matchActor(ctx, issue.reporterId) ||
    matchActor(ctx, issue.assigneeId) ||
    matchActor(ctx, issue.verifierId)
  ) {
    return;
  }

  throw new AppError("ISSUE_EDIT_FORBIDDEN", "issue edit forbidden", 403);
}

export function requireIssueAssignAccess(ctx: RequestContext): void {
  if (isAdmin(ctx)) {
    return;
  }

  throw new AppError("ISSUE_ASSIGN_FORBIDDEN", "issue assign forbidden", 403);
}

export function requireIssueStartAccess(issue: IssueEntity, ctx: RequestContext): void {
  if (isAdmin(ctx) || matchActor(ctx, issue.assigneeId)) {
    return;
  }

  throw new AppError("ISSUE_START_FORBIDDEN", "issue start forbidden", 403);
}

export function requireIssueResolveAccess(issue: IssueEntity, ctx: RequestContext): void {
  if (isAdmin(ctx) || matchActor(ctx, issue.assigneeId)) {
    return;
  }

  throw new AppError("ISSUE_RESOLVE_FORBIDDEN", "issue resolve forbidden", 403);
}

export function requireIssueVerifyAccess(issue: IssueEntity, ctx: RequestContext): void {
  if (isAdmin(ctx) || matchActor(ctx, issue.verifierId) || matchActor(ctx, issue.reporterId)) {
    return;
  }

  throw new AppError("ISSUE_VERIFY_FORBIDDEN", "issue verify forbidden", 403);
}

export function requireIssueReopenAccess(issue: IssueEntity, ctx: RequestContext): void {
  if (isAdmin(ctx) || matchActor(ctx, issue.verifierId) || matchActor(ctx, issue.reporterId)) {
    return;
  }

  throw new AppError("ISSUE_REOPEN_FORBIDDEN", "issue reopen forbidden", 403);
}

export function requireIssueCloseAccess(ctx: RequestContext): void {
  if (isAdmin(ctx)) {
    return;
  }

  throw new AppError("ISSUE_CLOSE_FORBIDDEN", "issue close forbidden", 403);
}
