import path from "node:path";
import { GlobalError, GlobalErrorCodes } from "@yinuo-ngm/errors";
import type { FastifyInstance } from "fastify";
import type {
    GenerateSpriteResultDto,
    ProjectAssetsDto,
    SaveSpriteConfigBodyDto,
    SaveSpriteConfigResponseDto,
    GenerateSpriteOptionsDto,
    SpriteGroupItemDto,
    SpriteSnapshotDto,
    SpriteConfigDto,
} from "@yinuo-ngm/protocol";
import type { GenerateSpriteOptions, SpriteConfig, SpriteGroupItem, SpriteSnapshot } from "@yinuo-ngm/sprite";
import type { ProjectAssets } from "@yinuo-ngm/project";

function toSpriteConfigDto(cfg: SpriteConfig): SpriteConfigDto {
    return {
        projectId: cfg.projectId,
        enabled: cfg.enabled,
        sourceId: cfg.sourceId,
        localDir: cfg.localDir,
        prefix: cfg.prefix,
        template: cfg.template,
        spriteUrl: cfg.spriteUrl,
        spriteExportDir: cfg.spriteExportDir,
        lessExportDir: cfg.lessExportDir,
        algorithm: cfg.algorithm,
        persistLess: cfg.persistLess,
        updatedAt: cfg.updatedAt,
        localImageRoot: cfg.localImageRoot,
        localCacheDir: cfg.localCacheDir,
    };
}

function toSpriteGroupItemDto(item: SpriteGroupItem): SpriteGroupItemDto {
    return {
        group: item.group,
        kind: item.kind,
        previewSpriteUrl: item.previewSpriteUrl,
        spriteUrl: item.spriteUrl,
        meta: item.meta,
        lessText: item.lessText,
        exported: item.exported,
        status: item.status,
        error: item.error,
    };
}

function toSpriteSnapshotDto(snapshot: SpriteSnapshot): SpriteSnapshotDto {
    return {
        projectId: snapshot.projectId,
        sourceId: snapshot.sourceId,
        iconsRoot: snapshot.iconsRoot,
        cacheOutDir: snapshot.cacheOutDir,
        config: toSpriteConfigDto(snapshot.config),
        total: snapshot.total,
        success: snapshot.success,
        failed: snapshot.failed,
        groups: (snapshot.groups ?? []).map(toSpriteGroupItemDto),
    };
}

function toGenerateSpriteResultDto(snapshot: SpriteSnapshot): GenerateSpriteResultDto {
    return toSpriteSnapshotDto(snapshot);
}

export async function spriteRoutes(fastify: FastifyInstance) {
    fastify.get<{ Params: { projectId: string } }>(
        "/config/:projectId",
        async (req) => {
            const { projectId } = req.params;
            const cfg = await fastify.core.sprite.getConfig(projectId);
            return cfg ? toSpriteConfigDto(cfg) : null;
        }
    );

    fastify.post<{ Params: { projectId: string }; Body: Partial<SaveSpriteConfigBodyDto> }>(
        "/config/:projectId",
        async (req) => {
            const { projectId } = req.params;
            const body = req.body as Partial<SaveSpriteConfigBodyDto>;
            if (!body || !body.config) {
                throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, "Missing config in request body");
            }

            const nextCfg = body.config as Omit<SpriteConfig, "updatedAt" | "projectId">;
            const nextAssets = (body.assets || {}) as Partial<ProjectAssets>;
            const hasLocalImageRoot = !!String(nextCfg.localImageRoot ?? "").trim();

            if (!nextAssets.iconsSvn && !hasLocalImageRoot) {
                throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, "iconsSvn asset or localImageRoot is required");
            }

            if (nextCfg.localDir && nextAssets.iconsSvn) {
                nextAssets.iconsSvn.localDir = path.join(nextCfg.localDir, nextAssets.iconsSvn.label || "icons") as any;
                if (nextAssets.cutImageSvn) {
                    nextAssets.cutImageSvn.localDir = path.join(nextCfg.localDir, nextAssets.cutImageSvn.label || "images") as any;
                }
            }

            const shouldUpdateAssets = !!(nextAssets.iconsSvn || nextAssets.cutImageSvn);
            const project = shouldUpdateAssets
                ? await fastify.core.project.updateAssets(projectId, nextAssets as ProjectAssets)
                : await fastify.core.project.get(projectId);

            if (project.assets?.iconsSvn) {
                (nextCfg as any).sourceId = project.assets.iconsSvn.id;
            }

            const cfg = await fastify.core.sprite.createConfig(projectId, nextCfg as Omit<SpriteConfig, "projectId" | "updatedAt">);
            const assets: ProjectAssetsDto | undefined = project.assets
                ? {
                    iconsSvn: project.assets.iconsSvn,
                    cutImageSvn: project.assets.cutImageSvn,
                }
                : undefined;

            return {
                cfg: toSpriteConfigDto(cfg),
                project: { id: project.id, name: project.name, root: project.root, assets },
            } as SaveSpriteConfigResponseDto;
        }
    );

    fastify.post<{
        Params: { projectId: string };
        Body: Partial<GenerateSpriteOptionsDto>;
    }>("/generate/:projectId", async (req) => {
        const { projectId } = req.params;
        const body = req.body || ({} as Partial<GenerateSpriteOptionsDto>);

        const result = await fastify.core.sprite.generate(projectId, {
            groups: body.groups,
            forceRefresh: !!body.forceRefresh,
            concurrency: body.concurrency ?? 1,
            continueOnError: body.continueOnError ?? true,
        } as GenerateSpriteOptions);

        return toGenerateSpriteResultDto(result);
    });

    fastify.get<{ Params: { projectId: string }; Querystring: { local?: string | boolean } }>(
        "/list/:projectId",
        async (req) => {
            const { projectId } = req.params;
            const local = String(req.query?.local ?? "").toLowerCase() === "true";
            const snapshot = await fastify.core.sprite.getSprites(projectId, local);
            return toSpriteSnapshotDto(snapshot);
        }
    );
}
