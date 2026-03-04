import open from "open";
import { ensureManagedServer, waitForManagedServerExit } from "./runtime";

export async function startUi(opts: any): Promise<void> {
    console.log(`🚀  Preparing local UI ...`);
    const server = await ensureManagedServer(opts);

    if (opts.open !== false) {
        await open(server.url);
    }

    console.log(`🎉  Ready on ${server.url}`);

    if (server.child) {
        await waitForManagedServerExit(server.child);
    }
}
