import type { SvnRuntime, SvnSyncResult } from "./svn.types";

export interface SvnSyncService {
    sync(
        projectId: string,
        sourceId: string,
        dir: string,
        url: string
    ): Promise<SvnSyncResult>;

    syncWithStream(
        projectId: string,
        sourceId: string,
        dir: string,
        url: string,
    ): Promise<void>;

    getRuntimeByProjectId(projectId: string, tail?: number): Promise<SvnRuntime[]>;
}
