import type { SvnSyncResult, } from "./svn.types";

export interface SvnSyncService {
    sync(
        projectId: string,
        sourceId: string,
        dir: string,
        url: string
    ): Promise<SvnSyncResult>
}