import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import { createUserSchema, listUsersQuerySchema, resetUserPasswordSchema, updateUserSchema } from "./user.schema";

export default async function userRoutes(app: FastifyInstance) {
  app.get("/users", async (request) => {
    const ctx = requireAuth(request);
    const query = listUsersQuerySchema.parse(request.query);
    return ok(await app.container.userQuery.list(query, ctx));
  });

  app.post("/users", async (request, reply) => {
    const ctx = requireAuth(request);
    const body = createUserSchema.parse(request.body);
    const user = await app.container.userCommand.create(body, ctx);
    return reply.status(201).send(ok(user, "user created"));
  });

  app.get("/users/:userId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { userId: string };
    return ok(await app.container.userQuery.getById(params.userId, ctx));
  });

  app.patch("/users/:userId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { userId: string };
    const body = updateUserSchema.parse(request.body);
    return ok(await app.container.userCommand.update(params.userId, body, ctx), "user updated");
  });

  app.post("/users/:userId/reset-password", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { userId: string };
    const body = resetUserPasswordSchema.parse(request.body ?? {});
    return ok(await app.container.userCommand.resetPassword(params.userId, body, ctx), "password reset");
  });
}
