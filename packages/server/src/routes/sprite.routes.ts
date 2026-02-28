import fs from "node:fs";
import path from "node:path";
import { env } from "../env";

import { AppError, GenerateSpriteOptions, Project, type ProjectAssets, type SpriteConfig } from "@yinuo-ngm/core";

import { FastifyInstance } from "fastify";

function ensureDir(dir: string) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function genCacheDir(projectId: string) {
    const cacheDir = path.join(env.dataDir, "cache", "sprites", projectId);
    ensureDir(cacheDir);
    return cacheDir;
}

function computeSpriteDefaults(projectId: string, projectRoot: string) {
    const localDir = path.join(env.dataDir, "svn", projectId);
    ensureDir(localDir);
    return {
        localDir,
        spriteExportDir: path.join(projectRoot, "assets", "icons"),
        lessExportDir: path.join(projectRoot, "src", "styles", "icons"),
    };
}

/**
 * 决定 iconsRoot：
 * 1) spriteConfig.localDir（如果配置了）
 * 2) project.assets 中 id==sourceId 的 localDir
 * 3) fallback project.assets.iconsSvn.localDir
 */
function resolveIconsRoot(project: Project, cfg: SpriteConfig): string {
    const cfgLocal = String((cfg as any).localDir ?? "").trim();
    if (cfgLocal) return cfgLocal;

    const bySource = resolveAssetLocalDir(project, (cfg as any).sourceId);
    if (bySource) return bySource;

    const iconsSvnLocal = String(project?.assets?.iconsSvn?.localDir ?? "").trim();
    if (iconsSvnLocal) return iconsSvnLocal;

    throw new AppError("SPRITE_ICONS_ROOT_NOT_FOUND", "Cannot resolve icons root for sprite generation");
}

/**
 * 按 projectId + spriteConfig.sourceId 找到对应 asset.localDir
 * - assets 结构：iconsSvn/cutImageSvn/... 每个都有 id/kind/localDir
 */
function resolveAssetLocalDir(project: any, sourceId: string): string | null {
    const assets = project?.assets;
    if (!assets) return null;

    const arr = Object.values(assets).filter(Boolean) as any[];
    const hit = arr.find((a) => a?.id === sourceId && a?.kind === "svn");
    return hit?.localDir ? String(hit.localDir) : null;
}

// 列出 iconsRoot 下的一级目录，作为分组
function listGroupDirs(root: string): string[] {
    if (!fs.existsSync(root)) return [];
    return fs
        .readdirSync(root, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
}


/**
 * Sprite routes
 * prefix: /api/sprite
 */
export async function spriteRoutes(fastify: FastifyInstance) {
    /**
    * GET config 
    */
    fastify.get("/config/:projectId", async (req) => {
        const { projectId } = req.params as { projectId: string };
        const p = await fastify.core.project.get(projectId);
        const cfg = await fastify.core.sprite.getConfig(projectId);
        // 如果配置里缺少导出目录，计算默认值返回（但不更新配置文件）
        if (cfg) {
            if ((!cfg.spriteExportDir || !cfg.lessExportDir || !cfg.localDir)) {
                const { localDir, spriteExportDir, lessExportDir } = computeSpriteDefaults(p.id, p.root);
                cfg.spriteExportDir = cfg.spriteExportDir || spriteExportDir;
                cfg.lessExportDir = cfg.lessExportDir || lessExportDir;
                cfg.localDir = cfg.localDir || localDir;
            }
            return { cfg, projectId };
        } else {
            return {
                cfg: {
                    ...computeSpriteDefaults(p.id, p.root),
                }, projectId
            };
        }
    });

    /**
     * POST config
     * 约定：如果已存在配置，则覆盖更新（不区分 create/update）
     */
    fastify.post("/config/:projectId", async (req) => {
        const { projectId } = req.params as { projectId: string };
        const body = req.body as { config: Omit<SpriteConfig, "updatedAt" | "projectId">, assets: ProjectAssets };
        if (!body || !body.config || !body.assets) {
            throw new AppError('BAD_REQUEST', 'Missing config or assets in request body');
        }
        const nextCfg = body.config;
        const nextAssets = body.assets;
        if (!nextAssets.iconsSvn) {
            throw new AppError('BAD_REQUEST', 'iconsSvn asset is required');
        }
        if (nextCfg.localDir) {
            nextAssets.iconsSvn.localDir = path.join(nextCfg.localDir, nextAssets.iconsSvn.label || 'icons');
            if (nextAssets.cutImageSvn) {
                nextAssets.cutImageSvn.localDir = path.join(nextCfg.localDir, nextAssets.cutImageSvn.label || 'images');
            }
        }
        const p = await fastify.core.project.updateAssets(projectId, nextAssets);

        // 先创建/更新配置，再关联 sourceId（因为 sourceId 可能是新创建的）
        if (p.assets?.iconsSvn) {
            nextCfg.sourceId = p.assets.iconsSvn.id;
        }
        const cfg = await fastify.core.sprite.createConfig(projectId, nextCfg);
        return { cfg, project: p };
    });

    // 根据 projectId  生成雪碧图
    fastify.post<{
        Params: { projectId: string };
        Body: GenerateSpriteOptions;
    }>("/generate/:projectId", async (req) => {
        const { projectId } = req.params;
        const body = req.body || ({} as GenerateSpriteOptions);
        const result = await fastify.core.sprite.generate(projectId, {
            groups: body.groups,
            forceRefresh: !!body.forceRefresh,
            concurrency: body.concurrency ?? 1,
            continueOnError: body.continueOnError ?? true,
        });
        return result;
    })
    /**
     * 约定：
     * icons:  {env.dataDir}/icons/{projectId}/icons/{group}/...
     * sprites:{env.dataDir}/sprites/{projectId}/{group}.png
     *
     * PS:
     *   后续 iconsRoot 的真实位置不是 dataDir 下，也没问题：改这里的 iconsRoot 解析即可（或从 ProjectService 取）
     */
    // fastify.post<{
    //     Params: { projectId: string };
    //     Body: GenerateSpriteOptions;
    // }>("/generate", async req => {
    //     try {
    //         const { projectId } = req.params;
    //         const body = req.body || ({} as any);

    //         const group = String(body.group || "").trim();
    //         if (!group) {
    //             throw new Error("group is required");
    //         }

    //         const prefix = (body.prefix || "sl").trim() || "sl";
    //         const forceRefresh = !!body.forceRefresh;
    //         const algorithm = body.algorithm || "binary-tree";
    //         const persistLess = body.persistLess ?? true;

    //         // iconsRoot 约定：dataDir/icons/{projectId}/icons/{group}
    //         // 路径后续接 ProjectService（更精准，直接定位到对应的项目目录）
    //         const iconsRoot = path.join(env.dataDir, "icons", projectId, "icons");
    //         const groupDir = path.join(iconsRoot, group);

    //         if (!fs.existsSync(groupDir)) {
    //             throw new Error(`Icon group not found: ${groupDir}`);
    //         }

    //         // 输出目录：dataDir/sprites/{projectId}
    //         const outDir = path.join(env.dataDir, "sprites", projectId);
    //         ensureDir(outDir);

    //         // 与 static 映射一致：/sprites/{projectId}/{group}.png
    //         const spriteUrl = `/sprites/${encodeURIComponent(projectId)}/${encodeURIComponent(group)}.png`;

    //         const type = detectGroupType(groupDir);

    //         let data: GenerateGroupResult;

    //         if (type === "mixed") {
    //             // return reply.code(400).send({
    //             //     ok: false,
    //             //     message: `分组 ${group} 同时存在 png 与 svg，请统一格式（建议拆分目录）`,
    //             // });
    //             throw new Error(`分组 ${group} 同时存在 png 与 svg，请统一格式（建议拆分目录）`);
    //         }

    //         if (type === "svg") {
    //             data = await generateSvgGroup({
    //                 group,
    //                 groupDir,
    //                 prefix,
    //                 urlResolver: ({ group, file }) =>
    //                     // 如果做了 /icons 的 static 映射，可替换成 /icons/{projectId}/icons/{group}/{file}
    //                     `/icons/${encodeURIComponent(projectId)}/icons/${encodeURIComponent(group)}/${encodeURIComponent(file)}`,
    //             });
    //         } else {
    //             data = await generatePngGroup({
    //                 group,
    //                 groupDir,
    //                 outDir,
    //                 spriteUrl,
    //                 css: {
    //                     prefix,
    //                     spriteUrlResolver: ({ spriteUrl }) => spriteUrl,
    //                 },
    //                 cache: {
    //                     enabled: true,
    //                     forceRefresh,
    //                     persistLess,
    //                 },
    //                 spritesmith: { algorithm },
    //             });
    //         }

    //         return data;
    //     } catch (e: any) {
    //         req.log.error(e);
    //         throw new Error("Failed to generate sprite");
    //     }
    // });
}
