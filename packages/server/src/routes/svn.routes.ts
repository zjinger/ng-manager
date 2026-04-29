import type { FastifyInstance } from "fastify";
import path from "node:path";
import { env } from "../env";
import type {
    SvnSyncRequestDto,
    SvnSyncResultDto,
    SvnRuntimeDto,
    SvnSyncStreamStartResponseDto,
} from "@yinuo-ngm/protocol";
import type { SvnSyncService } from "@yinuo-ngm/svn";
import type { ProjectAssetSourceSvn } from "@yinuo-ngm/project";
import { CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";

function toSvnSyncResultDto(result: import("@yinuo-ngm/svn").SvnSyncResult): SvnSyncResultDto {
    return {
        ok: result.ok,
        projectId: result.projectId,
        sourceId: result.sourceId,
        mode: result.mode,
        updatedAt: result.updatedAt,
        desiredUrl: result.desiredUrl,
        currentUrl: result.currentUrl,
        stdout: result.stdout,
        stderr: result.stderr,
    };
}

function toSvnRuntimeDto(runtime: import("@yinuo-ngm/svn").SvnRuntime): SvnRuntimeDto {
    return {
        projectId: runtime.projectId,
        sourceId: runtime.sourceId,
        lastSyncAt: runtime.lastSyncAt,
        lastSyncMode: runtime.lastSyncMode,
        desiredUrl: runtime.desiredUrl,
        currentUrl: runtime.currentUrl,
        lastStdout: runtime.lastStdout,
        lastStderr: runtime.lastStderr,
    };
}

function resolveSources(
    assets: { iconsSvn?: ProjectAssetSourceSvn; cutImageSvn?: ProjectAssetSourceSvn },
    body?: Partial<SvnSyncRequestDto>
): ProjectAssetSourceSvn[] {
    const includeIcons = !body?.types?.length || body.types.includes("icons");
    const includeImages = !body?.types?.length || body.types.includes("images");
    const list: ProjectAssetSourceSvn[] = [];
    if (includeIcons && assets.iconsSvn?.kind === "svn") list.push(assets.iconsSvn);
    if (includeImages && assets.cutImageSvn?.kind === "svn") list.push(assets.cutImageSvn);
    return list;
}

export default async function svnRoutes(fastify: FastifyInstance) {
    const svnSync = fastify.core.svnSync as SvnSyncService;

    fastify.post<{ Params: { projectId: string }; Body: Partial<SvnSyncRequestDto> }>(
        "/sync/:projectId",
        async (req): Promise<SvnSyncResultDto[]> => {
            const { projectId } = req.params;
            const p = await fastify.core.project.get(projectId);
            const assets = p.assets;
            if (!assets) {
                throw new CoreError(CoreErrorCodes.ASSET_NOT_FOUND, "Project assets are required for SVN sync");
            }
            const { iconsSvn, cutImageSvn } = assets;
            const svnSources = resolveSources({ iconsSvn, cutImageSvn }, req.body);
            const results: SvnSyncResultDto[] = [];

            for (const s of svnSources) {
                let localDir = s.localDir;
                if (!localDir) {
                    localDir = path.join(env.dataDir, "svn", projectId, s.label || s.id);
                }
                const r = await svnSync.sync(projectId, s.id, localDir, s.url);
                results.push(toSvnSyncResultDto(r));
            }

            return results;
        }
    );

    fastify.get<{ Params: { projectId: string } }>(
        "/runtime/:projectId",
        async (req): Promise<SvnRuntimeDto[]> => {
            const { projectId } = req.params;
            const runtimes = await svnSync.getRuntimeByProjectId(projectId);
            return runtimes.map(toSvnRuntimeDto);
        }
    );

    fastify.post<{ Params: { projectId: string }; Body: Partial<SvnSyncRequestDto> }>(
        "/sync/stream/:projectId",
        async (req): Promise<SvnSyncStreamStartResponseDto> => {
            const { projectId } = req.params;
            const assets = (await fastify.core.project.get(projectId)).assets;
            if (!assets) {
                throw new CoreError(CoreErrorCodes.ASSET_NOT_FOUND, "Project assets are required for SVN sync");
            }
            const { iconsSvn, cutImageSvn } = assets;
            const svnSources = resolveSources({ iconsSvn, cutImageSvn }, req.body);

            for (const s of svnSources) {
                let localDir = s.localDir;
                if (!localDir) {
                    localDir = path.join(env.dataDir, "svn", projectId, s.label || s.id);
                }
                await svnSync.syncWithStream(projectId, s.id, localDir, s.url);
            }
            return { message: "SVN sync started" };
        }
    );
}
