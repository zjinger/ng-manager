import type { SpawnOptions, SpawnedProcess } from "./process.types";
export interface IProcessDriver {
    spawn(command: string, args: string[], opts: SpawnOptions): Promise<SpawnedProcess>;
}