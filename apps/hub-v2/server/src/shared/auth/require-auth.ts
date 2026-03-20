import type { FastifyRequest } from "fastify";
import { AppError } from "../errors/app-error";
import { ERROR_CODES } from "../errors/error-codes";
import type { RequestContext } from "../context/request-context";

export function requireAuth(request: FastifyRequest): RequestContext {
  if (!request.requestContext || request.requestContext.accountId === "anonymous") {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED, "unauthorized", 401);
  }

  return request.requestContext;
}
