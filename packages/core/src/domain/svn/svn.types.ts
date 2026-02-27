export type SvnSyncMode = "checkout" | "update" | "switch" | "recheckout";

export interface SvnWorkingCopyResult {
    mode: SvnSyncMode;
    stdout: string;
    stderr: string;
    desiredUrl: string;
    currentUrl: string;
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