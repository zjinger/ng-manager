import path from "path";
import { execa } from "execa";

export function startServerOnly(opts?: { port?: number }) {
    const port = String(opts?.port ?? process.env.NGM_SERVER_PORT ?? 3210);

    // 关键：稳如老狗
    const serverPkgJson = require.resolve("@ngm/server/package.json");
    const serverDir = path.dirname(serverPkgJson);
    const entry = path.join(serverDir, "lib", "index.js");

    const child = execa(process.execPath, [entry], {
        stdio: "inherit",
        env: { ...process.env, NGM_SERVER_PORT: port }
    });
    const kill = () => {
        child.kill("SIGINT");
        setTimeout(() => {
            child.kill("SIGKILL");
        }, 2000);
    };
    process.on("SIGINT", kill);
    process.on("SIGTERM", kill);
}
