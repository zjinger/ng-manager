import { readLock } from "./lock";
import { isHealthy, getHealth } from "./health";
import { pidExists } from "./pid";

export async function statusCmd(): Promise<void> {
    const lock = readLock();

    if (!lock) {
        console.log("ngm-server: not running");
        return;
    }

    const host = lock.host ?? "127.0.0.1";
    const alive = pidExists(lock.pid);
    const healthy = await isHealthy(lock.port, host);

    console.log("ngm-server status:");
    console.log(`  pid:     ${lock.pid} (${alive ? "alive" : "missing"})`);
    console.log(`  port:    ${lock.port}`);
    console.log(`  url:     http://${host}:${lock.port}`);
    console.log(`  health:  ${healthy ? "ok" : "fail"}`);
    console.log(`  started: ${new Date(lock.startedAt).toLocaleString()}`);

    if (healthy) {
        const h = await getHealth(lock.port, host);
        const data = h?.data || {};
        console.log(
            `  server:  pid=${data.pid} uptime=${Math.floor(data.uptime)}s dataDir=${data.dataDir}`
        );
    }
}
