import { FsEntry, FsListResult, FsLsOptions } from "./fs.types"

export interface FsService {
    ls(inputPath: string, opts?: FsLsOptions): Promise<FsListResult>
    mkdir(basePath: string, name: string): Promise<FsEntry>
    exists(path: string): Promise<boolean>
}