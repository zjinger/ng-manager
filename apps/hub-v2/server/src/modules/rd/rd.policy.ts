import { ERROR_CODES } from "../../shared/errors/error-codes";
import { AppError } from "../../shared/errors/app-error";
import type { RequestContext } from "../../shared/context/request-context";
import type { RdItemEntity } from "./rd.types";

function matchActor(ctx: RequestContext, actorId: string | null): boolean {
  return !!actorId && !!ctx.userId && actorId === ctx.userId;
}

export function requireRdStageManageAccess(_ctx: RequestContext): void {
  throw new AppError(ERROR_CODES.RD_STAGE_FORBIDDEN, "rd stage forbidden", 403);
}

export function requireRdAcceptAccess(item: RdItemEntity, ctx: RequestContext): void {
  const effectiveVerifierId = item.verifierId || item.creatorId;
  if (matchActor(ctx, effectiveVerifierId)) {
    return;
  }
  throw new AppError(ERROR_CODES.RD_ACCEPT_FORBIDDEN, "rd item accept forbidden", 403);
}
