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

        // 前台模式：等待子进程退出
        if (opts.foreground && server.child) {
            await deps.waitForManagedServerExit(server.child);
        }
        // 后台模式：直接返回，CLI 退出
    };
}

const defaultUiDeps: UiDeps = {
    ensureManagedServer,
    openUrl: open,
    waitForManagedServerExit,
    log: (line) => console.log(line),
};

export const startUi = createStartUi();
