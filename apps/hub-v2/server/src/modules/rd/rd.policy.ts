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

export function requireRdEditAccess(item: RdItemEntity, ctx: RequestContext): void {
  if (isAdmin(ctx) || matchActor(ctx, item.creatorId) || matchActor(ctx, item.assigneeId) || matchActor(ctx, item.reviewerId)) {
    return;
  }
  throw new AppError("RD_EDIT_FORBIDDEN", "rd item edit forbidden", 403);
}

export function requireRdStartAccess(item: RdItemEntity, ctx: RequestContext): void {
  if (isAdmin(ctx) || matchActor(ctx, item.assigneeId)) {
    return;
  }
  throw new AppError("RD_START_FORBIDDEN", "rd item start forbidden", 403);
}

export function requireRdBlockAccess(item: RdItemEntity, ctx: RequestContext): void {
  if (isAdmin(ctx) || matchActor(ctx, item.assigneeId)) {
    return;
  }
  throw new AppError("RD_BLOCK_FORBIDDEN", "rd item block forbidden", 403);
}

export function requireRdCompleteAccess(item: RdItemEntity, ctx: RequestContext): void {
  if (isAdmin(ctx) || matchActor(ctx, item.assigneeId)) {
    return;
  }
  throw new AppError("RD_COMPLETE_FORBIDDEN", "rd item complete forbidden", 403);
}

export function requireRdAcceptAccess(item: RdItemEntity, ctx: RequestContext): void {
  if (isAdmin(ctx) || matchActor(ctx, item.reviewerId) || matchActor(ctx, item.creatorId)) {
    return;
  }
  throw new AppError("RD_ACCEPT_FORBIDDEN", "rd item accept forbidden", 403);
}

export function requireRdCloseAccess(ctx: RequestContext): void {
  if (isAdmin(ctx)) {
    return;
  }
  throw new AppError("RD_CLOSE_FORBIDDEN", "rd item close forbidden", 403);
}
