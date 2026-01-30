
import { createServer } from "./app";
import { env } from "./env";

async function start() {
    const { port, host } = env;
    const app = await createServer();
    await app.listen({ port, host });
    app.log.info(`local server listening on http://${host}:${port}`);
    app.core.sysLog.append({
        level: "info",
        text: `Server started at http://${host}:${port}`,
        source: "server",
        scope: "system",
    })
}

start().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
});