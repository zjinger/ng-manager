import { FastifyInstance } from "fastify";
import fs from "node:fs";

export default async function publicUploadRoutes(fastify: FastifyInstance) {
    /**
     * /preview/${row.avatar_upload_id}
     * 最终返回给前端的 URL 是 /api/public/preview/${row.avatar_upload_id}
     */
    fastify.get("/preview/:uploadId", async (request, reply) => {
        const { uploadId } = request.params as { uploadId: string };
        const upload = fastify.services.upload.getById(uploadId);
        if (upload.storageProvider !== "local") {
            return reply.status(400).send("Unsupported storage provider");
        }
        if (!fs.existsSync(upload.storagePath)) {
            return reply.status(404).send("File not found");
        }
        reply.header("Cache-Control", "no-store");
        reply.header("Content-Type", upload.mimeType || "application/octet-stream");
        return reply.send(fs.createReadStream(upload.storagePath));
    })
}