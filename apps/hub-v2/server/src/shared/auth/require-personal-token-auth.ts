import type { FastifyRequest } from "fastify";
import { ERROR_CODES } from "../errors/error-codes";
import type { RequestContext } from "../context/request-context";
import { AppError } from "../errors/app-error";

export function requirePersonalTokenAuth(request: FastifyRequest, scope?: string | string[]): RequestContext {
  const ctx = request.requestContext;
  if (!ctx || ctx.authType !== "personal_token") {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED, "unauthorized", 401);
  }
  const requiredScopes = Array.isArray(scope) ? scope : scope ? [scope] : [];
  if (requiredScopes.length > 0 && !requiredScopes.some((item) => ctx.authScopes?.includes(item))) {
    throw new AppError(ERROR_CODES.TOKEN_SCOPE_FORBIDDEN, "token scope forbidden", 403);
  }
  return ctx;
}
