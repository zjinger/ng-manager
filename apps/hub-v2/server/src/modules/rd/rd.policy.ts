import { AppError } from "../../shared/errors/app-error";
import type { RequestContext } from "../../shared/context/request-context";
import type { RdItemEntity } from "./rd.types";

function isAdmin(ctx: RequestContext): boolean {
  return ctx.roles.includes("admin");
}

function matchActor(ctx: RequestContext, actorId: string | null): boolean {
  return !!actorId && !!ctx.userId && actorId === ctx.userId;
}

export function requireRdStageManageAccess(ctx: RequestContext): void {
  if (isAdmin(ctx)) {
    return;
  }
  throw new AppError("RD_STAGE_FORBIDDEN", "rd stage forbidden", 403);
}

export function requireRdAcceptAccess(item: RdItemEntity, ctx: RequestContext): void {
  const effectiveReviewerId = item.reviewerId || item.assigneeId;
  if (matchActor(ctx, effectiveReviewerId)) {
    return;
  }
  throw new AppError("RD_ACCEPT_FORBIDDEN", "rd item accept forbidden", 403);
}
