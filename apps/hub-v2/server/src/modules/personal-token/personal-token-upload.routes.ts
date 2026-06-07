import type { FastifyInstance } from "fastify";
import { rmSync } from "node:fs";
import path from "node:path";
import { requirePersonalTokenAuth } from "../../shared/auth/require-personal-token-auth";
import { AppError } from "../../shared/errors/app-error";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { ok } from "../../shared/http/response";
import { saveMultipartFile } from "../../shared/storage/file-storage";
import type { PersonalTokenScope } from "./personal-token.types";
import { personalProjectParamSchema } from "./personal-token.schema";
import { assertUploadAllowed, resolveUploadPolicy } from "../upload/upload-policy";

const MARKDOWN_UPLOAD_SCOPES: PersonalTokenScope[] = [
  "issue:create:write",
  "issue:update:write",
  "issue:comment:write",
  "rd:create:write",
  "rd:stage-task:write",
  "rd:transition:write",
  "rd:edit:write"
];

type PersonalFileUploadTarget = "issueAttachment" | "taskSheetAttachment";

const FILE_UPLOAD_TARGETS: Record<
  PersonalFileUploadTarget,
  {
    bucket: string;
    category: string;
    scopes: PersonalTokenScope[];
  }
> = {
  issueAttachment: {
    bucket: "issues",
    category: "attachment",
    scopes: ["issue:update:write"]
  },
  taskSheetAttachment: {
    bucket: "task-sheets",
    category: "attachment",
    scopes: ["rd:stage-task:write", "rd:edit:write"]
  }
};

const FILE_UPLOAD_SCOPES = Array.from(
  new Set(Object.values(FILE_UPLOAD_TARGETS).flatMap((target) => target.scopes))
) as PersonalTokenScope[];

export default async function personalTokenUploadRoutes(app: FastifyInstance) {
  app.post("/projects/:projectKey/uploads/markdown", async (request, reply) => {
    const ctx = requirePersonalTokenAuth(request, MARKDOWN_UPLOAD_SCOPES);
    const params = personalProjectParamSchema.parse(request.params);
    app.container.personalTokenQuery.resolveProjectId(params.projectKey);
    const capabilities = app.container.personalTokenQuery.getProjectCapabilities(params.projectKey, ctx);
    if (!capabilities.writable) {
      throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, "project write access forbidden", 403, {
        reason: capabilities.readOnlyReason
      });
    }

    const file = await request.file();
    if (!file) {
      return reply.status(400).send({
        code: "BAD_REQUEST",
        message: "file is required"
      });
    }

    const policy = resolveUploadPolicy("temp", "markdown");
    let saved: Awaited<ReturnType<typeof saveMultipartFile>> | null = null;

    assertUploadAllowed(
      {
        fileName: file.filename,
        mimeType: file.mimetype,
        fileSize: 0
      },
      policy,
      app.config.uploadMaxFileSize
    );

    try {
      saved = await saveMultipartFile(file, path.join(app.config.uploadDir, "temp"));
      assertUploadAllowed(
        {
          fileName: saved.originalName,
          mimeType: saved.mimeType,
          fileSize: saved.fileSize
        },
        policy,
        app.config.uploadMaxFileSize
      );

      const upload = await app.container.uploadCommand.create(
        {
          bucket: "temp",
          category: "markdown",
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

      const alt = sanitizeMarkdownAlt(getFieldValue(file.fields.alt), upload.originalName || upload.fileName);
      return reply.status(201).send(
        ok(
          {
            uploadId: upload.id,
            markdown: `![${alt}](/api/admin/uploads/${upload.id}/raw)`,
            upload: {
              id: upload.id,
              bucket: upload.bucket,
              category: upload.category,
              originalName: upload.originalName,
              mimeType: upload.mimeType,
              fileSize: upload.fileSize
            }
          },
          "markdown image uploaded"
        )
      );
    } catch (error) {
      if (saved?.storagePath) {
        cleanupSavedFile(saved.storagePath);
      }
      throw error;
    }
  });

  app.post("/projects/:projectKey/uploads/file", async (request, reply) => {
    const ctx = requirePersonalTokenAuth(request, FILE_UPLOAD_SCOPES);
    const params = personalProjectParamSchema.parse(request.params);
    app.container.personalTokenQuery.resolveProjectId(params.projectKey);
    const capabilities = app.container.personalTokenQuery.getProjectCapabilities(params.projectKey, ctx);
    if (!capabilities.writable) {
      throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, "project write access forbidden", 403, {
        reason: capabilities.readOnlyReason
      });
    }

    const file = await request.file();
    if (!file) {
      return reply.status(400).send({
        code: "BAD_REQUEST",
        message: "file is required"
      });
    }

    const target = resolveFileUploadTarget(getFieldValue(file.fields.target));
    requireTargetScope(ctx.authScopes ?? [], target.scopes);
    const policy = resolveUploadPolicy(target.bucket, target.category);
    let saved: Awaited<ReturnType<typeof saveMultipartFile>> | null = null;

    assertUploadAllowed(
      {
        fileName: file.filename,
        mimeType: file.mimetype,
        fileSize: 0
      },
      policy,
      app.config.uploadMaxFileSize
    );

    try {
      saved = await saveMultipartFile(file, path.join(app.config.uploadDir, target.bucket));
      assertUploadAllowed(
        {
          fileName: saved.originalName,
          mimeType: saved.mimeType,
          fileSize: saved.fileSize
        },
        policy,
        app.config.uploadMaxFileSize
      );

      const upload = await app.container.uploadCommand.create(
        {
          bucket: target.bucket,
          category: target.category,
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

      return reply.status(201).send(
        ok(
          {
            uploadId: upload.id,
            rawUrl: `/api/admin/uploads/${upload.id}/raw`,
            upload: {
              id: upload.id,
              bucket: upload.bucket,
              category: upload.category,
              originalName: upload.originalName,
              mimeType: upload.mimeType,
              fileSize: upload.fileSize,
              checksum: upload.checksum
            }
          },
          "file uploaded"
        )
      );
    } catch (error) {
      if (saved?.storagePath) {
        cleanupSavedFile(saved.storagePath);
      }
      throw error;
    }
  });
}

function getFieldValue(field: unknown): string | undefined {
  if (!field) {
    return undefined;
  }
  if (Array.isArray(field)) {
    return getFieldValue(field[0]);
  }
  if (typeof field === "object" && field !== null && "value" in field) {
    const value = (field as { value?: unknown }).value;
    return typeof value === "string" ? value : undefined;
  }
  return undefined;
}

function sanitizeMarkdownAlt(value: string | undefined, fallback: string): string {
  const raw = (value?.trim() || fallback || "image").replace(/[\r\n]+/g, " ");
  return raw.replace(/[\\[\]]/g, "").trim() || "image";
}

function resolveFileUploadTarget(value: string | undefined) {
  const target = value?.trim() as PersonalFileUploadTarget | undefined;
  if (!target || !(target in FILE_UPLOAD_TARGETS)) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "unsupported file upload target", 400, {
      target: value ?? null,
      supportedTargets: Object.keys(FILE_UPLOAD_TARGETS)
    });
  }
  return FILE_UPLOAD_TARGETS[target];
}

function requireTargetScope(authScopes: string[], requiredScopes: PersonalTokenScope[]): void {
  if (!requiredScopes.some((scope) => authScopes.includes(scope))) {
    throw new AppError(ERROR_CODES.TOKEN_SCOPE_FORBIDDEN, "token scope forbidden", 403, {
      requiredScopes
    });
  }
}

function cleanupSavedFile(filePath: string): void {
  try {
    rmSync(filePath, { force: true });
  } catch {}
}
