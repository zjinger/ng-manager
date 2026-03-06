import fp from "fastify-plugin";
import { ZodError } from "zod";
import { AppError } from "../utils/app-error";
import { fail } from "../utils/response";

export default fp(async function errorHandlerPlugin(fastify) {
  fastify.setErrorHandler((error, request, reply) => {
    request.log.error(
      {
        err: error,
        url: request.url,
        method: request.method
      },
      "request failed"
    );

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(
        fail(error.code, error.message, error.details)
      );
    }

    if (error instanceof ZodError) {
      return reply.status(400).send(
        fail("VALIDATION_ERROR", "request validation failed", error.flatten())
      );
    }

    return reply.status(500).send(
      fail("INTERNAL_SERVER_ERROR", "internal server error")
    );
  });
});