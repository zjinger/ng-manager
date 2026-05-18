import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import { requirePermission } from "../utils/require-permission";
import {
  generalSettingsSchema,
  securitySettingsSchema,
  notificationSettingsSchema,
  integrationSettingsSchema
} from "./system-settings.schema";

export default async function systemSettingsRoutes(app: FastifyInstance) {
  app.get("/system-settings", async (request) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.settings.manage");
    const settings = await app.container.systemSettingsQuery.getAllSettings(ctx);
    return ok(settings);
  });

  app.get("/system-settings/general", async (request) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.settings.manage");
    const data = await app.container.systemSettingsQuery.getGeneralSettings(ctx);
    return ok(data);
  });

  app.put("/system-settings/general", async (request) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.settings.manage");
    const body = generalSettingsSchema.parse(request.body);
    await app.container.systemSettingsCommand.updateGeneralSettings(body, ctx);
    return ok(null, "general settings updated");
  });

  app.get("/system-settings/security", async (request) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.settings.manage");
    const data = await app.container.systemSettingsQuery.getSecuritySettings(ctx);
    return ok(data);
  });

  app.put("/system-settings/security", async (request) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.settings.manage");
    const body = securitySettingsSchema.parse(request.body);
    await app.container.systemSettingsCommand.updateSecuritySettings(body, ctx);
    return ok(null, "security settings updated");
  });

  app.get("/system-settings/notification", async (request) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.settings.manage");
    const data = await app.container.systemSettingsQuery.getNotificationSettings(ctx);
    return ok(data);
  });

  app.put("/system-settings/notification", async (request) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.settings.manage");
    const body = notificationSettingsSchema.parse(request.body);
    await app.container.systemSettingsCommand.updateNotificationSettings(body, ctx);
    return ok(null, "notification settings updated");
  });

  app.get("/system-settings/integration", async (request) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.settings.manage");
    const data = await app.container.systemSettingsQuery.getIntegrationSettings(ctx);
    return ok(data);
  });

  app.put("/system-settings/integration", async (request) => {
    const ctx = requireAuth(request);
    requirePermission(ctx, "admin.settings.manage");
    const body = integrationSettingsSchema.parse(request.body);
    await app.container.systemSettingsCommand.updateIntegrationSettings(body, ctx);
    return ok(null, "integration settings updated");
  });
}
