import type { FastifyInstance } from "fastify";
import {
    createDocumentSchema,
    listDocumentQuerySchema,
    publishDocumentSchema,
    updateDocumentSchema
} from "../../modules/document/document.schema";
import { ok } from "../../utils/response";

export default async function adminDocumentRoutes(fastify: FastifyInstance) {
    fastify.get("/documents", async (request) => {
        const query = listDocumentQuerySchema.parse(request.query);
        const result = fastify.services.document.list({
            projectId: query.projectId,
            status: query.status,
            category: query.category,
            keyword: query.keyword,
            page: query.page,
            pageSize: query.pageSize
        });
        return ok(result);
    });

    fastify.get("/documents/:id", async (request) => {
        const params = request.params as { id: string };
        const item = fastify.services.document.getById(params.id);
        return ok(item);
    });

    fastify.post("/documents", async (request, reply) => {
        const body = createDocumentSchema.parse(request.body);
        const item = fastify.services.document.create({
            projectId: body.projectId ?? null,
            slug: body.slug,
            title: body.title,
            category: body.category,
            summary: body.summary,
            contentMd: body.contentMd,
            version: body.version,
            createdBy: body.createdBy
        });
        return reply.status(201).send(ok(item, "document created"));
    });

    fastify.put("/documents/:id", async (request) => {
        const params = request.params as { id: string };
        const body = updateDocumentSchema.parse(request.body);
        const item = fastify.services.document.update(params.id, {
            projectId: body.projectId,
            slug: body.slug,
            title: body.title,
            category: body.category,
            summary: body.summary,
            contentMd: body.contentMd,
            version: body.version
        });
        return ok(item, "document updated");
    });

    fastify.post("/documents/:id/publish", async (request) => {
        const params = request.params as { id: string };
        publishDocumentSchema.parse(request.body ?? {});
        const item = fastify.services.document.publish(params.id);
        return ok(item, "document published");
    });

    fastify.post("/documents/:id/archive", async (request) => {
        const params = request.params as { id: string };
        const item = fastify.services.document.archive(params.id);
        return ok(item, "document archived");
    });

    fastify.delete("/documents/:id", async (request) => {
        const params = request.params as { id: string };
        fastify.services.document.remove(params.id);
        return ok({ id: params.id }, "document deleted");
    });
}