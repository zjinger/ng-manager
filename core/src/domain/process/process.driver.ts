import type { SpawnOptions, SpawnedProcess } from "./process.model";

export interface IProcessDriver {
    spawn(command: string, opts: SpawnOptions): Promise<SpawnedProcess>;
}