import path from "node:path";
import { Readable } from "node:stream";
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
    QuickGenerateResponseDto,
    QuickSpriteProjectDto,
} from "@yinuo-ngm/protocol";
import type { GenerateSpriteOptions, SpriteConfig, SpriteGroupItem, SpriteSnapshot } from "@yinuo-ngm/sprite";
import type { ProjectAssets } from "@yinuo-ngm/project";
import {
    getBaseUrl,
    copyRawResponseHeaders,
    quickFetch,
    mapQuickGroupsToSnapshot,
    fetchRemoteProject,
    resolveEnabledRemoteProjectId,
    buildRemoteMiscUrl,
    MISC_PROXY_PREFIX,
} from "./sprite-quick.utils";

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
        quickSpriteProjectId: cfg.quickSpriteProjectId,
        quickSpriteEnabled: cfg.quickSpriteEnabled,
        quickSpriteBaseUrl: cfg.quickSpriteBaseUrl,
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
            // 如果未配置快捷雪碧图URL(TODO:后面迁移到getConfig中)
            if (cfg && !cfg?.quickSpriteBaseUrl) {
               const base = getBaseUrl(cfg);
               cfg.quickSpriteBaseUrl = base
            }
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
            const enableQuickSprite = nextCfg.quickSpriteProjectId && nextCfg.quickSpriteEnabled;

            if (!enableQuickSprite && !nextAssets.iconsSvn && !hasLocalImageRoot) {
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

        // ========== 快捷雪碧图分流：若配置了 quickSpriteProjectId，从远端拉取已生成列表 ==========
        const quickProjectId = await resolveEnabledRemoteProjectId(fastify, projectId);
        if (quickProjectId) {
            const localCfg = await fastify.core.sprite.getConfig(projectId);
            const baseUrl = getBaseUrl(localCfg);
            const [results, remoteProj] = await Promise.all([
                quickFetch<QuickGenerateResponseDto[]>(
                    fastify,
                    baseUrl,
                    `/api/project-sprites?projectId=${encodeURIComponent(quickProjectId)}`,
                ),
                fetchRemoteProject(fastify, baseUrl, quickProjectId),
            ]);
            if (!results?.length) {
                throw new GlobalError(
                    GlobalErrorCodes.NOT_FOUND,
                    `远端项目「${quickProjectId}」尚未生成任何雪碧图，请先在远端服务中为该项目生成雪碧图后再试`,
                );
            }
            return mapQuickGroupsToSnapshot(projectId, results, remoteProj, localCfg);
        }
        // ========== 本地生成逻辑 ==========

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

            // ========== 快捷雪碧图分流：若配置了 quickSpriteProjectId，从远端拉取已生成列表 ==========
            const quickProjectId = await resolveEnabledRemoteProjectId(fastify, projectId);
            if (quickProjectId) {
                const localCfg = await fastify.core.sprite.getConfig(projectId);
                const baseUrl = getBaseUrl(localCfg);
                const [results, remoteProj] = await Promise.all([
                    quickFetch<QuickGenerateResponseDto[]>(
                        fastify,
                        baseUrl,
                        `/api/project-sprites?projectId=${encodeURIComponent(quickProjectId)}`,
                    ),
                    fetchRemoteProject(fastify, baseUrl, quickProjectId),
                ]);
                return mapQuickGroupsToSnapshot(projectId, results, remoteProj, localCfg);
            }
            // ========== 本地查询逻辑 ==========

            const snapshot = await fastify.core.sprite.getSprites(projectId, local);
            return toSpriteSnapshotDto(snapshot);
        }
    );

    // ========== 快捷雪碧图代理路由（供配置弹窗下拉选择） ==========
    // - GET /projects：获取远端项目列表
    fastify.get<{ Reply: QuickSpriteProjectDto[] }>("/quick/projects", async (_req) => {
        const baseUrl = getBaseUrl();
        const projects = await quickFetch<QuickSpriteProjectDto[]>(
            fastify,
            baseUrl,
            "/api/projects",
        );
        return projects;
    });

    // - GET /groups/:projectId：获取远端项目的分组列表
    fastify.get<{
        Params: { projectId: string };
        Reply: string[];
    }>("/quick/groups/:projectId", async (req) => {
        const { projectId } = req.params;
        const baseUrl = getBaseUrl();
        const groups = await quickFetch<string[]>(
            fastify,
            baseUrl,
            `/api/groups?projectId=${encodeURIComponent(projectId)}`,
        );
        return groups;
    });

    // ========== 远端雪碧图 PNG 代理路由（不落盘，实时转发） ==========
    // 路径: /api/sprite/proxy/:projectId/:group.png
    // 映射链路：本地 projectId → SpriteConfig.quickSpriteProjectId → 远端 static/icons/{quickProjectId}/{group}.png
    fastify.get<{
        Params: { projectId: string; group: string };
    }>("/proxy/:projectId/:group.png", async (req, reply) => {
        const { projectId, group } = req.params;
        const cfg = await fastify.core.sprite.getConfig(projectId);
        const quickProjectId = cfg?.quickSpriteProjectId;
        if (!quickProjectId) {
            throw new GlobalError(
                GlobalErrorCodes.NOT_FOUND,
                `项目「${projectId}」未配置快捷雪碧图远端映射`,
            );
        }

        const baseUrl = getBaseUrl(cfg);
        const remoteUrl = `${baseUrl}/sprites/${encodeURIComponent(quickProjectId)}/${encodeURIComponent(group)}.png`;
        fastify.log.info(`[sprite-proxy] → GET ${remoteUrl}`);

        let response: Response;
        try {
            response = await fetch(remoteUrl);
        } catch (err: any) {
            fastify.log.error(`[sprite-proxy] ✗ ${remoteUrl}: ${err?.message || err}`);
            throw new GlobalError(
                GlobalErrorCodes.INTERNAL_ERROR,
                `无法连接远端雪碧图服务: ${err?.message || err}`,
            );
        }

        if (!response.ok) {
            throw new GlobalError(
                GlobalErrorCodes.NOT_FOUND,
                `远端雪碧图不存在: ${response.status}`,
            );
        }

        copyRawResponseHeaders(response, reply);
        const body = response.body;
        if (!body) {
            return reply.status(response.status).send();
        }
        return reply.status(response.status).send(Readable.fromWeb(body as any));
    });

    // ========== 远端切图图片代理路由（不落盘，实时转发） ==========
    // 路径: /api/sprite/misc-proxy/:quickProjectId/*
    fastify.get<{
        Params: { quickProjectId: string; "*": string };
    }>("/misc-proxy/:quickProjectId/*", async (req, reply) => {
        const { quickProjectId } = req.params;
        const filename = req.params["*"];

        const baseUrl = getBaseUrl();
        const remoteUrl = buildRemoteMiscUrl(baseUrl, quickProjectId, filename);
        fastify.log.info(`[sprite-misc-proxy] → GET ${remoteUrl}`);

        let response: Response;
        try {
            response = await fetch(remoteUrl);
        } catch (err: any) {
            fastify.log.error(`[sprite-misc-proxy] ✗ ${remoteUrl}: ${err?.message || err}`);
            throw new GlobalError(
                GlobalErrorCodes.INTERNAL_ERROR,
                `无法连接远端切图服务: ${err?.message || err}`,
            );
        }

        if (!response.ok) {
            throw new GlobalError(
                GlobalErrorCodes.NOT_FOUND,
                `远端切图不存在: ${response.status}`,
            );
        }

        copyRawResponseHeaders(response, reply);
        const body = response.body;
        if (!body) {
            return reply.status(response.status).send();
        }
        return reply.status(response.status).send(Readable.fromWeb(body as any));
    });
}
