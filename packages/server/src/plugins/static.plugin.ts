import fp from "fastify-plugin";
import path from "path";
import fastifyStatic from "@fastify/static";
import { env } from "../env";
import fs from "fs";

export default fp(async function staticPlugin(fastify) {
    /**
     * __dirname === packages/server/lib/plugins
     */
    const webRoot = path.resolve(__dirname, "../../www/browser");

    // 统一数据目录（支持 NGM_DATA_DIR 覆盖）
    const dataDir = env.dataDir;
    const spritesRoot = path.join(env.dataDir, "cache", "sprites");

    // 确保目录存在
    for (const dir of [dataDir]) {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }

    fastify.log.info(`[static] serving webapp from ${webRoot}`);
    fastify.log.info(`[static] dataDir=${dataDir}`);
    fastify.log.info(`[static] serving sprites from ${spritesRoot} `);
    // fastify.log.inof(`[static] serving sprite-css from ${spriteCssRoot} at /sprite-css/`);

    // 1 webapp 静态资源（无 prefix = /）
    await fastify.register(fastifyStatic, {
        root: webRoot,
        index: "index.html",
        decorateReply: true, // 需要 reply.sendFile
    });
    // 2 sprites：/sprites/{projectId}/{group}.png
    await fastify.register(fastifyStatic, {
        root: spritesRoot,
        prefix: "/sprites/",
        decorateReply: false,
    });

    // SPA fallback（非 API / WS / 静态资源 → index.html）
    fastify.setNotFoundHandler((req, reply) => {
        const url = req.url || "";

        const isSpaFallbackCandidate =
            req.method === "GET" &&
            !url.startsWith("/api") &&
            !url.startsWith("/ws") &&
            !url.startsWith("/sprites/")

        if (isSpaFallbackCandidate) {
            return reply.sendFile("index.html");
        }

        reply.code(404).send({ ok: false, message: "Not Found" });
    });

});
