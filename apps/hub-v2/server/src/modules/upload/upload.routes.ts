import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import { saveMultipartFile } from "../../shared/storage/file-storage";

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

export default async function uploadRoutes(app: FastifyInstance) {
  app.post("/uploads", async (request, reply) => {
    const ctx = requireAuth(request);
    const file = await request.file();

    if (!file) {
      return reply.status(400).send({
        code: "BAD_REQUEST",
        message: "file is required"
      });
    }

    const saved = await saveMultipartFile(file, app.config.uploadDir);
    const bucket = getFieldValue(file.fields.bucket);
    const category = getFieldValue(file.fields.category);
    const visibility = getFieldValue(file.fields.visibility);
    const upload = await app.container.uploadCommand.create(
      {
        bucket,
        category,
        visibility: visibility === "public" || visibility === "private" ? visibility : undefined,
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

    return reply.status(201).send(ok(upload, "upload created"));
  });

  app.get("/uploads/:uploadId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { uploadId: string };
    return ok(await app.container.uploadQuery.getById(params.uploadId, ctx));
  });
}
