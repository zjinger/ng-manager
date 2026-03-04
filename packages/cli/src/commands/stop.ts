import { readLock } from "./lock";
import { stopManagedServer } from "./runtime";

export async function stopCmd(): Promise<void> {
    const lock = readLock();
    if (!lock) {
        console.log("ngm-server: not running");
        return;
    }

    // const host = lock.host ?? "127.0.0.1";
    // const port = lock.port;

    console.log(`Stopping ngm-server (pid=${lock.pid}) ...`);
    await stopManagedServer(lock);
    console.log("ngm-server stopped");
}
