import type { FastifyInstance } from "fastify";
import * as path from "path";
import { AppError } from "@core";
import { AngularConfigAdapter } from "@core/domain/config/angular.config.adapter";
import type { JsonPatchOp } from "@core/domain/config/config.schema";

export default async function configRoutes(fastify: FastifyInstance) {
    // 获取 Project rootDir
    async function getProjectRootDir(projectId: string): Promise<string> {
        const p = await fastify.core.project.get(projectId);
        const rootDir = p?.root;
        if (!rootDir) throw new AppError("PROJECT_NOT_FOUND", "project not found", { projectId });
        return rootDir;
    }

    function getAngularAdapter(rootDir: string) {
        const angularJsonPath = path.join(rootDir, "angular.json");
        return new AngularConfigAdapter(angularJsonPath);
    }

    /**
     * GET /config/descriptor/:projectId
     */
    fastify.get("/descriptor/:projectId", async (req) => {
        const { projectId } = req.params as any;
        const rootDir = await getProjectRootDir(projectId);

        const adapter = getAngularAdapter(rootDir);
        return adapter.getDescriptor();
    });

    /**
     * GET /config/values/:projectId
     */
    fastify.get("/values/:projectId", async (req) => {
        const { projectId } = req.params as any;
        const rootDir = await getProjectRootDir(projectId);

        const adapter = getAngularAdapter(rootDir);
        const descriptor = adapter.getDescriptor();
        const values = adapter.readValues(descriptor);

        return { file: descriptor.file, values };
    });

    /**
     * POST /config/patch/:projectId
     * body: { patch: JsonPatchOp[], dryRun?: boolean }
     */
    fastify.post("/patch/:projectId", async (req) => {
        const { projectId } = req.params as any;
        const body = req.body as { patch: JsonPatchOp[]; dryRun?: boolean };

        if (!body?.patch?.length) {
            throw new AppError("BAD_REQUEST", "patch is empty", { projectId });
        }

        const rootDir = await getProjectRootDir(projectId);
        const adapter = getAngularAdapter(rootDir);

        const dryRun = body.dryRun !== false; // 默认 dryRun=true
        const res = adapter.applyPatch(body.patch, dryRun, rootDir);
        return res;
    });

    /**
     * POST /config/rollback/:projectId
     * body: { backupId: string }
     */
    fastify.post("/rollback/:projectId", async (req) => {
        const { projectId } = req.params as any;
        const body = req.body as { backupId: string };
        if (!body?.backupId) throw new AppError("BAD_REQUEST", "backupId required", { projectId });

        const rootDir = await getProjectRootDir(projectId);
        const adapter = getAngularAdapter(rootDir);
        const res = adapter.rollback(rootDir, body.backupId);

        return res;
    });
}
