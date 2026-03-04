import open from "open";
import { ensureManagedServer, waitForManagedServerExit } from "./runtime";

type UiDeps = {
    ensureManagedServer: typeof ensureManagedServer;
    openUrl: (url: string) => Promise<unknown>;
    waitForManagedServerExit: typeof waitForManagedServerExit;
    log: (line: string) => void;
};

export function createStartUi(deps: UiDeps = defaultUiDeps) {
    return async function startUi(opts: any): Promise<void> {
        deps.log(`🚀  Preparing local UI ...`);
        const server = await deps.ensureManagedServer(opts);

        if (opts.open !== false) {
            await deps.openUrl(server.url);
        }

        deps.log(`🎉  Ready on ${server.url}`);

        if (server.child) {
            await deps.waitForManagedServerExit(server.child);
        }
    };
}

const defaultUiDeps: UiDeps = {
    ensureManagedServer,
    openUrl: open,
    waitForManagedServerExit,
    log: (line) => console.log(line),
};

export const startUi = createStartUi();
