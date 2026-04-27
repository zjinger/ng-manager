import { GlobalError, GlobalErrorCodes, CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";
import type { FastifyInstance } from "fastify";
import { openFolder } from "../common/editor";

export default async function configRoutes(fastify: FastifyInstance) {

    // GET catalog
    fastify.get("/catalog/:projectId", async (req) => {
        const { projectId } = req.params as { projectId: string };
        return await fastify.core.config.getCatalog(projectId);
    });

    // GET read doc
    fastify.get("/readDoc/:projectId/:docId", async (req) => {
        const { projectId, docId } = req.params as { projectId: string; docId: string };
        return await fastify.core.config.readDoc(projectId, docId);
    });

    // POST write doc
    fastify.post("/writeDoc/:projectId/:docId", async (req) => {
        const { projectId, docId } = req.params as { projectId: string; docId: string };
        const body = req.body as any;

        // 约定：raw 优先，其次 data
        const next = body?.raw ?? body?.data;
        if (next === undefined) {
            throw new CoreError(CoreErrorCodes.CONFIG_WRITE_FAILED, "missing body.raw or body.data", { projectId, docId });
        }
        return await fastify.core.config.writeDoc(projectId, docId, next);
    });

    /**
        * 在编辑器打开项目
        * POST /projects/openInEditor/:projectId
        * body: { editor?: "code" | "system" }
        */
    fastify.post("/openInEditor/:projectId/:docId", async (req) => {
        try {
            const { projectId, docId } = req.params as { projectId: string; docId: string };
            const { filePath } = await fastify.core.config.openDoc(projectId, docId);
            await openFolder(filePath, { editor: 'code' });
            return { ok: true };
        } catch (e: any) {
            throw new CoreError(CoreErrorCodes.EDITOR_LAUNCH_FAILED, e?.message || "openInEditor failed");
        }
    });

    // GET read schema
    fastify.get("/readSchema/:projectId/:domainId", async (req) => {
        const { projectId, domainId } = req.params as { projectId: string; domainId: string };
        return await fastify.core.config.readDomainSchema(projectId, domainId);
    });

    // POST write schema
    fastify.post("/writeSchema/:projectId/:domainId", async (req) => {
        const { projectId, domainId } = req.params as { projectId: string; domainId: string };
        const body = req.body as any;
        const vm = body?.vm;
        if (vm === undefined) {
            throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, "missing body.vm");
        }
        await fastify.core.config.writeDomainSchema(projectId, domainId, vm);
        return {
            projectId,
            domainId,
        };
    });

    // GET domain schema doc
    fastify.get("/getDomainSchema/:projectId/:domainId", async (req) => {
        const { projectId, domainId } = req.params as { projectId: string; domainId: string };
        return await fastify.core.config.getDomainSchemaDoc(projectId, domainId);
    });

    // POST diff domain schema
    fastify.post("/diffSchema/:projectId/:domainId", async (req) => {
        const { projectId, domainId } = req.params as { projectId: string; domainId: string };
        const body = req.body as any;
        const vm = body?.vm;
        if (vm === undefined) {
            throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, "missing body.vm");
        }
        return await fastify.core.config.diffDomainSchema(projectId, domainId, vm);
    });

}
