import path from "node:path";

import { GlobalError, GlobalErrorCodes } from "@yinuo-ngm/errors";
import { GenerateSpriteOptions, type SpriteConfig } from "@yinuo-ngm/core";
import { Project, type ProjectAssets } from "@yinuo-ngm/project";

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
        const body = req.body as { config: Omit<SpriteConfig, "updatedAt" | "projectId">, assets?: ProjectAssets };
        if (!body || !body.config) {
            throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, 'Missing config in request body');
        }
        const nextCfg = body.config;
        const nextAssets = body.assets || {};
        const hasLocalImageRoot = !!String(nextCfg.localImageRoot ?? "").trim();
        if (!nextAssets.iconsSvn && !hasLocalImageRoot) {
            throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, 'iconsSvn asset or localImageRoot is required');
        }

        if (nextCfg.localDir && nextAssets.iconsSvn) {
            nextAssets.iconsSvn.localDir = path.join(nextCfg.localDir, nextAssets.iconsSvn.label || 'icons');
            if (nextAssets.cutImageSvn) {
                nextAssets.cutImageSvn.localDir = path.join(nextCfg.localDir, nextAssets.cutImageSvn.label || 'images');
            }
        }

        const shouldUpdateAssets = !!(nextAssets.iconsSvn || nextAssets.cutImageSvn);
        const project = shouldUpdateAssets
            ? await fastify.core.project.updateAssets(projectId, nextAssets)
            : await fastify.core.project.get(projectId);

        if (project.assets?.iconsSvn) {
            nextCfg.sourceId = project.assets.iconsSvn.id;
        }

        const cfg = await fastify.core.sprite.createConfig(projectId, nextCfg);
        return { cfg, project };
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
        const query = req.query as { local?: string | boolean };
        const local = String(query['local'] ?? '').toLowerCase() === 'true';
        return await fastify.core.sprite.getSprites(projectId, local);
    })
}
