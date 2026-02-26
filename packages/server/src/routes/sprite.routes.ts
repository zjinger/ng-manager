import fs from "node:fs";
import path from "node:path";
import { env } from "../env";

import {
    detectGroupType,
    generatePngGroup,
    generateSvgGroup,
    type GenerateGroupResult,
} from "@yinuo-ngm/sprite";
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



function ensureDir(dir: string) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * Sprite routes
 * prefix: /api/sprite
 */
export async function spriteRoutes(fastify: FastifyInstance) {
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
