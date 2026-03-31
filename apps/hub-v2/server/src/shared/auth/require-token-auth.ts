import type { FastifyRequest } from "fastify";
import { ERROR_CODES } from "../errors/error-codes";
import type { RequestContext } from "../context/request-context";
import { AppError } from "../errors/app-error";

export function requireTokenAuth(request: FastifyRequest, scope?: string): RequestContext {
  const ctx = request.requestContext;
  if (!ctx || ctx.authType !== "token") {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED, "unauthorized", 401);
  }
  if (scope && !ctx.authScopes?.includes(scope)) {
    throw new AppError(ERROR_CODES.TOKEN_SCOPE_FORBIDDEN, "token scope forbidden", 403);
  }
  return ctx;
}
