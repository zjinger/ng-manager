import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import { createUserSchema, listUsersQuerySchema } from "./user.schema";

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
}
