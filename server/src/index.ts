
import { createServer } from "./app";

const port = Number(process.env.NGM_SERVER_PORT || 3210);
const host = process.env.NGM_SERVER_HOST || "127.0.0.1";

async function start() {
    const app = await createServer();
    await app.listen({ port, host });
    app.log.info(`local server listening on http://${host}:${port}`);
    app.core.sysLog.append({
        level: "info",
        text: `Server started at http://${host}:${port}`,
        ts: Date.now(),
        source: "system",
        scope: "task", // 理论上这里scope 应该是server， 但是为了在task 模块中展示，暂时用task
    })

    process.on("unhandledRejection", (reason) => {
        console.error("[unhandledRejection]", reason);
    });

    process.on("uncaughtException", (err) => {
        console.error("[uncaughtException]", err);
    });
}

start().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
});