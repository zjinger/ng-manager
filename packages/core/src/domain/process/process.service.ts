import { CoreError, CoreErrorCodes } from "../../common/errors";
import { IProcessDriver , SpawnOptions, SpawnedProcess } from "../../infra/process";

export class ProcessService {
    constructor(private driver: IProcessDriver) { }
    async spawn(
        command: string,
        args: string[],
        opts: SpawnOptions
    ): Promise<SpawnedProcess> {
        try {
            return await this.driver.spawn(command, args, opts);
        } catch (e: any) {
            if (e?.code === "ENOENT") {
                throw new CoreError(CoreErrorCodes.COMMAND_NOT_FOUND, `Command not found: ${command}`, {
                    command,
                    args,
                    cwd: opts.cwd,
                });
            }
            throw new CoreError(
                CoreErrorCodes.PROCESS_SPAWN_FAILED,
                e?.message || "spawn failed",
                { command, args, cwd: opts.cwd }
            );
        }
    }

    async spawnDetached(
        command: string,
        args: string[],
        opts: Omit<SpawnOptions, "detached" | "stdio">
    ): Promise<void> {
        await this.spawn(command, args, {
            ...opts,
            detached: true,
            stdio: "ignore",
        });
    }
}
