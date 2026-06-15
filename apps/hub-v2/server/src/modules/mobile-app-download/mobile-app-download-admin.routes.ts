import type { FastifyInstance } from "fastify";
import { rmSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { requireAuth } from "../../shared/auth/require-auth";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { AppError } from "../../shared/errors/app-error";
import { ok } from "../../shared/http/response";
import { saveMultipartFile } from "../../shared/storage/file-storage";
import type { ProjectAccessContract } from "../project/project-access.contract";
import { ProjectRepo } from "../project/project.repo";
import { assertUploadAllowed, resolveUploadPolicy } from "../upload/upload-policy";
import {
  MOBILE_APP_PACKAGE_BUCKET,
  MOBILE_APP_PACKAGE_CATEGORY,
  MobileAppDownloadService
} from "./mobile-app-download.service";
import type { MobileAppPlatform, MobileAppProjectRef } from "./mobile-app-download.types";

type ProjectMaintainerAccess = ProjectAccessContract & {
  requireProjectMaintainer(projectId: string, ctx: ReturnType<typeof requireAuth>, action: string): Promise<void>;
};

const paramsSchema = z.object({ projectId: z.string().trim().min(1) });
const platformParamsSchema = z.object({
  projectId: z.string().trim().min(1),
  platform: z.enum(["android", "ios"])
});

export default async function mobileAppDownloadAdminRoutes(app: FastifyInstance) {
  app.get("/projects/:projectId/mobile-app", async (request) => {
    const ctx = requireAuth(request);
    const { projectId } = paramsSchema.parse(request.params);
    const project = await resolveProjectById(app, projectId);
    const service = createService(app);
    return ok(await service.getProjectConfig(project, ctx));
  });

  app.put("/projects/:projectId/mobile-app", async (request) => {
    const ctx = requireAuth(request);
    const { projectId } = paramsSchema.parse(request.params);
    const project = await resolveProjectById(app, projectId);
    const service = createService(app);
    return ok(await service.updateProjectConfig(project, request.body, ctx), "mobile app config updated");
  });

  app.post("/projects/:projectId/mobile-app/packages/:platform", async (request, reply) => {
    const ctx = requireAuth(request);
    const { projectId, platform } = platformParamsSchema.parse(request.params);
    const project = await resolveProjectById(app, projectId);
    await (app.container.projectAccess as ProjectMaintainerAccess).requireProjectMaintainer(
      project.id,
      ctx,
      "upload mobile app package"
    );

    const file = await request.file();
    if (!file) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, "file is required", 400);
    }

    const uploadPolicy = resolveUploadPolicy(MOBILE_APP_PACKAGE_BUCKET, MOBILE_APP_PACKAGE_CATEGORY);
    assertUploadAllowed(
      {
        fileName: file.filename,
        mimeType: file.mimetype,
        fileSize: 0
      },
      uploadPolicy,
      app.config.uploadMaxFileSize
    );

    const targetDir = path.join(app.config.uploadDir, MOBILE_APP_PACKAGE_BUCKET, project.id);
    let saved: Awaited<ReturnType<typeof saveMultipartFile>> | null = null;
    try {
      saved = await saveMultipartFile(file, targetDir);
      assertUploadAllowed(
        {
          fileName: saved.originalName,
          mimeType: saved.mimeType,
          fileSize: saved.fileSize
        },
        uploadPolicy,
        app.config.uploadMaxFileSize
      );

      const upload = await app.container.uploadCommand.create(
        {
          bucket: MOBILE_APP_PACKAGE_BUCKET,
          category: MOBILE_APP_PACKAGE_CATEGORY,
          visibility: "private",
          fileName: saved.fileName,
          originalName: saved.originalName,
          fileExt: saved.fileExt,
          mimeType: saved.mimeType,
          fileSize: saved.fileSize,
          checksum: saved.checksum,
          storagePath: saved.storagePath
        },
        ctx
      );

      const service = createService(app);
      return reply
        .status(201)
        .send(ok(await service.attachPackage(project, platform as MobileAppPlatform, upload, ctx), "mobile app package uploaded"));
    } catch (error) {
      if (saved?.storagePath) {
        cleanupSavedFile(saved.storagePath);
      }
      throw error;
    }
  });

  app.delete("/projects/:projectId/mobile-app/packages/:platform", async (request) => {
    const ctx = requireAuth(request);
    const { projectId, platform } = platformParamsSchema.parse(request.params);
    const project = await resolveProjectById(app, projectId);
    const service = createService(app);
    return ok(await service.removePackage(project, platform as MobileAppPlatform, ctx), "mobile app package removed");
  });
}

function createService(app: FastifyInstance): MobileAppDownloadService {
  return new MobileAppDownloadService({
    sharedConfigQuery: app.container.sharedConfigQuery,
    sharedConfigCommand: app.container.sharedConfigCommand,
    releaseQuery: app.container.releaseQuery,
    uploadQuery: app.container.uploadQuery,
    uploadCommand: app.container.uploadCommand,
    projectAccess: app.container.projectAccess as ProjectMaintainerAccess
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

function cleanupSavedFile(filePath: string): void {
  try {
    rmSync(filePath, { force: true });
  } catch {}
}
