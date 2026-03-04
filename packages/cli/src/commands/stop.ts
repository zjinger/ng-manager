import { readLock } from "./lock";
import { stopManagedServer } from "./runtime";

type StopDeps = {
    readLock: typeof readLock;
    stopManagedServer: typeof stopManagedServer;
    log: (line: string) => void;
};

export function createStopCmd(deps: StopDeps = defaultStopDeps) {
    return async function stopCmd(): Promise<void> {
        const lock = deps.readLock();
        if (!lock) {
            deps.log("ngm-server: not running");
            return;
        }

        deps.log(`Stopping ngm-server (pid=${lock.pid}) ...`);
        await deps.stopManagedServer(lock);
        deps.log("ngm-server stopped");
    };
}

const defaultStopDeps: StopDeps = {
    readLock,
    stopManagedServer,
    log: (line) => console.log(line),
};

export const stopCmd = createStopCmd();
