import fs from "node:fs";
import path from "node:path";
import { env } from "../env";

import {
    detectGroupType,
    generatePngGroup,
    generateSvgGroup,
    type GenerateGroupResult,
} from "@yinuo-ngm/sprite";

import { AppError, type ProjectAssets, type SpriteConfig } from "@yinuo-ngm/core";

import { FastifyInstance } from "fastify";

type GenerateSpriteBody = {
    group: string;                 // "10-10"
    // 如果不传 prefix，默认 "sl"
    prefix?: string;               // css prefix
    // 是否强制重生成
    forceRefresh?: boolean;
    /**
     * spritesmith algorithm
     * binary-tree: 经典的二叉树算法，效率较高，生成的雪碧图较紧凑，适用于大多数情况。
     * top-down: 从上到下排列图标，适用于图标尺寸相似的情况。
     * left-right: 从左到右排列图标，适用于图标尺寸相似的情况。
     * diagonal: 对角线排列图标，适用于图标尺寸差异较大的情况，但可能会浪费一些空间。
     */
    algorithm?: "binary-tree" | "top-down" | "left-right" | "diagonal";
    // 仅 png：是否写 group.less 到磁盘（默认 true）
    persistLess?: boolean;
    // svg：自定义 url 规则
};
// function exists(p: string) {
//     try { return fs.existsSync(p); } catch { return false; }
// }

// function findGitRoot(start: string): string {
//     let cur = path.resolve(start);
//     while (true) {
//         const gitDir = path.join(cur, ".git");
//         if (exists(gitDir)) {
//             return cur;
//         }
//         const parent = path.dirname(cur);
//         if (parent === cur) break;
//         cur = parent;
//     }
//     return path.resolve(start);
// }

// export function computeSpriteDefaults(projectRoot: string,) {
//     const root = path.resolve(projectRoot);
//     const repoRoot = findGitRoot(root);
//     const parent = path.dirname(repoRoot);
//     let localDir: string;
//     // 随机数
//     const rand = Math.random().toString(36).substring(2, 8);
//     // 防止极端情况 parent === repoRoot（例如在盘符根）
//     if (parent === repoRoot) {
//         localDir = path.join(repoRoot, rand);
//     } else {
//         localDir = path.join(parent, rand);
//     }
//     const spriteExportDir = path.join(projectRoot, "assets", "icons")
//     const lessExportDir = path.join(projectRoot, "src", "styles", "icons")
//     return {
//         localDir,
//         spriteExportDir,
//         lessExportDir,
//     }
// }

function ensureDir(dir: string) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function computeSpriteDefaults(projectId: string, projectRoot: string) {
    const localDir = path.join(env.dataDir, "svn", projectId);
    const spriteCacheDir = path.join(env.dataDir, "cache", "sprites", projectId);

    ensureDir(localDir);
    ensureDir(spriteCacheDir);

    return {
        localDir,
        spriteExportDir: path.join(projectRoot, "assets", "icons"),
        lessExportDir: path.join(projectRoot, "src", "styles", "icons"),
    };
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
        if (cfg && (!cfg.spriteExportDir || !cfg.lessExportDir || !cfg.localDir)) {
            const { localDir, spriteExportDir, lessExportDir } = computeSpriteDefaults(p.id, p.root);
            cfg.spriteExportDir = cfg.spriteExportDir || spriteExportDir;
            cfg.lessExportDir = cfg.lessExportDir || lessExportDir;
            cfg.localDir = cfg.localDir || localDir;
        }
        return { cfg, projectId };
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
        return { cfg, projectId };
    });

    // 根据 projectId  生成雪碧图
    fastify.post("/generate/:projectId", async (req) => { })

    // 根据 projectId 从SVN拉取原尺寸图标和其他切图等资源文件
    fastify.post("/checkout/:projectId", async (req) => {

    })

    /**
     * 约定：
     * icons:  {env.dataDir}/icons/{projectId}/icons/{group}/...
     * sprites:{env.dataDir}/sprites/{projectId}/{group}.png
     *
     * PS:
     *   后续 iconsRoot 的真实位置不是 dataDir 下，也没问题：改这里的 iconsRoot 解析即可（或从 ProjectService 取）
     */
    fastify.post<{
        Params: { projectId: string };
        Body: GenerateSpriteBody;
    }>("/generate", async req => {
        try {
            const { projectId } = req.params;
            const body = req.body || ({} as any);

            const group = String(body.group || "").trim();
            if (!group) {
                throw new Error("group is required");
            }

            const prefix = (body.prefix || "sl").trim() || "sl";
            const forceRefresh = !!body.forceRefresh;
            const algorithm = body.algorithm || "binary-tree";
            const persistLess = body.persistLess ?? true;

            // iconsRoot 约定：dataDir/icons/{projectId}/icons/{group}
            // 路径后续接 ProjectService（更精准，直接定位到对应的项目目录）
            const iconsRoot = path.join(env.dataDir, "icons", projectId, "icons");
            const groupDir = path.join(iconsRoot, group);

            if (!fs.existsSync(groupDir)) {
                throw new Error(`Icon group not found: ${groupDir}`);
            }

            // 输出目录：dataDir/sprites/{projectId}
            const outDir = path.join(env.dataDir, "sprites", projectId);
            ensureDir(outDir);

            // 与 static 映射一致：/sprites/{projectId}/{group}.png
            const spriteUrl = `/sprites/${encodeURIComponent(projectId)}/${encodeURIComponent(group)}.png`;

            const type = detectGroupType(groupDir);

            let data: GenerateGroupResult;

            if (type === "mixed") {
                // return reply.code(400).send({
                //     ok: false,
                //     message: `分组 ${group} 同时存在 png 与 svg，请统一格式（建议拆分目录）`,
                // });
                throw new Error(`分组 ${group} 同时存在 png 与 svg，请统一格式（建议拆分目录）`);
            }

            if (type === "svg") {
                data = await generateSvgGroup({
                    group,
                    groupDir,
                    prefix,
                    urlResolver: ({ group, file }) =>
                        // 如果做了 /icons 的 static 映射，可替换成 /icons/{projectId}/icons/{group}/{file}
                        `/icons/${encodeURIComponent(projectId)}/icons/${encodeURIComponent(group)}/${encodeURIComponent(file)}`,
                });
            } else {
                data = await generatePngGroup({
                    group,
                    groupDir,
                    outDir,
                    spriteUrl,
                    css: {
                        prefix,
                        spriteUrlResolver: ({ spriteUrl }) => spriteUrl,
                    },
                    cache: {
                        enabled: true,
                        forceRefresh,
                        persistLess,
                    },
                    spritesmith: { algorithm },
                });
            }

            return data;
        } catch (e: any) {
            req.log.error(e);
            throw new Error("Failed to generate sprite");
        }
    });
}
