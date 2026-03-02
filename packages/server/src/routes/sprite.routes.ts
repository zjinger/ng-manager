import path from "node:path";

import { AppError, GenerateSpriteOptions, Project, type ProjectAssets, type SpriteConfig } from "@yinuo-ngm/core";

import { FastifyInstance } from "fastify";
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
        return await fastify.core.sprite.getConfig(projectId);
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

    fastify.get("/list/:projectId", async (req) => { 
        const { projectId } = req.params as { projectId: string };
        return await fastify.core.sprite.getSprites(projectId);
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
