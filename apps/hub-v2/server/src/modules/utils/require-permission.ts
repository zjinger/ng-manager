import { ERROR_CODES } from "../../shared/errors/error-codes";
import { AppError } from "../../shared/errors/app-error";
import type { RequestContext } from "../../shared/context/request-context";

export type PermissionMode = "any" | "all";

export function requirePermission(ctx: RequestContext, codes: string | string[], mode: PermissionMode = "any"): void {
  const required = (Array.isArray(codes) ? codes : [codes]).map((item) => item.trim()).filter(Boolean);
  if (required.length === 0) {
    return;
  }
  const granted = new Set(ctx.authScopes ?? []);
  const pass =
    mode === "all"
      ? required.every((code) => granted.has(code))
      : required.some((code) => granted.has(code));
  if (!pass) {
    throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, "forbidden", 403);
  }
}
