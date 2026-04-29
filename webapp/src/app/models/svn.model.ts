import type { SvnSyncMode, SvnSyncRuntimePayload } from "@yinuo-ngm/protocol";

export type { SvnSyncMode } from "@yinuo-ngm/protocol";

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

export interface SvnRuntime extends SvnSyncRuntimePayload {}
