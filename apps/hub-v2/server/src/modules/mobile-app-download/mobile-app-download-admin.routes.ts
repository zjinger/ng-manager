import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../../shared/auth/require-auth";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { AppError } from "../../shared/errors/app-error";
import { ok } from "../../shared/http/response";
import { ProjectRepo } from "../project/project.repo";
import { createMobileAppVersionSchema, updateMobileAppVersionSchema } from "./mobile-app-version.schema";
import type { MobileAppProjectRef } from "./mobile-app-download.types";

const paramsSchema = z.object({ projectId: z.string().trim().min(1) });
const versionParamsSchema = z.object({
  projectId: z.string().trim().min(1),
  versionId: z.string().trim().min(1)
});

export default async function mobileAppDownloadAdminRoutes(app: FastifyInstance) {
  app.get("/projects/:projectId/mobile-app/versions", async (request) => {
    const ctx = requireAuth(request);
    const { projectId } = paramsSchema.parse(request.params);
    await resolveProjectById(app, projectId);
    return ok(await app.container.mobileAppVersionQuery.listVersions(projectId, ctx));
  });

  app.post("/projects/:projectId/mobile-app/versions", async (request, reply) => {
    const ctx = requireAuth(request);
    const { projectId } = paramsSchema.parse(request.params);
    await resolveProjectById(app, projectId);
    const input = createMobileAppVersionSchema.parse(request.body);
    return reply
      .status(201)
      .send(ok(await app.container.mobileAppVersionCommand.createVersion(projectId, input, ctx), "mobile app version created"));
  });

  app.get("/projects/:projectId/mobile-app/versions/:versionId", async (request) => {
    const ctx = requireAuth(request);
    const { projectId, versionId } = versionParamsSchema.parse(request.params);
    await resolveProjectById(app, projectId);
    return ok(await app.container.mobileAppVersionQuery.getVersion(projectId, versionId, ctx));
  });

  app.patch("/projects/:projectId/mobile-app/versions/:versionId", async (request) => {
    const ctx = requireAuth(request);
    const { projectId, versionId } = versionParamsSchema.parse(request.params);
    await resolveProjectById(app, projectId);
    const input = updateMobileAppVersionSchema.parse(request.body);
    return ok(await app.container.mobileAppVersionCommand.updateVersion(projectId, versionId, input, ctx), "mobile app version updated");
  });

  app.delete("/projects/:projectId/mobile-app/versions/:versionId", async (request) => {
    const ctx = requireAuth(request);
    const { projectId, versionId } = versionParamsSchema.parse(request.params);
    await resolveProjectById(app, projectId);
    return ok(await app.container.mobileAppVersionCommand.deleteVersion(projectId, versionId, ctx), "mobile app version deleted");
  });

  app.post("/projects/:projectId/mobile-app/versions/:versionId/publish", async (request) => {
    const ctx = requireAuth(request);
    const { projectId, versionId } = versionParamsSchema.parse(request.params);
    await resolveProjectById(app, projectId);
    return ok(await app.container.mobileAppVersionCommand.publishVersion(projectId, versionId, ctx), "mobile app version published");
  });

  app.post("/projects/:projectId/mobile-app/versions/:versionId/archive", async (request) => {
    const ctx = requireAuth(request);
    const { projectId, versionId } = versionParamsSchema.parse(request.params);
    await resolveProjectById(app, projectId);
    return ok(await app.container.mobileAppVersionCommand.archiveVersion(projectId, versionId, ctx), "mobile app version archived");
  });

  app.get("/projects/:projectId/mobile-app/release-logs", async (request) => {
    const ctx = requireAuth(request);
    const { projectId } = paramsSchema.parse(request.params);
    await resolveProjectById(app, projectId);
    return ok(await app.container.mobileAppVersionQuery.listReleaseRecords(projectId, ctx));
  });

  app.get("/projects/:projectId/mobile-app/stats", async (request) => {
    const ctx = requireAuth(request);
    const { projectId } = paramsSchema.parse(request.params);
    await resolveProjectById(app, projectId);
    return ok(await app.container.mobileAppVersionQuery.getStats(projectId, ctx));
  });

  app.get("/projects/:projectId/mobile-app/portal-settings", async (request) => {
    const ctx = requireAuth(request);
    const { projectId } = paramsSchema.parse(request.params);
    const project = await resolveProjectById(app, projectId);
    return ok(await app.container.mobileAppVersionQuery.getPortalSettings(project.id, project.name, ctx));
  });

  app.put("/projects/:projectId/mobile-app/portal-settings", async (request) => {
    const ctx = requireAuth(request);
    const { projectId } = paramsSchema.parse(request.params);
    const project = await resolveProjectById(app, projectId);
    return ok(
      await app.container.mobileAppVersionCommand.updatePortalSettings(project.id, project.name, request.body, ctx),
      "mobile app portal settings updated"
    );
  });
}

async function resolveProjectById(app: FastifyInstance, projectId: string): Promise<MobileAppProjectRef> {
  const repo = new ProjectRepo(app.db);
  const project = repo.findById(projectId);
  if (!project) {
    throw new AppError(ERROR_CODES.PROJECT_NOT_FOUND, `project not found: ${projectId}`, 404);
  }
  return {
    id: project.id,
    projectKey: project.projectKey,
    name: project.name
  };
}
