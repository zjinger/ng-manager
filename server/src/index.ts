// import Fastify from "fastify";

// const app = Fastify({ logger: true });

// app.get("/health", async () => {
//     return { ok: true, ts: Date.now() };
// });

// const port = Number(process.env.NGM_SERVER_PORT || 3210);
// const host = process.env.NGM_SERVER_HOST || "127.0.0.1";

// app.listen({ port, host }).then(() => {
//     app.log.info(`local server listening on http://${host}:${port}`);
// });

import { createServer } from "./app";

const port = Number(process.env.NGM_SERVER_PORT || 3210);
const host = process.env.NGM_SERVER_HOST || "127.0.0.1";

async function start() {
    const app = await createServer();
    await app.listen({ port, host });
    app.log.info(`local server listening on http://${host}:${port}`);
}

start().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
});