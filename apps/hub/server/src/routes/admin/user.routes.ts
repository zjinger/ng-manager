import type { FastifyInstance } from "fastify";
import {
  createUserSchema,
  enableUserLoginAccountSchema,
  listUserQuerySchema,
  resetUserPasswordSchema,
  updateUserSchema
} from "../../modules/user/user.schema";
import { AppError } from "../../utils/app-error";
import { ok } from "../../utils/response";

function assertAdminRole(request: { adminUser?: { role?: string } | null }) {
  if (request.adminUser?.role !== "admin") {
    throw new AppError("AUTH_FORBIDDEN", "only admin can manage users", 403);
  }
}

export default async function adminUserRoutes(fastify: FastifyInstance) {
  fastify.get("/users/titles", async () => {
    return ok({ items: fastify.services.user.getTitles() });
  });

  fastify.get("/users", async (request) => {
    const query = listUserQuerySchema.parse(request.query);
    const result = fastify.services.user.list(query);
    return ok(result);
  });

  fastify.get("/users/:id", async (request) => {
    const params = request.params as { id: string };
    const item = fastify.services.user.getById(params.id);
    return ok(item);
  });

  fastify.post("/users", async (request, reply) => {
    assertAdminRole(request);

    const body = createUserSchema.parse(request.body);
    const item = await fastify.services.user.create(body);
    return reply.status(201).send(ok(item, "user created"));
  });

  fastify.put("/users/:id", async (request) => {
    const params = request.params as { id: string };
    const body = updateUserSchema.parse(request.body);
    const item = fastify.services.user.update(params.id, body);
    return ok(item, "user updated");
  });

  fastify.post("/users/:id/login-account/enable", async (request) => {
    assertAdminRole(request);

    const params = request.params as { id: string };
    const body = enableUserLoginAccountSchema.parse(request.body ?? {});
    const item = fastify.services.user.enableLoginAccount({
      userId: params.id,
      username: body.username,
      password: body.password,
      mustChangePassword: body.mustChangePassword
    });

    return ok(item, "login account enabled");
  });

  fastify.post("/users/:id/login-account/disable", async (request) => {
    assertAdminRole(request);

    const params = request.params as { id: string };
    const item = fastify.services.user.disableLoginAccount(params.id);
    return ok(item, "login account disabled");
  });

  fastify.post("/users/:id/password", async (request) => {
    assertAdminRole(request);

    const params = request.params as { id: string };
    const body = resetUserPasswordSchema.parse(request.body);
    await fastify.services.user.resetPassword({
      userId: params.id,
      newPassword: body.newPassword,
      mustChangePassword: body.mustChangePassword
    });

    return ok({ ok: true }, "password reset");
  });
}
