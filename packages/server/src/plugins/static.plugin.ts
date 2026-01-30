import fp from "fastify-plugin";
import path from "path";
import fastifyStatic from "@fastify/static";

export default fp(async function staticPlugin(fastify) {
    /**
     * __dirname === packages/server/lib/plugins
     * 回到 monorepo 根，再进 www/browser
     */
    const webRoot = path.resolve(__dirname, "../../www/browser");

    fastify.log.info(`[static] serving webapp from ${webRoot}`);

    await fastify.register(fastifyStatic, {
        root: webRoot,
        index: "index.html",
    });

    // SPA fallback（非 API 请求 → index.html）
    fastify.setNotFoundHandler((req, reply) => {
        if (
            req.method === "GET" &&
            !req.url.startsWith("/api") &&
            !req.url.startsWith("/ws")
        ) {
            return reply.sendFile("index.html");
        }
        reply.code(404).send({ ok: false, message: "Not Found" });
    });
});
