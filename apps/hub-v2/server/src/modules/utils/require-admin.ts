import { ERROR_CODES } from "../../shared/errors/error-codes";
import { AppError } from "../../shared/errors/app-error";
import type { RequestContext } from "../../shared/context/request-context";

export function requireAdmin(ctx: RequestContext): void {
  if (!ctx.roles.includes("admin")) {
    throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, "forbidden", 403);
  }
}
