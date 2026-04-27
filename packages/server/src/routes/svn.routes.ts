import { ProjectAssetSourceSvn } from "@yinuo-ngm/project";
import { CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";
import type { FastifyInstance } from "fastify";
import path from "node:path";
import { env } from "../env";
export default async function svnRoutes(fastify: FastifyInstance) {

    fastify.post("/sync/:projectId", async (req) => {
        const { projectId } = req.params as { projectId: string };
        // const options = req.body as { forceRefresh?: boolean, types?: string[], };
        const p = await fastify.core.project.get(projectId);
        const assets = p.assets;
        if (!assets) {
            throw new CoreError(CoreErrorCodes.ASSET_NOT_FOUND, 'Project assets are required for SVN sync');;
        }
        const { iconsSvn, cutImageSvn } = assets
        const svnSources = [iconsSvn, cutImageSvn].filter(s => s && s.kind === "svn") as ProjectAssetSourceSvn[];
        const results = [];

        for (const s of svnSources) {
            let localDir = s.localDir;
            if (!localDir) {
                // 如果没有 localDir，默认放在 dataDir/svn/{projectId}/{sourceLabel} 目录下
                localDir = path.join(env.dataDir, 'svn', projectId, s.label || s.id);
            }
            const r = await fastify.core.svnSync.sync(projectId, s.id, localDir, s.url);
            results.push(r);
        }

        return results;
    });

    fastify.get("/runtime/:projectId", async (req) => {
        const { projectId } = req.params as { projectId: string };
        const runtimes = await fastify.core.svnSync.getRuntimeByProjectId(projectId);
        return runtimes;
    });

    fastify.post("/sync/stream/:projectId", async (req) => {
        const { projectId } = req.params as { projectId: string };
        const assets = (await fastify.core.project.get(projectId)).assets;
        if (!assets) {
            throw new CoreError(CoreErrorCodes.ASSET_NOT_FOUND, 'Project assets are required for SVN sync');;
        }
        const { iconsSvn, cutImageSvn } = assets;
        const svnSources = [iconsSvn, cutImageSvn].filter(s => s && s.kind === "svn") as ProjectAssetSourceSvn[];

        for (const s of svnSources) {
            let localDir = s.localDir;
            if (!localDir) {
                // 如果没有 localDir，默认放在 dataDir/svn/{projectId}/{sourceLabel} 目录下
                localDir = path.join(env.dataDir, 'svn', projectId, s.label || s.id);
            }
            await fastify.core.svnSync.syncWithStream(projectId, s.id, localDir, s.url);
        }
        return { message: "SVN sync started" };
    })
}

