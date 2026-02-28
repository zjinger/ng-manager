import { SvnSyncMode } from "../../protocol";
export type ProgressState = {
    total: number;      // 估算总条目数
    changed: number;    // 已处理条目数
};
export interface SvnWorkingCopyResult {
    mode: SvnSyncMode;
    stdout: string;
    stderr: string;
    desiredUrl: string;
    currentUrl: string;
}

export interface SvnWorkingCopyStreamResult extends SvnWorkingCopyResult {
    progress: ProgressState;
}
export interface SvnSyncResult {
    ok: boolean;
    projectId: string;
    sourceId: string;
    mode: SvnSyncMode;
    updatedAt: string;
    desiredUrl: string;
    currentUrl: string;
    stdout?: string;
    stderr?: string;
}

export interface SvnRuntime {
    projectId: string;
    sourceId: string;
    lastSyncAt?: string;
    lastSyncMode?: SvnSyncMode;
    desiredUrl?: string;
    currentUrl?: string;
    lastStdout?: string;
    lastStderr?: string;
}

