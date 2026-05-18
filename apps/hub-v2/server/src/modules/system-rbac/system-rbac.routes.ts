import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import { requirePermission } from "../utils/require-permission";
import {
  listSystemRolesQuerySchema,
  createSystemRoleSchema,
  updateSystemRoleSchema,
  updateRolePermissionsSchema,
  addRoleUsersSchema,
  listSystemPermissionsQuerySchema,
  createSystemPermissionSchema,
  updateSystemPermissionSchema
} from "./system-rbac.schema";

export default async function systemRbacRoutes(app: FastifyInstance) {
  app.get("/system-roles", async (request) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.roles.manage");
    const query = listSystemRolesQuerySchema.parse(request.query);
    const items = await app.container.systemRbacQuery.listSystemRoles(query, ctx);
    return ok({ items });
  });

  app.get("/system-roles/:roleId", async (request) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.roles.manage");
    const params = request.params as { roleId: string };
    const detail = await app.container.systemRbacQuery.getSystemRoleDetail(params.roleId, ctx);
    return ok(detail);
  });

  app.post("/system-roles", async (request, reply) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.roles.manage");
    const body = createSystemRoleSchema.parse(request.body);
    const item = await app.container.systemRbacCommand.createSystemRole(body, ctx);
    return reply.status(201).send(ok(item, "system role created"));
  });

  app.patch("/system-roles/:roleId", async (request) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.roles.manage");
    const params = request.params as { roleId: string };
    const body = updateSystemRoleSchema.parse(request.body);
    return ok(await app.container.systemRbacCommand.updateSystemRole(params.roleId, body, ctx), "system role updated");
  });

  app.delete("/system-roles/:roleId", async (request) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.roles.manage");
    const params = request.params as { roleId: string };
    await app.container.systemRbacCommand.deleteSystemRole(params.roleId, ctx);
    return ok({ id: params.roleId }, "system role deleted");
  });

  app.get("/system-permissions", async (request) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.roles.manage");
    const query = listSystemPermissionsQuerySchema.parse(request.query);
    const items = await app.container.systemRbacQuery.listPermissions(query, ctx);
    return ok({ items });
  });

  app.post("/system-permissions", async (request, reply) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.roles.manage");
    const body = createSystemPermissionSchema.parse(request.body);
    const item = await app.container.systemRbacCommand.createSystemPermission(body, ctx);
    return reply.status(201).send(ok(item, "system permission created"));
  });

  app.patch("/system-permissions/:permissionId", async (request) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.roles.manage");
    const params = request.params as { permissionId: string };
    const body = updateSystemPermissionSchema.parse(request.body);
    const item = await app.container.systemRbacCommand.updateSystemPermission(params.permissionId, body, ctx);
    return ok(item, "system permission updated");
  });

  app.delete("/system-permissions/:permissionId", async (request) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.roles.manage");
    const params = request.params as { permissionId: string };
    await app.container.systemRbacCommand.deleteSystemPermission(params.permissionId, ctx);
    return ok({ id: params.permissionId }, "system permission deleted");
  });

  app.get("/system-roles/:roleId/permissions", async (request) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.roles.manage");
    const params = request.params as { roleId: string };
    const detail = await app.container.systemRbacQuery.getSystemRoleDetail(params.roleId, ctx);
    return ok({ items: detail.permissions });
  });

  app.put("/system-roles/:roleId/permissions", async (request) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.roles.manage");
    const params = request.params as { roleId: string };
    const body = updateRolePermissionsSchema.parse(request.body);
    await app.container.systemRbacCommand.setRolePermissions(params.roleId, body, ctx);
    return ok(null, "role permissions updated");
  });

  app.get("/system-roles/:roleId/users", async (request) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.roles.manage");
    const params = request.params as { roleId: string };
    const items = await app.container.systemRbacQuery.listRoleUsers(params.roleId, ctx);
    return ok({ items });
  });

  app.post("/system-roles/:roleId/users", async (request, reply) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.roles.manage");
    const params = request.params as { roleId: string };
    const body = addRoleUsersSchema.parse(request.body);
    await app.container.systemRbacCommand.addRoleUsers(params.roleId, body, ctx);
    return reply.status(201).send(ok(null, "users added to role"));
  });

  app.delete("/system-roles/:roleId/users/:userId", async (request) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.roles.manage");
    const params = request.params as { roleId: string; userId: string };
    await app.container.systemRbacCommand.removeRoleUser(params.roleId, params.userId, ctx);
    return ok(null, "user removed from role");
  });

  app.get("/users/:userId/system-roles", async (request) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.roles.manage");
    const params = request.params as { userId: string };
    const items = await app.container.systemRbacQuery.listUserSystemRoles(params.userId, ctx);
    return ok({ items });
  });
}
