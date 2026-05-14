import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import {
  createDepartmentSchema,
  listDepartmentsQuerySchema,
  updateDepartmentSchema,
  userDepartmentSchema
} from "./organization.schema";

export default async function organizationRoutes(app: FastifyInstance) {
  app.get("/departments", async (request) => {
    const ctx = requireAuth(request);
    const query = listDepartmentsQuerySchema.parse(request.query);
    return ok({ items: await app.container.organizationQuery.listDepartments(query, ctx) });
  });

  app.get("/departments/tree", async (request) => {
    const ctx = requireAuth(request);
    const query = listDepartmentsQuerySchema.parse(request.query);
    return ok({ items: await app.container.organizationQuery.listDepartmentTree(query, ctx) });
  });

  app.post("/departments", async (request, reply) => {
    const ctx = requireAuth(request);
    const body = createDepartmentSchema.parse(request.body);
    const item = await app.container.organizationCommand.createDepartment(body, ctx);
    return reply.status(201).send(ok(item, "department created"));
  });

  app.patch("/departments/:departmentId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { departmentId: string };
    const body = updateDepartmentSchema.parse(request.body);
    return ok(await app.container.organizationCommand.updateDepartment(params.departmentId, body, ctx), "department updated");
  });

  app.get("/users/:userId/departments", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { userId: string };
    return ok({ items: await app.container.organizationQuery.listUserDepartments(params.userId, ctx) });
  });

  app.post("/users/:userId/departments", async (request, reply) => {
    const ctx = requireAuth(request);
    const params = request.params as { userId: string };
    const body = userDepartmentSchema.parse(request.body);
    const item = await app.container.organizationCommand.addUserDepartment(params.userId, body, ctx);
    return reply.status(201).send(ok(item, "user primary department saved"));
  });

  app.delete("/users/:userId/departments/:departmentId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { userId: string; departmentId: string };
    await app.container.organizationCommand.removeUserDepartment(params.userId, params.departmentId, ctx);
    return ok({ id: params.departmentId }, "user department removed");
  });
}
