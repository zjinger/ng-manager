import type { IProcessDriver } from "./process.driver";
import type { SpawnOptions, SpawnedProcess } from "./process.model";
import { AppError } from "../../common/errors";

export class ProcessService {
    constructor(private driver: IProcessDriver) { }

    async spawn(command: string, opts: SpawnOptions): Promise<SpawnedProcess> {
        try {
            return await this.driver.spawn(command, opts);
        } catch (e: any) {
            throw new AppError("PROCESS_SPAWN_FAILED", e?.message || "spawn failed", {
                command,
                cwd: opts.cwd,
            });
        }
    }
}
