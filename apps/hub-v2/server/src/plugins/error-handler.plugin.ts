import fp from "fastify-plugin";
import { ZodError } from "zod";
import { AppError } from "../shared/errors/app-error";
import { ERROR_CODES } from "../shared/errors/error-codes";
import { fail } from "../shared/http/error-response";

export default fp(async function errorHandlerPlugin(app) {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send(fail(error.code, error.message, error.details));
      return;
    }

    if (error instanceof ZodError) {
      reply.status(400).send(
        fail(ERROR_CODES.VALIDATION_ERROR, "validation error", {
          issues: error.issues
        })
      );
      return;
    }

    app.log.error(error, "[hub-v2] unhandled error");
    reply.status(500).send(fail(ERROR_CODES.INTERNAL_ERROR, "internal error"));
  });
});
