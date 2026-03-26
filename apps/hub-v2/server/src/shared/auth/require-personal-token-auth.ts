import type { FastifyRequest } from "fastify";
import type { RequestContext } from "../context/request-context";
import { AppError } from "../errors/app-error";
import { ERROR_CODES } from "../errors/error-codes";

export function requirePersonalTokenAuth(request: FastifyRequest, scope?: string): RequestContext {
  const ctx = request.requestContext;
  if (!ctx || ctx.authType !== "personal_token") {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED, "unauthorized", 401);
  }
  if (scope && !ctx.authScopes?.includes(scope)) {
    throw new AppError("TOKEN_SCOPE_FORBIDDEN", "token scope forbidden", 403);
  }
  return ctx;
}
